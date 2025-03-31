import { getIndexerConfig } from '../config/indexer-config';

import { SearchIndexerClient } from '@azure/search-documents';

export async function createOrUpdateIndexer(
  client: SearchIndexerClient,
  indexerName: string,
  dataSourceName: string,
  indexName: string,
) {
  console.log(`Creating/updating indexer: ${indexerName}`);

  const indexerConfig = getIndexerConfig(
    indexerName,
    dataSourceName,
    indexName,
  );

  await client.createOrUpdateIndexer(indexerConfig);

  console.log(`Indexer ${indexerName} created or updated successfully`);

  // Reset and run the indexer to apply changes immediately
  try {
    await client.resetIndexer(indexerName);
    console.log(`Indexer ${indexerName} reset successfully`);

    await client.runIndexer(indexerName);
    console.log(`Indexer ${indexerName} started running`);
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.warn(`Warning: Could not reset or run indexer: ${errorMessage}`);
  }

  return indexerName;
}
