import Weather from './components/Weather';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-400 to-blue-600">
      <div className="container mx-auto py-8">
        <ErrorBoundary>
          <Weather />
        </ErrorBoundary>
      </div>
    </div>
  );
}

export default App;
