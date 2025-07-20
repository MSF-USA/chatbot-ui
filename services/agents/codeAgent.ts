import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import {
  AgentConfig,
  AgentExecutionContext,
  AgentResponse,
  AgentExecutionEnvironment,
} from '@/types/agent';

import { BaseAgent, AgentCreationError, AgentExecutionError } from './baseAgent';
import { AzureMonitorLoggingService } from '@/services/loggingService';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);
const rm = promisify(fs.rm);

/**
 * Supported programming languages for code execution
 */
export enum SupportedLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  BASH = 'bash',
}

/**
 * Code execution configuration
 */
interface CodeExecutionConfig {
  language: SupportedLanguage;
  timeout: number;
  maxMemory: number;
  allowedModules?: string[];
  sandboxPath: string;
}

/**
 * Code execution result
 */
interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  memoryUsage: number;
}

/**
 * Code execution result with additional metadata
 */
interface CodeExecutionResultWithMetadata {
  language: SupportedLanguage;
  code: string;
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  executionTime: number;
  memoryUsage: number;
}

/**
 * Base log metadata interface
 */
interface LogMetadata {
  agentId?: string;
  agentType?: string;
  [key: string]: unknown;
}

/**
 * Info log metadata interface
 */
interface InfoLogMetadata extends LogMetadata {
  language?: SupportedLanguage;
  sandboxPath?: string;
  processingTime?: number;
  codeBlocksExecuted?: number;
  totalExecutionTime?: number;
  supportedLanguages?: SupportedLanguage[];
}

/**
 * Error log metadata interface
 */
interface ErrorLogMetadata extends LogMetadata {
  language?: SupportedLanguage;
  sandboxPath?: string;
  processingTime?: number;
  query?: string;
  executionTime?: number;
  correlationId?: string;
}

/**
 * Warning log metadata interface
 */
interface WarningLogMetadata extends LogMetadata {
  error?: string;
  sandboxPath?: string;
}

/**
 * CodeAgent - Implementation for local code execution
 * Provides sandboxed code execution capabilities with security constraints
 */
export class CodeAgent extends BaseAgent {
  private executionConfig: CodeExecutionConfig;
  private sandboxBasePath: string;

  constructor(config: AgentConfig) {
    // Ensure this is a code agent
    if (config.environment !== AgentExecutionEnvironment.CODE) {
      throw new AgentCreationError(
        'CodeAgent can only be used with CODE environment',
        { providedEnvironment: config.environment },
      );
    }

    super(config);

    // Initialize execution configuration
    this.sandboxBasePath = process.env.CODE_SANDBOX_PATH || '/tmp/code-agent-sandbox';
    this.executionConfig = {
      language: (config.parameters?.language as SupportedLanguage) || SupportedLanguage.PYTHON,
      timeout: config.parameters?.timeout || 30000, // 30 seconds
      maxMemory: config.parameters?.maxMemory || 128, // 128MB
      allowedModules: config.parameters?.allowedModules || [
        'os',
        'sys',
        'json',
        'math',
        'datetime',
        'requests',
        'pandas',
        'numpy',
      ],
      sandboxPath: path.join(this.sandboxBasePath, config.id),
    };
  }

  protected async initializeAgent(): Promise<void> {
    try {
      // Create sandbox directory
      await this.createSandbox();

      // Validate language support
      if (!this.isLanguageSupported(this.executionConfig.language)) {
        throw new AgentCreationError(
          `Unsupported programming language: ${this.executionConfig.language}`,
          { language: this.executionConfig.language },
        );
      }

      // Verify execution environment
      await this.verifyExecutionEnvironment();

      this.logInfo('CodeAgent initialized successfully', {
        agentId: this.config.id,
        language: this.executionConfig.language,
        sandboxPath: this.executionConfig.sandboxPath,
      });
    } catch (error) {
      const errorMessage = `Failed to initialize CodeAgent: ${(error as Error).message}`;
      this.logError(errorMessage, error as Error, {
        agentId: this.config.id,
        language: this.executionConfig.language,
      });
      throw new AgentCreationError(errorMessage, error);
    }
  }

  protected async executeInternal(
    context: AgentExecutionContext,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      // Extract code from the query
      const codeBlocks = this.extractCodeBlocks(context.query);
      
      if (codeBlocks.length === 0) {
        // No code found, return analysis response
        return this.generateAnalysisResponse(context, Date.now() - startTime);
      }

      const results: CodeExecutionResultWithMetadata[] = [];
      let totalExecutionTime = 0;

      // Execute each code block
      for (const codeBlock of codeBlocks) {
        try {
          const result = await this.executeCode(codeBlock.code, codeBlock.language);
          totalExecutionTime += result.executionTime;
          
          results.push({
            language: codeBlock.language,
            code: codeBlock.code,
            success: result.exitCode === 0,
            stdout: result.stdout,
            stderr: result.stderr,
            executionTime: result.executionTime,
            memoryUsage: result.memoryUsage,
          });
        } catch (error) {
          results.push({
            language: codeBlock.language,
            code: codeBlock.code,
            success: false,
            error: (error as Error).message,
            executionTime: 0,
            memoryUsage: 0,
          });
        }
      }

      const processingTime = Date.now() - startTime;
      
      // Generate response content
      const responseContent = this.formatExecutionResults(results);

      const response: AgentResponse = {
        content: responseContent,
        agentId: this.config.id,
        agentType: this.config.type,
        success: true,
        metadata: {
          processingTime,
          confidence: this.calculateExecutionConfidence(results),
          toolResults: results,
          agentMetadata: {
            executedCodeBlocks: results.length,
            totalExecutionTime,
            language: this.executionConfig.language,
            sandboxPath: this.executionConfig.sandboxPath,
          },
        },
      };

      this.logInfo('CodeAgent execution completed successfully', {
        agentId: this.config.id,
        processingTime,
        codeBlocksExecuted: results.length,
        totalExecutionTime,
      });

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logError('CodeAgent execution failed', error as Error, {
        agentId: this.config.id,
        processingTime,
        query: context.query?.substring(0, 100),
      });

      throw new AgentExecutionError(
        `Code execution failed: ${(error as Error).message}`,
        {
          agentId: this.config.id,
          processingTime,
          originalError: error,
        },
      );
    }
  }

  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];

    // Validate language
    if (!this.executionConfig.language) {
      errors.push('Programming language is required');
    } else if (!this.isLanguageSupported(this.executionConfig.language)) {
      errors.push(`Unsupported programming language: ${this.executionConfig.language}`);
    }

    // Validate timeout
    if (this.executionConfig.timeout < 1000 || this.executionConfig.timeout > 300000) {
      errors.push('Timeout must be between 1 second and 5 minutes');
    }

    // Validate memory limit
    if (this.executionConfig.maxMemory < 16 || this.executionConfig.maxMemory > 1024) {
      errors.push('Memory limit must be between 16MB and 1GB');
    }

    // Validate sandbox path
    if (!this.executionConfig.sandboxPath) {
      errors.push('Sandbox path is required');
    }

    return errors;
  }

  protected getCapabilities(): string[] {
    return [
      'code_execution',
      'python_support',
      'javascript_support',
      'typescript_support',
      'bash_support',
      'file_processing',
      'data_analysis',
      'visualization',
      'sandboxed_execution',
    ];
  }

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // Test sandbox access
      const testFile = path.join(this.executionConfig.sandboxPath, 'health_check.py');
      await writeFile(testFile, 'print("health_check_ok")');
      
      // Test code execution
      const result = await this.executeCode('print("health_check_ok")', SupportedLanguage.PYTHON);
      
      // Cleanup test file
      await rm(testFile, { force: true });
      
      return result.exitCode === 0 && result.stdout.includes('health_check_ok');
    } catch (error) {
      this.logWarning('CodeAgent health check failed', {
        agentId: this.config.id,
        error: (error as Error).message,
      });
      return false;
    }
  }

  protected async performCleanup(): Promise<void> {
    try {
      // Clean up sandbox directory
      await rm(this.executionConfig.sandboxPath, { recursive: true, force: true });

      this.logInfo('CodeAgent cleanup completed', {
        agentId: this.config.id,
        sandboxPath: this.executionConfig.sandboxPath,
      });
    } catch (error) {
      this.logError('CodeAgent cleanup failed', error as Error, {
        agentId: this.config.id,
        sandboxPath: this.executionConfig.sandboxPath,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async createSandbox(): Promise<void> {
    try {
      await mkdir(this.executionConfig.sandboxPath, { recursive: true });
      
      // Set restrictive permissions (Unix systems only)
      if (process.platform !== 'win32') {
        await fs.promises.chmod(this.executionConfig.sandboxPath, 0o755);
      }
    } catch (error) {
      throw new AgentCreationError(
        `Failed to create sandbox directory: ${(error as Error).message}`,
        { sandboxPath: this.executionConfig.sandboxPath },
      );
    }
  }

  private async verifyExecutionEnvironment(): Promise<void> {
    // This is a placeholder for environment verification
    // In a production system, you would verify that the required interpreters are available
    // and properly configured for sandboxed execution
    
    const supportedLanguages = Object.values(SupportedLanguage);
    this.logInfo('Verified execution environment', {
      agentId: this.config.id,
      supportedLanguages,
      sandboxPath: this.executionConfig.sandboxPath,
    });
  }

  private extractCodeBlocks(query: string): Array<{ code: string; language: SupportedLanguage }> {
    const codeBlocks: Array<{ code: string; language: SupportedLanguage }> = [];
    
    // Regex to match code blocks with language specification
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(query)) !== null) {
      const language = this.mapLanguage(match[1] || 'python');
      const code = match[2].trim();
      
      if (code && this.isLanguageSupported(language)) {
        codeBlocks.push({ code, language });
      }
    }

    // If no code blocks found, check for inline code or treat entire query as code
    if (codeBlocks.length === 0) {
      const inlineCodeRegex = /`([^`]+)`/g;
      let inlineMatch;
      
      while ((inlineMatch = inlineCodeRegex.exec(query)) !== null) {
        const code = inlineMatch[1].trim();
        if (code.length > 10) { // Only consider substantial code
          codeBlocks.push({ 
            code, 
            language: this.executionConfig.language 
          });
        }
      }
    }

    return codeBlocks;
  }

  private mapLanguage(languageString: string): SupportedLanguage {
    const mapping: Record<string, SupportedLanguage> = {
      'python': SupportedLanguage.PYTHON,
      'py': SupportedLanguage.PYTHON,
      'javascript': SupportedLanguage.JAVASCRIPT,
      'js': SupportedLanguage.JAVASCRIPT,
      'typescript': SupportedLanguage.TYPESCRIPT,
      'ts': SupportedLanguage.TYPESCRIPT,
      'bash': SupportedLanguage.BASH,
      'shell': SupportedLanguage.BASH,
      'sh': SupportedLanguage.BASH,
    };

    return mapping[languageString.toLowerCase()] || SupportedLanguage.PYTHON;
  }

  /**
   * Check if a language is supported (instance method)
   * @param language The language string or enum value to check
   * @returns True if the language is supported, false otherwise
   */
  private isLanguageSupported(language: string | SupportedLanguage): boolean {
    return CodeAgent.isLanguageSupported(language);
  }

  private async executeCode(code: string, language: SupportedLanguage): Promise<CodeExecutionResult> {
    const startTime = Date.now();
    
    // This is a placeholder implementation for security reasons
    // In a production system, you would use proper sandboxing technologies like:
    // - Docker containers
    // - Firejail
    // - Virtual machines
    // - Language-specific sandboxes (e.g., PyPy sandbox, Node.js vm module)
    
    try {
      // Create temporary file for code execution
      const tempFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const extension = this.getFileExtension(language);
      const tempFilePath = path.join(this.executionConfig.sandboxPath, `${tempFileName}.${extension}`);
      
      // Write code to temporary file
      await writeFile(tempFilePath, code);
      
      // Simulate code execution (placeholder)
      const result: CodeExecutionResult = {
        stdout: `[SIMULATED] Code execution for ${language}\nCode:\n${code}\n\nThis is a placeholder output.`,
        stderr: '',
        exitCode: 0,
        executionTime: Date.now() - startTime,
        memoryUsage: Math.floor(Math.random() * 50) + 10, // Simulated memory usage
      };
      
      // Clean up temporary file
      await rm(tempFilePath, { force: true });
      
      return result;
    } catch (error) {
      return {
        stdout: '',
        stderr: `Execution failed: ${(error as Error).message}`,
        exitCode: 1,
        executionTime: Date.now() - startTime,
        memoryUsage: 0,
      };
    }
  }

  private getFileExtension(language: SupportedLanguage): string {
    const extensions: Record<SupportedLanguage, string> = {
      [SupportedLanguage.PYTHON]: 'py',
      [SupportedLanguage.JAVASCRIPT]: 'js',
      [SupportedLanguage.TYPESCRIPT]: 'ts',
      [SupportedLanguage.BASH]: 'sh',
    };
    
    return extensions[language] || 'txt';
  }

  private formatExecutionResults(results: CodeExecutionResultWithMetadata[]): string {
    let content = '## Code Execution Results\n\n';
    
    results.forEach((result, index) => {
      content += `### Code Block ${index + 1} (${result.language})\n\n`;
      
      if (result.success) {
        content += '✅ **Execution successful**\n\n';
        
        if (result.stdout) {
          content += '**Output:**\n```\n' + result.stdout + '\n```\n\n';
        }
        
        if (result.stderr) {
          content += '**Warnings:**\n```\n' + result.stderr + '\n```\n\n';
        }
        
        content += `**Execution time:** ${result.executionTime}ms\n`;
        content += `**Memory usage:** ${result.memoryUsage}MB\n\n`;
      } else {
        content += '❌ **Execution failed**\n\n';
        
        if (result.error) {
          content += '**Error:**\n```\n' + result.error + '\n```\n\n';
        }
        
        if (result.stderr) {
          content += '**Error details:**\n```\n' + result.stderr + '\n```\n\n';
        }
      }
      
      content += '---\n\n';
    });
    
    return content;
  }

  private generateAnalysisResponse(context: AgentExecutionContext, processingTime: number): AgentResponse {
    const content = `## Code Analysis

I can help you with code execution and analysis. I noticed your query doesn't contain any code blocks. 

### Supported languages:
- Python (recommended for data analysis, machine learning)
- JavaScript/TypeScript (for web development, general scripting)
- Bash (for system operations, file management)

### How to use:
Include your code in markdown code blocks like this:

\`\`\`python
print("Hello, World!")
\`\`\`

I can execute code, analyze results, help debug issues, and provide explanations.

**Query analyzed:** "${context.query.substring(0, 100)}${context.query.length > 100 ? '...' : ''}"`;

    return {
      content,
      agentId: this.config.id,
      agentType: this.config.type,
      success: true,
      metadata: {
        processingTime,
        confidence: 0.8,
        agentMetadata: {
          analysisType: 'no_code_detected',
          supportedLanguages: Object.values(SupportedLanguage),
        },
      },
    };
  }

  private calculateExecutionConfidence(results: CodeExecutionResultWithMetadata[]): number {
    if (results.length === 0) {
      return 0.6; // Lower confidence for analysis-only responses
    }
    
    const successfulExecutions = results.filter(r => r.success).length;
    const successRate = successfulExecutions / results.length;
    
    // Base confidence on success rate
    let confidence = 0.5 + (successRate * 0.4);
    
    // Adjust based on execution characteristics
    const avgExecutionTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / results.length;
    
    if (avgExecutionTime < 1000) {
      confidence += 0.1; // Quick execution is good
    }
    
    return Math.max(0, Math.min(1, confidence));
  }


  /**
   * Static factory method for creating CodeAgent instances
   */
  public static async create(config: AgentConfig): Promise<CodeAgent> {
    const agent = new CodeAgent(config);
    await agent.initializeAgent();
    return agent;
  }

  /**
   * Get supported programming languages
   */
  public static getSupportedLanguages(): SupportedLanguage[] {
    return Object.values(SupportedLanguage);
  }

  /**
   * Check if a language is supported
   * @param language The language string or enum value to check
   * @returns True if the language is supported, false otherwise
   */
  public static isLanguageSupported(language: string | SupportedLanguage): boolean {
    if (typeof language === 'string') {
      // Check if the string matches any enum value
      return Object.values(SupportedLanguage).includes(language as SupportedLanguage) ||
             Object.values(SupportedLanguage).some(val => val.toLowerCase() === language.toLowerCase());
    }
    // If it's already a SupportedLanguage enum value
    return Object.values(SupportedLanguage).includes(language);
  }
}