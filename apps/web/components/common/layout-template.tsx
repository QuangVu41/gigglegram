import { NextIntlClientProvider } from "next-intl";
import { Roboto, Dancing_Script } from "next/font/google";
import { ThemeProvider } from "@/components/common/theme-provider";
import BackgroundGradient from "@/components/common/backgroud-gradient";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import LogoLoading from "@/components/common/logo-loading";
import AxiosInterceptorsProvider from "@/components/common/axios-interceptors-provider";
import TanstackQueryProvider from "@/components/common/tanstack-query-provider";
import { SocketProvider } from "@/components/common/socket-provider";

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

const dancingScript = Dancing_Script({
  weight: ["400", "700"],
  subsets: ["vietnamese", "latin"],
  display: "swap",
  variable: "--font-dancing-script",
});

const LayoutTemplate = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${dancingScript.variable}`}
      suppressHydrationWarning
    >
      <body className="mb-16 md:mb-0">
        <TanstackQueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <BackgroundGradient>
              <Suspense fallback={<LogoLoading />}>
                <NextIntlClientProvider>
                  <AxiosInterceptorsProvider>
                    <SocketProvider>{children}</SocketProvider>
                  </AxiosInterceptorsProvider>
                  <Toaster richColors closeButton position="top-right" />
                </NextIntlClientProvider>
              </Suspense>
            </BackgroundGradient>
          </ThemeProvider>
        </TanstackQueryProvider>
      </body>
    </html>
  );
};

export default LayoutTemplate;
