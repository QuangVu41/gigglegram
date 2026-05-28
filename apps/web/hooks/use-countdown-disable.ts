import { useEffect, useRef, useState } from "react";

export const useCountdownDisable = (
  initialTime: number = 0,
  startOnMount: boolean = false,
) => {
  const [countdown, setCountdown] = useState(initialTime);
  const interval = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (startOnMount) {
      const clearIntervalFunc = startCountdown(
        initialTime > 0 ? initialTime : 15,
      );
      return clearIntervalFunc;
    }
  }, [startOnMount, initialTime]);

  const startCountdown = (time = 15) => {
    setCountdown(time);
    clearInterval(interval.current);
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
