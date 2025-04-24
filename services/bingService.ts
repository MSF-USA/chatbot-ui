import fetch from 'node-fetch';
import { HttpError } from '@/services/webpageService';
import { BingSearchParams, BingSearchResponse, SearchResult } from "@/types/bing";

export async function fetchAndParseBingSearch(
  params: BingSearchParams,
): Promise<SearchResult[]> {
  const apiKey = process.env.BING_SEARCH_API_KEY;
  if (!params || !params.q) {
    throw new HttpError(400, 'Invalid search query');
  }
  if (!apiKey) {
    throw new HttpError(401, 'Bing API key is required');
  }

  const {
    q,
    mkt = 'en-US',
    safeSearch = 'Moderate',
    textDecorations = true,
    textFormat = 'Raw',
    count = 5,
    offset = 0,
  } = params;

  const searchParams = new URLSearchParams({
    q: q,
    mkt,
    safeSearch,
    textDecorations: textDecorations.toString(),
    textFormat,
    count: count.toString(),
    offset: offset.toString(),
  });

  const url = `https://api.bing.microsoft.com/v7.0/search?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'User-Agent': process.env.USER_AGENT ?? 'MSF Assistant',
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, 'Failed to fetch search results');
  }

  const data: BingSearchResponse = await response.json();

  if (!data.webPages || !data.webPages.value) {
    throw new HttpError(404, 'No search results found');
  }

  const searchResults: SearchResult[] = data.webPages.value;

  return searchResults;
}
