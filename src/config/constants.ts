export const CONFIG = {
  API: {
    BASE_URL: 'https://api.weatherapi.com/v1',
    TIMEOUT: 30000,
    RATE_LIMIT: 30,
    MIN_QUERY_LENGTH: 2,
    MONTHLY_LIMIT: 1_000_000,
    STORAGE_KEY: 'weather_api_calls'
  },
  CACHE: {
    DURATION: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 50,
    VERSION: '1.0.0'
  },
  UI: {
    DEBOUNCE_DELAY: 300,
    SEARCH_TIMEOUT: 10000
  }
} as const;

export const ERROR_MESSAGES = {
  EMPTY_CITY: 'Please enter a city name',
  GENERIC_ERROR: 'Unable to fetch weather information. Please try again.',
  MIN_LENGTH: `Please enter at least ${CONFIG.API.MIN_QUERY_LENGTH} characters`,
  RATE_LIMIT: 'Please wait a moment before trying again',
  NETWORK_ERROR: 'Please check your internet connection',
  API_KEY_MISSING: 'Weather API key is not configured',
  VALIDATION_ERROR: 'Please enter a valid city name'
} as const; 