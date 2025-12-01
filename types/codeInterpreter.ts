/**
 * Type definitions for Code Interpreter Agent
 * Secure code execution with multi-language support via Azure AI Foundry
 */

/**
 * Supported programming languages for code execution
 */
export enum ProgrammingLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  SQL = 'sql',
  BASH = 'bash',
  R = 'r',
}

/**
 * Code execution environment types
 */
export enum ExecutionEnvironment {
  PYTHON_3_11 = 'python-3.11',
  NODE_18 = 'node-18',
  NODE_20 = 'node-20',
  SQL_SERVER = 'sql-server',
  POSTGRESQL = 'postgresql',
  MYSQL = 'mysql',
  BASH = 'bash',
  R_4_3 = 'r-4.3',
}

/**
 * Code execution result status
 */
export enum ExecutionStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  MEMORY_LIMIT = 'memory_limit',
  SECURITY_VIOLATION = 'security_violation',
  INVALID_CODE = 'invalid_code',
}

/**
 * Configuration for code interpreter operations
 */
export interface CodeInterpreterConfig {
  /** Azure AI Foundry endpoint */
  foundryEndpoint?: string;
  /** Project ID for code execution */
  projectId?: string;
  /** Default execution timeout in milliseconds */
  defaultTimeout?: number;
  /** Maximum memory usage in MB */
  maxMemoryMb?: number;
  /** Enable code validation before execution */
  enableValidation?: boolean;
  /** Enable result caching */
  enableCaching?: boolean;
  /** Cache TTL in seconds */
  cacheTtl?: number;
  /** Allowed libraries for each language */
  allowedLibraries?: Record<ProgrammingLanguage, string[]>;
  /** Blocked functions/modules for security */
  blockedFunctions?: Record<ProgrammingLanguage, string[]>;
  /** Resource limits */
  resourceLimits?: {
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
    maxFileSize?: number;
    maxOutputLength?: number;
  };
}

/**
 * Request for code execution
 */
export interface CodeExecutionRequest {
  /** Code to execute */
  code: string;
  /** Programming language */
  language: ProgrammingLanguage;
  /** Execution environment */
  environment?: ExecutionEnvironment;
  /** Input data for the code */
  inputs?: Record<string, any>;
  /** Required libraries/packages */
  dependencies?: string[];
  /** Execution configuration */
  config?: CodeExecutionConfig;
  /** Additional context for execution */
  context?: Record<string, any>;
}

/**
 * Configuration for individual code execution
 */
export interface CodeExecutionConfig {
  /** Timeout in milliseconds */
  timeout?: number;
  /** Memory limit in MB */
  memoryLimit?: number;
  /** Enable debug output */
  enableDebug?: boolean;
  /** Return intermediate results */
  returnSteps?: boolean;
  /** Output format preference */
  outputFormat?: 'text' | 'json' | 'html' | 'markdown';
  /** Include execution metadata */
  includeMetadata?: boolean;
}

/**
 * Code execution output/result
 */
export interface CodeExecutionOutput {
  /** Execution output */
  output: string;
  /** Error messages if any */
  error?: string;
  /** Output type */
  type: 'stdout' | 'stderr' | 'return_value' | 'exception';
  /** MIME type of output */
  mimeType?: string;
  /** Binary data (base64 encoded) */
  data?: string;
  /** Output metadata */
  metadata?: {
    lineNumber?: number;
    timestamp?: string;
    size?: number;
  };
}

/**
 * Code execution result
 */
export interface CodeExecutionResult {
  /** Execution status */
  status: ExecutionStatus;
  /** Code that was executed */
  code: string;
  /** Programming language used */
  language: ProgrammingLanguage;
  /** Execution environment */
  environment: ExecutionEnvironment;
  /** Execution outputs */
  outputs: CodeExecutionOutput[];
  /** Execution statistics */
  stats: CodeExecutionStats;
  /** Generated files */
  files?: ExecutionFile[];
  /** Execution metadata */
  metadata: {
    executionId: string;
    startTime: string;
    endTime: string;
    cached?: boolean;
    cacheTimestamp?: string;
  };
}

/**
 * Execution statistics
 */
export interface CodeExecutionStats {
  /** Execution time in milliseconds */
  executionTime: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Number of output lines */
  outputLines: number;
  /** Total output size in bytes */
  outputSize: number;
  /** Number of imports/dependencies used */
  dependenciesUsed: number;
  /** Exit code */
  exitCode: number;
}

/**
 * File generated during execution
 */
export interface ExecutionFile {
  /** File name */
  name: string;
  /** File path relative to execution directory */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File content (base64 encoded for binary) */
  content: string;
  /** Whether content is base64 encoded */
  isBase64: boolean;
  /** File creation timestamp */
  createdAt: string;
}

/**
 * Code analysis result
 */
export interface CodeAnalysisResult {
  /** Whether code is valid */
  isValid: boolean;
  /** Detected language (if not specified) */
  detectedLanguage?: ProgrammingLanguage;
  /** Code complexity score (1-10) */
  complexity: number;
  /** Security risk assessment */
  securityRisk: 'low' | 'medium' | 'high';
  /** Detected issues */
  issues: CodeIssue[];
  /** Estimated execution time */
  estimatedRuntime?: number;
  /** Required dependencies */
  dependencies: string[];
  /** Suggested optimizations */
  optimizations: string[];
}

/**
 * Code issue/warning
 */
export interface CodeIssue {
  /** Issue type */
  type: 'error' | 'warning' | 'info' | 'security';
  /** Issue severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Issue message */
  message: string;
  /** Line number where issue occurs */
  line?: number;
  /** Column number */
  column?: number;
  /** Suggested fix */
  suggestion?: string;
  /** Rule/check that detected this issue */
  rule?: string;
}

/**
 * Code interpreter response
 */
export interface CodeInterpreterResponse {
  /** User query that triggered execution */
  query: string;
  /** Execution results */
  results: CodeExecutionResult[];
  /** Analysis results */
  analysis: CodeAnalysisResult[];
  /** Overall success status */
  success: boolean;
  /** Processing statistics */
  processingStats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    totalProcessingTime: number;
    averageExecutionTime: number;
    cacheHits: number;
  };
  /** Error information if any */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Response metadata */
  metadata?: {
    totalCodeBlocks: number;
    languagesDetected: ProgrammingLanguage[];
    executionMethod: 'sequential' | 'parallel';
    securityChecksPerformed: boolean;
  };
}

/**
 * Code validation result
 */
export interface CodeValidationResult {
  /** Whether code is valid and safe to execute */
  isValid: boolean;
  /** Whether code is safe (no security risks) */
  isSafe: boolean;
  /** Validation errors */
  errors: string[];
  /** Security warnings */
  securityWarnings: string[];
  /** Detected dangerous patterns */
  dangerousPatterns: string[];
  /** Required permissions */
  requiredPermissions: string[];
}

/**
 * Supported library configurations
 */
export interface LibraryConfig {
  /** Library name */
  name: string;
  /** Supported versions */
  versions: string[];
  /** Default version */
  defaultVersion: string;
  /** Import aliases */
  aliases?: string[];
  /** Security risk level */
  riskLevel: 'low' | 'medium' | 'high';
  /** Description */
  description?: string;
}

/**
 * Code execution environment configuration
 */
export interface EnvironmentConfig {
  /** Environment identifier */
  id: ExecutionEnvironment;
  /** Display name */
  name: string;
  /** Programming language */
  language: ProgrammingLanguage;
  /** Base image/container */
  baseImage: string;
  /** Pre-installed libraries */
  preInstalledLibraries: LibraryConfig[];
  /** Resource limits */
  resourceLimits: {
    maxMemoryMb: number;
    maxExecutionTimeMs: number;
    maxFilesMb: number;
    maxProcesses: number;
  };
  /** Security configuration */
  security: {
    networkAccess: boolean;
    fileSystemAccess: 'none' | 'read-only' | 'sandboxed';
    allowedDomains?: string[];
    blockedFunctions: string[];
  };
}

/**
 * Error types for code execution
 */
export enum CodeInterpreterErrorType {
  SYNTAX_ERROR = 'syntax_error',
  RUNTIME_ERROR = 'runtime_error',
  TIMEOUT_ERROR = 'timeout_error',
  MEMORY_ERROR = 'memory_error',
  SECURITY_ERROR = 'security_error',
  DEPENDENCY_ERROR = 'dependency_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  ENVIRONMENT_ERROR = 'environment_error',
  PERMISSION_ERROR = 'permission_error',
}

/**
 * Code execution metrics for monitoring
 */
export interface CodeInterpreterMetrics {
  /** Total executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Average execution time */
  averageExecutionTime: number;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Error distribution */
  errorDistribution: Record<CodeInterpreterErrorType, number>;
  /** Language usage distribution */
  languageDistribution: Record<ProgrammingLanguage, number>;
  /** Resource usage */
  resourceUsage: {
    averageMemoryMb: number;
    averageCpuUsage: number;
    peakMemoryMb: number;
    peakCpuUsage: number;
  };
  /** Security events */
  securityEvents: {
    blockedExecutions: number;
    securityWarnings: number;
    dangerousPatterns: number;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CODE_INTERPRETER_CONFIG: Required<CodeInterpreterConfig> =
  {
    foundryEndpoint: '',
    projectId: '',
    defaultTimeout: 30000, // 30 seconds
    maxMemoryMb: 512,
    enableValidation: true,
    enableCaching: true,
    cacheTtl: 3600, // 1 hour
    allowedLibraries: {
      [ProgrammingLanguage.PYTHON]: [
        'numpy',
        'pandas',
        'matplotlib',
        'seaborn',
        'scikit-learn',
        'requests',
        'json',
        'csv',
        'datetime',
        'math',
        'statistics',
        'plotly',
        'scipy',
        'sympy',
        'pillow',
      ],
      [ProgrammingLanguage.JAVASCRIPT]: [
        'lodash',
        'axios',
        'moment',
        'uuid',
        'crypto-js',
        'chart.js',
        'd3',
        'express',
        'fs',
        'path',
      ],
      [ProgrammingLanguage.TYPESCRIPT]: [
        'lodash',
        'axios',
        'moment',
        'uuid',
        'crypto-js',
        'chart.js',
        'd3',
        'express',
        'fs',
        'path',
      ],
      [ProgrammingLanguage.SQL]: [],
      [ProgrammingLanguage.BASH]: [],
      [ProgrammingLanguage.R]: [
        'ggplot2',
        'dplyr',
        'tidyr',
        'readr',
        'lubridate',
        'stringr',
        'forcats',
        'purrr',
        'tibble',
      ],
    },
    blockedFunctions: {
      [ProgrammingLanguage.PYTHON]: [
        'exec',
        'eval',
        'compile',
        '__import__',
        'open',
        'input',
        'raw_input',
        'file',
        'execfile',
      ],
      [ProgrammingLanguage.JAVASCRIPT]: [
        'eval',
        'Function',
        'setTimeout',
        'setInterval',
        'require',
        'import',
        'process',
        'global',
      ],
      [ProgrammingLanguage.TYPESCRIPT]: [
        'eval',
        'Function',
        'setTimeout',
        'setInterval',
        'require',
        'import',
        'process',
        'global',
      ],
      [ProgrammingLanguage.SQL]: [
        'DROP',
        'DELETE',
        'UPDATE',
        'INSERT',
        'CREATE',
        'ALTER',
        'TRUNCATE',
        'GRANT',
        'REVOKE',
      ],
      [ProgrammingLanguage.BASH]: [
        'rm',
        'mv',
        'cp',
        'chmod',
        'chown',
        'sudo',
        'su',
        'passwd',
        'useradd',
        'userdel',
      ],
      [ProgrammingLanguage.R]: ['system', 'system2', 'shell', 'Sys.setenv'],
    },
    resourceLimits: {
      maxExecutionTime: 30000,
      maxMemoryUsage: 512,
      maxFileSize: 10,
      maxOutputLength: 100000,
    },
  };

/**
 * Custom error class for code interpreter operations
 */
export class CodeInterpreterError extends Error {
  constructor(
    message: string,
    public code: CodeInterpreterErrorType,
    public details?: any,
    public executionId?: string,
  ) {
    super(message);
    this.name = 'CodeInterpreterError';
  }
}

/**
 * Code execution job for queue processing
 */
export interface CodeExecutionJob {
  /** Job ID */
  id: string;
  /** Code execution request */
  request: CodeExecutionRequest;
  /** Job priority */
  priority: 'low' | 'normal' | 'high';
  /** Job status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Creation timestamp */
  createdAt: string;
  /** Started timestamp */
  startedAt?: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Execution result */
  result?: CodeExecutionResult;
  /** Error information */
  error?: {
    type: CodeInterpreterErrorType;
    message: string;
    details?: any;
  };
  /** Retry count */
  retryCount: number;
  /** Maximum retries allowed */
  maxRetries: number;
}
