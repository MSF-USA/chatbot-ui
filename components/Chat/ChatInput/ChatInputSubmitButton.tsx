import { IconLoader2, IconPlayerStop, IconSend2 } from '@tabler/icons-react';
import React, { FC } from 'react';

interface ChatInputSubmitButtonProps {
  isStreaming: boolean;
  isTranscribing: boolean;
  handleSend: () => void;
  handleStopConversation: () => void;
  preventSubmission: () => boolean;
}

const ChatInputSubmitButton: FC<ChatInputSubmitButtonProps> = ({
  isStreaming,
  handleSend,
  handleStopConversation,
  isTranscribing,
  preventSubmission,
}) => {
  return (
    <>
      {preventSubmission() ? (
        isStreaming ? (
          <button
            className="flex items-center justify-center w-10 h-10 rounded-full
                      bg-gray-300 text-black hover:bg-gray-400 dark:bg-[#171717] dark:text-white dark:hover:bg-[#252525]
                      transition-colors duration-200"
            onClick={handleStopConversation}
            disabled={!isStreaming}
            aria-label="Stop generation"
          >
            <IconPlayerStop size={18} />
          </button>
        ) : (
          <div className="flex items-center justify-center w-10 h-10">
            <IconLoader2 className="animate-spin text-gray-500" size={20} />
          </div>
        )
      ) : (
        <button
          onClick={handleSend}
          className="flex items-center justify-center w-10 h-10 rounded-full
                    bg-gray-300 text-black hover:bg-gray-400 dark:bg-[#171717] dark:text-white dark:hover:bg-[#252525]
                    transition-colors duration-200"
          aria-label="Send message"
        >
          <IconSend2 size={18} className="ml-0.5" />
        </button>
      )}
    </>
  );
};

export default ChatInputSubmitButton;
