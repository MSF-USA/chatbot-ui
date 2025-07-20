import { 
  IconCode, 
  IconClock, 
  IconCpu, 
  IconFileDownload, 
  IconTerminal,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconPlayerPlay,
  IconFileText
} from '@tabler/icons-react';
import { FC, useState, useMemo } from 'react';
import { useTranslation } from 'next-i18next';

import { AgentResponse } from '@/types/agent';
import { 
  CodeExecutionResult, 
  CodeExecutionOutput, 
  ExecutionStatus, 
  ProgrammingLanguage,
  ExecutionFile 
} from '@/types/codeInterpreter';
import { CodeBlock } from '@/components/Markdown/CodeBlock';

interface CodeExecutionResultsPanelProps {
  agentResponse: AgentResponse;
}

interface ExecutionOutputCardProps {
  output: CodeExecutionOutput;
  index: number;
}

interface ExecutionFileCardProps {
  file: ExecutionFile;
  onDownload: (file: ExecutionFile) => void;
}

/**
 * Individual execution output card
 */
const ExecutionOutputCard: FC<ExecutionOutputCardProps> = ({ output, index }) => {
  const { t } = useTranslation('agents');
  
  const getOutputIcon = (type: string) => {
    switch (type) {
      case 'stdout':
        return <IconTerminal size={14} className="text-green-600 dark:text-green-400" />;
      case 'stderr':
        return <IconAlertTriangle size={14} className="text-red-600 dark:text-red-400" />;
      case 'return_value':
        return <IconCheck size={14} className="text-blue-600 dark:text-blue-400" />;
      case 'exception':
        return <IconX size={14} className="text-red-600 dark:text-red-400" />;
      default:
        return <IconTerminal size={14} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getOutputBorderColor = (type: string) => {
    switch (type) {
      case 'stdout':
        return 'border-green-200 dark:border-green-800';
      case 'stderr':
        return 'border-red-200 dark:border-red-800';
      case 'return_value':
        return 'border-blue-200 dark:border-blue-800';
      case 'exception':
        return 'border-red-200 dark:border-red-800';
      default:
        return 'border-gray-200 dark:border-gray-700';
    }
  };

  const getOutputBgColor = (type: string) => {
    switch (type) {
      case 'stdout':
        return 'bg-green-50 dark:bg-green-900/20';
      case 'stderr':
        return 'bg-red-50 dark:bg-red-900/20';
      case 'return_value':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'exception':
        return 'bg-red-50 dark:bg-red-900/20';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50';
    }
  };

  return (
    <div className={`border rounded-lg ${getOutputBorderColor(output.type)} ${getOutputBgColor(output.type)}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          {getOutputIcon(output.type)}
          <span className="text-sm font-medium capitalize">
            {t(`codeInterpreter.resultsPanel.outputTypes.${output.type}`, { defaultValue: output.type.replace('_', ' ') })}
          </span>
        </div>
        
        {output.metadata?.timestamp && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(output.metadata.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {output.mimeType === 'text/plain' || !output.mimeType ? (
          <pre className="text-sm font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 max-h-96 overflow-y-auto">
            {output.output || output.error}
          </pre>
        ) : output.mimeType === 'text/html' ? (
          <div 
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: output.output }}
          />
        ) : output.mimeType?.startsWith('image/') ? (
          <img 
            src={`data:${output.mimeType};base64,${output.data}`}
            alt="Execution output"
            className="max-w-full h-auto rounded border"
          />
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('codeInterpreter.resultsPanel.unsupportedOutput')} ({output.mimeType})
          </div>
        )}
        
        {output.metadata?.size && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {t('codeInterpreter.resultsPanel.outputSize')}: {(output.metadata.size / 1024).toFixed(2)} KB
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Execution file card for downloads
 */
const ExecutionFileCard: FC<ExecutionFileCardProps> = ({ file, onDownload }) => {
  const { t } = useTranslation('agents');

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center space-x-3">
        <IconFileText size={16} className="text-gray-600 dark:text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(file.size)} • {file.mimeType}
          </p>
        </div>
      </div>
      
      <button
        onClick={() => onDownload(file)}
        className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
      >
        <IconFileDownload size={14} />
        <span>{t('codeInterpreter.resultsPanel.download')}</span>
      </button>
    </div>
  );
};

/**
 * Code execution results panel component
 * Displays code execution output, errors, logs, and performance metrics
 */
export const CodeExecutionResultsPanel: FC<CodeExecutionResultsPanelProps> = ({ agentResponse }) => {
  const { t } = useTranslation('agents');
  const [activeTab, setActiveTab] = useState<'output' | 'code' | 'files'>('output');

  // Extract code execution data from agent response
  const codeExecutionData: CodeExecutionResult | null = useMemo(() => {
    try {
      // Check if agent metadata contains code execution results
      if (agentResponse.metadata?.agentMetadata?.codeExecutionResult) {
        return agentResponse.metadata.agentMetadata.codeExecutionResult as CodeExecutionResult;
      }
      // Fallback: check if toolResults contains code execution data
      if (agentResponse.metadata?.toolResults) {
        const codeResult = agentResponse.metadata.toolResults.find(
          (result: any) => result.type === 'code_execution' || result.toolName === 'code_interpreter'
        );
        if (codeResult?.data) {
          return codeResult.data as CodeExecutionResult;
        }
      }
      return null;
    } catch (error) {
      console.error('Error parsing code execution data:', error);
      return null;
    }
  }, [agentResponse]);

  const handleFileDownload = (file: ExecutionFile) => {
    try {
      const content = file.isBase64 ? atob(file.content) : file.content;
      const blob = new Blob([content], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (!codeExecutionData) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        {t('codeInterpreter.resultsPanel.noData')}
      </div>
    );
  }

  const getStatusColor = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.SUCCESS:
        return 'text-green-600 dark:text-green-400';
      case ExecutionStatus.ERROR:
      case ExecutionStatus.SECURITY_VIOLATION:
      case ExecutionStatus.INVALID_CODE:
        return 'text-red-600 dark:text-red-400';
      case ExecutionStatus.TIMEOUT:
      case ExecutionStatus.MEMORY_LIMIT:
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.SUCCESS:
        return <IconCheck size={16} className="text-green-600 dark:text-green-400" />;
      case ExecutionStatus.ERROR:
      case ExecutionStatus.SECURITY_VIOLATION:
      case ExecutionStatus.INVALID_CODE:
        return <IconX size={16} className="text-red-600 dark:text-red-400" />;
      case ExecutionStatus.TIMEOUT:
      case ExecutionStatus.MEMORY_LIMIT:
        return <IconAlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />;
      default:
        return <IconPlayerPlay size={16} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="code-execution-results-panel">
      {/* Header with status and stats */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <IconCode size={16} className="text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('codeInterpreter.resultsPanel.title')}
          </h3>
          <div className="flex items-center space-x-1">
            {getStatusIcon(codeExecutionData.status)}
            <span className={`text-xs ${getStatusColor(codeExecutionData.status)}`}>
              {t(`codeInterpreter.resultsPanel.status.${codeExecutionData.status}`, { 
                defaultValue: codeExecutionData.status 
              })}
            </span>
          </div>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          {codeExecutionData.language} • {codeExecutionData.environment}
        </span>
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-xs">
          <IconClock size={14} className="text-blue-600 dark:text-blue-400" />
          <span className="text-gray-600 dark:text-gray-400">
            {t('codeInterpreter.resultsPanel.executionTime')}: {codeExecutionData.stats.executionTime}ms
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          <IconCpu size={14} className="text-purple-600 dark:text-purple-400" />
          <span className="text-gray-600 dark:text-gray-400">
            {t('codeInterpreter.resultsPanel.memoryUsage')}: {codeExecutionData.stats.memoryUsage.toFixed(1)}MB
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          <IconCpu size={14} className="text-orange-600 dark:text-orange-400" />
          <span className="text-gray-600 dark:text-gray-400">
            {t('codeInterpreter.resultsPanel.cpuUsage')}: {codeExecutionData.stats.cpuUsage.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          <IconTerminal size={14} className="text-gray-600 dark:text-gray-400" />
          <span className="text-gray-600 dark:text-gray-400">
            {t('codeInterpreter.resultsPanel.outputLines')}: {codeExecutionData.stats.outputLines}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('output')}
          className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === 'output'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {t('codeInterpreter.resultsPanel.tabs.output')} ({codeExecutionData.outputs.length})
        </button>
        
        <button
          onClick={() => setActiveTab('code')}
          className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
            activeTab === 'code'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {t('codeInterpreter.resultsPanel.tabs.code')}
        </button>
        
        {codeExecutionData.files && codeExecutionData.files.length > 0 && (
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === 'files'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {t('codeInterpreter.resultsPanel.tabs.files')} ({codeExecutionData.files.length})
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {activeTab === 'output' && (
          <div className="space-y-3">
            {codeExecutionData.outputs.length > 0 ? (
              codeExecutionData.outputs.map((output, index) => (
                <ExecutionOutputCard key={index} output={output} index={index} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <IconTerminal size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('codeInterpreter.resultsPanel.noOutput')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'code' && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('codeInterpreter.resultsPanel.executedCode')} ({codeExecutionData.language})
              </span>
            </div>
            <div className="p-0">
              <CodeBlock
                language={codeExecutionData.language}
                value={codeExecutionData.code}
              />
            </div>
          </div>
        )}

        {activeTab === 'files' && codeExecutionData.files && (
          <div className="space-y-3">
            {codeExecutionData.files.length > 0 ? (
              codeExecutionData.files.map((file, index) => (
                <ExecutionFileCard 
                  key={index} 
                  file={file} 
                  onDownload={handleFileDownload}
                />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <IconFileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('codeInterpreter.resultsPanel.noFiles')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeExecutionResultsPanel;