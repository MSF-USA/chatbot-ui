import { HttpError } from '@/utils/app/security';

import { XMLParser } from 'fast-xml-parser';
import fetch from 'node-fetch';

export interface Article {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

export async function fetchAndParseNewsSearch(
  q: string | null,
  n: number,
): Promise<Article[]> {
  if (!q || typeof q !== 'string') {
    throw new HttpError(400, 'Invalid search query');
  }
  if (isNaN(n) || n <= 0) {
    throw new HttpError(400, 'Invalid number of articles requested');
  }

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}`;

  const resp = await fetch(url, {
    headers: { 'User-Agent': process.env.USER_AGENT ?? 'MSF Assistant' },
  });
  if (!resp.ok) {
    throw new HttpError(resp.status, 'Failed to fetch news articles');
  }

  const xmlData = await resp.text();

  const parser = new XMLParser();
  const jsonObj = parser.parse(xmlData);

  const items = jsonObj?.rss?.channel?.item;
  if (!items || !Array.isArray(items)) {
    throw new HttpError(500, 'Failed to parse news feed');
  }

  const articles: Article[] = items.slice(0, n).map((item: any) => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    description: item.description,
  }));

  return articles;
}
