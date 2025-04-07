import { getSkillsetConfig } from '../config/skillset-config';

import { SearchIndexerClient } from '@azure/search-documents';

export async function createOrUpdateSkillset(
  skillsetName: string,
  indexName: string,
  endpoint: string,
  apiKey: string,
  openaiEndpoint: string,
  openaiEmbeddingDeployment: string,
) {
  console.log(`Creating/updating skillset: ${skillsetName}`);

  const skillsetConfig = getSkillsetConfig(
    skillsetName,
    indexName,
    openaiEndpoint,
    openaiEmbeddingDeployment,
  );

  try {
    const rawJson = JSON.stringify(skillsetConfig);
    console.log('Skillset configuration being sent:', rawJson);

    const response = await fetch(
      `${endpoint}/skillsets/${skillsetName}?api-version=2024-11-01-preview`,
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
      `Skillset ${skillsetName} created successfully via direct API call`,
    );
    return skillsetName;
  } catch (directApiError) {
    console.warn(directApiError);
  }
}
