import { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';

interface TimerProps {
  isRunning: boolean;
  initialSeconds?: number;
  onStart: () => void;
  onStop: (totalSeconds: number) => void;
  disabled?: boolean;
}

const Timer = ({ isRunning, initialSeconds = 0, onStart, onStop, disabled }: TimerProps) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (disabled) return;
    
    if (isRunning) {
      onStop(seconds);
    } else {
      onStart();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {(isRunning || seconds > 0) && (
        <div className={`timer-display ${isRunning ? 'animate-pulse-slow' : ''}`}>
          {formatTime(seconds)}
        </div>
      )}
      
      {!disabled && (
        <button
          onClick={handleClick}
          className={`w-full ${isRunning ? 'btn-warning' : 'btn-success'}`}
        >
          {isRunning ? (
            <>
              <Square size={20} className="mr-2" />
              SKOŃCZYŁEM
            </>
          ) : (
            <>
              <Play size={20} className="mr-2" />
              ZACZYNAM
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default Timer;
