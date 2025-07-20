import {Dispatch, SetStateAction} from 'react';

import {makeRequest} from '@/services/frontendChatServices';

import {
  AgentExecutionApiRequest,
  AgentExecutionApiResponse,
  IntentAnalysisApiRequest,
  IntentAnalysisApiResponse,
} from '@/types/agentApi';
import {AgentType} from '@/types/agent';
import {
  ChatRequestResult,
  Conversation,
  FileMessageContent,
  Message,
  MessageType,
  TextMessageContent,
} from '@/types/chat';
import {Plugin, PluginID} from '@/types/plugin';
import {AgentSettings} from '@/types/settings';

/**
 * Result of agentic chat processing
 */
export interface AgenticChatResult extends ChatRequestResult {
  /** Whether an agent was used in processing */
  usedAgent: boolean;
  /** Type of agent used (if any) */
  agentType?: AgentType;
  /** Agent confidence score */
  agentConfidence?: number;
  /** Intent analysis result */
  intent?: string;
  /** Whether fallback to standard chat occurred */
  fellBackToStandardChat: boolean;
  /** Processing metadata */
  processingMetadata?: {
    intentAnalysisTime: number;
    agentExecutionTime?: number;
    standardChatTime?: number;
    totalProcessingTime: number;
  };
}

/**
 * Configuration for agentic chat processing
 */
export interface AgenticChatConfig {
  /** User agent settings */
  agentSettings: AgentSettings;
  /** Whether to enable debug logging */
  enableDebugLogging?: boolean;
  /** Timeout for intent analysis (ms) */
  intentAnalysisTimeout?: number;
  /** Timeout for agent execution (ms) */
  agentExecutionTimeout?: number;
}

/**
 * AgenticFrontendService - Intelligent chat routing using intent analysis and agents
 */
export class AgenticFrontendService {
  private config: AgenticChatConfig;

  constructor(config: AgenticChatConfig) {
    this.config = config;
  }

  /**
   * Main orchestration method for agentic chat
   */
  async handleRequest(
    plugin: Plugin | null,
    setRequestStatusMessage: Dispatch<SetStateAction<string | null>>,
    updatedConversation: Conversation,
    apiKey: string,
    pluginKeys: { pluginId: PluginID; requiredKeys: any[] }[],
    systemPrompt: string,
    temperature: number,
    stream: boolean = true,
    setProgress: Dispatch<SetStateAction<number | null>>,
    stopConversationRef?: { current: boolean },
  ): Promise<AgenticChatResult> {
    const startTime = Date.now();
    let usedAgent = false;
    let agentType: AgentType | undefined;
    let agentConfidence: number | undefined;
    let intent: string | undefined;
    let fellBackToStandardChat = false;
    let intentAnalysisTime = 0;
    let agentExecutionTime: number | undefined;
    let standardChatTime: number | undefined;

    try {
      this.log('Starting agentic chat processing');

      // Step 1: Check if agents are enabled
      const shouldUseAgentsResult = this.shouldUseAgents(updatedConversation);
      this.log('=== AGENT ROUTING DECISION ===');
      this.log(`shouldUseAgents result: ${shouldUseAgentsResult}`);
      this.log(`Agent settings:`, {
        enabled: this.config.agentSettings.enabled,
        enabledAgentTypes: this.config.agentSettings.enabledAgentTypes,
        confidenceThreshold: this.config.agentSettings.confidenceThreshold
      });
      
      if (!shouldUseAgentsResult) {
        this.log('❌ Agents disabled or not applicable, using standard chat');
        return await this.executeStandardWorkflow(
          plugin,
          setRequestStatusMessage,
          updatedConversation,
          apiKey,
          pluginKeys,
          systemPrompt,
          temperature,
          stream,
          setProgress,
          stopConversationRef,
          { usedAgent: false, fellBackToStandardChat: false, startTime }
        );
      }
      
      this.log('✅ Agents are enabled, proceeding with intent analysis');

      // Step 2: Analyze intent
      setRequestStatusMessage('Analyzing your request...');
      const intentStartTime = Date.now();
      
      const lastMessage = updatedConversation.messages[updatedConversation.messages.length - 1];
      const messageText = this.extractMessageText(lastMessage);
      
      const intentResult = await this.analyzeIntent(messageText);
      intentAnalysisTime = Date.now() - intentStartTime;
      
      this.log('=== INTENT ANALYSIS RESULT ===');
      this.log('Intent result:', {
        success: intentResult.success,
        hasData: !!intentResult.data,
        error: intentResult.error
      });
      
      if (!intentResult.success || !intentResult.data) {
        this.log('❌ Intent analysis failed, falling back to standard chat');
        if (intentResult.error) {
          this.log('Intent analysis error:', intentResult.error);
        }
        fellBackToStandardChat = true;
        return await this.executeStandardWorkflow(
          plugin,
          setRequestStatusMessage,
          updatedConversation,
          apiKey,
          pluginKeys,
          systemPrompt,
          temperature,
          stream,
          setProgress,
          stopConversationRef,
          { usedAgent: false, fellBackToStandardChat: true, startTime }
        );
      }

      intent = intentResult.data.analysisMethod; // Use analysis method as intent
      agentConfidence = intentResult.data.confidence;
      agentType = intentResult.data.recommendedAgent;

      this.log('✅ Intent analysis completed successfully:');
      this.log(`  Analysis Method: ${intent}`);
      this.log(`  Confidence: ${agentConfidence}`);
      this.log(`  Recommended Agent: ${agentType}`);
      this.log(`  Full Intent Data:`, intentResult.data);

      // Step 3: Check if we should use an agent based on confidence and settings
      this.log('=== AGENT SELECTION DECISION ===');
      const shouldUseAgent = this.shouldUseAgentBasedOnIntent(intentResult.data, agentType);
      
      this.log(`shouldUseAgentBasedOnIntent result: ${shouldUseAgent}`);
      
      // Get agent-specific threshold for logging
      const agentConfig = agentType ? this.config.agentSettings.agentConfigurations[agentType] : null;
      const effectiveThreshold = agentConfig?.confidenceThreshold ?? this.config.agentSettings.confidenceThreshold;
      
      this.log('Decision factors:', {
        hasIntentData: !!intentResult.data,
        hasAgentType: !!agentType,
        confidence: agentConfidence,
        globalThreshold: this.config.agentSettings.confidenceThreshold,
        agentSpecificThreshold: agentConfig?.confidenceThreshold,
        effectiveThreshold: effectiveThreshold,
        passesThreshold: agentConfidence >= effectiveThreshold,
        agentTypeEnabled: agentType ? this.config.agentSettings.enabledAgentTypes.includes(agentType) : false,
        agentConfigEnabled: agentConfig?.enabled
      });
      
      if (!shouldUseAgent) {
        this.log('❌ Agent not recommended or confidence too low, using standard chat');
        return await this.executeStandardWorkflow(
          plugin,
          setRequestStatusMessage,
          updatedConversation,
          apiKey,
          pluginKeys,
          systemPrompt,
          temperature,
          stream,
          setProgress,
          stopConversationRef,
          { usedAgent: false, fellBackToStandardChat: false, startTime },
          true // ai has determined this is standard, so do not check again
        );
      }

      this.log(`✅ Proceeding with ${agentType} agent execution`);

      // Step 4: Execute agent workflow
      try {
        this.log('=== AGENT EXECUTION ===');
        setRequestStatusMessage(`Processing with ${agentType} agent...`);
        const agentStartTime = Date.now();
        
        this.log(`Executing ${agentType} agent with query: "${messageText}"`);
        const agentResult = await this.executeAgentWorkflow(
          agentType!,
          messageText,
          updatedConversation,
          setProgress,
          stopConversationRef
        );
        
        agentExecutionTime = Date.now() - agentStartTime;
        usedAgent = true;

        this.log('Agent execution result:', {
          success: agentResult.success,
          hasData: !!agentResult.data,
          executionTime: agentExecutionTime,
          error: agentResult.error
        });

        if (!agentResult.success || !agentResult.data) {
          this.log('❌ Agent execution failed, falling back to standard chat');
          if (agentResult.error) {
            this.log('Agent execution error:', agentResult.error);
          }
          fellBackToStandardChat = true;
          return await this.executeStandardWorkflow(
            plugin,
            setRequestStatusMessage,
            updatedConversation,
            apiKey,
            pluginKeys,
            systemPrompt,
            temperature,
            stream,
            setProgress,
            stopConversationRef,
            { usedAgent: false, fellBackToStandardChat: true, startTime }
          );
        }

        // Step 5: Process agent result through standard chat for final response
        setRequestStatusMessage('Generating final response...');
        const standardChatStartTime = Date.now();
        
        const processedConversation = await this.processAgentResult(
          agentResult.data,
          updatedConversation,
          messageText
        );
        
        const finalResult = await this.executeStandardWorkflow(
          plugin,
          setRequestStatusMessage,
          processedConversation,
          apiKey,
          pluginKeys,
          systemPrompt,
          temperature,
          stream,
          setProgress,
          stopConversationRef,
          { usedAgent: true, fellBackToStandardChat: false, startTime },
          true // Force standard chat for final processing
        );
        
        standardChatTime = Date.now() - standardChatStartTime;

        // Return enhanced result with agent metadata
        return {
          ...finalResult,
          usedAgent: true,
          agentType,
          agentConfidence,
          intent,
          fellBackToStandardChat: false,
          processingMetadata: {
            intentAnalysisTime,
            agentExecutionTime,
            standardChatTime,
            totalProcessingTime: Date.now() - startTime,
          },
        };

      } catch (agentError) {
        this.log('Agent workflow failed, falling back to standard chat', agentError);
        fellBackToStandardChat = true;
        return await this.executeStandardWorkflow(
          plugin,
          setRequestStatusMessage,
          updatedConversation,
          apiKey,
          pluginKeys,
          systemPrompt,
          temperature,
          stream,
          setProgress,
          stopConversationRef,
          { usedAgent: false, fellBackToStandardChat: true, startTime }
        );
      }

    } catch (error) {
      this.log('Agentic processing failed completely, falling back to standard chat', error);
      return await this.executeStandardWorkflow(
        plugin,
        setRequestStatusMessage,
        updatedConversation,
        apiKey,
        pluginKeys,
        systemPrompt,
        temperature,
        stream,
        setProgress,
        stopConversationRef,
        { usedAgent: false, fellBackToStandardChat: true, startTime }
      );
    }
  }

  /**
   * Execute standard chat workflow (existing makeRequest logic)
   */
  private async executeStandardWorkflow(
    plugin: Plugin | null,
    setRequestStatusMessage: Dispatch<SetStateAction<string | null>>,
    updatedConversation: Conversation,
    apiKey: string,
    pluginKeys: { pluginId: PluginID; requiredKeys: any[] }[],
    systemPrompt: string,
    temperature: number,
    stream: boolean,
    setProgress: Dispatch<SetStateAction<number | null>>,
    stopConversationRef: { current: boolean } | undefined,
    metadata: { usedAgent: boolean; fellBackToStandardChat: boolean; startTime: number },
    forceStandardChat?: boolean
  ): Promise<AgenticChatResult> {
    const standardChatStartTime = Date.now();
    
    // If forceStandardChat is true, we need to modify the request to include this flag
    // The simplest approach is to use makeRequest but modify the conversation to include the flag
    const result = await makeRequest(
      plugin,
      setRequestStatusMessage,
      updatedConversation,
      apiKey,
      pluginKeys,
      systemPrompt,
      temperature,
      stream,
      setProgress,
      stopConversationRef,
      forceStandardChat // Pass the force flag to makeRequest
    );

    const standardChatTime = Date.now() - standardChatStartTime;

    return {
      ...result,
      usedAgent: metadata.usedAgent,
      fellBackToStandardChat: metadata.fellBackToStandardChat,
      processingMetadata: {
        intentAnalysisTime: 0,
        standardChatTime,
        totalProcessingTime: Date.now() - metadata.startTime,
      },
    };
  }

  /**
   * Execute agent workflow
   */
  private async executeAgentWorkflow(
    agentType: AgentType,
    query: string,
    conversation: Conversation,
    setProgress: Dispatch<SetStateAction<number | null>>,
    stopConversationRef?: { current: boolean }
  ): Promise<AgentExecutionApiResponse> {
    this.log('=== executeAgentWorkflow START ===');
    
    const request: AgentExecutionApiRequest = {
      agentType,
      query,
      model: {
        id: conversation.model.id,
        tokenLimit: conversation.model.tokenLimit,
      },
      config: this.getAgentConfiguration(agentType),
      timeout: this.config.agentExecutionTimeout || 30000,
    };

    this.log('Agent execution request:', {
      agentType,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      model: request.model,
      configKeys: Object.keys(request.config || {}),
      timeout: request.timeout
    });

    const response = await fetch('/api/v2/agent/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    this.log('Agent execution response:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.log('Agent execution error response body:', errorText);
      throw new Error(`Agent execution failed: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    this.log('Agent execution result parsed successfully');
    return result;
  }

  /**
   * Process agent result by incorporating it into conversation for final AI processing
   */
  private async processAgentResult(
    agentData: AgentExecutionApiResponse['data'],
    originalConversation: Conversation,
    originalQuery: string
  ): Promise<Conversation> {
    if (!agentData) {
      throw new Error('No agent data to process');
    }

    // Create an enhanced prompt that includes the agent's findings
    let enhancedPrompt = `Based on the following information retrieved by the ${agentData.agentType} agent, please provide a comprehensive response to the user's question.

User's original question: ${originalQuery}

Agent findings:
${agentData.content}`;

    // Add structured content if available
    if (agentData.structuredContent && agentData.structuredContent.items.length > 0) {
      enhancedPrompt += `\n\nAdditional context:`;
      agentData.structuredContent.items.forEach((item, index) => {
        enhancedPrompt += `\n\n[Source ${index + 1}: ${item.source}]\n${item.content}`;
      });
    }

    enhancedPrompt += `\n\nPlease synthesize this information and provide a helpful, accurate response to the user's question.`;

    // Add agent-specific instructions based on the agent type used
    if (agentData.agentType === AgentType.WEB_SEARCH) {
      this.log('Adding web search specific instruction: include references and citations');
      enhancedPrompt += `\n\nAdditionally, when presenting your response, please include proper references and citations to the sources provided in the agent findings. Use numbered, markdown citations and provide a reference list at the end if multiple sources are cited.`;
    } else if (agentData.agentType === AgentType.LOCAL_KNOWLEDGE) {
      this.log('Adding local knowledge specific instruction: respond directly without meta-commentary');
      enhancedPrompt += `\n\nPlease respond directly to the user's original question using the provided information. Do not include additional commentary about the request, explanations about the information source, or meta-discussion about the response process. Focus solely on answering the user's question.`;
    } else if (agentData.agentType === AgentType.URL_PULL) {
      this.log('Adding URL pull specific instruction: try to be clear what information relates to what url, if multiple are provided');
      enhancedPrompt += `\n\nPlease respond directly to the user's original question using the provided information. If multiple urls are provided, please try to be clear which information relates to which url. If the article is in a different language from what the user is using, provide at least a translation of the title.`;
    } else {
      this.log(`No specific instructions for agent type: ${agentData.agentType}`);
    }

    // Create a new message with the enhanced prompt
    const enhancedMessage: Message = {
      role: 'user',
      content: [{ type: 'text', text: enhancedPrompt } as TextMessageContent],
      messageType: MessageType.TEXT,
    };

    // Replace the last message with our enhanced version
    const messages = [...originalConversation.messages.slice(0, -1), enhancedMessage];

    return {
      ...originalConversation,
      messages,
    };
  }

  /**
   * Analyze user intent using the intent analysis API
   */
  private async analyzeIntent(message: string): Promise<IntentAnalysisApiResponse> {
    const request: IntentAnalysisApiRequest = { message };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, this.config.intentAnalysisTimeout || 5000);

    try {
      const response = await fetch('/api/v2/agent/intent-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Intent analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check if agents should be used for this conversation
   */
  private shouldUseAgents(conversation: Conversation): boolean {
    this.log('=== shouldUseAgents EVALUATION ===');
    
    // Check if agents are globally enabled
    this.log(`Agents globally enabled: ${this.config.agentSettings.enabled}`);
    if (!this.config.agentSettings.enabled) {
      this.log('❌ Agents globally disabled');
      return false;
    }

    // Check if any agent types are enabled
    this.log(`Enabled agent types: ${this.config.agentSettings.enabledAgentTypes.length} types`);
    this.log(`Enabled types list:`, this.config.agentSettings.enabledAgentTypes);
    if (this.config.agentSettings.enabledAgentTypes.length === 0) {
      this.log('❌ No agent types enabled');
      return false;
    }

    // Check the most recent user message for conditions that should skip agents
    const lastMessage = conversation.messages[conversation.messages.length - 1];
    
    // Skip if not a user message
    if (lastMessage.role !== 'user') {
      this.log('❌ Last message is not from user, skipping agents');
      return false;
    }

    const messageContent = lastMessage.content;
    const isArrayContent = Array.isArray(messageContent);
    
    this.log(`Message content analysis:`, {
      isArray: isArrayContent,
      contentLength: isArrayContent ? messageContent.length : 'not array',
      messageType: lastMessage.messageType
    });

    // Check for file uploads (FileMessageContent)
    if (isArrayContent) {
      const hasFileUpload = messageContent.some((content: any) => content.type === 'file_url');
      if (hasFileUpload) {
        this.log('❌ File upload detected, skipping agents for better performance');
        return false;
      }

      // Check for image uploads (ImageMessageContent)
      const hasImageUpload = messageContent.some((content: any) => content.type === 'image_url');
      if (hasImageUpload) {
        this.log('❌ Image upload detected, skipping agents for better performance');
        return false;
      }

      // Check for multiple content items (complex content)
      if (messageContent.length > 1) {
        this.log('❌ Multiple content items detected, skipping agents for existing compatibility');
        return false;
      }
    }

    // Check for very long text messages (> 2000 characters)
    const textContent = this.extractMessageText(lastMessage);
    if (textContent.length > 2000) {
      this.log(`❌ Very long message detected (${textContent.length} chars), skipping agents for performance`);
      return false;
    }

    this.log(`✅ Message content checks passed (${textContent.length} chars), agents can be used`);

    this.log('✅ All checks passed, agents should be used');
    return true;
  }

  /**
   * Check if we should use an agent based on intent analysis
   */
  private shouldUseAgentBasedOnIntent(
    intentData: IntentAnalysisApiResponse['data'],
    agentType?: AgentType
  ): boolean {
    if (!intentData || !agentType) {
      return false;
    }

    // Check if the recommended agent type is enabled
    if (!this.config.agentSettings.enabledAgentTypes.includes(agentType)) {
      return false;
    }

    // Check if the specific agent is enabled in configuration
    const agentConfig = this.config.agentSettings.agentConfigurations[agentType];
    if (!agentConfig || !agentConfig.enabled) {
      return false;
    }

    // Use agent-specific confidence threshold if available, otherwise use global threshold
    const threshold = agentConfig.confidenceThreshold ?? this.config.agentSettings.confidenceThreshold;
    
    // Check confidence threshold
    if (intentData.confidence < threshold) {
      this.log(`Agent ${agentType} confidence ${intentData.confidence} below threshold ${threshold}`);
      return false;
    }

    return true;
  }

  /**
   * Map intent analysis suggested agent type to our AgentType enum
   */
  private mapSuggestedAgentType(suggested: string): AgentType | undefined {
    const mapping: Record<string, AgentType> = {
      'web_search': AgentType.WEB_SEARCH,
      'code_interpreter': AgentType.CODE_INTERPRETER,
      'local_knowledge': AgentType.LOCAL_KNOWLEDGE,
      'url_pull': AgentType.URL_PULL,
      'standard_chat': AgentType.STANDARD_CHAT,
    };

    return mapping[suggested];
  }

  /**
   * Get agent-specific configuration
   */
  private getAgentConfiguration(agentType: AgentType): Record<string, any> {
    const agentConfig = this.config.agentSettings.agentConfigurations[agentType];
    return agentConfig?.parameters || {};
  }

  /**
   * Extract text content from a message
   */
  private extractMessageText(message: Message): string {
    if (typeof message.content === 'string') {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      const textContent = (message.content as (TextMessageContent | FileMessageContent)[]).find(
        (content): content is TextMessageContent => content.type === 'text'
      );
      return textContent?.text || '';
    }

    return '';
  }


  /**
   * Debug logging
   */
  private log(message: string, data?: any): void {
    if (this.config.enableDebugLogging) {
      console.log(`[AgenticFrontendService] ${message}`, data || '');
    }
  }
}

/**
 * Factory function to create AgenticFrontendService instance
 */
export function createAgenticFrontendService(config: AgenticChatConfig): AgenticFrontendService {
  return new AgenticFrontendService(config);
}