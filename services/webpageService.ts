import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
  }
}

// Define a set of content types that are considered unsafe or executable
const unsafeContentTypes = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msdos-windows',
  'application/x-ms-shortcut',
  'application/octet-stream', // Handle with care, as it can be generic
  // Add more content types as needed
]);

export async function fetchAndParseWebpage(url: string, maxRedirects = 5): Promise<string> {
  if (!url || typeof url !== 'string') {
    throw new HttpError(400, 'Invalid URL'); // Bad Request
  }

  let validatedUrl: URL;
  try {
    validatedUrl = new URL(url);
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      throw new HttpError(400, 'Invalid protocol');
    }
  } catch {
    throw new HttpError(400, 'Invalid URL format');
  }

  let response: fetch.Response | null = null;
  let redirectCount = 0;
  let currentUrl = validatedUrl.toString();

  while (redirectCount < maxRedirects) {
    response = await fetch(currentUrl, {
      headers: {
        'User-Agent': process.env.USER_AGENT ?? 'MSF Assistant',
      },
      redirect: 'manual', // We'll handle redirects manually
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new HttpError(response.status, 'Redirect location not provided');
      }
      currentUrl = new URL(location, currentUrl).toString();
      redirectCount++;
    } else {
      break;
    }
  }

  if (redirectCount >= maxRedirects) {
    throw new HttpError(429, 'Too many redirects');
  }

  if (!response) {
    throw new Error('Failed to get any response from any requests');
  }

  if (!response.ok) {
    throw new HttpError(response.status, 'Failed to fetch the URL');
  }

  // Get the Content-Type header
  const contentType = response.headers.get('content-type')?.toLowerCase() || '';

  // Check for unsafe content types
  for (const unsafeType of unsafeContentTypes) {
    if (contentType.includes(unsafeType)) {
      throw new HttpError(415, 'Unsupported Media Type');
    }
  }

  let cleanText: string;
  const host = validatedUrl.host;
  let title: string = ''

  // Handle non-HTML content
  if (!contentType.includes('text/html')) {
    // For blob content types like images, PDFs, etc.
    // Here we can handle them as needed. For example:
    if (contentType.startsWith('image/')) {
      // For images
      cleanText = `ERROR: Content could not be pulled. The URL points to an image of type ${contentType}. The MSF AI Assistant only supports direct image upload in the image or file upload handler..`;
    } else if (contentType === 'application/pdf') {
      // For PDFs
      cleanText = 'ERROR: Content could not be pulled. The URL points to a PDF document, which is not yet supported through MSF AI Assistant. Please contact the developer if you want to request support for this file type.';
    } else if (contentType.startsWith('text/')) {
      // For plain text or other text types
      const textContent = await response.text();
      cleanText = `# Content from ${validatedUrl.host}\n\n${textContent}`;
    } else {
      cleanText = `ERROR: Content could not be pulled. The URL points to a file of type ${contentType}. Parsing is not yet supported through MSF AI Assistant. Please contact the developer if you want to request support for this file type.`;
    }
  } else {

    // Since it's HTML, proceed to parse it
    const html = await response.text();
    const $ = cheerio.load(html);

    title = $('title').text().trim() || 'No title found';

    // Remove unwanted elements
    $('script, iframe, style, link[rel="stylesheet"], noscript').remove();

    const textContent = $('body').text();
    cleanText = textContent.replace(/\s+/g, ' ').trim();
  }

  // Combine title, host, and content
  const finalContent = `# ${title}\n## URL: ${host}\n\n## Content\n\n${cleanText}`;

  return finalContent;
}
