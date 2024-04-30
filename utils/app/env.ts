export function getEnvVariable(
    name: string, throwErrorOnFail: boolean = true,
    defaultValue: string = ''
): string {
    const value = process.env[name];
    if (!value && throwErrorOnFail) {
        throw new Error(`Environment variable ${name} not set`);
    } else if (!value) {
        return defaultValue;
    }
    return value;
}
