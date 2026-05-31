import { NextRequest, NextResponse } from "next/server";
import { authClient } from "@/lib/auth/auth-client";
import { API_AUTH_PREFIX, AUTH_ROUTES, DEFAULT_LOGIN_REDIRECT, PUBLIC_API_PREFIXES } from "@/constants/routes";
import { cookies } from "next/headers";

export async function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const isApiAuthRoute = nextUrl.pathname.startsWith(API_AUTH_PREFIX);
  const isPublicApiRoute = PUBLIC_API_PREFIXES.some((prefix) => nextUrl.pathname.startsWith(prefix));

  if (isApiAuthRoute || isPublicApiRoute) return NextResponse.next();

  const session = await authClient.getSession({
    fetchOptions: { headers: req.headers },
  });
  const isAuthRoute = AUTH_ROUTES.some((route) => nextUrl.pathname.startsWith(route));

  if (isAuthRoute) {
    if (session.data) return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, nextUrl.origin));
    return NextResponse.next();
  }

  if (!session.data && session.error?.status === 429) {
    const cookieStore = await cookies();
    const baCookie = cookieStore.get("better-auth.session_token");
    if (baCookie) return NextResponse.next();
  }

  if (!session.data && session.error?.status !== 429) {
    let callBackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callBackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callBackUrl);
    return NextResponse.redirect(new URL(`/accounts/login?callbackURL=${encodedCallbackUrl}`, nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    // "/(api|trpc)(.*)",
  ],
};
