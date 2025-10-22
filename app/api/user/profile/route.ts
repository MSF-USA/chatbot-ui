import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';

/**
 * GET /api/user/profile
 * Fetches full user profile data from Microsoft Graph
 * This endpoint is called on-demand to avoid bloating the session cookie
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get access token from JWT (not stored in session to keep cookies small)
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    });

    if (!token?.accessToken) {
      return NextResponse.json({ error: 'No access token' }, { status: 401 });
    }

    // Fetch full user data from Microsoft Graph
    const selectProperties = `id,userPrincipalName,displayName,givenName,surname,department,jobTitle,mail,companyName`;
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me?$select=${selectProperties}`,
      {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          'Content-type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.statusText}`);
    }

    const userData = await response.json();

    // Fetch user photo (optional - may not exist for all users)
    let photoUrl = null;
    try {
      const photoResponse = await fetch(
        'https://graph.microsoft.com/v1.0/me/photo/$value',
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
          },
        },
      );

      if (photoResponse.ok) {
        const photoBlob = await photoResponse.arrayBuffer();
        const photoBase64 = Buffer.from(photoBlob).toString('base64');
        const contentType =
          photoResponse.headers.get('content-type') || 'image/jpeg';
        photoUrl = `data:${contentType};base64,${photoBase64}`;
      }
    } catch (photoError) {
      // Photo is optional - don't fail if it doesn't exist
      console.log('User photo not available');
    }

    return NextResponse.json({
      ...userData,
      photoUrl,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 },
    );
  }
}
