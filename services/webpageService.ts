import {
  executeSecureRequest,
  streamNodeResponseContent,
  validateResponseContentType,
} from '@/utils/app/networkSecurity';
import { ContentValidation, HttpError } from '@/utils/app/security';

import * as cheerio from 'cheerio';
import { AbortController } from 'node-abort-controller';
import fetch from 'node-fetch';

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

export async function fetchAndParseWebpage(
  url: string,
  maxRedirects = 5,
): Promise<string> {
  // Execute secure request with redirect handling (includes SSRF protection)
  const { response, finalUrl } = await executeSecureRequest(url, {
    timeout: REQUEST_TIMEOUT,
    maxRedirects,
    userAgent: process.env.USER_AGENT ?? 'MSF Assistant',
  });

  // Parse final URL for content processing
  const currentUrlObj = new URL(finalUrl);

  // Validate content type and check for unsafe types
  const contentType = validateResponseContentType(response, {
    blockedTypes: unsafeContentTypes,
    contentTypeDescription: 'webpage content',
  });

  // Check content length before processing
  const contentLength = parseInt(response.headers.get('content-length') || '0');
  if (contentLength > 0) {
    ContentValidation.validateContentLength(contentLength, MAX_CONTENT_SIZE);
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
        cleanText =
          'This URL contains a PDF document, which is not supported through this interface. Please use the file upload feature if available.';
      } else if (contentType.startsWith('text/')) {
        // For plain text or other text types
        const textContent = await response.text();

        // Check content size after fetching
        ContentValidation.validateContentLength(
          textContent.length,
          MAX_CONTENT_SIZE,
        );

        cleanText = textContent;
      } else {
        cleanText = `This URL contains content of type ${contentType}, which is not supported through this interface.`;
      }
    } else {
      // Since it's HTML, proceed to parse it with enhanced sanitization

      // Stream content with size validation
      const htmlBuffer = await streamNodeResponseContent(
        response.body,
        MAX_CONTENT_SIZE,
      );
      const html = htmlBuffer.toString('utf-8');

      // Load HTML into cheerio for parsing
      const $ = cheerio.load(html);

      // Extract title
      title = $('title').text().trim() || 'No title found';

      // Enhanced sanitization: remove more potentially dangerous elements
      $(
        'script, iframe, style, link, noscript, object, embed, applet, base, meta, form, input, button, textarea, select, option',
      ).remove();

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
        if (
          lowercaseHref.startsWith('javascript:') ||
          lowercaseHref.startsWith('data:') ||
          lowercaseHref.startsWith('vbscript:')
        ) {
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
    throw new HttpError(
      500,
      'Failed to process content: ' +
        ((error as Error).message || 'Unknown error'),
    );
  }
}
