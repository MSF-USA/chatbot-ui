// @ts-ignore
import {JWT} from "next-auth/jwt";

export interface CustomJWT extends JWT {
    accessToken: string;
    refreshToken: string;
    userId: string;
}
