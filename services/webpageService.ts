import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message);
    this.status = status;
  }
}

export async function fetchAndParseWebpage(url: string, maxRedirects = 5): Promise<string> {
  // Validate the URL
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

  const html = await response.text();

  const $ = cheerio.load(html);

  const title = $('title').text().trim() || 'No title found';
  const host = validatedUrl.host;

  $('script, iframe, style, link[rel="stylesheet"], noscript').remove();
  const textContent = $('body').text();
  const cleanText = textContent.replace(/\s+/g, ' ').trim();

  // Combine title, host, and content
  const finalContent = `Title: ${title}\nURL: ${host}\n\n${cleanText}`;

  return finalContent;
}
