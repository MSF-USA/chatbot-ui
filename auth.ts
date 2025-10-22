import NextAuth, { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

declare module 'next-auth' {
  interface User {
    id: string;
    displayName: string;
    givenName?: string;
    surname?: string;
    mail?: string;
    jobTitle?: string;
    department?: string;
    companyName?: string;
  }

  interface Session {
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    accessTokenExpires: number;
    refreshToken?: string;
    error?: string;
    // Store minimal user data in JWT to avoid API calls on every request
    userId?: string;
    userDisplayName?: string;
    userMail?: string;
  }
}

interface UserData {
  id: string;
  givenName?: string;
  surname?: string;
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
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60, // 12 hours (reduced from default 30 days)
    updateAge: 60 * 60, // Update session every 1 hour
  },
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
      // Initial sign in - store tokens and fetch user data ONCE
      if (account) {
        try {
          const userData = await fetchUserData(account.access_token!);
          return {
            ...token,
            accessToken: account.access_token!,
            accessTokenExpires: account.expires_at
              ? account.expires_at * 1000
              : Date.now() + 24 * 60 * 60 * 1000,
            refreshToken: account.refresh_token,
            error: undefined,
            // Store minimal user data in JWT to avoid fetching on every request
            userId: userData.id,
            userDisplayName: userData.displayName,
            userMail: userData.mail,
          };
        } catch (error) {
          console.error('Failed to fetch user data during login:', error);
          return {
            ...token,
            accessToken: account.access_token!,
            accessTokenExpires: account.expires_at
              ? account.expires_at * 1000
              : Date.now() + 24 * 60 * 60 * 1000,
            refreshToken: account.refresh_token,
            error: 'UserDataFetchError',
          };
        }
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
      // Pass through user data from JWT (no API calls on every request!)
      // Full user data can be fetched on-demand via /api/user/profile
      return {
        ...session,
        user: {
          id: token.userId || '',
          displayName: token.userDisplayName || '',
          mail: token.userMail,
        } as Session['user'],
        error: token.error,
        expires: session.expires,
      };
    },
  },
});
