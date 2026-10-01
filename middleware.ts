import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getMarkdownForPath, MARKDOWN_PAGES } from "@/lib/markdownContent";

export default auth((req) => {
  const acceptHeader = req.headers.get('accept') || '';
  const pathname = req.nextUrl.pathname;

  // Handle Accept: text/markdown content negotiation (acceptmarkdown.com)
  if (acceptHeader.includes('text/markdown')) {
    const md = getMarkdownForPath(pathname);
    if (md) {
      return new NextResponse(md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept, Accept-Encoding',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
      });
    }

    // Check if path is known or a 404
    const knownPaths = [
      '/', '/login', '/about', '/contact', '/privacy', '/developers', '/docs',
      '/portfolio', '/stocks', '/bonds', '/cashflow', '/calendar', '/analytics',
      '/reports', '/insights', '/news', '/sitemap.xml', '/robots.txt',
      '/openapi.json', '/openapi.yaml', '/llms.txt', '/llms-full.txt'
    ];
    const isKnownPath = knownPaths.some(
      (p) => pathname === p || pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/.well-known/')
    );

    if (!isKnownPath) {
      return new NextResponse(MARKDOWN_PAGES['404'], {
        status: 404,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Vary': 'Accept, Accept-Encoding',
          'Cache-Control': 'no-store',
        },
      });
    }
  }

  // ── Authentication Protection ───────────────────────────────────────────────
  const isLoggedIn = !!req.auth?.user && Object.keys(req.auth.user).length > 0;

  const protectedAppRoutes = [
    '/portfolio',
    '/stocks',
    '/bonds',
    '/cashflow',
    '/calendar',
    '/analytics',
    '/reports',
    '/insights',
    '/news',
  ];

  const isProtectedAppRoute = protectedAppRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  // If user is not logged in and tries to access a protected app route -> redirect to /login
  if (!isLoggedIn && isProtectedAppRoute) {
    const loginUrl = new URL('/login', req.nextUrl);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already logged in and visits /login -> redirect to /
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // If accessing a protected API route while unauthenticated -> 401 JSON
  const isPublicApiRoute =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/market-data') ||
    pathname.startsWith('/api/v1') ||
    pathname.startsWith('/api/mcp') ||
    pathname.startsWith('/api/openapi') ||
    pathname === '/api/news/sync/cron';

  if (!isLoggedIn && pathname.startsWith('/api/') && !isPublicApiRoute) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to access this API resource.',
          resolution_hint: 'Provide a valid session or API key. For public endpoints, visit /developers or /openapi.json.',
        },
        code: 'UNAUTHORIZED',
        message: 'Authentication required to access this API resource.',
      },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const response = NextResponse.next();
  response.headers.set('Vary', 'Accept, Accept-Encoding');
  return response;
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
