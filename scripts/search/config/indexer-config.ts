export function getIndexerConfig(
  indexerName: string,
  dataSourceName: string,
  indexName: string,
  skillsetName: string,
) {
  return {
    name: indexerName,
    description: 'Indexer for the comms RAG system',
    dataSourceName: dataSourceName,
    targetIndexName: indexName,
    skillsetName: skillsetName,
    schedule: {
      interval: 'PT5M',
    },
    parameters: {
      configuration: {
        parsingMode: 'json' as 'json',
        indexStorageMetadataOnlyForOversizedDocuments: true,
        excludedFileNameExtensions: '.txt',
      },
    },
    fieldMappings: [
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
    ],
  };
}
