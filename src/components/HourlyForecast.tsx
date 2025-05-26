import { useMemo, useRef, useEffect } from 'react';
import type { HourlyWeather } from '../types/weather';

interface HourlyForecastProps {
  hours: HourlyWeather[];
  className?: string;
  timezone?: string;
  localtime?: string;
}

export default function HourlyForecast({ 
  hours, 
  className = '',
  timezone,
  localtime
}: HourlyForecastProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Get location's current time
  const locationTime = useMemo(() => {
    if (!localtime) {
      console.log('No localtime provided, using current time');
      return new Date();
    }
    console.log('Using location time:', localtime);
    return new Date(localtime);
  }, [localtime]);

  // Filter and sort hours to show next 24 hours from location's current time
  const nextHours = useMemo(() => {
    if (!hours?.length) {
      console.log('No hours data provided');
      return [];
    }
    
    console.log('Filtering hours from:', hours.length, 'hours');
    console.log('Location time:', locationTime.toISOString());
    
    const currentTime = locationTime.getTime();
    const filteredHours = hours
      .filter(hour => {
        const hourTime = new Date(hour.time).getTime();
        const shouldInclude = hourTime >= currentTime;
        console.log('Hour:', hour.time, 'Include:', shouldInclude);
        return shouldInclude;
      })
      .slice(0, 24);

    console.log('Filtered to', filteredHours.length, 'hours');
    return filteredHours;
  }, [hours, locationTime]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current && nextHours.length > 0) {
      const currentHourElement = scrollRef.current.querySelector('[data-is-now="true"]');
      if (currentHourElement) {
        console.log('Scrolling to current hour');
        currentHourElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      } else {
        console.log('No current hour element found');
      }
    }
  }, [nextHours]);

  if (!nextHours.length) {
    console.log('No hours to display');
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-white">Hourly Forecast</h2>
        {timezone && (
          <div className="text-sm text-white/70">
            {timezone}
          </div>
        )}
      </div>
      
      {/* Scrollable container with snap points */}
      <div className="relative">
        {/* Scroll indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#1e4976] to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#1e4976] to-transparent pointer-events-none z-10" />
        
        {/* Scroll buttons */}
        <button 
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
            }
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
          aria-label="Scroll left"
        >
          ←
        </button>
        <button 
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
          aria-label="Scroll right"
        >
          →
        </button>
        
        <div 
          ref={scrollRef}
          className="overflow-x-auto pb-4 hide-scrollbar scroll-smooth"
        >
          <div className="flex gap-4 px-4">
            {nextHours.map((hour, index) => {
              const hourTime = new Date(hour.time);
              const isNow = hourTime.getHours() === locationTime.getHours() &&
                           hourTime.getDate() === locationTime.getDate();
              const showDate = index === 0 || hourTime.getDate() !== new Date(nextHours[index - 1].time).getDate();
              
              return (
                <div
                  key={hour.time}
                  data-is-now={isNow}
                  className={`flex-none w-[120px] rounded-xl p-4 transition-all
                    ${isNow ? 'bg-white/20 ring-2 ring-white/50' : 'bg-white/5 hover:bg-white/10'}
                    snap-start`}
                >
                  <div className="text-center">
                    {showDate && (
                      <p className="text-white/60 text-xs mb-1">
                        {hourTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                    )}
                    <p className="text-white/80 text-sm mb-2">
                      {index === 0 && isNow ? 'Now' : hourTime.toLocaleTimeString([], { hour: 'numeric' })}
                    </p>
                    
                    <div className="relative">
                      <img
                        src={hour.condition.icon.startsWith('//') 
                          ? `https:${hour.condition.icon}`
                          : hour.condition.icon}
                        alt={hour.condition.text}
                        className="w-12 h-12 mx-auto mb-2"
                      />
                      {hour.is_day === 0 && (
                        <span className="absolute top-0 right-0 text-xs">🌙</span>
                      )}
                    </div>
                    
                    <p className="text-2xl font-semibold text-white mb-2">
                      {Math.round(hour.temp_c)}°
                    </p>
                    
                    <div className="space-y-1 text-sm text-white/70">
                      {(hour.chance_of_rain > 0 || hour.chance_of_snow > 0) && (
                        <p className="flex items-center justify-center gap-1">
                          <span className="w-4 h-4">{hour.chance_of_snow > hour.chance_of_rain ? '❄️' : '💧'}</span>
                          {Math.max(hour.chance_of_rain, hour.chance_of_snow)}%
                        </p>
                      )}
                      
                      <p className="flex items-center justify-center gap-1">
                        <span className="w-4 h-4">💨</span>
                        {Math.round(hour.wind_kph)} km/h
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <style>
        {`
          .hide-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
            scroll-snap-type: x mandatory;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
} 