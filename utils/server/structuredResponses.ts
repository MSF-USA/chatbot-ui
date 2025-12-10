import { Session } from 'next-auth';

import { ImageMessageContent, Message, TextMessageContent } from '@/types/chat';

import { AzureOpenAI, OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions';

type OptimizedQueryResponse = {
  optimizedQuery: string;
  optimizedQuestion: string;
};

type OptimizedWebSearchQueryResponse = {
  optimizedQuery: string;
};

/**
 * Generic function to get a structured response from OpenAI's API based on a provided JSON schema.
 * @param openai - Instance of AzureOpenAI.
 * @param messages - Array of message objects for the conversation.
 * @param modelId - The ID of the model to use.
 * @param user - User session information.
 * @param jsonSchema - The JSON schema defining the expected response format.
 * @param temperature - Sampling temperature.
 * @param maxTokens - Maximum number of tokens to generate.
 * @returns A promise that resolves to a structured response of type T.
 */
export async function getStructuredResponse<T>(
  openai: AzureOpenAI,
  messages: ChatCompletionMessageParam[],
  modelId: string,
  user: Session['user'],
  jsonSchema: Record<string, unknown> | undefined,
  temperature: number = 0.7,
  maxTokens: number = 500,
): Promise<T> {
  const response = await openai.chat.completions.create({
    model: modelId,
    messages: messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'StructuredResponse',
        strict: true,
        schema: jsonSchema,
      },
    },
    temperature: temperature,
    max_tokens: maxTokens,
    user: JSON.stringify(user),
  });

  const content = response?.choices?.[0]?.message?.content?.trim() ?? '';

  try {
    const output = JSON.parse(content) as T;
    return output;
  } catch (error) {
    console.error('Failed to parse OpenAI response as JSON:', content);
    throw new Error('Failed to parse output');
  }
}

/**
 * Generates optimized search query and question from a user's raw question.
 * @param openai - Instance of AzureOpenAI.
 * @param question - The user's raw question.
 * @param user - User session information.
 * @param modelId - The ID of the model to use.
 * @returns A promise that resolves to an object containing the optimized query and question.
 */
export async function generateOptimizedQueryAndQuestion(
  openai: AzureOpenAI,
  question: string,
  user: Session['user'],
  modelId: string,
): Promise<OptimizedQueryResponse> {
  const prompt = `Given the user's raw question, generate an optimized search query to find relevant data from a search engine and an optimized question, which will be passed to an AI along with the found web pages to give the user useful information. Do not ignore or discard parts of the user query. Assume that every aspect is important and provides context.

Make sure your responses are relevant to the user's original question and fit for their intended purpose. Try to understand the user's intent, but if the context is ambiguous keep that ambiguity in your revisions to avoid drifting from the user's needs. If the user asks for any dates relative to the present, the current date is ${new Date().toISOString()}. But this is a search query, which can handle concepts like 'recent', so only include specific dates if it is directly relevant to the request / response.

Make sure the values of your response matches whatever language the original question was submitted in.

\`\`\`user-question
${question}
\`\`\`

Provide the output in JSON format with keys "optimizedQuery" and "optimizedQuestion".

Output format:
{
  "optimizedQuery": "...",
  "optimizedQuestion": "..."
}
`;

  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'You are an AI assistant that transforms user questions into optimized search queries and optimized questions for further processing.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const jsonSchema: Record<string, unknown> | undefined = {
    type: 'object',
    properties: {
      optimizedQuery: {
        type: 'string',
      },
      optimizedQuestion: {
        type: 'string',
      },
    },
    required: ['optimizedQuery', 'optimizedQuestion'],
    additionalProperties: false,
  };

  const response = await getStructuredResponse<OptimizedQueryResponse>(
    openai,
    messages,
    modelId,
    user,
    jsonSchema,
    0.7, // temperature
    500, // maxTokens
  );

  return response;
}

/**
 * Generates an optimized search query from conversation history and current query.
 * Analyzes the conversation context to create a search query that includes necessary
 * context from previous messages while emphasizing the most recent user question.
 *
 * @param openai - Instance of AzureOpenAI.
 * @param messages - Full conversation history.
 * @param currentQuery - The most recent user query.
 * @param user - User session information.
 * @param modelId - The ID of the model to use.
 * @returns A promise that resolves to an object containing the optimized search query.
 */
export async function generateOptimizedWebSearchQuery(
  openai: AzureOpenAI,
  messages: Message[],
  currentQuery: string,
  user: Session['user'],
  modelId: string,
): Promise<OptimizedWebSearchQueryResponse> {
  // Extract conversation context from the last 5-7 messages for relevance
  const relevantMessages = messages.slice(-7);

  // Build conversation context string
  let conversationContext = '';
  if (relevantMessages.length > 1) {
    const contextMessages = relevantMessages.slice(0, -1); // All except the last message
    conversationContext = contextMessages
      .map((msg, index) => {
        let content = '';
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (Array.isArray(msg.content)) {
          // Extract text content from complex message content
          const textContent = (
            msg.content as (TextMessageContent | ImageMessageContent)[]
          ).find((item) => item?.type === 'text');
          content = textContent
            ? (textContent as any).text
            : '[Non-text content]';
        }
        return `${msg.role === 'user' ? 'User' : 'Assistant'}: ${content}`;
      })
      .join('\n');
  }

  const prompt = `You are helping to optimize a web search query by analyzing conversation context. Your task is to create a search query that combines the user's current question with relevant context from their previous messages.

${
  conversationContext
    ? `Previous conversation context:
\`\`\`conversation-history
${conversationContext}
\`\`\`

`
    : ''
}Current user question:
\`\`\`current-question
${currentQuery}
\`\`\`

Generate an optimized search query that:
1. Emphasizes the current user question as the primary focus
2. Includes necessary context from the conversation history to make the search more specific and relevant
3. Combines related entities, topics, or references mentioned in previous messages
4. Maintains the original language and intent of the current question
5. Creates a search query that would return results relevant to answering the current question in the established context

Guidelines:
- If the current question is a follow-up that references previous topics (e.g., "who was the first president" after discussing a specific country), include that context
- If the current question is completely unrelated to previous messages, focus primarily on the current question
- Keep the query natural and searchable (avoid overly complex phrasing)
- Maintain the user's original language preference
- If dates are mentioned relatively (e.g., "recent", "latest"), the current date is ${
    new Date().toISOString().split('T')[0]
  }

Provide the output in JSON format with the key "optimizedQuery".

Output format:
{
  "optimizedQuery": "..."
}`;

  const structuredMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content:
        'You are an AI assistant that optimizes search queries by analyzing conversation context. You create contextually-aware search queries that improve search relevance for follow-up questions.',
    },
    {
      role: 'user',
      content: prompt,
    },
  ];

  const jsonSchema: Record<string, unknown> | undefined = {
    type: 'object',
    properties: {
      optimizedQuery: {
        type: 'string',
      },
    },
    required: ['optimizedQuery'],
    additionalProperties: false,
  };

  const response = await getStructuredResponse<OptimizedWebSearchQueryResponse>(
    openai,
    structuredMessages,
    modelId,
    user,
    jsonSchema,
    0.3, // Lower temperature for more consistent, focused optimization
    600, // Slightly higher token limit for context analysis
  );

  return response;
}
