import { SearchConfig, configureSearch } from './configure';

import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log('Loading environment from .env.local');
  require('dotenv').config({ path: envPath });
  // This only runs in local development
}

async function main() {
  // Check for allowIndexDowntime in arguments or environment
  const allowDowntime =
    process.env.ALLOW_INDEX_DOWNTIME === 'true' ||
    process.argv.includes('--allow-downtime');

  console.log(`Allow index downtime: ${allowDowntime}`);

  // Get all configuration from environment variables
  const config: SearchConfig = {
    endpoint: process.env.SEARCH_ENDPOINT || '',
    apiKey: process.env.SEARCH_ENDPOINT_API_KEY || '',
    indexName: process.env.SEARCH_INDEX || 'prod-ai-index',
    dataSourceName: process.env.SEARCH_DATASOURCE || 'msfintlnycprodaiplatform',
    indexerName: process.env.SEARCH_INDEXER || 'prod-ai-indexer',
    containerName: process.env.STORAGE_CONTAINER || 'ai-portal-datasources',
    resourceId: process.env.STORAGE_RESOURCE_ID || '',
    allowIndexDowntime: allowDowntime,
  };

  // Validate required config
  const missingVars = Object.entries(config)
    .filter(([key, value]) => !value && key !== 'allowIndexDowntime')
    .map(([key, _]) => key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`,
    );
  }

  try {
    await configureSearch(config);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { configureSearch };
