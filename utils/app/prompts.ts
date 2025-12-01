import { ImageMessageContent, TextMessageContent } from '@/types/chat';
import { Prompt } from '@/types/prompt';

export const updatePrompt = (updatedPrompt: Prompt, allPrompts: Prompt[]) => {
  const updatedPrompts = allPrompts.map((c) => {
    if (c.id === updatedPrompt.id) {
      return updatedPrompt;
    }

    return c;
  });

  savePrompts(updatedPrompts);

  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const savePrompts = (prompts: Prompt[]) => {
  localStorage.setItem('prompts', JSON.stringify(prompts));
};

export const getFullMessageFromPromptAndContent = (
  prompt: Prompt,
  content: string | Array<TextMessageContent | ImageMessageContent>,
): string | Array<TextMessageContent | ImageMessageContent> => {
  if (Array.isArray(content)) {
    return content.map((contentMessage) => {
      return contentMessage.type === 'text'
        ? ({
            type: 'text',
            text: contentMessage?.text?.replace(/\/\w*$/, prompt.content),
          } as TextMessageContent)
        : contentMessage;
    });
  } else {
    const newContent = content?.replace(/\/\w*$/, prompt.content);
    return newContent;
  }
};
