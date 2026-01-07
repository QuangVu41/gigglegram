"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const BackgroundGradient = ({ children }: { children: React.ReactNode }) => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  const bgStyle = isDark ? "bg-dark" : "bg-fade";

  return (
    <div className={`min-h-screen w-full ${bgStyle} relative`}>
      <div className="absolute inset-0 z-0 bg-grid-fade dark:bg-grid-dark" />
      <div className="relative z-1">{children}</div>
    </div>
  );
};

export default BackgroundGradient;
