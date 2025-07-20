import { BaseAgent } from './baseAgent';
import {
  AgentExecutionContext,
  AgentResponse,
  AgentType,
  CodeInterpreterAgentConfig,
  AgentExecutionEnvironment,
} from '@/types/agent';
import {
  CodeExecutionRequest,
  CodeExecutionResult,
  CodeInterpreterResponse,
  ProgrammingLanguage,
  ExecutionEnvironment,
  ExecutionStatus,
  CodeAnalysisResult,
  CodeInterpreterError,
  CodeInterpreterErrorType,
  DEFAULT_CODE_INTERPRETER_CONFIG,
} from '@/types/codeInterpreter';
import { CodeInterpreterService } from '../codeInterpreterService';

interface CodeBlock {
  code: string;
  language: ProgrammingLanguage;
  startIndex: number;
  endIndex: number;
}

export class CodeInterpreterAgent extends BaseAgent {
  private codeInterpreterConfig: CodeInterpreterAgentConfig;
  private codeInterpreterService: CodeInterpreterService;
  private executionCache: Map<string, { result: CodeExecutionResult; timestamp: number }>;

  constructor(config: CodeInterpreterAgentConfig) {
    super(config);
    this.codeInterpreterConfig = config;
    this.codeInterpreterService = new CodeInterpreterService();
    this.executionCache = new Map();
  }

  protected async initializeAgent(): Promise<void> {
    // Initialize Code Interpreter Agent specific components
    this.executionCache.clear();
    
    // Validate configuration
    if (!this.codeInterpreterConfig.codeInterpreterConfig) {
      throw new Error('Code interpreter configuration is required');
    }
  }

  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];
    
    // Access config from base class since instance properties aren't set yet during construction
    const config = this.config as CodeInterpreterAgentConfig;
    
    if (!config?.codeInterpreterConfig) {
      errors.push('Code interpreter configuration is required');
    }
    
    if (config?.maxExecutionTime !== undefined && config.maxExecutionTime <= 0) {
      errors.push('Maximum execution time must be greater than 0');
    }
    
    if (config?.maxMemoryMb !== undefined && config.maxMemoryMb <= 0) {
      errors.push('Maximum memory must be greater than 0');
    }
    
    return errors;
  }

  protected getCapabilities(): string[] {
    return [
      'code-execution',
      'python-support',
      'javascript-support',
      'sql-support',
      'data-analysis',
      'file-processing',
      'visualization',
      'debugging',
      'security-scanning'
    ];
  }

  protected async executeInternal(context: AgentExecutionContext): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      const codeBlocks = this.extractCodeBlocks(context.query);
      
      if (codeBlocks.length === 0) {
        return this.createErrorResponse(
          'No code blocks found in the query. Please provide code within ```language blocks.',
          'NO_CODE_FOUND',
          Date.now() - startTime
        );
      }

      const results: CodeExecutionResult[] = [];
      const analysisResults: CodeAnalysisResult[] = [];
      
      for (const codeBlock of codeBlocks) {
        try {
          // Analyze code first
          const analysis = await this.codeInterpreterService.analyzeCode(
            codeBlock.code,
            codeBlock.language
          );
          analysisResults.push(analysis);

          // Create execution request
          const executionRequest: CodeExecutionRequest = {
            code: codeBlock.code,
            language: codeBlock.language,
            environment: this.getExecutionEnvironment(codeBlock.language),
            config: {
              timeout: this.codeInterpreterConfig.maxExecutionTime || DEFAULT_CODE_INTERPRETER_CONFIG.defaultTimeout,
              memoryLimit: this.codeInterpreterConfig.maxMemoryMb || DEFAULT_CODE_INTERPRETER_CONFIG.maxMemoryMb,
              enableDebug: false,
              returnSteps: false,
              outputFormat: 'text',
              includeMetadata: true,
            },
            context: {
              agentId: this.config.id,
              userId: context.user?.id,
              locale: context.locale,
            },
          };

          // Execute code
          const result = await this.codeInterpreterService.executeCode(executionRequest);
          results.push(result);

        } catch (error) {
          // Create error result for this code block
          const errorResult: CodeExecutionResult = {
            status: ExecutionStatus.ERROR,
            code: codeBlock.code,
            language: codeBlock.language,
            environment: this.getExecutionEnvironment(codeBlock.language),
            outputs: [{
              output: '',
              error: error instanceof Error ? error.message : 'Unknown error',
              type: 'exception',
            }],
            stats: {
              executionTime: 0,
              memoryUsage: 0,
              cpuUsage: 0,
              outputLines: 0,
              outputSize: 0,
              dependenciesUsed: 0,
              exitCode: 1,
            },
            metadata: {
              executionId: `error_${Date.now()}`,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
            },
          };
          results.push(errorResult);
        }
      }

      const processingTime = Date.now() - startTime;
      const response = this.buildResponse(context.query, results, analysisResults, processingTime);
      
      return {
        content: this.formatResponse(response),
        agentId: this.config.id,
        agentType: AgentType.CODE_INTERPRETER,
        success: true,
        metadata: {
          processingTime,
          confidence: this.calculateConfidence(response),
          agentMetadata: {
            totalCodeBlocks: codeBlocks.length,
            successfulExecutions: results.filter(r => r.status === ExecutionStatus.SUCCESS).length,
            failedExecutions: results.filter(r => r.status === ExecutionStatus.ERROR).length,
            languagesUsed: [...new Set(codeBlocks.map(cb => cb.language))],
          },
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return this.createErrorResponse(
        `Code interpreter execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof CodeInterpreterError ? error.code : CodeInterpreterErrorType.RUNTIME_ERROR,
        processingTime
      );
    }
  }

  /**
   * Extract code blocks from user query
   */
  private extractCodeBlocks(query: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(query)) !== null) {
      const languageStr = match[1] || 'python';
      const code = match[2].trim();
      const language = this.mapLanguageString(languageStr);
      
      if (code.length > 0) {
        codeBlocks.push({
          code,
          language,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    // If no explicit code blocks, try to detect inline code
    if (codeBlocks.length === 0) {
      const inlineCodeMatch = query.match(/`([^`]+)`/);
      if (inlineCodeMatch) {
        const code = inlineCodeMatch[1].trim();
        const language = this.detectLanguageFromCode(code);
        
        codeBlocks.push({
          code,
          language,
          startIndex: inlineCodeMatch.index || 0,
          endIndex: (inlineCodeMatch.index || 0) + inlineCodeMatch[0].length,
        });
      }
    }

    return codeBlocks;
  }

  /**
   * Map language string to ProgrammingLanguage enum
   */
  private mapLanguageString(languageStr: string): ProgrammingLanguage {
    const normalized = languageStr.toLowerCase();
    
    switch (normalized) {
      case 'python':
      case 'py':
        return ProgrammingLanguage.PYTHON;
      case 'javascript':
      case 'js':
        return ProgrammingLanguage.JAVASCRIPT;
      case 'typescript':
      case 'ts':
        return ProgrammingLanguage.TYPESCRIPT;
      case 'sql':
        return ProgrammingLanguage.SQL;
      case 'bash':
      case 'shell':
      case 'sh':
        return ProgrammingLanguage.BASH;
      case 'r':
        return ProgrammingLanguage.R;
      default:
        return ProgrammingLanguage.PYTHON; // Default to Python
    }
  }

  /**
   * Detect programming language from code content
   */
  private detectLanguageFromCode(code: string): ProgrammingLanguage {
    // Python indicators
    if (code.includes('print(') || code.includes('import ') || code.includes('def ') || code.includes('if __name__')) {
      return ProgrammingLanguage.PYTHON;
    }
    
    // JavaScript indicators
    if (code.includes('console.log') || code.includes('function') || code.includes('const ') || 
        code.includes('let ') || code.includes('var ') || code.includes('=>')) {
      return ProgrammingLanguage.JAVASCRIPT;
    }
    
    // SQL indicators
    const upperCode = code.toUpperCase();
    if (upperCode.includes('SELECT') || upperCode.includes('INSERT') || 
        upperCode.includes('UPDATE') || upperCode.includes('DELETE') || 
        upperCode.includes('CREATE') || upperCode.includes('FROM')) {
      return ProgrammingLanguage.SQL;
    }
    
    // Bash indicators
    if (code.includes('#!/bin/bash') || code.includes('echo ') || code.includes('ls ') || 
        code.includes('cd ') || code.includes('grep ')) {
      return ProgrammingLanguage.BASH;
    }
    
    // Default to Python
    return ProgrammingLanguage.PYTHON;
  }

  /**
   * Get execution environment for language
   */
  private getExecutionEnvironment(language: ProgrammingLanguage): ExecutionEnvironment {
    switch (language) {
      case ProgrammingLanguage.PYTHON:
        return ExecutionEnvironment.PYTHON_3_11;
      case ProgrammingLanguage.JAVASCRIPT:
      case ProgrammingLanguage.TYPESCRIPT:
        return ExecutionEnvironment.NODE_18;
      case ProgrammingLanguage.SQL:
        return ExecutionEnvironment.POSTGRESQL;
      case ProgrammingLanguage.BASH:
        return ExecutionEnvironment.BASH;
      case ProgrammingLanguage.R:
        return ExecutionEnvironment.R_4_3;
      default:
        return ExecutionEnvironment.PYTHON_3_11;
    }
  }

  /**
   * Build the response object
   */
  private buildResponse(
    query: string,
    results: CodeExecutionResult[],
    analysisResults: CodeAnalysisResult[],
    processingTime: number
  ): CodeInterpreterResponse {
    const successfulExecutions = results.filter(r => r.status === ExecutionStatus.SUCCESS).length;
    const failedExecutions = results.filter(r => r.status !== ExecutionStatus.SUCCESS).length;
    
    return {
      query,
      results,
      analysis: analysisResults,
      success: failedExecutions === 0,
      processingStats: {
        totalExecutions: results.length,
        successfulExecutions,
        failedExecutions,
        totalProcessingTime: processingTime,
        averageExecutionTime: results.length > 0 ? 
          results.reduce((sum, r) => sum + r.stats.executionTime, 0) / results.length : 0,
        cacheHits: results.filter(r => r.metadata.cached).length,
      },
      metadata: {
        totalCodeBlocks: results.length,
        languagesDetected: [...new Set(results.map(r => r.language))],
        executionMethod: 'sequential', // For now, always sequential
        securityChecksPerformed: true,
      },
    };
  }

  /**
   * Format the response for display
   */
  private formatResponse(response: CodeInterpreterResponse): string {
    let result = '# Code Execution Results\n\n';
    
    // Summary
    result += '## Execution Summary\n';
    result += `- **Total Code Blocks**: ${response.processingStats.totalExecutions}\n`;
    result += `- **Successful**: ${response.processingStats.successfulExecutions}\n`;
    result += `- **Failed**: ${response.processingStats.failedExecutions}\n`;
    result += `- **Languages Used**: ${response.metadata?.languagesDetected.join(', ')}\n`;
    result += `- **Processing Time**: ${Math.round(response.processingStats.totalProcessingTime)}ms\n\n`;

    // Individual results
    response.results.forEach((execResult, index) => {
      result += `## Code Block ${index + 1} (${execResult.language})\n\n`;
      
      if (execResult.status === 'success') {
        result += '✅ **Status**: Success\n\n';
      } else {
        result += `❌ **Status**: ${execResult.status}\n\n`;
      }
      
      // Show the code that was executed
      result += '**Code:**\n';
      result += `\`\`\`${execResult.language}\n${execResult.code}\n\`\`\`\n\n`;
      
      // Show outputs
      if (execResult.outputs.length > 0) {
        result += '**Output:**\n';
        execResult.outputs.forEach(output => {
          if (output.type === 'exception' && output.error) {
            result += `\`\`\`\nError: ${output.error}\n\`\`\`\n\n`;
          } else if (output.output) {
            result += `\`\`\`\n${output.output}\n\`\`\`\n\n`;
          }
        });
      }
      
      // Show execution stats
      result += '**Execution Stats:**\n';
      result += `- Execution Time: ${execResult.stats.executionTime}ms\n`;
      result += `- Memory Usage: ${execResult.stats.memoryUsage}MB\n`;
      result += `- Output Size: ${execResult.stats.outputSize} characters\n`;
      
      if (execResult.files && execResult.files.length > 0) {
        result += `- Generated Files: ${execResult.files.length}\n`;
      }
      
      result += '\n---\n\n';
    });

    return result;
  }

  /**
   * Calculate confidence score for the response
   */
  private calculateConfidence(response: CodeInterpreterResponse): number {
    if (response.processingStats.totalExecutions === 0) {
      return 0;
    }
    
    const successRate = response.processingStats.successfulExecutions / response.processingStats.totalExecutions;
    let confidence = successRate;
    
    // Boost confidence for fast execution
    if (response.processingStats.averageExecutionTime < 1000) {
      confidence += 0.1;
    }
    
    // Reduce confidence for security issues
    const hasSecurityIssues = response.analysis.some(a => a.securityRisk === 'high');
    if (hasSecurityIssues) {
      confidence -= 0.2;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Create error response
   */
  private createErrorResponse(message: string, errorCode: string, processingTime: number): AgentResponse {
    return {
      content: `❌ **Code Execution Error**\n\n${message}`,
      agentId: this.config.id,
      agentType: AgentType.CODE_INTERPRETER,
      success: false,
      metadata: {
        processingTime,
        confidence: 0,
      },
      error: {
        code: errorCode,
        message,
      },
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.executionCache.clear();
    this.codeInterpreterService.cleanup();
    await super.cleanup();
  }
}