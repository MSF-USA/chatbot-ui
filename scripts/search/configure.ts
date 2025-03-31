import { createOrUpdateDataSource } from './components/create-datasource';
import { createOrUpdateIndex } from './components/create-index';
import { createOrUpdateIndexer } from './components/create-indexer';

import {
  AzureKeyCredential,
  SearchIndexClient,
  SearchIndexerClient,
} from '@azure/search-documents';

export interface SearchConfig {
  endpoint: string;
  apiKey: string;
  indexName: string;
  dataSourceName: string;
  indexerName: string;
  resourceId: string;
  containerName: string;
  allowIndexDowntime?: boolean;
  openaiEndpoint?: string;
  openaiApiKey?: string;
  openaiEmbeddingDeployment?: string;
}

export async function configureSearch(config: SearchConfig) {
  console.log('Starting Azure Search configuration for RAG system...');

  const credential = new AzureKeyCredential(config.apiKey);

  const indexClient = new SearchIndexClient(config.endpoint, credential);

  const indexerClient = new SearchIndexerClient(config.endpoint, credential);

  try {
    // Create components in the right order

    /*
    Creating VectorProfile with SDK doesn't seem to work.
    Using direct API call instead.
    */
    await createOrUpdateIndex(
      indexClient,
      config.indexName,
      config.allowIndexDowntime,
      config.endpoint,
      config.apiKey,
      config.openaiEndpoint,
      config.openaiApiKey,
      config.openaiEmbeddingDeployment,
    );

    /*
    data source seems to have issues for inital creation with system managed identities
    but seems fine updating after creation
    */
    await createOrUpdateDataSource(
      indexerClient,
      config.dataSourceName,
      config.resourceId,
      config.containerName,
    );

    await createOrUpdateIndexer(
      indexerClient,
      config.indexerName,
      config.dataSourceName,
      config.indexName,
    );

    console.log('Azure Search configuration completed successfully!');
  } catch (error) {
    console.error('Error configuring Azure Search:', error);
    throw error;
  }
}
