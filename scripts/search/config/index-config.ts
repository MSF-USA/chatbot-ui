import {
  BM25Similarity,
  FreshnessScoringParameters,
  ScoringProfile,
  SearchFieldDataType,
} from '@azure/search-documents';

export function getIndexConfig(indexName: string) {
  return {
    name: indexName,
    defaultScoringProfile: 'dateScore',
    fields: [
      {
        name: 'content',
        type: 'Edm.String' as SearchFieldDataType,
        searchable: true,
        filterable: false,
        retrievable: true,
        stored: true,
        sortable: false,
        facetable: false,
        key: false,
        synonymMaps: [],
      },
      {
        name: 'url',
        type: 'Edm.String' as SearchFieldDataType,
        searchable: true,
        filterable: true,
        retrievable: true,
        stored: true,
        sortable: false,
        facetable: false,
        key: false,
        synonymMaps: [],
      },
      {
        name: 'Id',
        type: 'Edm.String' as SearchFieldDataType,
        searchable: false,
        filterable: false,
        retrievable: true,
        stored: true,
        sortable: true,
        facetable: false,
        key: true,
        synonymMaps: [],
      },
      {
        name: 'title',
        type: 'Edm.String' as SearchFieldDataType,
        searchable: true,
        filterable: true,
        retrievable: true,
        stored: true,
        sortable: true,
        facetable: false,
        key: false,
        synonymMaps: [],
      },
      {
        name: 'date',
        type: 'Edm.DateTimeOffset' as SearchFieldDataType,
        searchable: false,
        filterable: true,
        retrievable: true,
        stored: true,
        sortable: true,
        facetable: false,
        key: false,
        synonymMaps: [],
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
            parameters: {
              boostingDuration: 'P60D',
            } as FreshnessScoringParameters,
          },
        ],
      } as ScoringProfile,
    ],
    suggesters: [],
    similarity: {
      odatatype: '#Microsoft.Azure.Search.BM25Similarity',
      k1: 1.2,
      b: 0.6,
    } as BM25Similarity,
  };
}
