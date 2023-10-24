import NextAuth from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import {JWT} from "next-auth/jwt";

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
    }),
    // ...add more providers here
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({token, user, account, profile, isNewUser}) {
        if (account?.accessToken) {
            token.accessToken = account.accessToken;
        } else if (account?.access_token) {
            token.accessToken = account.access_token;
        }

        return token;
    }
  }
};

export default NextAuth(authOptions);
