import { Conversation, Message, FileMessageContent, TextMessageContent } from '@/types/chat';

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  localStorage.setItem('selectedConversation', JSON.stringify(conversation));
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem('conversationHistory', JSON.stringify(conversations));
};

export const generateTitleFromAPI = async (
  conversation: Conversation,
  user: any,
): Promise<string | null> => {
  try {
    // Only attempt to generate a title if there's at least one response message
    const hasResponseMessage = conversation.messages.some(
      (msg) => msg.role === 'assistant'
    );

    if (!hasResponseMessage) {
      return null;
    }

    const response = await fetch('/api/v2/chat/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: conversation.messages,
        user: user,
        modelId: conversation.model?.id,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate title');
    }

    const data = await response.json();
    return data.title;
  } catch (error) {
    console.error('Error generating title:', error);
    return null;
  }
};

export const setConversationTitle = async (
  updatedConversation: Conversation,
  message: Message,
  user: any,
): Promise<Conversation> => {
  // First try to generate a title using the API
  const generatedTitle = await generateTitleFromAPI(updatedConversation, user);

  if (generatedTitle) {
    return {
      ...updatedConversation,
      name: generatedTitle,
    };
  }

  // Fallback to the old method if API fails or there's not enough conversation
  let title = '';
  if (typeof message.content === 'string') {
    title = message.content.substring(0, 30);
  } else if (Array.isArray(message.content)) {
    const contentTypes = message.content.map((section) => section.type);
    if (contentTypes.includes('image_url')) {
      title = 'Image Chat';
    } else if (contentTypes.includes('file_url')) {
      const fileSection = (
        message.content as (FileMessageContent | TextMessageContent)[]
      ).find(
        (section) => (section as FileMessageContent).originalFilename,
      ) as FileMessageContent;
      title = fileSection?.originalFilename
        ? `File: ${fileSection.originalFilename.substring(0, 20)}`
        : 'File Chat';
    } else {
      const textSection = (
        message.content as (TextMessageContent | any)[]
      ).find(
        (section) => (section as TextMessageContent).type === 'text',
      ) as TextMessageContent;
      title = textSection?.text
        ? textSection.text.substring(0, 30)
        : 'New Chat';
    }
  } else if ((message.content as TextMessageContent)?.type === 'text') {
    title = (message.content as TextMessageContent).text.substring(0, 30);
  } else {
    title = 'New Chat';
  }

  title = title.trim().length > 0 ? title : 'New Chat';
  title = title.length > 30 ? title.substring(0, 30) + '...' : title;

  return {
    ...updatedConversation,
    name: title,
  };
};
