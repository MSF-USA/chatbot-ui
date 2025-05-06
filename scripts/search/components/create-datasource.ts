import { getDataSourceConfig } from '../config/datasource-config';

import { SearchIndexerClient } from '@azure/search-documents';

export async function createOrUpdateDataSource(
  client: SearchIndexerClient,
  dataSourceName: string,
  storageResourceId: string,
  containerName: string,
) {
  console.log(`Creating/updating data source: ${dataSourceName}`);

  const dataSourceConfig = getDataSourceConfig(
    dataSourceName,
    storageResourceId,
    containerName,
  );

  await client.createOrUpdateDataSourceConnection(dataSourceConfig);

  console.log(`Data source ${dataSourceName} created or updated successfully`);
  return dataSourceName;
}
