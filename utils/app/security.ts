import * as dns from 'dns';
import * as ipaddr from 'ipaddr.js';
import { URL } from 'url';
import { promisify } from 'util';

// Promisified DNS lookup for async operations
export const dnsLookup = promisify(dns.lookup);

/**
 * HTTP Error class for consistent error handling across security utilities
 */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

/**
 * Common security constants
 */
export const SECURITY_CONSTANTS = {
  // Request timeout in milliseconds (30 seconds)
  DEFAULT_REQUEST_TIMEOUT: 30000,
  // Maximum redirects allowed
  MAX_REDIRECTS: 5,
  // Default User-Agent for requests
  DEFAULT_USER_AGENT: process.env.USER_AGENT ?? 'MSF Assistant',
} as const;

/**
 * Check if an IP address is private, localhost, or in a reserved range
 *
 * @param ip - The IP address to check
 * @returns true if the IP is private/localhost/reserved, false otherwise
 */
export function isPrivateOrLocalhost(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);

    // Check if it's localhost
    if (ip === '127.0.0.1' || ip === '::1') {
      return true;
    }

    // Check if it's in private ranges
    if (addr.kind() === 'ipv4') {
      return (
        addr.range() === 'private' ||
        addr.range() === 'loopback' ||
        addr.range() === 'linkLocal'
      );
    } else {
      return (
        addr.range() === 'uniqueLocal' ||
        addr.range() === 'loopback' ||
        addr.range() === 'linkLocal'
      );
    }
  } catch (error) {
    // If parsing fails, assume it's not safe
    return true;
  }
}

/**
 * Check if a URL points to a private network, localhost, or reserved IP ranges
 * This prevents Server-Side Request Forgery (SSRF) attacks
 *
 * @param url - The URL object to validate
 * @returns Promise<boolean> - true if the URL points to a private/unsafe network
 */
export async function isUrlPointingToPrivateNetwork(
  url: URL,
): Promise<boolean> {
  try {
    const hostname = url.hostname;

    // Check if hostname is an IP address
    if (ipaddr.isValid(hostname)) {
      return isPrivateOrLocalhost(hostname);
    }

    // If it's a domain name, resolve it to an IP address
    const { address } = await dnsLookup(hostname);
    return isPrivateOrLocalhost(address);
  } catch (error) {
    // If DNS lookup fails, assume it's not safe
    return true;
  }
}

/**
 * Validate URL format and protocol security
 *
 * @param url - The URL string to validate
 * @returns URL object if valid
 * @throws HttpError if URL is invalid or uses unsupported protocol
 */
export function validateUrlFormat(url: string): URL {
  if (!url || typeof url !== 'string') {
    throw new HttpError(400, 'Invalid URL: URL must be a non-empty string');
  }

  let validatedUrl: URL;
  try {
    validatedUrl = new URL(url);
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      throw new HttpError(
        400,
        'Invalid protocol: Only HTTP and HTTPS protocols are supported',
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(400, 'Invalid URL format: The URL could not be parsed');
  }

  return validatedUrl;
}

/**
 * Perform complete URL security validation (format + SSRF protection)
 *
 * @param url - The URL string to validate
 * @returns Promise<URL> - Validated URL object
 * @throws HttpError if URL is invalid or points to private networks
 */
export async function validateUrlSecurity(url: string): Promise<URL> {
  const validatedUrl = validateUrlFormat(url);

  // SSRF protection - Check if URL points to private network or localhost
  try {
    if (await isUrlPointingToPrivateNetwork(validatedUrl)) {
      throw new HttpError(
        403,
        'Access denied: Cannot access internal or private networks',
      );
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(403, 'Access denied: Cannot verify network safety');
  }

  return validatedUrl;
}

/**
 * Content validation utilities
 */
export const ContentValidation = {
  /**
   * Check if content length exceeds maximum allowed size
   */
  validateContentLength(contentLength: number, maxSize: number): void {
    if (contentLength > maxSize) {
      throw new HttpError(
        413,
        `Content too large: Maximum size is ${maxSize / (1024 * 1024)}MB`,
      );
    }
  },

  /**
   * Check if content type is in the blocked list
   */
  checkBlockedContentTypes(
    contentType: string,
    blockedTypes: Set<string>,
  ): void {
    const lowerContentType = contentType.toLowerCase();
    blockedTypes.forEach((blockedType) => {
      if (lowerContentType.includes(blockedType)) {
        throw new HttpError(
          415,
          `Unsupported media type: ${contentType} is not allowed for security reasons`,
        );
      }
    });
  },

  /**
   * Check if content type is in the allowed list
   */
  checkAllowedContentTypes(
    contentType: string,
    allowedTypes: Set<string>,
  ): void {
    const lowerContentType = contentType.toLowerCase();
    const isAllowed =
      allowedTypes.has(lowerContentType) ||
      Array.from(allowedTypes).some((type) =>
        lowerContentType.startsWith(type.split('/')[0] + '/'),
      );

    if (!isAllowed) {
      throw new HttpError(
        415,
        `Unsupported media type: ${contentType} is not a supported format`,
      );
    }
  },
};

/**
 * Create an abort controller with timeout for request cancellation
 *
 * @param timeout - Timeout in milliseconds
 * @returns Object with controller and cleanup function
 */
export function createTimeoutController(
  timeout: number = SECURITY_CONSTANTS.DEFAULT_REQUEST_TIMEOUT,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return { controller, cleanup };
}

/**
 * Handle abort errors and convert to appropriate HttpError
 *
 * @param error - The error to handle
 * @throws HttpError with appropriate status code
 */
export function handleAbortError(error: any): never {
  if (error instanceof HttpError) {
    throw error;
  }
  if (error?.name === 'AbortError') {
    throw new HttpError(
      408,
      'Request timeout: The request took too long to complete',
    );
  }
  throw new HttpError(500, 'Network error: Request failed');
}
