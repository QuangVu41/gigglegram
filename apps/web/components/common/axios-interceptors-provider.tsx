"use client";

import { setupAxiosInterceptors } from "@/lib/axios-config";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

interface AxiosInterceptorsProviderProps {
  children: React.ReactNode;
}

const AxiosInterceptorsProvider = ({
  children,
}: AxiosInterceptorsProviderProps) => {
  const t = useTranslations("SystemWideErrorCodes");

  useEffect(() => {
    setupAxiosInterceptors(t);
  }, [t]);

  return children;
};

export default AxiosInterceptorsProvider;
