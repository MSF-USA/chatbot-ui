import { useSession } from "next-auth/react";
import { useEffect } from "react";
import type { Session } from "next-auth"

     // @ts-ignore
const RefreshTokenHandler = (props) => {
    const { data: session } = useSession();

    useEffect(() => {
        if(!!session) {
           // @ts-ignore
            const timeRemaining = Math.round((((session.accessTokenExpires - 30 * 60 * 1000) - Date.now()) / 1000));
            props.setInterval(timeRemaining > 0 ? timeRemaining : 0);
        }
    }, [session]);

    return null;
}

export default RefreshTokenHandler;