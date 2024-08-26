import {Session} from "next-auth";

const EUVariableMap: any = {
    'AZURE_BLOB_STORAGE_NAME': 'AZURE_BLOB_STORAGE_NAME_EU',
    'AZURE_BLOB_STORAGE_KEY': 'AZURE_BLOB_STORAGE_KEY_EU',
}

/**
 * Fetches the value of a specific environment variable. If the environment variable is not set, it either returns a default value or throws an error based on the flag throwErrorOnFail
 *
 * @param {string} name - The name of the environment variable.
 * @param {boolean} throwErrorOnFail - Flag that decides whether to throw an error or not when the environment variable is not set. Default is true.
 * @param {string} defaultValue - The default value to return when the environment variable is not set and throwErrorOnFail is false. Default is an empty string.
 *
 * @returns {string} - The value of the environment variable if it is set. Throws an error or returns the defaultValue based on the throwErrorOnFail flag if the environment variable is not set.
 *
 * @throws {Error} - Throws an error if the environment variable is not set and the flag throwErrorOnFail is set to true.
 */
export function getEnvVariable(
    name: string,
    throwErrorOnFail: boolean = true,
    defaultValue: string = '',
    user?: Session["user"] | undefined
): string {
    let euUser: boolean = true;
    if (user?.mail && user.mail.toLowerCase()?.indexOf('newyork.msf.org') > -1) {
        euUser = false;
    }

    let value: string | undefined;
    if (!euUser || !EUVariableMap[name]) {
       value = process.env[name];
    } else {
        value = process.env[EUVariableMap[name]]
    }
    if (!value && throwErrorOnFail) {
        throw new Error(`Environment variable ${name} not set`);
    } else if (!value) {
        return defaultValue;
    }
    return value;
}

/**
 * Checks if the current device is a mobile device. The function identifies a mobile device based on the `navigator.userAgent` property.
 *
 * @returns {boolean} - Returns true if the current device is a mobile device. Returns false otherwise. If the function is called in a server-side rendering scenario (where `window` is undefined), the function returns false.
 */
export function isMobile(): boolean {
    if (typeof window === 'undefined') return false; // For SSR
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
