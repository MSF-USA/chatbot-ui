import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      givenName: string;
      surname: string;
      displayName: string;
      jobTitle?: string;
      department?: string;
      mail?: string;
      companyName?: string;
    };
    error?: string;
    accessToken: string;
    accessTokenExpires: number;
  }

  interface JWT {
    accessToken: string;
    refreshToken?: string;
    accessTokenExpires: number;
    error?: string;
  }
}
