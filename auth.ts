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
    maxAge: 3600, // 1 hour
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign-in, user is defined
      if (user) {
        token.id = user.id || user.email || 'test-user';
        token.loginTime = Date.now();
        
        // Initialize global store if needed
        if (!(globalThis as any).activeSessions) {
          (globalThis as any).activeSessions = {};
        }
        // Record the latest login time for this user
        (globalThis as any).activeSessions[token.id as string] = token.loginTime;
      }

      // Check if this token is from an older session
      if (token.id && token.loginTime) {
        const latestLogin = (globalThis as any).activeSessions?.[token.id as string];
        if (latestLogin && (token.loginTime as number) < latestLogin) {
          // Invalidate token by returning empty
          return {} as any;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && Object.keys(token).length > 0) {
        if (session.user) {
          (session.user as any).id = token.id;
        }
      } else {
        // If token was cleared (invalidated), remove the user from session
        (session as any).user = null;
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
      const isPublicPath =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/api/auth') ||
        nextUrl.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico)$/) ||
        nextUrl.pathname.startsWith('/_next/');

      if (isLoggedIn) {
        if (nextUrl.pathname.startsWith('/login')) {
          return Response.redirect(new URL('/', nextUrl));
        }
        return true;
      }

      if (isPublicPath) return true;

      // Redirect to login if not logged in and not on a public path
      return false;
    },
  },
});
