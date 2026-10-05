import { useState, useEffect } from 'react';
import { MATCH_DURATION_SECONDS } from '../utils/time';
import { playHorn } from '../utils/audio';

export function useTimer() {
  const [time, setTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning && time > 0) {
      interval = setInterval(() => setTime((t) => t - 1), 1000);
    } else if (time === 0 && timerRunning) {
      setTimerRunning(false);
      playHorn();
    }
    return () => clearInterval(interval);
  }, [timerRunning, time]);

  const resetTimer = () => {
    setTime(MATCH_DURATION_SECONDS);
    setTimerRunning(false);
  };

  return { time, setTime, timerRunning, setTimerRunning, resetTimer };
}
