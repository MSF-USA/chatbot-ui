import { IconLoader2, IconPlayerStop, IconSend } from '@tabler/icons-react';
import { FC } from 'react';

interface ChatInputSubmitButtonProps {
  messageIsStreaming: boolean;
  isTranscribing: boolean;
  handleSend: () => void;
  handleStopConversation: () => void;
  preventSubmission: () => boolean;
}

const ChatInputSubmitButton: FC<ChatInputSubmitButtonProps> = ({
  messageIsStreaming,
  handleSend,
  handleStopConversation,
  isTranscribing,
  preventSubmission,
}) => {
  return (
    <>
      {preventSubmission() ? (
        messageIsStreaming ? (
          <button
            className="flex items-center gap-1 rounded px-3 py-1 text-black
                    hover:opacity-80 dark:border-neutral-600 dark:text-red-600"
            onClick={handleStopConversation}
            disabled={!messageIsStreaming}
          >
            <IconPlayerStop size={18} />
          </button>
        ) : (
          <IconLoader2 className="animate-spin text-gray-500" size={18} />
        )
      ) : (
        // <div
        //     className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
        <button onClick={handleSend}>
          <IconSend size={18} />
        </button>
      )}
    </>
  );
};

export default ChatInputSubmitButton;
