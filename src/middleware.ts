import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { auth } from "./auth";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ["/dashboard", "/onboarding", "/settings", "/profile"];

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Check if route needs auth protection (across any locale prefix)
  const isProtected = routing.locales.some((locale) =>
    protectedPaths.some((path) =>
      pathname === `/${locale}${path}` || pathname.startsWith(`/${locale}${path}/`)
    )
  );

  if (isProtected) {
    const session = await auth();
    if (!session) {
      const locale =
        routing.locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
        routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/auth/login`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
