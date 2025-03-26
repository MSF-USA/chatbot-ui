export function getIndexerConfig(
  indexerName: string,
  dataSourceName: string,
  indexName: string,
) {
  return {
    name: indexerName,
    description: 'Indexer for the AI platform.',
    dataSourceName: dataSourceName,
    targetIndexName: indexName,
    schedule: {
      interval: 'PT5M',
    },
    parameters: {
      configuration: {
        parsingMode: 'json' as 'json',
        excludedFileNameExtensions: '.txt',
      },
    },
    fieldMappings: [
      {
        sourceFieldName: 'metadata_storage_path',
        targetFieldName: 'Id',
        mappingFunction: {
          name: 'base64Encode',
        },
      },
      {
        sourceFieldName: '/url',
        targetFieldName: 'url',
      },
      {
        sourceFieldName: '/date',
        targetFieldName: 'date',
      },
      {
        sourceFieldName: '/title',
        targetFieldName: 'title',
      },
      {
        sourceFieldName: '/content',
        targetFieldName: 'content',
      },
    ],
  };
}
