import { SearchResult } from '@/types/rag';

import { getRedisService } from './redisService';

export class SearchResultsStore {
  private redisService;

  constructor() {
    this.redisService = getRedisService();
  }

  async getPreviousSearchDocs(key: string): Promise<SearchResult[]> {
    try {
      console.log(`Attempting to get search docs with key: search:${key}`);

      const data = await this.redisService.get(`search:${key}`);
      if (!data) {
        console.log(`No search docs found for key: search:${key}`);
        return [];
      }

      const results = JSON.parse(data) as SearchResult[];
      console.log(
        `Retrieved ${results.length} search docs for key: search:${key}`,
      );
      return results;
    } catch (error) {
      console.error(
        `Error retrieving search docs for key search:${key}:`,
        error,
      );
      return [];
    }
  }

  async savePreviousSearchDocs(
    key: string,
    docs: SearchResult[],
  ): Promise<void> {
    try {
      console.log(`Saving ${docs.length} search docs with key: search:${key}`);

      const success = await this.redisService.set(
        `search:${key}`,
        JSON.stringify(docs),
        { EX: 3600 }, // Expire after 1 hour
      );

      if (success) {
        console.log(`Successfully saved search docs with key: search:${key}`);
      } else {
        console.warn(
          `Failed to save search docs with key: search:${key} due to Redis unavailability`,
        );
      }
    } catch (error) {
      console.error(`Error saving search docs for key search:${key}:`, error);
    }
  }

  async clearPreviousSearchDocs(key: string): Promise<void> {
    try {
      console.log(`Clearing search docs with key: search:${key}`);

      const success = await this.redisService.del(`search:${key}`);

      if (success) {
        console.log(`Successfully cleared search docs with key: search:${key}`);
      } else {
        console.warn(
          `Failed to clear search docs with key: search:${key} due to Redis unavailability`,
        );
      }
    } catch (error) {
      console.error(`Error clearing search docs for key search:${key}:`, error);
    }
  }
}
