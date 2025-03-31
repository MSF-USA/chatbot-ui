export function getIndexConfig(
  indexName: string,
  openaiEndpoint?: string,
  openaiApiKey?: string,
  openaiEmbeddingDeployment?: string,
) {
  // Only include vectorizers if all required OpenAI parameters are provided
  const vectorizers =
    openaiEndpoint && openaiApiKey && openaiEmbeddingDeployment
      ? [
          {
            name: 'MSFCommsVectorizer',
            kind: 'azureOpenAI',
            azureOpenAIParameters: {
              resourceUri: openaiEndpoint,
              deploymentId: openaiEmbeddingDeployment,
              apiKey: openaiApiKey,
              modelName: 'text-embedding-ada-002', // to-do: add var to terraform var group
            },
          },
        ]
      : [];

  return {
    name: indexName,
    defaultScoringProfile: 'dateScore',
    fields: [
      {
        name: 'content',
        type: 'Edm.String',
        searchable: true,
        filterable: false,
        retrievable: true,
        sortable: false,
        facetable: false,
        key: false,
        synonymMaps: [],
        analyzer: 'standard.lucene',
      },
      {
        name: 'contentVector',
        type: 'Collection(Edm.Single)',
        searchable: true,
        filterable: false,
        retrievable: true,
        dimensions: 1536,
        vectorSearchProfile: 'MSFCommsVectorProfile',
      },
      {
        name: 'url',
        type: 'Edm.String',
        searchable: true,
        filterable: true,
        retrievable: true,
        sortable: false,
        facetable: false,
        key: false,
        synonymMaps: [],
      },
      {
        name: 'Id',
        type: 'Edm.String',
        searchable: false,
        filterable: false,
        retrievable: true,
        sortable: true,
        facetable: false,
        key: true,
        synonymMaps: [],
      },
      {
        name: 'title',
        type: 'Edm.String',
        searchable: true,
        filterable: true,
        retrievable: true,
        sortable: true,
        facetable: false,
        key: false,
        synonymMaps: [],
        analyzer: 'standard.lucene',
      },
      {
        name: 'date',
        type: 'Edm.DateTimeOffset',
        searchable: false,
        filterable: true,
        retrievable: true,
        sortable: true,
        facetable: false,
        key: false,
        synonymMaps: [],
      },
      {
        name: 'locations',
        type: 'Collection(Edm.String)',
        searchable: true,
        filterable: true,
        retrievable: true,
        facetable: true,
      },
      {
        name: 'organizations',
        type: 'Collection(Edm.String)',
        searchable: true,
        filterable: true,
        retrievable: true,
        facetable: true,
      },
    ],
    scoringProfiles: [
      {
        name: 'dateScore',
        functionAggregation: 'sum',
        functions: [
          {
            fieldName: 'date',
            interpolation: 'logarithmic',
            type: 'freshness',
            boost: 5,
            freshness: {
              boostingDuration: 'P60D',
            },
          },
        ],
      },
    ],
    suggesters: [],
    similarity: {
      '@odata.type': '#Microsoft.Azure.Search.BM25Similarity',
      k1: 1.2,
      b: 0.6,
    },
    vectorSearch: {
      profiles: [
        {
          name: 'MSFCommsVectorProfile',
          algorithm: 'MSFCommsAlgorithm',
          vectorizer:
            openaiEndpoint && openaiApiKey && openaiEmbeddingDeployment
              ? 'MSFCommsVectorizer'
              : undefined,
        },
      ],
      algorithms: [
        {
          name: 'MSFCommsAlgorithm',
          kind: 'hnsw',
          hnswParameters: {
            m: 4,
            efConstruction: 400,
            efSearch: 500,
            metric: 'cosine',
          },
        },
      ],
      vectorizers: vectorizers,
    },
    semantic: {
      configurations: [
        {
          name: 'MSFCommsConfig',
          prioritizedFields: {
            titleField: {
              fieldName: 'title',
            },
            prioritizedContentFields: [
              {
                fieldName: 'content',
              },
            ],
            prioritizedKeywordsFields: [
              {
                fieldName: 'locations',
              },
              {
                fieldName: 'organizations',
              },
            ],
          },
        },
      ],
    },
  };
}
