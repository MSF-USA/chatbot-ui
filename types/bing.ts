export interface BingSearchParams {
  q: string;
  mkt?: string;
  safeSearch?: 'Off' | 'Moderate' | 'Strict';
  textDecorations?: boolean;
  textFormat?: 'Raw' | 'HTML';
  count?: number;
  offset?: number;
}

export interface DeepLink {
  name: string;
  url: string;
  snippet?: string;
  deepLinks?: DeepLink[];
}

export interface SearchResult {
  id: string;
  name: string;
  url: string;
  isFamilyFriendly: boolean;
  displayUrl: string;
  snippet: string;
  deepLinks?: DeepLink[];
  dateLastCrawled: string;
  language: string;
  isNavigational: boolean;
  noCache: boolean;
  siteName?: string;
}

export interface BingWebPages {
  webSearchUrl: string;
  totalEstimatedMatches: number;
  value: SearchResult[];
  someResultsRemoved?: boolean;
}

export interface BingSearchResponse {
  _type: string;
  queryContext: {
    originalQuery: string;
  };
  webPages?: BingWebPages;
  [key: string]: any;
}
