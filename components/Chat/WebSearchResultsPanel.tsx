import { IconExternalLink, IconSearch, IconClock, IconBookmark, IconStar, IconFilter } from '@tabler/icons-react';
import { FC, useState, useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { AgentResponse } from '@/types/agent';
import { WebSearchResult, WebSearchResponse } from '@/types/webSearch';

interface WebSearchResultsPanelProps {
  agentResponse: AgentResponse;
}

interface SearchResultCardProps {
  result: WebSearchResult;
  index: number;
  onCitationClick?: (result: WebSearchResult) => void;
}

/**
 * Individual search result card component
 */
const SearchResultCard: FC<SearchResultCardProps> = ({ result, index, onCitationClick }) => {
  const { t } = useTranslation('agents');
  
  const handleResultClick = () => {
    if (onCitationClick) {
      onCitationClick(result);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return null;
    }
  };

  const getContentTypeIcon = (contentType?: string) => {
    switch (contentType) {
      case 'news':
        return '📰';
      case 'academic':
        return '🎓';
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      default:
        return '🌐';
    }
  };

  const getRelevanceColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  return (
    <div className="group p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-gray-800">
      {/* Header with title and relevance */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start space-x-2 flex-1">
          <span className="text-sm">{getContentTypeIcon(result.contentType)}</span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer group-hover:underline line-clamp-2">
              {result.title}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {result.displayUrl || result.url}
            </p>
          </div>
        </div>
        
        {/* Relevance score */}
        {result.relevanceScore && (
          <div className="flex items-center space-x-1 ml-2">
            <IconStar size={12} className={getRelevanceColor(result.relevanceScore)} />
            <span className={`text-xs ${getRelevanceColor(result.relevanceScore)}`}>
              {Math.round(result.relevanceScore * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Snippet */}
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
        {result.snippet}
      </p>

      {/* Footer with metadata and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
          {result.dateLastCrawled && (
            <div className="flex items-center space-x-1">
              <IconClock size={12} />
              <span>{formatDate(result.dateLastCrawled)}</span>
            </div>
          )}
          {result.language && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              {result.language.toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleResultClick}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
            title={t('webSearch.resultsPanel.cite')}
          >
            <IconBookmark size={12} />
            <span>{t('webSearch.resultsPanel.cite')}</span>
          </button>
          
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center space-x-1"
            title={t('webSearch.resultsPanel.openLink')}
          >
            <IconExternalLink size={12} />
            <span>{t('webSearch.resultsPanel.open')}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * Web search results panel component
 * Displays search results with citations and confidence scores
 */
export const WebSearchResultsPanel: FC<WebSearchResultsPanelProps> = ({ agentResponse }) => {
  const { t } = useTranslation('agents');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Extract web search data from agent response
  const webSearchData: WebSearchResponse | null = useMemo(() => {
    try {
      // Check if agent metadata contains web search results
      if (agentResponse.metadata?.agentMetadata?.webSearchResponse) {
        return agentResponse.metadata.agentMetadata.webSearchResponse as WebSearchResponse;
      }
      // Fallback: check if toolResults contains web search data
      if (agentResponse.metadata?.toolResults) {
        const webSearchResult = agentResponse.metadata.toolResults.find(
          (result: any) => result.type === 'web_search' || result.toolName === 'web_search'
        );
        if (webSearchResult?.data) {
          return webSearchResult.data as WebSearchResponse;
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing web search data:', error);
      return null;
    }
  }, [agentResponse]);

  // Sort and filter results
  const processedResults = useMemo(() => {
    if (!webSearchData?.results) return [];

    let filtered = [...webSearchData.results];

    // Filter by content type
    if (filterType !== 'all') {
      filtered = filtered.filter(result => result.contentType === filterType);
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        case 'date':
          const dateA = a.dateLastCrawled ? new Date(a.dateLastCrawled).getTime() : 0;
          const dateB = b.dateLastCrawled ? new Date(b.dateLastCrawled).getTime() : 0;
          return dateB - dateA;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [webSearchData, sortBy, filterType]);

  const handleCitationClick = (result: WebSearchResult) => {
    // TODO: Integrate with citation system
    console.log('Citation clicked:', result);
  };

  if (!webSearchData) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        {t('webSearch.resultsPanel.noData')}
      </div>
    );
  }

  const uniqueContentTypes = [...new Set(webSearchData.results.map(r => r.contentType).filter(Boolean))];

  return (
    <div className="web-search-results-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <IconSearch size={16} className="text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('webSearch.resultsPanel.title')}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({processedResults.length} {t('webSearch.resultsPanel.results')})
          </span>
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center space-x-1"
        >
          <IconFilter size={12} />
          <span>{t('webSearch.resultsPanel.filters')}</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <label className="text-gray-700 dark:text-gray-300">{t('webSearch.resultsPanel.sortBy')}:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
              >
                <option value="relevance">{t('webSearch.resultsPanel.relevance')}</option>
                <option value="date">{t('webSearch.resultsPanel.date')}</option>
                <option value="title">{t('webSearch.resultsPanel.title')}</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-gray-700 dark:text-gray-300">{t('webSearch.resultsPanel.filterBy')}:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
              >
                <option value="all">{t('webSearch.resultsPanel.all')}</option>
                {uniqueContentTypes.map(type => (
                  <option key={type} value={type}>
                    {t(`webSearch.resultsPanel.contentTypes.${type}`, { defaultValue: type })}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Search metadata */}
      <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-4">
        <span>
          {t('webSearch.resultsPanel.query')}: &quot;{webSearchData.query}&quot;
        </span>
        <span>
          {t('webSearch.resultsPanel.searchTime')}: {webSearchData.searchTime}ms
        </span>
        {webSearchData.cached && (
          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
            {t('webSearch.resultsPanel.cached')}
          </span>
        )}
      </div>

      {/* Results */}
      {processedResults.length > 0 ? (
        <div className="space-y-3">
          {processedResults.map((result, index) => (
            <SearchResultCard
              key={result.id}
              result={result}
              index={index}
              onCitationClick={handleCitationClick}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <IconSearch size={48} className="mx-auto mb-4 opacity-50" />
          <p>{t('webSearch.resultsPanel.noResults')}</p>
        </div>
      )}
    </div>
  );
};

export default WebSearchResultsPanel;