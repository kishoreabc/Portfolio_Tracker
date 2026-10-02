import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { recordUserLogin, isAllowedEmail } from '@/lib/auth/user-logins';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  events: {
    async signIn({ user, account }) {
      if (user?.email) {
        await recordUserLogin({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account?.provider || 'google',
        });
      }
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || user.email;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      token.canTogglePrivacy = isAllowedEmail(token.email as string);
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || (token.email as string) || 'user';
        session.user.canTogglePrivacy = Boolean(token.canTogglePrivacy);
      }
      return session;
    },
    async signIn({ user }) {
      // Any authenticated user can log in
      return true;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user && Object.keys(auth.user).length > 0;
      const pathname = nextUrl.pathname;

      // Protected private application routes that strictly require authentication
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

      // Public API endpoints that do not require authentication
      const isPublicApiRoute =
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/market-data') ||
        pathname.startsWith('/api/v1') ||
        pathname.startsWith('/api/mcp') ||
        pathname.startsWith('/api/openapi') ||
        pathname === '/api/news/sync/cron';

      if (isLoggedIn) {
        if (pathname.startsWith('/login')) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      // If user is not logged in and tries to access a protected app route -> redirect to login
      if (isProtectedAppRoute) {
        const loginUrl = new URL('/login', nextUrl);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return Response.redirect(loginUrl);
      }

      // If accessing an API route that is not public -> return structured JSON 401
      if (pathname.startsWith('/api/')) {
        if (isPublicApiRoute) return true;
        return Response.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required to access this API resource.',
              resolution_hint: 'Provide a valid session or API key. For public endpoints, visit /developers or /openapi.json.',
            },
            code: 'UNAUTHORIZED',
            message: 'Authentication required to access this API resource.',
            resolution_hint: 'Provide a valid session or API key. For public endpoints, visit /developers or /openapi.json.',
          },
          { status: 401, headers: { 'Cache-Control': 'no-store' } }
        );
      }

      // All other routes (homepage, login, about, contact, privacy, developers, docs, static assets, sitemap, robots, openapi, llms, mcp, and unknown routes for 404 handling)
      return true;
    },
  },
});
