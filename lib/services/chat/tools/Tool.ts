import { Session } from 'next-auth';

import { Message, ToolType } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { Citation } from '@/types/rag';

/**
 * Result from tool execution
 */
export interface ToolResult {
  text: string;
  citations?: Citation[];
}

/**
 * Base interface for all tools.
 * Tools are discrete capabilities that can be used during a conversation
 * without sending the full conversation to AI Foundry.
 */
export interface Tool {
  /**
   * The type of tool (used for routing and identification)
   */
  readonly type: ToolType;

  /**
   * Human-readable name of the tool
   */
  readonly name: string;

  /**
   * Description of what this tool does
   */
  readonly description: string;

  /**
   * Executes the tool with the given parameters.
   *
   * @param params - Tool-specific parameters
   * @returns Tool execution result with text and optional citations
   */
  execute(params: ToolExecutionParams): Promise<ToolResult>;
}

/**
 * Base parameters for tool execution
 */
export interface ToolExecutionParams {
  user: Session['user'];
  model?: OpenAIModel;
  [key: string]: any; // Allow tool-specific parameters
}

/**
 * Web search tool parameters
 */
export interface WebSearchToolParams extends ToolExecutionParams {
  searchQuery: string;
  model: OpenAIModel; // Required for web search
}
