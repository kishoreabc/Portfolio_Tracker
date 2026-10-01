import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

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
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const validUsername = process.env.LOGIN_USERNAME;
        const validPassword = process.env.LOGIN_PASSWORD;
        
        if (credentials?.username === validUsername && credentials?.password === validPassword) {
          return { id: 'test-user', name: 'Test User', email: 'test@example.com' };
        }
        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id || user.email || 'test-user';
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'credentials') {
        return true;
      }
      
      const allowedEmailsStr = process.env.ALLOWED_EMAILS;
      if (allowedEmailsStr) {
        const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());
        if (user.email && allowedEmails.includes(user.email.toLowerCase())) {
          return true;
        }
        return false; // Deny access
      }
      return true; // Allow all if ALLOWED_EMAILS is not configured
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
