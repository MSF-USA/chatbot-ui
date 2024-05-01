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
      authorization: {
          params: {
              scope: "openid User.Read User.ReadBasic.all offline_access",
          }
        }

    }),
    // ...add more providers here
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
      // @ts-ignore
      async jwt({token, user, account, profile, isNewUser}) {
        if (account?.access_token) {
            token.accessToken = account?.access_token;
        } else if (token?.accessToken) {
            token.accessToken = token?.accessToken;
        }

        if (account?.refresh_token) {
            token.refreshToken = account?.refresh_token;
        } else if (token?.refreshToken) {
            token.refreshToken = token?.refreshToken;
        }

        if (user?.id)
            token.userId = user.id

        return token;
    }
  }
};

//@ts-ignore
export default NextAuth(authOptions);
