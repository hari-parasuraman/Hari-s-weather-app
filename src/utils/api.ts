import type { 
  WeatherData, 
  ForecastData, 
  ApiError, 
  CacheEntry,
  LocationInfo,
  DayForecast
} from '../types/weather';
import type {
  WeatherApiResponse,
  ForecastApiResponse,
  CitySearchApiResponse
} from '../types/api';
import { CONFIG, ERROR_MESSAGES } from '../config/constants';
import { apiCounter } from './apiCounter';

// Configuration constants
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE_URL = 'https://api.weatherapi.com/v1';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_SIZE = 50; // Maximum number of items to cache

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 2,
  baseDelay: 1000,
} as const;

// Exponential backoff for retries
const getRetryDelay = (attempt: number): number => {
  return Math.min(RETRY_CONFIG.baseDelay * Math.pow(2, attempt), 5000);
};

// API response types
export interface CitySearchResult {
  id: number;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  url: string;
}

// Rate limiter implementation
class RateLimiter {
  private requests: number = 0;
  private lastReset: number = Date.now();

  canMakeRequest(): boolean {
    if (Date.now() - this.lastReset > 60000) {
      this.requests = 0;
      this.lastReset = Date.now();
    }
    return this.requests++ < CONFIG.API.RATE_LIMIT;
  }
}

// Cache implementation with versioning
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = Array.from(this.cache.keys())[0];
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { 
      data: value, 
      timestamp: Date.now(),
      version: CONFIG.CACHE.VERSION
    });
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (entry && entry.version !== CONFIG.CACHE.VERSION) {
      this.cache.delete(key);
      return undefined;
    }
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
    }
    return entry;
  }

  clear(): void {
    this.cache.clear();
  }
}

// Initialize caches and rate limiter
const cityCache = new LRUCache<CitySearchApiResponse[]>(CONFIG.CACHE.MAX_SIZE);
const weatherCache = new LRUCache<WeatherData | ForecastData>(CONFIG.CACHE.MAX_SIZE);
const rateLimiter = new RateLimiter();

// Utility functions
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CONFIG.CACHE.DURATION;
};

const sanitizeInput = (input: string | undefined): string => {
  if (!input) return '';
  return encodeURIComponent(input.trim().toLowerCase());
};

const validateApiKey = (): void => {
  if (!import.meta.env.VITE_WEATHER_API_KEY) {
    throw new Error(ERROR_MESSAGES.API_KEY_MISSING);
  }
};

// Request validation
const validateRequest = (params: unknown): boolean => {
  if (!params || typeof params !== 'object') return false;
  if ('city' in params && typeof (params as { city: unknown }).city !== 'string') return false;
  return true;
};

// API request wrapper with error handling, rate limiting, and retries
async function fetchApi<T>(url: string, errorMessage: string): Promise<T> {
  if (!rateLimiter.canMakeRequest()) {
    throw new Error(ERROR_MESSAGES.RATE_LIMIT);
  }

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API.TIMEOUT);

      // Only increment the counter on the first attempt
      if (attempt === 0) {
        apiCounter.increment();
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `${errorMessage} (Status: ${response.status})`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's not a timeout or network error
      if (error instanceof Error && 
          error.name !== 'AbortError' && 
          !error.message.includes('network')) {
        throw error;
      }

      // Last attempt failed
      if (attempt === RETRY_CONFIG.maxRetries) {
        console.error('All retry attempts failed:', error);
        throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
    }
  }

  // This should never happen due to the loop above
  throw lastError || new Error(ERROR_MESSAGES.GENERIC_ERROR);
}

// Batch request handler
async function batchRequests<T>(
  requests: Promise<T>[],
  batchSize: number = 3
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
  return results;
}

/**
 * Searches for cities matching the query string
 * @param query - The search query
 * @returns Promise<CitySearchApiResponse[]>
 * @throws {Error} When the query is invalid or rate limit is exceeded
 */
export async function searchCities(query: string): Promise<CitySearchApiResponse[]> {
  if (!query?.trim() || query.length < CONFIG.API.MIN_QUERY_LENGTH) return [];
  
  validateApiKey();
  const sanitizedQuery = sanitizeInput(query);
  
  // Check cache
  const cached = cityCache.get(sanitizedQuery);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }
  
  try {
    const url = `${CONFIG.API.BASE_URL}/search.json?key=${import.meta.env.VITE_WEATHER_API_KEY}&q=${sanitizedQuery}`;
    const data = await fetchApi<CitySearchApiResponse[]>(url, 'Failed to fetch city suggestions');
    
    cityCache.set(sanitizedQuery, data);
    return data;
  } catch (error) {
    console.error('Error searching cities:', error);
    return [];
  }
}

/**
 * Fetches current weather data for a city
 * @param city - The name of the city
 * @returns Promise<WeatherData>
 * @throws {Error} When the city is invalid or API call fails
 */
export async function getWeatherData(city: string): Promise<WeatherData> {
  if (!city?.trim()) {
    throw new Error(ERROR_MESSAGES.EMPTY_CITY);
  }
  
  validateApiKey();
  const sanitizedCity = sanitizeInput(city);
  
  // Check cache
  const cacheKey = `weather_${sanitizedCity}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data as WeatherData;
  }

  const url = `${CONFIG.API.BASE_URL}/current.json?key=${import.meta.env.VITE_WEATHER_API_KEY}&q=${sanitizedCity}&aqi=no`;
  const data = await fetchApi<WeatherApiResponse>(url, 'Failed to fetch weather data');
  
  // Transform API response
  const transformedData: WeatherData = {
    weather: [{
      id: data.current.condition.code,
      main: data.current.condition.text,
      description: data.current.condition.text,
      icon: data.current.condition.icon
    }],
    main: {
      temp: Math.round(data.current.temp_c),
      feels_like: Math.round(data.current.feelslike_c),
      temp_min: Math.round(data.current.temp_c),
      temp_max: Math.round(data.current.temp_c),
      pressure: data.current.pressure_mb,
      humidity: data.current.humidity
    },
    wind: {
      speed: Math.round(data.current.wind_kph / 3.6),
      deg: data.current.wind_degree
    },
    name: data.location.name,
    sys: {
      name: data.location.name,
      country: data.location.country
    }
  };

  weatherCache.set(cacheKey, transformedData);
  return transformedData;
}

/**
 * Fetches forecast data for a city
 * @param city - The name of the city
 * @returns Promise<ForecastData>
 * @throws {Error} When the city is invalid or API call fails
 */
export async function getForecastData(city: string): Promise<ForecastData> {
  if (!city?.trim()) {
    throw new Error(ERROR_MESSAGES.EMPTY_CITY);
  }
  
  validateApiKey();
  const sanitizedCity = sanitizeInput(city);
  
  // Check cache
  const cacheKey = `forecast_${sanitizedCity}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data as ForecastData;
  }

  const url = `${CONFIG.API.BASE_URL}/forecast.json?key=${import.meta.env.VITE_WEATHER_API_KEY}&q=${sanitizedCity}&days=3&aqi=no`;
  const data = await fetchApi<ForecastApiResponse>(url, 'Failed to fetch forecast data');
  
  if (!data.forecast?.forecastday?.[0]?.hour) {
    throw new Error('Invalid forecast data received from API');
  }

  // Transform API response
  const transformedData: ForecastData = {
    list: data.forecast.forecastday.map(day => ({
      dt: new Date(day.date).getTime() / 1000,
      main: {
        temp: Math.round(day.day.avgtemp_c),
        feels_like: Math.round(day.day.avgtemp_c),
        temp_min: Math.round(day.day.mintemp_c),
        temp_max: Math.round(day.day.maxtemp_c),
        pressure: 1015, // Default value as it's not provided in daily forecast
        humidity: 0 // Not provided in daily forecast
      },
      weather: [{
        id: day.day.condition.code,
        main: day.day.condition.text,
        description: day.day.condition.text,
        icon: day.day.condition.icon
      }],
      wind: {
        speed: 0, // Not provided in daily forecast
        deg: 0
      },
      dt_txt: day.date
    })),
    city: {
      name: data.location.name,
      country: data.location.country
    },
    forecast: {
      forecastday: data.forecast.forecastday.map(day => ({
        date: day.date,
        day: {
          maxtemp_c: day.day.maxtemp_c,
          mintemp_c: day.day.mintemp_c,
          avgtemp_c: day.day.avgtemp_c,
          condition: day.day.condition
        },
        hour: day.hour.map(hour => ({
          time: hour.time,
          temp_c: hour.temp_c,
          temp_f: hour.temp_f,
          condition: hour.condition,
          wind_kph: hour.wind_kph,
          wind_degree: hour.wind_degree,
          humidity: hour.humidity,
          chance_of_rain: hour.chance_of_rain,
          chance_of_snow: hour.chance_of_snow,
          is_day: hour.is_day
        }))
      }))
    },
    location: {
      timezone: data.location.tz_id,
      localtime: data.location.localtime,
      country: data.location.country,
      name: data.location.name,
      region: data.location.region
    }
  };

  weatherCache.set(cacheKey, transformedData);
  return transformedData;
} 