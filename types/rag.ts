import { Message } from './chat';

export interface SearchResult {
  content: string;
  title: string;
  date: string;
  url: string;
}

export interface DateRange {
  newest: string | null;
  oldest: string | null;
}

export interface RAGResponse {
  answer: string;
  sources_used: Array<{
    title: string;
    date: string;
    url: string;
    number: number;
  }>;
  sources_date_range: DateRange;
  total_sources: number;
}

export interface Citation {
  title: string;
  date: string;
  url: string;
  number: number;
}
