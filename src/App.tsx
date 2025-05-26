import Weather from './components/Weather';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 to-blue-600">
      <header className="w-full py-4 px-6 bg-black/10 backdrop-blur-sm">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-white">Weather Forecast</h1>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8" role="main">
        <ErrorBoundary>
          <Weather />
        </ErrorBoundary>
      </main>

      <footer className="w-full py-4 px-6 mt-8 bg-black/10 backdrop-blur-sm">
        <div className="container mx-auto text-center text-white/70 text-sm">
          <p>Powered by WeatherAPI.com</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
