interface URLValidationOptions {
    /**
     * Allow localhost URLs
     * @default false
     */
    allowLocalhost?: boolean;

    /**
     * Allow IP addresses in URLs
     * @default false
     */
    allowIP?: boolean;

    /**
     * Require HTTPS protocol
     * @default false
     */
    requireHTTPS?: boolean;

    /**
     * Allow specific protocols (e.g., ['http', 'https', 'ftp'])
     * @default ['http', 'https']
     */
    allowedProtocols?: string[];

    /**
     * Maximum length of the entire URL
     * @default 2048
     */
    maxLength?: number;
}

/**
 * Validates if a string is a properly formatted URL
 * @param url - The URL string to validate
 * @param options - Configuration options for URL validation
 * @returns boolean indicating if the URL is valid according to the specified options
 */
export function isValidUrl(url: string, options: URLValidationOptions = {}): boolean {
    const {
        allowLocalhost = false,
        allowIP = false,
        requireHTTPS = false,
        allowedProtocols = ['http', 'https'],
        maxLength = 2048,
    } = options;

    if (!url || typeof url !== 'string') {
        return false;
    }

    if (url.length > maxLength) {
        return false;
    }

    try {
        const urlObject = new URL(url);

        if (!allowedProtocols.includes(urlObject.protocol.slice(0, -1))) {
            return false;
        }

        if (requireHTTPS && urlObject.protocol !== 'https:') {
            return false;
        }

        const hostname = urlObject.hostname;

        if (!allowLocalhost && (hostname === 'localhost' || hostname.endsWith('.localhost'))) {
            return false;
        }

        if (!allowIP && isIPAddress(hostname)) {
            return false;
        }

        return isValidHostname(hostname);
    } catch {
        return false;
    }
}

/**
 * Checks if a hostname is a valid IP address
 * @param hostname - The hostname to check
 * @returns boolean indicating if the hostname is an IP address
 */
function isIPAddress(hostname: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
}

/**
 * Validates a hostname string according to RFC standards
 * @param hostname - The hostname to validate
 * @returns boolean indicating if the hostname is valid
 */
function isValidHostname(hostname: string): boolean {
    // Each label can be alphanumeric, start and end with alphanumeric, and contain hyphens in between
    // Labels are separated by dots, and the entire hostname must be 253 characters or less
    const hostnameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return hostname.length <= 253 && hostnameRegex.test(hostname);
}
