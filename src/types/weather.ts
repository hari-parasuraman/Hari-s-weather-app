// Weather condition types
export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  icon: string;
}

// Main weather metrics
export interface WeatherMetrics {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
}

// Wind information
export interface WindInfo {
  speed: number;
  deg: number;
}

// Location information with timezone
export interface LocationInfo {
  timezone: string;
  localtime: string;
  country: string;
  name: string;
  region: string;
}

// Hourly weather data
export interface HourlyWeather {
  time: string;
  temp_c: number;
  temp_f: number;
  condition: {
    text: string;
    icon: string;
    code: number;
  };
  wind_kph: number;
  wind_degree: number;
  humidity: number;
  chance_of_rain: number;
  chance_of_snow: number;
  is_day: number;
}

// Day forecast with hourly data
export interface DayForecast {
  date: string;
  day: {
    maxtemp_c: number;
    mintemp_c: number;
    avgtemp_c: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
  };
  hour: HourlyWeather[];
}

// Current weather data
export interface WeatherData {
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  name: string;
  sys: {
    name: string;
    country: string;
  };
}

// Forecast day data
export interface ForecastDay {
  dt: number;
  main: WeatherMetrics;
  weather: WeatherCondition[];
  wind: WindInfo;
  dt_txt: string;
}

// Complete forecast data
export interface ForecastData {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      humidity: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    wind: {
      speed: number;
      deg: number;
    };
    dt_txt: string;
  }>;
  city: {
    name: string;
    country: string;
  };
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
      };
      hour: Array<HourlyWeather>;
    }>;
  };
  location: LocationInfo;
}

// API error response
export interface ApiError {
  code: number;
  message: string;
}

// Cache entry type
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
} 