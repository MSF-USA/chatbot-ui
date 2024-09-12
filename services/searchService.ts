import { SearchIndex } from '@/types/searchIndex';

import {
  AzureKeyCredential,
  SearchClient,
  SearchDocumentsResult,
} from '@azure/search-documents';

export const useSearchService = async (
  query: string,
): Promise<SearchIndex[]> => {
  try {
    const searchEndpoint = process.env.SEARCH_ENDPOINT;
    const searchIndex = process.env.SEARCH_INDEX;
    const searchApiKey = process.env.SEARCH_ENDPOINT_API_KEY;

    if (!searchEndpoint || !searchIndex || !searchApiKey) {
      throw new Error('Search service configuration is missing');
    }

    const searchClient = new SearchClient<SearchIndex>(
      searchEndpoint,
      searchIndex,
      new AzureKeyCredential(searchApiKey),
    );

    const searchResults: SearchDocumentsResult<SearchIndex> =
      await searchClient.search(query, {
        select: ['Id', 'url', 'content', 'title', 'date'],
        top: 5,
      });

    const results: SearchIndex[] = [];
    for await (const result of searchResults.results) {
      results.push(result.document);
    }

    if (results.length === 0) {
      console.warn('Search returned no results');
    }

    return results;
  } catch (error) {
    console.error('Error in useSearchService:', error);
    if (error instanceof Error) {
      throw new Error(`Search service error: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred in the search service');
    }
  }
};

export default useSearchService;
