import {IconLoader2, IconPlayerStop, IconSend} from "@tabler/icons-react";
import React, {FC} from "react";

interface ChatInputSubmitButtonProps {
  isStreaming: boolean;
  isTranscribing: boolean;
  handleSend: () => void;
  handleStopConversation: () => void;
  preventSubmission: () => boolean;
}

const ChatInputSubmitButton: FC<ChatInputSubmitButtonProps> = (
  {
    isStreaming,
    handleSend,
    handleStopConversation,
    isTranscribing,
    preventSubmission,
  }
) => {
  return (
    <>
      {preventSubmission() ? (
        isStreaming ? (
          <button
            className="flex items-center justify-center w-8 h-8 rounded-md
                      bg-gray-200 text-gray-700 hover:bg-gray-300
                      dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                      transition-colors duration-200"
            onClick={handleStopConversation}
            disabled={!isStreaming}
            aria-label="Stop generation"
          >
            <IconPlayerStop size={16}/>
          </button>
        ) : (
          <div className="flex items-center justify-center w-8 h-8">
            <IconLoader2 className="animate-spin text-gray-500" size={18}/>
          </div>
        )
      ) : (
        <button
          onClick={handleSend}
          className="flex items-center justify-center w-9 h-9 rounded-full
                    bg-gray-300 text-black hover:bg-gray-400 dark:bg-[#171717] dark:text-white dark:hover:bg-[#252525]
                    transition-colors duration-200"
          aria-label="Send message"
        >
          <IconSend size={18} className="ml-0.5" />
        </button>
      )}
    </>
  )
}

export default ChatInputSubmitButton;
