import {JWT} from "next-auth/jwt";
import {CustomJWT} from "@/types/jwt";

export const refreshAccessToken = async (token: CustomJWT | null) => {
    if (!token || !token.refreshToken) {
        return;
    }

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
    const data = await response.json()

    token.accessToken = data.access_token;
    token.refreshToken = data.refresh_token;

    return data;
}
