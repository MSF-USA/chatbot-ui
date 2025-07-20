import { FC, useState } from 'react';
import { useTranslation } from 'next-i18next';

import { AgentType, AgentResponse } from '@/types/agent';
import { Message } from '@/types/chat';


// Agent-specific panel imports
import { WebSearchResultsPanel } from './WebSearchResultsPanel';
import { CodeExecutionResultsPanel } from './CodeExecutionResultsPanel';
import { DocumentAnalysisPanel } from './DocumentAnalysisPanel';
import { AgentTypeIndicator } from './AgentTypeIndicator';

interface AgentResponsePanelProps {
  message: Message;
  agentResponse: AgentResponse;
  onExpand?: () => void;
  onCollapse?: () => void;
}

/**
 * Main agent response panel that wraps all agent-specific content
 * Provides consistent interface and behavior across all agent types
 */
export const AgentResponsePanel: FC<AgentResponsePanelProps> = ({
  message,
  agentResponse,
  onExpand,
  onCollapse,
}) => {
  const { t } = useTranslation(['chat', 'agents']);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Agent panels are always enabled in the simplified system

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (newExpanded && onExpand) {
      onExpand();
    } else if (!newExpanded && onCollapse) {
      onCollapse();
    }
  };


  const renderAgentSpecificContent = () => {
    if (!agentResponse.success && agentResponse.error) {
      return (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-red-800 dark:text-red-200">
              {t('agents:common.error.title')}
            </span>
          </div>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {agentResponse.error.message || t('agents:common.error.unknown')}
          </p>
        </div>
      );
    }

    switch (agentResponse.agentType) {
      case AgentType.WEB_SEARCH:
        return <WebSearchResultsPanel agentResponse={agentResponse} />;
      
      case AgentType.CODE_INTERPRETER:
        return <CodeExecutionResultsPanel agentResponse={agentResponse} />;
      
      case AgentType.URL_PULL:
      case AgentType.LOCAL_KNOWLEDGE:
        return <DocumentAnalysisPanel agentResponse={agentResponse} />;
      
      default:
        return (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('agents:common.resultsPanel.placeholder')}
            </p>
          </div>
        );
    }
  };

  const renderMetadata = () => {
    if (!agentResponse.metadata) return null;

    return (
      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
        {agentResponse.metadata.processingTime && (
          <span>
            {t('agents:common.metadata.processingTime')}: {agentResponse.metadata.processingTime}ms
          </span>
        )}
        {agentResponse.metadata.confidence && (
          <span>
            {t('agents:common.metadata.confidence')}: {Math.round(agentResponse.metadata.confidence * 100)}%
          </span>
        )}
        {agentResponse.metadata.tokenUsage && (
          <span>
            {t('agents:common.metadata.tokens')}: {agentResponse.metadata.tokenUsage.total}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="agent-response-panel border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <AgentTypeIndicator 
            agentType={agentResponse.agentType}
            size="md"
            showLabel={true}
          />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {agentResponse.agentId}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Status indicator */}
          <div className={`w-2 h-2 rounded-full ${
            agentResponse.success 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}></div>
          
          {/* Expand/Collapse button */}
          <button
            onClick={handleToggleExpand}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={isExpanded ? t('common.collapse') : t('common.expand')}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3">
          {/* Agent-specific content */}
          {renderAgentSpecificContent()}
          
          {/* Metadata */}
          {renderMetadata()}
        </div>
      )}
    </div>
  );
};

export default AgentResponsePanel;