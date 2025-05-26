import { useState, useEffect } from 'react';
import { apiCounter } from '../utils/apiCounter';
import { CONFIG } from '../config/constants';

export function ApiCallCounter() {
  const [count, setCount] = useState(apiCounter.getCount());
  const [percentage, setPercentage] = useState(apiCounter.getPercentage());

  useEffect(() => {
    // Update counter every minute
    const interval = setInterval(() => {
      setCount(apiCounter.getCount());
      setPercentage(apiCounter.getPercentage());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Determine color based on usage percentage
  const getColor = (percent: number): string => {
    if (percent < 50) return 'text-emerald-400';
    if (percent < 80) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="fixed bottom-4 right-4 p-3 bg-[#1e4976] backdrop-blur-sm rounded-lg shadow-lg border border-white/10 z-50">
      <div className="text-xs text-white/70 mb-1">API Calls This Month</div>
      <div className={`text-sm font-medium ${getColor(percentage)}`}>
        {formatNumber(count)} / {formatNumber(CONFIG.API.MONTHLY_LIMIT)}
      </div>
      <div className="w-full h-1 bg-black/20 rounded-full mt-1 overflow-hidden">
        <div 
          className={`h-full ${getColor(percentage)} bg-current transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
} 