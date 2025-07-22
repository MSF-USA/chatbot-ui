import { 
  HttpError, 
  ContentValidation 
} from './security';
import { 
  executeSecureRequest,
  streamResponseContent,
  validateResponseContentType,
  createSecureRequestOptions
} from './networkSecurity';
import { JSDOM } from 'jsdom';

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
 * Sanitize SVG content to remove potential security threats using DOMPurify
 */
function sanitizeSVG(content: string): string {
  // Create JSDOM window for DOMPurify to work in Node.js environment
  const window = new JSDOM('').window;
  // I hate this but can't control how javascript / typescript handles imports in node
  const createDOMPurify = require('dompurify');
  const purify = createDOMPurify(window);
  
  // Configure DOMPurify for SVG sanitization
  const sanitized = purify.sanitize(content, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false
  });
    
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

  // Execute secure request with image-specific headers (includes SSRF protection)
  const { response } = await executeSecureRequest(imageUrl, {
    timeout,
    maxRedirects: MAX_REDIRECTS,
    userAgent: process.env.USER_AGENT ?? 'MSF Assistant Image Fetcher',
    additionalHeaders: {
      'Accept': 'image/*,*/*;q=0.8'
    }
  });

  // Validate image content type
  const contentType = validateResponseContentType(response, {
    allowedTypes: ALLOWED_IMAGE_TYPES,
    contentTypeDescription: 'image'
  });

  // Block SVG if not explicitly allowed
  if (contentType.includes('svg') && !allowSVG) {
    throw new HttpError(
      415,
      'SVG images are not allowed for security reasons'
    );
  }

  // Stream and validate content with size checking
  const buffer = await streamResponseContent(response, maxSize);

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
 * Fetches an image from a given URL and converts it to a Base64 string with comprehensive security measures.
 * 
 * This function now uses secure image fetching with SSRF protection, content validation, and size limits.
 * It maintains backward compatibility with the original API while providing enhanced security.
 *
 * @param imageUrl - The URL of the image to fetch and convert to Base64
 * @param init - Optional RequestInit configuration (mapped to security options)
 * @returns Promise that resolves with the Base64 string of the image
 * @throws Error for various security and validation failures
 *
 * @example
 * const imageBase64 = await getBase64FromImageURL('https://example.com/image.jpg');
 * console.log(imageBase64);
 */
export const getBase64FromImageURL = async (
  imageUrl: string,
  init?: RequestInit | undefined,
): Promise<string> => {
  try {
    // Extract timeout from AbortSignal if available
    let timeout = REQUEST_TIMEOUT;
    if (init?.signal) {
      // Use a reasonable timeout if signal is provided
      timeout = 30000; // 30 seconds default
    }

    // Create secure options from RequestInit, preserving headers
    const secureOptions = createSecureRequestOptions(init, {
      timeout,
      userAgent: process.env.USER_AGENT ?? 'MSF Assistant Image Fetcher',
      additionalHeaders: {
        'Accept': 'image/*,*/*;q=0.8'
      }
    });

    // Execute secure request with custom headers (includes SSRF protection)
    const { response } = await executeSecureRequest(imageUrl, {
      timeout: secureOptions.timeout!,
      maxRedirects: MAX_REDIRECTS,
      userAgent: secureOptions.userAgent!,
      additionalHeaders: secureOptions.additionalHeaders!,
      headers: secureOptions.headers,
      method: secureOptions.method,
      body: secureOptions.body,
      signal: secureOptions.signal
    });

    // Validate image content type
    const contentType = validateResponseContentType(response, {
      allowedTypes: ALLOWED_IMAGE_TYPES,
      contentTypeDescription: 'image'
    });

    // Stream and validate content with size checking
    const buffer = await streamResponseContent(response, MAX_IMAGE_SIZE);

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
    
  } catch (error) {
    // Convert HttpError to generic Error for API compatibility
    if (error instanceof HttpError) {
      throw new Error(`Error fetching the image: ${error.message}`);
    }
    throw new Error(`Error fetching the image: ${error}`);
  }
};
