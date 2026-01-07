import { NextIntlClientProvider } from "next-intl";
import { Roboto } from "next/font/google";
import { ThemeProvider } from "@/components/common/theme-provider";
import BackgroundGradient from "@/components/common/backgroud-gradient";
import { Suspense } from "react";
import LogoLoading from "./logo-loading";
import { Toaster } from "@/components/ui/sonner";

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

const LayoutTemplate = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en" className={`${roboto.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <BackgroundGradient>
            <Suspense fallback={<LogoLoading />}>
              <NextIntlClientProvider>
                {children}
                <Toaster richColors closeButton position="top-right" />
              </NextIntlClientProvider>
            </Suspense>
          </BackgroundGradient>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default LayoutTemplate;
