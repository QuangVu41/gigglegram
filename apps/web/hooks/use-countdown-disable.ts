import { useEffect, useRef, useState } from "react";

export const useCountdownDisable = (initialTime: number = 15) => {
  const [countdown, setCountdown] = useState(initialTime);
  const interval = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    const clearIntervalFunc = startCountdown();
    return clearIntervalFunc;
  }, []);

  const startCountdown = (time = 15) => {
    setCountdown(time);
    interval.current = setInterval(() => {
      setCountdown((t) => {
        const newT = t - 1;
        if (newT <= 0) {
          clearInterval(interval.current);
          return 0;
        }
        return newT;
      });
    }, 1000);
    return () => clearInterval(interval.current);
  };

  return { countdown, startCountdown, interval };
};
