import { Dispatch, SetStateAction } from 'react';

import { getEndpoint } from '@/utils/app/api';

import {
  ChatBody,
  Conversation,
  FileMessageContent,
  ImageMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';
import { Plugin, PluginID } from '@/types/plugin';

const isComplexContent = (
  content: (TextMessageContent | ImageMessageContent | FileMessageContent)[],
): boolean => {
  const contentTypes = content.map((section) => section.type);
  return (
    content.length > 2 ||
    (contentTypes.includes('file_url') && contentTypes.includes('image_url')) ||
    contentTypes.filter((type) => type === 'file_url').length > 1 ||
    contentTypes.filter((type) => type === 'image_url').length > 1
  );
};

const createChatBody = (
  conversation: Conversation,
  messages: Message[],
  apiKey: string,
  systemPrompt: string,
  temperature: number,
  botId: string | undefined,
  stream: boolean,
): ChatBody => ({
  model: conversation.model,
  messages,
  key: apiKey,
  prompt: conversation.prompt || systemPrompt,
  temperature: conversation.temperature || temperature,
  botId,
  stream,
});

const appendPluginKeys = (
  chatBody: ChatBody,
  pluginKeys: { pluginId: PluginID; requiredKeys: any[] }[],
) => ({
  ...chatBody,
  googleAPIKey: pluginKeys
    .find((key) => key.pluginId === PluginID.GOOGLE_SEARCH)
    ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
  googleCSEId: pluginKeys
    .find((key) => key.pluginId === PluginID.GOOGLE_SEARCH)
    ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
});

const sendRequest = async (endpoint: string, body: string) => {
  const controller = new AbortController();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body,
    mode: 'cors',
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${errorText}`,
    );
  }
  return { controller, body, response };
};

export const makeRequest = async (
  plugin: Plugin | null,
  setRequestStatusMessage: Dispatch<SetStateAction<string | null>>,
  updatedConversation: Conversation,
  apiKey: string,
  pluginKeys: { pluginId: PluginID; requiredKeys: any[] }[],
  systemPrompt: string,
  temperature: number,
  stream: boolean = true,
  setProgress: Dispatch<SetStateAction<number | null>>,
) => {
  const lastMessage: Message =
    updatedConversation.messages[updatedConversation.messages.length - 1];
  let hasComplexContent = false;

  if (
    Array.isArray(lastMessage.content) &&
    isComplexContent(lastMessage.content)
  ) {
    setRequestStatusMessage('Handling multi-file processing. Please wait...');
    hasComplexContent = true;
    const messageContent = lastMessage.content as (
      | TextMessageContent
      | ImageMessageContent
      | FileMessageContent
    )[];
    const messageText = messageContent.find(
      (content): content is TextMessageContent => content.type === 'text',
    );
    const nonTextContents = messageContent.filter(
      (content): content is ImageMessageContent | FileMessageContent =>
        content.type !== 'text',
    );

    let progressPercentage = 0;
    const totalFiles = nonTextContents.length + 1; // Final bit is the consolidated summary
    let filesProcessed = 0;
    setProgress(progressPercentage);

    const allMessagesExceptFinal = updatedConversation.messages.slice(0, -1);

    const fileSummaries: any[] = [];
    for (const content of nonTextContents) {
      const filename =
        content.type === 'file_url'
          ? content.originalFilename
          : `Image: ${content.image_url.url.split('/').pop()}`;
      setRequestStatusMessage(`Processing ${filename}...`);
      const summarizationPrompt = `
Please summarize the following document. This summary will be used to compare documents based on the user's prompt.

\`\`\`users-prompt
${messageText?.text ?? ''}
\`\`\`

Document metadata: ${filename}
`.trim();

      // Create a temporary message for summarization
      const temporaryLastMessage: Message = {
        role: 'user',
        content: [{ type: 'text', text: summarizationPrompt }, content as any],
        messageType: 'text',
      };

      const chatBody = createChatBody(
        updatedConversation,
        [...allMessagesExceptFinal.slice(-5), temporaryLastMessage],
        apiKey,
        systemPrompt,
        temperature,
        updatedConversation.bot,
        false, // Don't stream intermediate steps
      );
      const endpoint = getEndpoint(null);
      const requestBody = JSON.stringify(chatBody, null, 2);

      const { controller, response, body } = await sendRequest(
        endpoint,
        requestBody,
      );
      const responseData = await response.json();

      // Store the summary with a clear association to its file
      if (content.type === 'file_url') {
        fileSummaries.push({
          filename: content.originalFilename,
          summary: responseData.text ?? '',
        });
      } else {
        fileSummaries.push({
          filename: `Image: ${content.image_url.url.split('/').pop()}`,
          summary: responseData.text ?? '',
        });
      }

      filesProcessed++;
      progressPercentage = (filesProcessed / totalFiles) * 100;
      setProgress(progressPercentage);
    }
    setRequestStatusMessage(
      `File processing complete! Handling user prompt...`,
    );
    const comparisonPrompt = `
Please compare the following documents based on the user's prompt.

${fileSummaries
  .map(
    (summary) => `\`\`\`${summary.filename}
${summary.summary}
\`\`\``,
  )
  .join('\n\n')}

User's prompt: ${messageText?.text ?? ''}

Provide a detailed comparison.
`.trim();

    // Create a final message for comparison
    const finalMessage: Message = {
      role: 'user',
      content: [{ type: 'text', text: comparisonPrompt }],
      messageType: 'text',
    };

    // Create chatBody for the final request
    const chatBody = createChatBody(
      updatedConversation,
      [...allMessagesExceptFinal.slice(-5), finalMessage],
      apiKey,
      systemPrompt,
      temperature,
      updatedConversation.bot,
      stream, // Stream the final comparison response
    );

    const endpoint = getEndpoint(plugin);

    let requestBody = plugin
      ? JSON.stringify(appendPluginKeys(chatBody, pluginKeys))
      : JSON.stringify(chatBody);

    setProgress(progressPercentage);
    const { controller, body, response } = await sendRequest(
      endpoint,
      requestBody,
    );

    setRequestStatusMessage(null);
    setProgress(null);

    return {
      controller,
      body,
      response,
      hasComplexContent,
    };
  } else {
    const chatBody = createChatBody(
      updatedConversation,
      updatedConversation.messages.slice(-6),
      apiKey,
      systemPrompt,
      temperature,
      updatedConversation.bot,
      stream,
    );
    const endpoint = getEndpoint(plugin);

    let requestBody = plugin
      ? JSON.stringify(appendPluginKeys(chatBody, pluginKeys))
      : JSON.stringify(chatBody);
    const { controller, body, response } = await sendRequest(
      endpoint,
      requestBody,
    );

    return {
      controller,
      body,
      response,
      hasComplexContent,
    };
  }
};
