import { SearchIndex } from '@/types/searchIndex';

import {
  AzureKeyCredential,
  SearchClient,
  SearchDocumentsResult,
} from '@azure/search-documents';

const useSearchService = async (query: string): Promise<SearchIndex[]> => {
  const searchClient = new SearchClient<SearchIndex>(
    process.env.SEARCH_ENDPOINT ?? '',
    process.env.SEARCH_INDEX ?? '',
    new AzureKeyCredential(process.env.SEARCH_ENDPOINT_API_KEY ?? ''),
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

  return results;
};

export default useSearchService;
