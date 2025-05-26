# Hari's Weather Forecast App

A modern weather forecast application built with React, TypeScript, and Vite. The app provides current weather conditions, 3-day forecasts, and hourly weather updates using the WeatherAPI.com service.

## Features

- Current weather conditions
- 3-day weather forecast
- Hourly weather forecast
- City search with autocomplete
- Responsive design with glass-morphic UI
- API call monitoring
- Error handling and retry mechanism
- Caching for better performance

## Technologies Used

- React 18
- TypeScript
- Vite
- TailwindCSS
- WeatherAPI.com

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- WeatherAPI.com API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/hari-parasuraman/weather-app.git
cd weather-app
```

2. Install dependencies:
```bash
npm install
# or
yarn
```

3. Create a `.env` file in the root directory and add your WeatherAPI.com API key:
```env
VITE_WEATHER_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The app will be available at `http://localhost:5173`

### Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

## Features in Detail

### Weather Information
- Current temperature and conditions
- Feels like temperature
- Wind speed and direction
- Humidity and pressure
- 3-day forecast with high/low temperatures
- Hourly forecast with detailed conditions

### User Interface
- Modern glass-morphic design
- Responsive layout for all devices
- Loading states and error handling
- Smooth animations and transitions
- Dark mode optimized

### Technical Features
- API call monitoring with monthly limit tracking
- Automatic retry mechanism for failed requests
- Local storage caching
- Rate limiting protection
- Type-safe API interactions

## License

MIT

## Acknowledgments

- Weather data provided by [WeatherAPI.com](https://www.weatherapi.com/)
- Icons and design inspiration from various sources
