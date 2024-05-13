import NextAuth from "next-auth"

declare module "next-auth" {

  interface Session {
    user: {
        givenName: string;
        surName: string;
        displayName: string;
        jobTitle?: string;
        department?: string;
        mail?: string;
    },
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