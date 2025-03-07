'use client';
import { useState, useEffect } from 'react';

// Timer duration: 5 minutes in milliseconds
const TIMER_DURATION = 5 * 60 * 1000;

interface WaitingTimerProps {
  movedAt: string;  // ISO string timestamp
}

export default function WaitingTimer({ movedAt }: WaitingTimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Calculate initial time left
    const startTime = new Date(movedAt).getTime();
    const expiryTime = startTime + TIMER_DURATION;
    const now = Date.now();
    const initialTimeLeft = expiryTime - now;
    
    if (initialTimeLeft <= 0) {
      setIsExpired(true);
      setTimeLeft(0);
      return;
    }
    
    setTimeLeft(initialTimeLeft);
    
    // Update the timer every second
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = expiryTime - now;
      
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [movedAt]);

  if (isExpired) {
    return <span className="text-red-400 text-sm md:text-base font-bold">EXPIRED</span>;
  }
  
  if (timeLeft === null) {
    return null;
  }
  
  // Format time left as mm:ss
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  // Make the timer bigger and more prominent
  return (
    <span className="text-amber-200 text-sm md:text-base font-bold">
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}
