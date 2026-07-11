import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

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
    maxAge: 3600, // 1 hour
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
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
      const isLoggedIn = !!auth?.user;
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
