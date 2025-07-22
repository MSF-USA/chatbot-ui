import * as dns from 'dns';
import * as ipaddr from 'ipaddr.js';
import { URL } from 'url';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

/**
 * HTTP Error class for consistent error handling
 */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

// Security Configuration
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon'
]);

// Maximum image file size (50MB - larger than webpage limit for high-res images)
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;

// Maximum image dimensions to prevent image bombs
const MAX_IMAGE_DIMENSION = 10000;

// Request timeout (30 seconds)
const REQUEST_TIMEOUT = 30000;

// Maximum redirects
const MAX_REDIRECTS = 5;

/**
 * Check if an IP address is private or localhost
 */
function isPrivateOrLocalhost(ip: string): boolean {
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
 * Check if URL points to private network or localhost
 */
async function isUrlPointingToPrivateNetwork(url: URL): Promise<boolean> {
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
 * Validate image format using magic bytes (file signatures)
 */
function validateImageFormat(buffer: Buffer, contentType: string): boolean {
  if (buffer.length < 16) return false;

  const magicBytes = buffer.subarray(0, 16);
  
  // JPEG: FF D8 FF
  if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
    return contentType.includes('jpeg') || contentType.includes('jpg');
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && 
      magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
    return contentType.includes('png');
  }
  
  // GIF: 47 49 46 38 (GIF8)
  if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && 
      magicBytes[2] === 0x46 && magicBytes[3] === 0x38) {
    return contentType.includes('gif');
  }
  
  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  if (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && 
      magicBytes[2] === 0x46 && magicBytes[3] === 0x46 &&
      magicBytes[8] === 0x57 && magicBytes[9] === 0x45 && 
      magicBytes[10] === 0x42 && magicBytes[11] === 0x50) {
    return contentType.includes('webp');
  }
  
  // BMP: 42 4D
  if (magicBytes[0] === 0x42 && magicBytes[1] === 0x4D) {
    return contentType.includes('bmp');
  }
  
  // ICO: 00 00 01 00
  if (magicBytes[0] === 0x00 && magicBytes[1] === 0x00 && 
      magicBytes[2] === 0x01 && magicBytes[3] === 0x00) {
    return contentType.includes('icon') || contentType.includes('x-icon');
  }
  
  // TIFF: 49 49 2A 00 or 4D 4D 00 2A
  if ((magicBytes[0] === 0x49 && magicBytes[1] === 0x49 && magicBytes[2] === 0x2A) ||
      (magicBytes[0] === 0x4D && magicBytes[1] === 0x4D && magicBytes[2] === 0x00)) {
    return contentType.includes('tiff');
  }
  
  // SVG: Look for SVG tag (less reliable but necessary)
  const textStart = buffer.toString('utf8', 0, Math.min(100, buffer.length)).toLowerCase();
  if (textStart.includes('<svg') || textStart.includes('<?xml')) {
    return contentType.includes('svg');
  }
  
  return false;
}

/**
 * Sanitize SVG content to remove potential security threats
 */
function sanitizeSVG(content: string): string {
  // Remove script tags and event handlers
  let sanitized = content
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<foreignObject[^>]*>.*?<\/foreignObject>/gis, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
    .replace(/<object[^>]*>.*?<\/object>/gis, '')
    .replace(/<embed[^>]*>/gi, '');
    
  return sanitized;
}

/**
 * Secure image fetching function with comprehensive security measures
 * 
 * @param imageUrl - The URL of the image to fetch
 * @param options - Optional configuration for security and processing
 * @returns Promise that resolves with the Base64 string of the image
 * @throws HttpError for various security and validation failures
 */
export const getSecureBase64FromImageURL = async (
  imageUrl: string,
  options: {
    stripMetadata?: boolean;
    maxSize?: number;
    timeout?: number;
    allowSVG?: boolean;
  } = {}
): Promise<string> => {
  const { 
    stripMetadata = false, 
    maxSize = MAX_IMAGE_SIZE, 
    timeout = REQUEST_TIMEOUT,
    allowSVG = true 
  } = options;

  // Validate URL format and protocol
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new HttpError(400, 'Invalid URL: URL must be a non-empty string');
  }

  let validatedUrl: URL;
  try {
    validatedUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      throw new HttpError(
        400,
        'Invalid protocol: Only HTTP and HTTPS protocols are supported'
      );
    }
  } catch {
    throw new HttpError(400, 'Invalid URL format: The URL could not be parsed');
  }

  // SSRF protection - Check if URL points to private network or localhost
  try {
    if (await isUrlPointingToPrivateNetwork(validatedUrl)) {
      throw new HttpError(
        403,
        'Access denied: Cannot access internal or private networks'
      );
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(403, 'Access denied: Cannot verify network safety');
  }

  // Set up abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response: Response | null = null;
  let redirectCount = 0;
  let currentUrl = validatedUrl.toString();

  try {
    // Handle redirects manually for security validation
    while (redirectCount < MAX_REDIRECTS) {
      try {
        response = await fetch(currentUrl, {
          headers: {
            'User-Agent': process.env.USER_AGENT ?? 'MSF Assistant Image Fetcher',
            'Accept': 'image/*,*/*;q=0.8'
          },
          redirect: 'manual',
          signal: controller.signal,
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            throw new HttpError(
              response.status,
              'Redirect error: Location header not provided'
            );
          }

          // Create new URL object for the redirect
          const redirectUrl = new URL(location, currentUrl);

          // SSRF protection for redirects
          if (await isUrlPointingToPrivateNetwork(redirectUrl)) {
            throw new HttpError(
              403,
              'Access denied: Redirect to internal or private network not allowed'
            );
          }

          currentUrl = redirectUrl.toString();
          redirectCount++;
        } else {
          break;
        }
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        if ((error as Error).name === 'AbortError') {
          throw new HttpError(
            408,
            'Request timeout: The request took too long to complete'
          );
        }
        throw new HttpError(500, 'Network error: Failed to fetch the image');
      }
    }

    if (redirectCount >= MAX_REDIRECTS) {
      throw new HttpError(
        429,
        'Too many redirects: Maximum redirect limit reached'
      );
    }

    if (!response) {
      throw new HttpError(
        500,
        'No response: Failed to get any response from the server'
      );
    }

    if (!response.ok) {
      throw new HttpError(
        response.status,
        `Server error: The server returned status code ${response.status}`
      );
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Validate Content-Type
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  
  if (!ALLOWED_IMAGE_TYPES.has(contentType) && !contentType.startsWith('image/')) {
    throw new HttpError(
      415,
      `Unsupported media type: ${contentType} is not a valid image format`
    );
  }

  // Block SVG if not explicitly allowed
  if (contentType.includes('svg') && !allowSVG) {
    throw new HttpError(
      415,
      'SVG images are not allowed for security reasons'
    );
  }

  // Check content length before processing
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  if (contentLength > 0 && contentLength > maxSize) {
    throw new HttpError(
      413,
      `Image too large: Maximum size is ${maxSize / (1024 * 1024)}MB`
    );
  }

  // Stream and validate content
  const chunks: Buffer[] = [];
  let receivedLength = 0;
  
  if (!response.body) {
    throw new HttpError(500, 'Failed to read response body');
  }

  // Read response body with size checking
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = Buffer.from(value);
      chunks.push(chunk);
      receivedLength += chunk.length;

      if (receivedLength > maxSize) {
        throw new HttpError(
          413,
          `Image too large: Maximum size is ${maxSize / (1024 * 1024)}MB`
        );
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Combine all chunks
  const buffer = Buffer.concat(chunks);

  // Validate actual image format matches Content-Type
  if (!validateImageFormat(buffer, contentType)) {
    throw new HttpError(
      415,
      'Invalid image: File format does not match Content-Type header'
    );
  }

  // Special handling for SVG
  if (contentType.includes('svg')) {
    let svgContent = buffer.toString('utf8');
    svgContent = sanitizeSVG(svgContent);
    return Buffer.from(svgContent).toString('base64');
  }

  // For other image formats, return base64 directly
  return buffer.toString('base64');
};

/**
 * This function fetches an image from a given URL and converts it to a Base64 string.
 *
 * @deprecated Use getSecureBase64FromImageURL for enhanced security
 * 
 * The function first makes a fetch request to the given `imageUrl`. If the response is not OK (HTTP status code not in the range 200-299), it throws an error.
 * If the request is successful, it attempts to create a buffer from the array buffer of the response body. This operation can be more efficient if running server-side.
 * If creating the buffer operation fails for any reason, the function falls back to a less efficient but more compatible method. It creates a new Uint8Array out of the response array buffer and converts it to a string.
 *
 * If there are any errors during these processes, it throws an error with a relevant message.
 *
 * @async
 * @param {string} imageUrl - The URL of the image to fetch and convert to Base64.
 * @return {Promise<string>} A promise that resolves with the Base64 string of the image.
 *
 * @throws {Error} If the network response is not OK or if there is an error during the fetch request or the Buffer/arrayBuffer creation
 *
 * @example
 *
 * const imageBase64 = await getBase64FromImageURL('https://example.com/image.jpg');
 * console.log(imageBase64);
 */
export const getBase64FromImageURL = async (
  imageUrl: string,
  init?: RequestInit | undefined,
): Promise<string> => {
  try {
    const response = await fetch(imageUrl, init);

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    try {
      // More efficient server-side method
      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer.toString();
    } catch (bufferError) {
      // less efficient, client-side compatible method
      const arrayBuffer = await response.arrayBuffer();
      // @ts-ignore
      return String.fromCharCode(...new Uint8Array(arrayBuffer));
    }
  } catch (error) {
    throw new Error(`Error fetching the image: ${error}`);
  }
};
