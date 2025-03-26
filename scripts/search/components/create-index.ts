import { getIndexConfig } from '../config/index-config';

import { SearchIndexClient } from '@azure/search-documents';

export async function createOrUpdateIndex(
  client: SearchIndexClient,
  indexName: string,
  allowIndexDowntime: boolean = false,
) {
  console.log(`Creating/updating index: ${indexName}`);
  console.log(`Allow index downtime: ${allowIndexDowntime}`);

  const indexConfig = getIndexConfig(indexName);

  // Use the allowIndexDowntime parameter
  const options = allowIndexDowntime ? { allowIndexDowntime: true } : undefined;

  await client.createOrUpdateIndex(indexConfig, options);

  console.log(`Index ${indexName} created or updated successfully`);
  return indexName;
}
