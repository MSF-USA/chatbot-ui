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
    accessToken?: string; // Not stored to reduce cookie size - fetched on-demand
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
      // Disable PKCE since Azure Container Apps ingress truncates the cookies
      checks: ['state'],
    }),
  ],
  pages: {
    signIn: '/signin',
    error: '/auth-error',
  },
  callbacks: {
    async jwt({ token, account }): Promise<JWT> {
      // Initial sign in - store tokens and use data from OAuth flow
      if (account) {
        // Only store refresh token to reduce cookie size
        // Access token will be fetched on-demand when needed
        return {
          ...token,
          // Don't store access token - cuts cookie size in half!
          // accessToken: account.access_token!,
          accessTokenExpires: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 24 * 60 * 60 * 1000,
          refreshToken: account.refresh_token,
          error: undefined,
          // Store minimal user data from OAuth token (avoids API calls on every request)
          userId: token.sub || '', // sub is the user's unique ID from OAuth
          userDisplayName: token.name || '',
          userMail: token.email || undefined,
        };
      }

      // For JWT strategy, we don't need to refresh tokens here
      // They'll be refreshed on-demand when needed
      return token;
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
