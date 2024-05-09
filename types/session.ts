import { Session } from 'next-auth';

export interface CustomSession extends Session {
    expires: string,
    accessToken: string,
    accessTokenExpires: number,
    error?: string,
  }
