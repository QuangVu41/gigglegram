import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { authClient } from "@/lib/auth/auth-client";
import { API_AUTH_PREFIX, AUTH_ROUTES, DEFAULT_LOGIN_REDIRECT } from "@/constants/routes";

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const session = await authClient.getSession({ fetchOptions: { headers: await headers() } });

  const isAuthRoute = AUTH_ROUTES.some((route) => nextUrl.pathname.includes(route));
  const isApiAuthRoute = nextUrl.pathname.startsWith(API_AUTH_PREFIX);

  if (isApiAuthRoute) return NextResponse.next();

  if (isAuthRoute) {
    if (session.data) return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl.origin));
    return NextResponse.next();
  }

  if (!session.data) {
    let callBackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callBackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callBackUrl);
    return NextResponse.redirect(new URL(`/accounts/login?callbackURL=${encodedCallbackUrl}`, nextUrl.origin));
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
