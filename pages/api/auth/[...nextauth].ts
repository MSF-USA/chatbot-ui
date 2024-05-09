import NextAuth from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import {CustomJWT} from "@/types/jwt";
import {Account} from "@/types/account";
import {CustomSession} from "@/types/session";

export const refreshAccessToken = async (token: CustomJWT | null) => {
  if (!token || !token.refreshToken) {
    return;
  }

  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('client_id', process.env.AZURE_AD_CLIENT_ID || '');
    body.append('client_secret', process.env.AZURE_AD_CLIENT_SECRET || '');
    body.append('refresh_token', token.refreshToken);
    body.append('scope', 'openid User.Read User.ReadBasic.all offline_access');

    const response = await fetch(url, {
        method: 'POST',
        body,
    });
    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token?.refreshToken, // Fall back to old refresh token
    }

  } catch (error) {
    console.log(error)

    return {
      ...token,
      error: "RefreshAccessTokenError"
    }
  }
}


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
      async jwt({token, account}: {token: CustomJWT, account: Account}) {

        if (account) {
          // This will only be executed at login. Each next invocation will skip this part.
          return {
            accessToken: account.access_token,
            accessTokenExpires: account.expires_at * 1000,
            refreshToken: account.refresh_token,
          }
      }
      // Return previous token if the access token has not expired yet
      if (Date.now() < token.accessTokenExpires) {
        return token
      }

      return refreshAccessToken(token);
    },
    async session({session, token}: {session: CustomSession, token: CustomJWT}) {
      if (token) {
        session.accessToken = token.accessToken;
        session.accessTokenExpires = token.accessTokenExpires;
        session.error = token.error;
      }

      return session;
    }
  }
};

//@ts-ignore
export default NextAuth(authOptions);
