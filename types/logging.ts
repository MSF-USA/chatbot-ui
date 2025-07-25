/**
 * Base log entry interface containing common fields for all log types.
 */
export interface BaseLogEntry {
  EventType: string;
  UserId?: string;
  UserJobTitle?: string;
  UserGivenName?: string;
  UserSurName?: string;
  UserDepartment?: string;
  UserDisplayName?: string;
  UserEmail?: string;
  UserCompanyName?: string;
  BotId?: string;
  Env?: string;
  Duration?: number;
}

/**
 * Message-related log entry interface extending base with message-specific fields.
 */
export interface MessageLogEntry extends BaseLogEntry {
  ModelUsed: string;
  MessageCount: number;
  Temperature: number;
  FileUpload?: boolean;
  FileName?: string;
  FileSize?: number;
}

/**
 * Search success log entry interface.
 */
export interface SearchLogEntry extends BaseLogEntry {
  Status: 'success';
  ResultCount: number;
  OldestDate?: string;
  NewestDate?: string;
}

/**
 * Message error log entry interface.
 */
export interface MessageErrorLogEntry extends MessageLogEntry {
  Status: 'error';
  ErrorMessage: string;
  ErrorStack?: string;
  StatusCode?: number;
}

/**
 * Search error log entry interface.
 */
export interface SearchErrorLogEntry extends BaseLogEntry {
  Status: 'error';
  ErrorMessage: string;
  ErrorStack?: string;
}

/**
 * Message success log entry interface.
 */
export interface MessageSuccessLogEntry extends MessageLogEntry {
  Status: 'success';
}

/**
 * File log entry interface for logging file-related operations.
 */
export interface FileLogEntry extends BaseLogEntry {
  EventType:
    | 'FileUploadSuccess'
    | 'FileUploadError'
    | 'DocumentSummarySuccess'
    | 'DocumentSummaryError'
    | 'FileOperationSuccess'
    | 'FileOperationError';
  ModelUsed: string;
  Duration: number;
  FileUpload: boolean;
  FileName?: string;
  FileSize?: number;
  ChunkCount?: number;
  ProcessedChunkCount?: number;
  FailedChunkCount?: number;
  StreamMode?: boolean;
  Status: 'success' | 'error';
  ErrorMessage?: string;
  ErrorStack?: string;
}

/**
 * Base metadata interface for agent logging
 */
export interface LogMetadata {
  agentId?: string;
  agentType?: string;
  [key: string]: unknown;
}

/**
 * Info log metadata interface
 */
export interface InfoLogMetadata extends LogMetadata {
  language?: string;
  sandboxPath?: string;
  processingTime?: number;
  codeBlocksExecuted?: number;
  totalExecutionTime?: number;
  supportedLanguages?: string[];
}

/**
 * Error log metadata interface
 */
export interface ErrorLogMetadata extends LogMetadata {
  language?: string;
  sandboxPath?: string;
  processingTime?: number;
  query?: string;
  executionTime?: number;
  correlationId?: string;
}

/**
 * Warning log metadata interface
 */
export interface WarningLogMetadata extends LogMetadata {
  error?: string;
  sandboxPath?: string;
}

/**
 * Union type of all possible log entry types.
 */
export type LogEntry =
  | MessageErrorLogEntry
  | MessageSuccessLogEntry
  | SearchErrorLogEntry
  | SearchLogEntry
  | FileLogEntry;
