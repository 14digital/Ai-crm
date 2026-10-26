import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

// Middleware uses auth.config.ts (NO Prisma import = Edge Runtime safe)
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Public routes
  const publicRoutes = ["/login", "/signup", "/api/signup", "/magic", "/api/auth", "/api/webhook", "/api/external", "/privacy-policy", "/terms"];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  // If not logged in, redirect to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin routes protection
  const adminPages = ["/dashboard", "/team", "/conversations", "/queue", "/bot-config", "/templates", "/analytics"];
  if (adminPages.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/inbox", req.url));
    }
  }

  // Admin API protection
  if (pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|icon\\.png|logo\\.png|logo\\.svg|sidebarLogo\\.svg|sidebarLogoDark\\.svg|icon-192\\.png|sw\\.js|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.ico$|.*\\.webp$|.*\\.gif$|.*\\.woff$|.*\\.woff2$|.*\\.ttf$|.*\\.css$|.*\\.js$).*)",
  ],
};
