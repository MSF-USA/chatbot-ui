import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { AbortController } from 'node-abort-controller';
import * as ipaddr from 'ipaddr.js';
import { URL } from 'url';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
    this.name = 'HttpError';
  }
}

// Define a set of content types that are considered unsafe or executable
const unsafeContentTypes = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msdos-windows',
  'application/x-ms-shortcut',
  'application/octet-stream', // Handle with care, as it can be generic
  'application/exe',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-msmetafile',
  'application/x-ms-application',
  'application/x-javascript',
  'text/javascript',
  // Add more content types as needed
]);

// Maximum content size in bytes (10MB)
const MAX_CONTENT_SIZE = 10 * 1024 * 1024;

// Request timeout in milliseconds (30 seconds)
const REQUEST_TIMEOUT = 30000;

// Check if an IP address is private or localhost
function isPrivateOrLocalhost(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip);

    // Check if it's localhost
    if (ip === '127.0.0.1' || ip === '::1') {
      return true;
    }

    // Check if it's in private ranges
    if (addr.kind() === 'ipv4') {
      return addr.range() === 'private' ||
             addr.range() === 'loopback' ||
             addr.range() === 'linkLocal';
    } else {
      return addr.range() === 'uniqueLocal' ||
             addr.range() === 'loopback' ||
             addr.range() === 'linkLocal';
    }
  } catch (error) {
    // If parsing fails, assume it's not safe
    return true;
  }
}

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

export async function fetchAndParseWebpage(url: string, maxRedirects = 5): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new HttpError(400, 'Invalid URL: URL must be a non-empty string');
  }

  let validatedUrl: URL;
  try {
    validatedUrl = new URL(url);
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      throw new HttpError(400, 'Invalid protocol: Only HTTP and HTTPS protocols are supported');
    }
  } catch {
    throw new HttpError(400, 'Invalid URL format: The URL could not be parsed');
  }

  // SSRF protection - Check if URL points to private network or localhost
  try {
    if (await isUrlPointingToPrivateNetwork(validatedUrl)) {
      throw new HttpError(403, 'Access denied: Cannot access internal or private networks');
    }
  } catch (error) {
    throw new HttpError(403, 'Access denied: Cannot verify network safety');
  }

  let response: fetch.Response | null = null;
  let redirectCount = 0;
  let currentUrl = validatedUrl.toString();
  let currentUrlObj = validatedUrl;

  // Set up abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    while (redirectCount < maxRedirects) {
      try {
        response = await fetch(currentUrl, {
          headers: {
            'User-Agent': process.env.USER_AGENT ?? 'MSF Assistant',
          },
          redirect: 'manual', // We'll handle redirects manually
          signal: controller.signal as any,
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (!location) {
            throw new HttpError(response.status, 'Redirect error: Location header not provided');
          }

          // Create new URL object for the redirect
          const redirectUrl = new URL(location, currentUrl);

          // SSRF protection for redirects
          if (await isUrlPointingToPrivateNetwork(redirectUrl)) {
            throw new HttpError(403, 'Access denied: Redirect to internal or private network not allowed');
          }

          currentUrl = redirectUrl.toString();
          currentUrlObj = redirectUrl;
          redirectCount++;
        } else {
          break;
        }
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        if ((error as Error).name === 'AbortError') {
          throw new HttpError(408, 'Request timeout: The request took too long to complete');
        }
        throw new HttpError(500, 'Network error: Failed to fetch the URL');
      }
    }

    if (redirectCount >= maxRedirects) {
      throw new HttpError(429, 'Too many redirects: Maximum redirect limit reached');
    }

    if (!response) {
      throw new HttpError(500, 'No response: Failed to get any response from the server');
    }

    if (!response.ok) {
      throw new HttpError(response.status, `Server error: The server returned status code ${response.status}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // Check content length before processing
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  if (contentLength > MAX_CONTENT_SIZE) {
    throw new HttpError(413, `Content too large: Maximum size is ${MAX_CONTENT_SIZE / (1024 * 1024)}MB`);
  }

  // Get the Content-Type header
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';

  // Check for unsafe content types
  for (const unsafeType of unsafeContentTypes) {
    if (contentType.includes(unsafeType)) {
      throw new HttpError(415, `Unsupported media type: ${contentType} is not allowed for security reasons`);
    }
  }

  let cleanText: string;
  const host = currentUrlObj.host; // Use the final URL after redirects
  let title: string = 'No title';

  try {
    // Handle non-HTML content
    if (!contentType.includes('text/html')) {
      // For blob content types like images, PDFs, etc.
      if (contentType.startsWith('image/')) {
        // For images
        cleanText = `This URL contains an image of type ${contentType}. Please use the image upload feature instead.`;
      } else if (contentType === 'application/pdf') {
        // For PDFs
        cleanText = 'This URL contains a PDF document, which is not supported through this interface. Please use the file upload feature if available.';
      } else if (contentType.startsWith('text/')) {
        // For plain text or other text types
        const textContent = await response.text();

        // Check content size after fetching
        if (textContent.length > MAX_CONTENT_SIZE) {
          throw new HttpError(413, `Content too large: Maximum size is ${MAX_CONTENT_SIZE / (1024 * 1024)}MB`);
        }

        cleanText = textContent;
      } else {
        cleanText = `This URL contains content of type ${contentType}, which is not supported through this interface.`;
      }
    } else {
      // Since it's HTML, proceed to parse it with enhanced sanitization
      let html = '';

// Handle as a Node.js stream
      if (!response.body) {
        throw new HttpError(500, 'Failed to read response body');
      }

      let receivedLength = 0;
      const chunks: any[] = [];

// Process the response body as a Node.js stream
      for await (const chunk of response.body) {
        chunks.push(Buffer.from(chunk as any));
        receivedLength += (chunk as any).length;

        if (receivedLength > MAX_CONTENT_SIZE) {
          // For Node streams, we can destroy the stream
          (response.body as any)?.destroy?.();
          throw new HttpError(413, `Content too large: Maximum size is ${MAX_CONTENT_SIZE / (1024 * 1024)}MB`);
        }
      }

// Concatenate chunks into a single Buffer and convert to string
      html = Buffer.concat(chunks).toString('utf-8');

// Load HTML into cheerio for parsing
      const $ = cheerio.load(html);


      // Extract title
      title = $('title').text().trim() || 'No title found';

      // Enhanced sanitization: remove more potentially dangerous elements
      $('script, iframe, style, link, noscript, object, embed, applet, base, meta, form, input, button, textarea, select, option').remove();

      // Remove on* attributes (event handlers) from all elements
      $('*').each((_, element) => {
        const attributes = (element as any).attribs || {};
        for (const attr in attributes) {
          if (attr.toLowerCase().startsWith('on')) {
            $(element).removeAttr(attr);
          }
        }
      });

      $('a[href]').each((_, element) => {
        const href = $(element).attr('href') || '';
        const lowercaseHref = href.toLowerCase();
        if (lowercaseHref.startsWith('javascript:') ||
            lowercaseHref.startsWith('data:') ||
            lowercaseHref.startsWith('vbscript:')) {
          $(element).removeAttr('href');
        }
      });

      // Extract text content
      const textContent = $('body').text();
      cleanText = textContent.replace(/\s+/g, ' ').trim();
    }

    // Combine title, host, and content
    const finalContent = `# ${title}\n## URL: ${host}\n\n## Content\n\n${cleanText}`;

    return finalContent;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, 'Failed to process content: ' + ((error as Error).message || 'Unknown error'));
  }
}
