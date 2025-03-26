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
  return indexerName;
}
