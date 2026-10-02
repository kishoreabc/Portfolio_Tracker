import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      canTogglePrivacy?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    canTogglePrivacy?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    canTogglePrivacy?: boolean;
  }
}
