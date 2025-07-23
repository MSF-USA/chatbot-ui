import {
  IconBookmark,
  IconBulb,
  IconCalendar,
  IconClock,
  IconDatabase,
  IconExternalLink,
  IconEye,
  IconFileText,
  IconLanguage,
  IconSearch,
  IconShield,
  IconTag,
  IconUser,
} from '@tabler/icons-react';
import { FC, useMemo, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { AgentResponse } from '@/types/agent';
import {
  AccessLevel,
  KnowledgeDocumentType,
  KnowledgeSearchResult,
  LocalKnowledgeResponse,
} from '@/types/localKnowledge';
import { FailedUrl, ProcessedUrl, UrlPullResponse } from '@/types/urlPull';

interface DocumentAnalysisPanelProps {
  agentResponse: AgentResponse;
}

interface ProcessedUrlCardProps {
  url: ProcessedUrl;
  index: number;
  onPreview?: (url: ProcessedUrl) => void;
}

interface KnowledgeResultCardProps {
  result: KnowledgeSearchResult;
  index: number;
  onView?: (result: KnowledgeSearchResult) => void;
}

interface FailedUrlCardProps {
  failedUrl: FailedUrl;
  index: number;
}

/**
 * Individual processed URL card
 */
const ProcessedUrlCard: FC<ProcessedUrlCardProps> = ({
  url,
  index,
  onPreview,
}) => {
  const { t } = useTranslation('agents');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
            {url.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {url.finalUrl || url.url}
          </p>
        </div>

        {url.cached && (
          <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
            {t('documentAnalysis.resultsPanel.cached')}
          </span>
        )}
      </div>

      {/* Content preview */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
          {truncateContent(url.content)}
        </p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <IconClock size={12} />
          <span>{url.processingTime}ms</span>
        </div>

        <div className="flex items-center space-x-1">
          <IconFileText size={12} />
          <span>{formatFileSize(url.contentLength)}</span>
        </div>

        {url.language && (
          <div className="flex items-center space-x-1">
            <IconLanguage size={12} />
            <span>{url.language.toUpperCase()}</span>
          </div>
        )}

        {url.metadata.author && (
          <div className="flex items-center space-x-1">
            <IconUser size={12} />
            <span>{url.metadata.author}</span>
          </div>
        )}
      </div>

      {/* Additional metadata */}
      {(url.metadata.publishedDate || url.metadata.keywords?.length) && (
        <div className="mb-3 space-y-1">
          {url.metadata.publishedDate && (
            <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
              <IconCalendar size={12} />
              <span>
                {new Date(url.metadata.publishedDate).toLocaleDateString()}
              </span>
            </div>
          )}

          {url.metadata.keywords && url.metadata.keywords.length > 0 && (
            <div className="flex items-center space-x-1 text-xs">
              <IconTag size={12} className="text-gray-500 dark:text-gray-400" />
              <div className="flex flex-wrap gap-1">
                {url.metadata.keywords.slice(0, 3).map((keyword, idx) => (
                  <span
                    key={idx}
                    className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                  >
                    {keyword}
                  </span>
                ))}
                {url.metadata.keywords.length > 3 && (
                  <span className="text-gray-500 dark:text-gray-400">
                    +{url.metadata.keywords.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {onPreview && (
            <button
              onClick={() => onPreview(url)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center space-x-1"
            >
              <IconEye size={12} />
              <span>{t('documentAnalysis.resultsPanel.preview')}</span>
            </button>
          )}
        </div>

        <a
          href={url.finalUrl || url.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center space-x-1"
        >
          <IconExternalLink size={12} />
          <span>{t('documentAnalysis.resultsPanel.open')}</span>
        </a>
      </div>
    </div>
  );
};

/**
 * Knowledge search result card
 */
const KnowledgeResultCard: FC<KnowledgeResultCardProps> = ({
  result,
  index,
  onView,
}) => {
  const { t } = useTranslation('agents');

  const getAccessLevelColor = (accessLevel: AccessLevel) => {
    switch (accessLevel) {
      case AccessLevel.PUBLIC:
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case AccessLevel.INTERNAL:
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900';
      case AccessLevel.CONFIDENTIAL:
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900';
      case AccessLevel.RESTRICTED:
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900';
      case AccessLevel.SECRET:
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getDocumentTypeIcon = (type: KnowledgeDocumentType) => {
    switch (type) {
      case KnowledgeDocumentType.FAQ:
        return '❓';
      case KnowledgeDocumentType.DOCUMENTATION:
        return '📖';
      case KnowledgeDocumentType.POLICY:
        return '📋';
      case KnowledgeDocumentType.PROCEDURE:
        return '📝';
      case KnowledgeDocumentType.TRAINING:
        return '🎓';
      default:
        return '📄';
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-2 flex-1 min-w-0">
          <span className="text-sm">
            {getDocumentTypeIcon(result.document.type)}
          </span>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
              {result.document.title}
            </h4>
            <div className="flex items-center space-x-2 text-xs">
              <span
                className={`px-2 py-1 rounded ${getAccessLevelColor(
                  result.document.accessLevel,
                )}`}
              >
                <IconShield size={10} className="inline mr-1" />
                {result.document.accessLevel}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {result.document.type.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="ml-2 text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t('documentAnalysis.resultsPanel.relevance')}
          </div>
          <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
            {Math.round(result.score * 100)}%
          </div>
        </div>
      </div>

      {/* Content snippet */}
      {result.highlights && result.highlights.length > 0 && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {result.highlights[0]}
          </p>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
        {result.document.metadata.author && (
          <div className="flex items-center space-x-1">
            <IconUser size={12} />
            <span>{result.document.metadata.author}</span>
          </div>
        )}

        <div className="flex items-center space-x-1">
          <IconCalendar size={12} />
          <span>
            {new Date(result.document.updatedAt).toLocaleDateString()}
          </span>
        </div>

        {result.document.metadata.department && (
          <div className="flex items-center space-x-1">
            <IconDatabase size={12} />
            <span>{result.document.metadata.department}</span>
          </div>
        )}

        <div className="flex items-center space-x-1">
          <IconLanguage size={12} />
          <span>{result.document.language.toUpperCase()}</span>
        </div>
      </div>

      {/* Tags */}
      {result.document.tags && result.document.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-1 text-xs">
            <IconTag size={12} className="text-gray-500 dark:text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {result.document.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-1 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
              {result.document.tags.length > 3 && (
                <span className="text-gray-500 dark:text-gray-400">
                  +{result.document.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {onView && (
            <button
              onClick={() => onView(result)}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center space-x-1"
            >
              <IconEye size={12} />
              <span>{t('documentAnalysis.resultsPanel.view')}</span>
            </button>
          )}

          <button className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center space-x-1">
            <IconBookmark size={12} />
            <span>{t('documentAnalysis.resultsPanel.bookmark')}</span>
          </button>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          v{result.document.version}
        </span>
      </div>
    </div>
  );
};

/**
 * Failed URL card
 */
const FailedUrlCard: FC<FailedUrlCardProps> = ({ failedUrl, index }) => {
  const { t } = useTranslation('agents');

  const getErrorTypeColor = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return 'text-red-600 dark:text-red-400';
      case 'timeout':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'forbidden':
      case 'not_found':
        return 'text-orange-600 dark:text-orange-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {failedUrl.url}
          </p>
          <p
            className={`text-xs mt-1 ${getErrorTypeColor(failedUrl.errorType)}`}
          >
            {failedUrl.error}
          </p>
        </div>

        {failedUrl.statusCode && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {failedUrl.statusCode}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Document analysis panel component
 * Displays document analysis results for url-pull and local-knowledge agents
 */
export const DocumentAnalysisPanel: FC<DocumentAnalysisPanelProps> = ({
  agentResponse,
}) => {
  const { t } = useTranslation('agents');
  const [activeTab, setActiveTab] = useState<
    'documents' | 'insights' | 'failed'
  >('documents');

  // Extract document analysis data from agent response
  const { urlPullData, localKnowledgeData } = useMemo(() => {
    try {
      let urlPullData: UrlPullResponse | null = null;
      let localKnowledgeData: LocalKnowledgeResponse | null = null;

      // Check if agent metadata contains analysis results
      if (agentResponse.metadata?.agentMetadata) {
        if (agentResponse.metadata.agentMetadata.urlPullResponse) {
          urlPullData = agentResponse.metadata.agentMetadata
            .urlPullResponse as UrlPullResponse;
        }
        if (agentResponse.metadata.agentMetadata.localKnowledgeResponse) {
          localKnowledgeData = agentResponse.metadata.agentMetadata
            .localKnowledgeResponse as LocalKnowledgeResponse;
        }
      }

      // Fallback: check if toolResults contains analysis data
      if (agentResponse.metadata?.toolResults) {
        const urlResult = agentResponse.metadata.toolResults.find(
          (result: any) =>
            result.type === 'url_pull' || result.toolName === 'url_pull',
        );
        if (urlResult?.data) {
          urlPullData = urlResult.data as UrlPullResponse;
        }

        const knowledgeResult = agentResponse.metadata.toolResults.find(
          (result: any) =>
            result.type === 'local_knowledge' ||
            result.toolName === 'local_knowledge',
        );
        if (knowledgeResult?.data) {
          localKnowledgeData = knowledgeResult.data as LocalKnowledgeResponse;
        }
      }

      return { urlPullData, localKnowledgeData };
    } catch (error) {
      console.error('Error parsing document analysis data:', error);
      return { urlPullData: null, localKnowledgeData: null };
    }
  }, [agentResponse]);

  if (!urlPullData && !localKnowledgeData) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        {t('documentAnalysis.resultsPanel.noData')}
      </div>
    );
  }

  const totalDocuments =
    (urlPullData?.processedUrls?.length || 0) +
    (localKnowledgeData?.results?.length || 0);
  const failedUrls = urlPullData?.failedUrls || [];
  const hasInsights =
    localKnowledgeData?.entityInsights &&
    localKnowledgeData.entityInsights.length > 0;

  return (
    <div className="document-analysis-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <IconFileText
            size={16}
            className="text-purple-600 dark:text-purple-400"
          />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('documentAnalysis.resultsPanel.title')}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({totalDocuments} {t('documentAnalysis.resultsPanel.documents')})
          </span>
        </div>

        {/* Analysis metadata */}
        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
          {urlPullData && (
            <span>
              {t('documentAnalysis.resultsPanel.processingTime')}:{' '}
              {urlPullData.processingStats.totalProcessingTime}ms
            </span>
          )}
          {localKnowledgeData && (
            <span>
              {t('documentAnalysis.resultsPanel.searchTime')}:{' '}
              {localKnowledgeData.searchTime}ms
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === 'documents'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {t('documentAnalysis.resultsPanel.tabs.documents')} ({totalDocuments})
        </button>

        {hasInsights && (
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'insights'
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('documentAnalysis.resultsPanel.tabs.insights')} (
            {localKnowledgeData?.entityInsights?.length || 0})
          </button>
        )}

        {failedUrls.length > 0 && (
          <button
            onClick={() => setActiveTab('failed')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'failed'
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('documentAnalysis.resultsPanel.tabs.failed')} (
            {failedUrls.length})
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'documents' && (
          <div className="space-y-3">
            {/* URL Pull Results */}
            {urlPullData?.processedUrls?.map((url, index) => (
              <ProcessedUrlCard key={`url-${index}`} url={url} index={index} />
            ))}

            {/* Local Knowledge Results */}
            {localKnowledgeData?.results?.map((result, index) => (
              <KnowledgeResultCard
                key={`knowledge-${index}`}
                result={result}
                index={index}
              />
            ))}

            {totalDocuments === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <IconFileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('documentAnalysis.resultsPanel.noDocuments')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && hasInsights && (
          <div className="space-y-3">
            {localKnowledgeData?.entityInsights?.map((insight, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20"
              >
                <div className="flex items-start space-x-2 mb-2">
                  <IconBulb
                    size={16}
                    className="text-blue-600 dark:text-blue-400 mt-0.5"
                  />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {insight.entity.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('documentAnalysis.resultsPanel.relevance')}:{' '}
                      {Math.round(insight.relevance * 100)}%
                    </p>
                  </div>
                </div>

                {insight.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {t('documentAnalysis.resultsPanel.suggestions')}:
                    </p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      {insight.suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start space-x-1">
                          <span className="text-blue-600 dark:text-blue-400">
                            •
                          </span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'failed' && failedUrls.length > 0 && (
          <div className="space-y-3">
            {failedUrls.map((failedUrl, index) => (
              <FailedUrlCard key={index} failedUrl={failedUrl} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentAnalysisPanel;
