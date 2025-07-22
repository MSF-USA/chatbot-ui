import { URL } from 'url';
import { 
  HttpError, 
  SECURITY_CONSTANTS, 
  isUrlPointingToPrivateNetwork,
  createTimeoutController,
  handleAbortError
} from './security';

/**
 * Configuration options for secure network requests
 */
export interface SecureRequestOptions {
  timeout?: number;
  maxRedirects?: number;
  userAgent?: string;
  additionalHeaders?: Record<string, string>;
}

/**
 * Result of a secure network request
 */
export interface SecureRequestResult {
  response: Response;
  finalUrl: string;
  redirectCount: number;
}

/**
 * Handle secure redirects with SSRF protection
 * 
 * @param initialUrl - The initial URL to fetch
 * @param options - Request configuration options
 * @returns Promise<SecureRequestResult> - The final response and metadata
 * @throws HttpError for various security and network failures
 */
export async function executeSecureRequest(
  initialUrl: string | URL,
  options: SecureRequestOptions & { 
    headers?: Record<string, string>;
    method?: string;
    body?: any;
    signal?: AbortSignal;
  } = {}
): Promise<SecureRequestResult> {
  const {
    timeout = SECURITY_CONSTANTS.DEFAULT_REQUEST_TIMEOUT,
    maxRedirects = SECURITY_CONSTANTS.MAX_REDIRECTS,
    userAgent = SECURITY_CONSTANTS.DEFAULT_USER_AGENT,
    additionalHeaders = {},
    headers = {},
    method = 'GET',
    body,
    signal: externalSignal
  } = options;

  let response: Response | null = null;
  let redirectCount = 0;
  let currentUrl = typeof initialUrl === 'string' ? initialUrl : initialUrl.toString();

  // Create timeout controller, but respect external signal if provided
  const { controller: timeoutController, cleanup } = createTimeoutController(timeout);
  
  // Combine external signal with timeout signal
  let effectiveSignal: AbortSignal;
  if (externalSignal && !externalSignal.aborted) {
    // If external signal exists and not aborted, create combined signal
    effectiveSignal = externalSignal;
    // Set up timeout that respects external signal
    const timeoutId = setTimeout(() => {
      if (!externalSignal.aborted) {
        timeoutController.abort();
      }
    }, timeout);
    
    // Clean up timeout when external signal aborts
    externalSignal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      cleanup();
    });
  } else {
    effectiveSignal = timeoutController.signal;
  }

  try {
    // Handle redirects manually for security validation
    while (redirectCount < maxRedirects) {
      try {
        const requestHeaders = {
          'User-Agent': userAgent,
          ...additionalHeaders,
          ...headers,
        };

        response = await fetch(currentUrl, {
          method,
          headers: requestHeaders,
          redirect: 'manual',
          signal: effectiveSignal,
          ...(body && { body }),
        });

        // Handle redirects
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
        handleAbortError(error);
      }
    }

    if (redirectCount >= maxRedirects) {
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

    return {
      response,
      finalUrl: currentUrl,
      redirectCount
    };

  } finally {
    cleanup();
  }
}

/**
 * Stream content from a response with size validation
 * 
 * @param response - The response to stream
 * @param maxSize - Maximum allowed content size in bytes
 * @returns Promise<Buffer> - The content as a buffer
 * @throws HttpError if content exceeds size limits
 */
export async function streamResponseContent(
  response: Response,
  maxSize: number
): Promise<Buffer> {
  if (!response.body) {
    throw new HttpError(500, 'Failed to read response body');
  }

  const chunks: Buffer[] = [];
  let receivedLength = 0;

  // Check content length header if available
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  if (contentLength > 0 && contentLength > maxSize) {
    throw new HttpError(
      413,
      `Content too large: Maximum size is ${maxSize / (1024 * 1024)}MB`
    );
  }

  // Stream content with size checking
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
          `Content too large: Maximum size is ${maxSize / (1024 * 1024)}MB`
        );
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

/**
 * Utility for streaming Node.js response bodies (for compatibility with node-fetch)
 * 
 * @param responseBody - Node.js response body stream
 * @param maxSize - Maximum allowed content size in bytes
 * @returns Promise<Buffer> - The content as a buffer
 * @throws HttpError if content exceeds size limits
 */
export async function streamNodeResponseContent(
  responseBody: any,
  maxSize: number
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let receivedLength = 0;

  // Process the response body as a Node.js stream
  for await (const chunk of responseBody) {
    const buffer = Buffer.from(chunk);
    chunks.push(buffer);
    receivedLength += buffer.length;

    if (receivedLength > maxSize) {
      // For Node streams, we can destroy the stream
      responseBody?.destroy?.();
      throw new HttpError(
        413,
        `Content too large: Maximum size is ${maxSize / (1024 * 1024)}MB`
      );
    }
  }

  return Buffer.concat(chunks);
}

/**
 * Validate response content type against allowed/blocked lists
 * 
 * @param response - The response to validate
 * @param options - Validation options
 * @throws HttpError if content type is not allowed
 */
export function validateResponseContentType(
  response: Response,
  options: {
    allowedTypes?: Set<string>;
    blockedTypes?: Set<string>;
    contentTypeDescription?: string;
  } = {}
): string {
  const { allowedTypes, blockedTypes, contentTypeDescription = 'content' } = options;
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';

  // Check blocked types first
  if (blockedTypes) {
    blockedTypes.forEach(blockedType => {
      if (contentType.includes(blockedType)) {
        throw new HttpError(
          415,
          `Unsupported media type: ${contentType} is not allowed for security reasons`
        );
      }
    });
  }

  // Check allowed types
  if (allowedTypes && allowedTypes.size > 0) {
    const isAllowed = allowedTypes.has(contentType) || 
                      Array.from(allowedTypes).some(type => {
                        if (type.endsWith('/*')) {
                          return contentType.startsWith(type.slice(0, -1));
                        }
                        return contentType.includes(type);
                      });
    
    if (!isAllowed) {
      throw new HttpError(
        415,
        `Unsupported media type: ${contentType} is not a valid ${contentTypeDescription} format`
      );
    }
  }

  return contentType;
}

/**
 * Create secure fetch options from RequestInit with security defaults
 * 
 * @param init - Original RequestInit options
 * @param securityOptions - Additional security options
 * @returns Combined options for secure requests
 */
export function createSecureRequestOptions(
  init: RequestInit | undefined,
  securityOptions: SecureRequestOptions = {}
): SecureRequestOptions & { 
  headers?: Record<string, string>;
  method?: string;
  body?: any;
  signal?: AbortSignal;
} {
  const headers: Record<string, string> = {};
  
  // Extract headers from RequestInit
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, init.headers);
    }
  }

  return {
    timeout: securityOptions.timeout || SECURITY_CONSTANTS.DEFAULT_REQUEST_TIMEOUT,
    maxRedirects: securityOptions.maxRedirects || SECURITY_CONSTANTS.MAX_REDIRECTS,
    userAgent: securityOptions.userAgent || SECURITY_CONSTANTS.DEFAULT_USER_AGENT,
    additionalHeaders: securityOptions.additionalHeaders || {},
    headers,
    method: init?.method || 'GET',
    body: init?.body,
    signal: init?.signal || undefined,
  };
}