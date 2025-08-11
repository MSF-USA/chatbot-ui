import {IconLoader2, IconPlayerStop, IconSend} from "@tabler/icons-react";
import {FC} from "react";

interface ChatInputSubmitButtonProps {
  messageIsStreaming: boolean;
  isTranscribing: boolean;
  handleSend: () => void;
  handleStopConversation: () => void;
  preventSubmission: () => boolean;
}

const ChatInputSubmitButton: FC<ChatInputSubmitButtonProps> = (
  {
    messageIsStreaming,
    handleSend,
    handleStopConversation,
    isTranscribing,
    preventSubmission,
  }
) => {
  return (
    <>
      {preventSubmission() ? (
        messageIsStreaming ? (
          <button
            className="flex items-center justify-center w-8 h-8 rounded-md 
                      bg-gray-200 text-gray-700 hover:bg-gray-300 
                      dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                      transition-colors duration-200"
            onClick={handleStopConversation}
            disabled={!messageIsStreaming}
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
          className="flex items-center justify-center w-8 h-8 rounded-md
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors duration-200"
          aria-label="Send message"
        >
          <IconSend size={18}/>
        </button>
      )}
    </>
  )
}

export default ChatInputSubmitButton;
