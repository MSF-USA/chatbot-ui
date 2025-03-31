import { getIndexConfig } from '../config/index-config';

import { SearchIndexClient } from '@azure/search-documents';

export async function createOrUpdateIndex(
  client: SearchIndexClient,
  indexName: string,
  allowIndexDowntime: boolean = false,
  endpoint?: string,
  apiKey?: string,
  openaiEndpoint?: string,
  openaiApiKey?: string,
  openaiEmbeddingDeployment?: string,
) {
  console.log(`Creating/updating index: ${indexName}`);
  console.log(`Allow index downtime: ${allowIndexDowntime}`);

  try {
    // Get the index config with all settings
    const indexConfig = getIndexConfig(
      indexName,
      openaiEndpoint,
      openaiApiKey,
      openaiEmbeddingDeployment,
    );
    const options = allowIndexDowntime
      ? { allowIndexDowntime: true }
      : undefined;

    if (endpoint && apiKey) {
      // Try direct API call if endpoint and apiKey are provided
      try {
        const rawJson = JSON.stringify(indexConfig);
        console.log('Index configuration being sent:', rawJson);

        const response = await fetch(
          `${endpoint}/indexes/${indexName}?api-version=2024-07-01`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'api-key': apiKey,
            },
            body: rawJson,
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Direct API call failed: ${response.status} ${errorText}`,
          );
        }

        console.log(
          `Index ${indexName} created successfully via direct API call`,
        );
        return indexName;
      } catch (directApiError) {
        console.warn(
          'Direct API call failed, falling back to SDK method:',
          directApiError,
        );
      }
    }

    // Fall back to using the SDK with type assertion
    await client.createOrUpdateIndex(indexConfig as any, options);

    console.log(`Index ${indexName} created successfully via SDK`);
    return indexName;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error creating/updating index: ${errorMessage}`);
    throw error;
  }
}
