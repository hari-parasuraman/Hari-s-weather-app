import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getWeatherData, getForecastData, searchCities, type CitySearchResult } from '../utils/api';
import type { WeatherData, ForecastData } from '../types/weather';
import HourlyForecast from './HourlyForecast';
import { ApiCallCounter } from './ApiCallCounter';

// Constants
const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_DELAY = 300;
const SEARCH_TIMEOUT = 10000;

// Error messages
const ERROR_MESSAGES = {
  EMPTY_CITY: 'Please enter a city name',
  SEARCH_TIMEOUT: 'Search request timed out. Please try again.',
  GENERIC_ERROR: 'An error occurred. Please try again.',
  MIN_LENGTH: `Please enter at least ${MIN_SEARCH_LENGTH} characters`,
} as const;

export default function Weather() {
  // State management with proper typing
  const [city, setCity] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for managing component lifecycle
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number>();
  const abortControllerRef = useRef<AbortController>();
  const searchTimeoutRef = useRef<number>();

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  // Handle clicks outside search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch city suggestions with debouncing
  useEffect(() => {
    cleanup();

    if (city.length < MIN_SEARCH_LENGTH) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const results = await searchCities(city);
        setSuggestions(results);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
        setSuggestions([]);
        setError(ERROR_MESSAGES.GENERIC_ERROR);
      }
    }, DEBOUNCE_DELAY);

    // Set timeout for search
    searchTimeoutRef.current = window.setTimeout(() => {
      cleanup();
      setError(ERROR_MESSAGES.SEARCH_TIMEOUT);
    }, SEARCH_TIMEOUT);

  }, [city, cleanup]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
      case 'Tab':
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedIndex]);

  // Handle suggestion selection
  const handleSuggestionClick = useCallback((suggestion: CitySearchResult) => {
    setCity(`${suggestion.name}, ${suggestion.country}`);
    setShowSuggestions(false);
    setSuggestions([]);
    void handleSearch(null, suggestion.name);
  }, []);

  // Main search handler
  const handleSearch = async (e: React.FormEvent | null, searchCity?: string) => {
    if (e) e.preventDefault();
    const searchTerm = searchCity || city;
    
    if (!searchTerm.trim()) {
      setError(ERROR_MESSAGES.EMPTY_CITY);
      return;
    }

    if (searchTerm.length < MIN_SEARCH_LENGTH) {
      setError(ERROR_MESSAGES.MIN_LENGTH);
      return;
    }

    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    setSuggestions([]);

    try {
      cleanup();
      abortControllerRef.current = new AbortController();

      console.log('Starting weather data fetch for:', searchTerm);
      
      const weatherPromise = getWeatherData(searchTerm);
      const forecastPromise = getForecastData(searchTerm);
      
      const [weatherData, forecastData] = await Promise.all([
        weatherPromise.catch(error => {
          console.error('Weather data fetch failed:', error);
          throw error;
        }),
        forecastPromise.catch(error => {
          console.error('Forecast data fetch failed:', error);
          throw error;
        })
      ]);
      
      console.log('Weather data received:', weatherData);
      console.log('Forecast data received:', forecastData);
      
      if (!forecastData.forecast?.forecastday?.[0]?.hour) {
        throw new Error('Invalid forecast data structure received');
      }
      
      setWeather(weatherData);
      setForecast(forecastData);
      setError(null);
    } catch (err) {
      console.error('Error in Weather component:', err);
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.GENERIC_ERROR;
      setError(errorMessage);
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
      cleanup();
    }
  };

  // Memoized suggestion list
  const renderSuggestions = useMemo(() => {
    if (!showSuggestions || !suggestions.length) return null;

    return (
      <ul
        id="city-suggestions"
        className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg bg-black/40 backdrop-blur-md border border-white/20 shadow-lg"
        role="listbox"
        aria-label="City suggestions"
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.id}
            id={`suggestion-${index}`}
            role="option"
            aria-selected={index === selectedIndex}
            className={`px-4 py-2 cursor-pointer transition-colors ${
              index === selectedIndex ? 'bg-primary/20' : 'hover:bg-white/10'
            }`}
            onClick={() => handleSuggestionClick(suggestion)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSuggestionClick(suggestion);
              }
            }}
            tabIndex={0}
          >
            <div className="text-white font-medium">{suggestion.name}</div>
            <div className="text-sm text-white/70">
              {suggestion.region && `${suggestion.region}, `}{suggestion.country}
            </div>
          </li>
        ))}
      </ul>
    );
  }, [suggestions, showSuggestions, selectedIndex, handleSuggestionClick]);

  return (
    <>
      <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
        {/* Search section */}
        <div ref={searchContainerRef} className="relative">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Use setTimeout to allow click events on suggestions to fire first
                setTimeout(() => {
                  setShowSuggestions(false);
                }, 200);
              }}
              placeholder="Enter city name..."
              className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              aria-label="Search for a city"
              aria-expanded={showSuggestions}
              aria-controls="city-suggestions"
              aria-activedescendant={selectedIndex >= 0 ? `suggestion-${selectedIndex}` : undefined}
              aria-describedby={error ? 'search-error' : undefined}
              role="combobox"
              autoComplete="off"
              disabled={loading}
            />
            {loading && (
              <div className="absolute right-14 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
              aria-label={loading ? 'Searching...' : 'Search for weather'}
            >
              Search
            </button>
          </form>

          {renderSuggestions}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="animate-pulse space-y-4">
            {/* ... existing loading state ... */}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 text-red-500">
            {error}
          </div>
        )}

        {weather && forecast && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Current Weather Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-[#2b5876]/80 to-[#4e4376]/80 backdrop-blur-sm border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
                <h2 className="text-2xl font-semibold mb-6 text-white">
                  Current Weather in {weather.name}, {weather.sys.country}
                </h2>
                <div className="flex items-center gap-6 mb-6">
                  <div className="flex items-center">
                    <img
                      src={weather.weather[0].icon.startsWith('//') 
                        ? `https:${weather.weather[0].icon}`
                        : weather.weather[0].icon}
                      alt={weather.weather[0].description}
                      className="w-20 h-20"
                    />
                    <div className="text-6xl font-bold text-white ml-4">{Math.round(weather.main.temp)}°C</div>
                  </div>
                  <div>
                    <p className="text-xl capitalize text-white">{weather.weather[0].description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-sm text-white/70">Feels like</p>
                    <p className="text-lg font-semibold text-white">{Math.round(weather.main.feels_like)}°C</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-sm text-white/70">Humidity</p>
                    <p className="text-lg font-semibold text-white">{weather.main.humidity}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-sm text-white/70">Wind Speed</p>
                    <p className="text-lg font-semibold text-white">{weather.wind.speed} m/s</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5">
                    <p className="text-sm text-white/70">Pressure</p>
                    <p className="text-lg font-semibold text-white">{weather.main.pressure} hPa</p>
                  </div>
                </div>
              </div>

              {/* 3-Day Forecast Card */}
              {forecast && forecast.forecast?.forecastday && (
                <div className="p-6 rounded-xl bg-gradient-to-br from-[#4e4376]/80 to-[#2b5876]/80 backdrop-blur-sm border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <h2 className="text-2xl font-semibold mb-6 text-white">3-Day Forecast</h2>
                  <div className="space-y-4">
                    {forecast.forecast.forecastday.map((day) => (
                      <div key={day.date} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                        <div className="flex items-center gap-4">
                          <img
                            src={day.day.condition.icon.startsWith('//') 
                              ? `https:${day.day.condition.icon}`
                              : day.day.condition.icon}
                            alt={day.day.condition.text}
                            className="w-12 h-12"
                          />
                          <div>
                            <p className="font-medium text-white">
                              {new Date(day.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-white/70">{day.day.condition.text}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-semibold text-white">{Math.round(day.day.avgtemp_c)}°C</p>
                          <p className="text-sm text-white/70">
                            H: {Math.round(day.day.maxtemp_c)}°C L: {Math.round(day.day.mintemp_c)}°C
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hourly forecast section */}
            {forecast?.forecast?.forecastday?.[0]?.hour && (
              <div className="p-6 rounded-xl bg-gradient-to-r from-[#2b5876]/80 via-[#4e4376]/80 to-[#2b5876]/80 backdrop-blur-sm border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
                <HourlyForecast 
                  hours={forecast.forecast.forecastday[0].hour}
                  timezone={forecast.location?.timezone}
                  localtime={forecast.location?.localtime}
                  className="mt-4"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <ApiCallCounter />
    </>
  );
} 