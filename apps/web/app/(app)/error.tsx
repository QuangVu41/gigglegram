"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Common.errors");

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 animate-in fade-in zoom-in duration-300">
      <Card className="w-full max-w-md border-none shadow-lg bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {t("somethingWentWrong")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            {error.message ||
              "An unexpected error occurred. Please try again later."}
          </p>
          {error.digest && (
            <p className="mt-2 text-[10px] font-mono text-muted-foreground/50">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button
            onClick={() => reset()}
            className="w-full sm:flex-1 font-semibold"
            variant="default"
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {t("tryAgain")}
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full sm:flex-1 font-semibold"
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              {t("goHome")}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
