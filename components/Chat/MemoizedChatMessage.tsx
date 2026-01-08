import { FC, memo } from 'react';

import { ChatMessage, Props } from './ChatMessage';

export const MemoizedChatMessage: FC<Props> = memo(
  ChatMessage,
  (prevProps, nextProps) =>
    prevProps.message.content === nextProps.message.content &&
    prevProps.versionInfo?.current === nextProps.versionInfo?.current &&
    prevProps.versionInfo?.total === nextProps.versionInfo?.total,
);
