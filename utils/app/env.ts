import type { Session } from 'next-auth';

const EUVariableMap: any = {
  AZURE_BLOB_STORAGE_NAME: 'AZURE_BLOB_STORAGE_NAME_EU',
  AZURE_BLOB_STORAGE_KEY: 'AZURE_BLOB_STORAGE_KEY_EU',
};

interface EnvVariableOptions {
  name: string;
  throwErrorOnFail?: boolean;
  defaultValue?: string;
  user?: Session['user'] | undefined;
}

/**
 * Fetches the value of a specific environment variable. If the environment variable is not set, it either returns a default value or throws an error based on the flag throwErrorOnFail
 *
 * @param {string | EnvVariableOptions} nameOrOptions - The name of the environment variable or an object containing all options.
 * @param {boolean} [throwErrorOnFail=true] - Flag that decides whether to throw an error or not when the environment variable is not set. Default is true.
 * @param {string} [defaultValue=''] - The default value to return when the environment variable is not set and throwErrorOnFail is false. Default is an empty string.
 * @param {Session["user"] | undefined} [user] - The user session object.
 *
 * @returns {string} - The value of the environment variable if it is set. Throws an error or returns the defaultValue based on the throwErrorOnFail flag if the environment variable is not set.
 *
 * @throws {Error} - Throws an error if the environment variable is not set and the flag throwErrorOnFail is set to true.
 */
export function getEnvVariable(
  nameOrOptions: string | EnvVariableOptions,
  throwErrorOnFail: boolean = true,
  defaultValue: string = '',
  user?: Session['user'] | undefined,
): string {
  let name: string;
  let options: EnvVariableOptions;

  if (typeof nameOrOptions === 'string') {
    name = nameOrOptions;
    options = { name, throwErrorOnFail, defaultValue, user };
  } else {
    options = nameOrOptions;
    name = options.name;
    throwErrorOnFail = options.throwErrorOnFail ?? true;
    defaultValue = options.defaultValue ?? '';
    user = options.user;
  }

  let euUser: boolean = true;
  // Type assertion to access mail property from augmented Session user type
  const userWithMail = user as { mail?: string } | undefined;
  if (userWithMail?.mail && userWithMail.mail.toLowerCase().endsWith('@newyork.msf.org')) {
    euUser = false;
  }

  let value: string | undefined;
  if (!euUser || !EUVariableMap[name]) {
    value = process.env[name];
  } else {
    value = process.env[EUVariableMap[name]];
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
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}
