import NextAuth, { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    accessTokenExpires: number;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    accessTokenExpires: number;
    refreshToken?: string;
    error?: string;
  }
}

interface UserData {
  id: string;
  givenName: string;
  surname: string;
  displayName: string;
  jobTitle?: string;
  department?: string;
  mail?: string;
  companyName?: string;
}

const refreshAccessToken = async (token: JWT): Promise<JWT> => {
  if (!token.refreshToken) {
    return { ...token, error: 'RefreshTokenMissing' };
  }

  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;

    const formData = {
      grant_type: 'refresh_token',
      client_id: process.env.AZURE_CLIENT_ID || '',
      client_secret: process.env.AZURE_CLIENT_SECRET || '',
      refresh_token: token.refreshToken,
      scope: 'openid User.Read User.ReadBasic.all offline_access',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString(),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw new Error(
        refreshedTokens.error_description || 'Failed to refresh token',
      );
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
};

async function fetchUserData(accessToken: string): Promise<UserData> {
  const selectProperties = `id,userPrincipalName,displayName,givenName,surname,department,jobTitle,mail,companyName`;
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me?$select=${selectProperties}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch user data: ${response.statusText}`);
  }

  const userData = await response.json();
  return {
    id: userData.id,
    givenName: userData.givenName,
    surname: userData.surname,
    displayName: userData.displayName,
    jobTitle: userData.jobTitle,
    department: userData.department,
    mail: userData.mail,
    companyName: userData.companyName,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_CLIENT_SECRET || '',
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: 'openid User.Read User.ReadBasic.all offline_access',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
    error: '/auth-error',
  },
  callbacks: {
    async jwt({ token, account }): Promise<JWT> {
      // Initial sign in - store tokens
      if (account) {
        return {
          ...token,
          accessToken: account.access_token!,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 24 * 60 * 60 * 1000,
          refreshToken: account.refresh_token,
          error: undefined,
        };
      }

      // Token is still valid - return as-is
      // Refresh proactively 5 minutes before expiry to prevent API failures
      const FIVE_MINUTES_IN_MS = 5 * 60 * 1000;
      if (Date.now() < token.accessTokenExpires - FIVE_MINUTES_IN_MS) {
        return token;
      }

      // Token is expired or will expire soon - refresh it
      return refreshAccessToken(token);
    },
    async session({ session, token }): Promise<Session> {
      // If token refresh failed, pass error to session
      if (token.error) {
        return {
          ...session,
          accessToken: token.accessToken,
          accessTokenExpires: token.accessTokenExpires,
          error: token.error,
          expires: session.expires,
        };
      }

      try {
        const userData = await fetchUserData(token.accessToken);

        return {
          ...session,
          user: userData,
          accessToken: token.accessToken,
          accessTokenExpires: token.accessTokenExpires,
          error: undefined,
          expires: session.expires,
        };
      } catch (error) {
        // If fetching user data fails, pass error to session
        console.error('Failed to fetch user data:', error);
        return {
          ...session,
          accessToken: token.accessToken,
          accessTokenExpires: token.accessTokenExpires,
          error: 'UserDataFetchError',
          expires: session.expires,
        };
      }
    },
  },
});
