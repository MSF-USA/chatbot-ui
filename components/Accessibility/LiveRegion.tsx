/**
 * Live Region Component
 *
 * ARIA live regions for announcing dynamic content changes to screen readers.
 * Essential for real-time chat applications and dynamic UI updates.
 */
import React, { useCallback, useEffect, useRef } from 'react';

import { useTranslation } from 'next-i18next';

/**
 * Live region priority levels
 */
export type LivePriority = 'polite' | 'assertive' | 'off';

/**
 * Live region types
 */
export type LiveRegionType = 'status' | 'alert' | 'log' | 'marquee' | 'timer';

/**
 * Announcement interface
 */
export interface Announcement {
  id: string;
  message: string;
  priority: LivePriority;
  timestamp: number;
  persistent?: boolean;
}

/**
 * Live Region Component Props
 */
interface LiveRegionProps {
  priority?: LivePriority;
  atomic?: boolean;
  relevant?:
    | 'additions'
    | 'removals'
    | 'text'
    | 'all'
    | 'additions text'
    | 'additions removals'
    | 'removals additions'
    | 'removals text'
    | 'text additions'
    | 'text removals';
  busy?: boolean;
  className?: string;
  id?: string;
  children?: React.ReactNode;
  role?: LiveRegionType;
}

/**
 * Live Region Component
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  priority = 'polite',
  atomic = true,
  relevant = 'additions text',
  busy = false,
  className = 'sr-only',
  id,
  children,
  role,
}) => {
  const regionRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={regionRef}
      id={id}
      className={className}
      role={role}
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      aria-busy={busy}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: '0',
      }}
    >
      {children}
    </div>
  );
};

/**
 * Announcer Context
 */
interface AnnouncerContextValue {
  announce: (
    message: string,
    priority?: LivePriority,
    persistent?: boolean,
  ) => void;
  announceError: (message: string) => void;
  announceSuccess: (message: string) => void;
  announceInfo: (message: string) => void;
  clearAnnouncements: () => void;
  announcements: Announcement[];
}

const AnnouncerContext = React.createContext<AnnouncerContextValue | null>(
  null,
);

/**
 * Announcer Provider Props
 */
interface AnnouncerProviderProps {
  children: React.ReactNode;
  maxAnnouncements?: number;
  clearDelay?: number;
}

/**
 * Announcer Provider Component
 */
export const AnnouncerProvider: React.FC<AnnouncerProviderProps> = ({
  children,
  maxAnnouncements = 5,
  clearDelay = 10000, // 10 seconds
}) => {
  const { t } = useTranslation('accessibility');
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Add announcement
   */
  const announce = useCallback(
    (
      message: string,
      priority: LivePriority = 'polite',
      persistent: boolean = false,
    ) => {
      const id = `announcement-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const announcement: Announcement = {
        id,
        message,
        priority,
        timestamp: Date.now(),
        persistent,
      };

      setAnnouncements((prev) => {
        const newAnnouncements = [...prev, announcement];

        // Limit number of announcements
        if (newAnnouncements.length > maxAnnouncements) {
          const removed = newAnnouncements.splice(
            0,
            newAnnouncements.length - maxAnnouncements,
          );
          removed.forEach((removed) => {
            const timeout = timeoutsRef.current.get(removed.id);
            if (timeout) {
              clearTimeout(timeout);
              timeoutsRef.current.delete(removed.id);
            }
          });
        }

        return newAnnouncements;
      });

      // Auto-clear non-persistent announcements
      if (!persistent && clearDelay > 0) {
        const timeout = setTimeout(() => {
          setAnnouncements((prev) => prev.filter((a) => a.id !== id));
          timeoutsRef.current.delete(id);
        }, clearDelay);

        timeoutsRef.current.set(id, timeout);
      }
    },
    [maxAnnouncements, clearDelay],
  );

  /**
   * Announce error message
   */
  const announceError = useCallback(
    (message: string) => {
      announce(t('Error: {{message}}', { message }), 'assertive');
    },
    [announce, t],
  );

  /**
   * Announce success message
   */
  const announceSuccess = useCallback(
    (message: string) => {
      announce(t('Success: {{message}}', { message }), 'polite');
    },
    [announce, t],
  );

  /**
   * Announce info message
   */
  const announceInfo = useCallback(
    (message: string) => {
      announce(message, 'polite');
    },
    [announce],
  );

  /**
   * Clear all announcements
   */
  const clearAnnouncements = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setAnnouncements([]);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      const timeouts = timeoutsRef.current;
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  const value: AnnouncerContextValue = {
    announce,
    announceError,
    announceSuccess,
    announceInfo,
    clearAnnouncements,
    announcements,
  };

  return (
    <AnnouncerContext.Provider value={value}>
      {children}

      {/* Live regions for different priorities */}
      <LiveRegion priority="polite" id="announcements-polite">
        {announcements
          .filter((a) => a.priority === 'polite')
          .map((announcement) => (
            <div key={announcement.id}>{announcement.message}</div>
          ))}
      </LiveRegion>

      <LiveRegion priority="assertive" id="announcements-assertive">
        {announcements
          .filter((a) => a.priority === 'assertive')
          .map((announcement) => (
            <div key={announcement.id}>{announcement.message}</div>
          ))}
      </LiveRegion>
    </AnnouncerContext.Provider>
  );
};

/**
 * Hook to use announcer
 */
export function useAnnouncer() {
  const context = React.useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within an AnnouncerProvider');
  }
  return context;
}

/**
 * Chat Message Announcer Component
 * Specialized for chat applications
 */
interface ChatMessageAnnouncerProps {
  message: string;
  sender?: string;
  timestamp?: Date;
  priority?: LivePriority;
  includeContext?: boolean;
}

export const ChatMessageAnnouncer: React.FC<ChatMessageAnnouncerProps> = ({
  message,
  sender,
  timestamp,
  priority = 'polite',
  includeContext = true,
}) => {
  const { t } = useTranslation('chat');
  const { announce } = useAnnouncer();

  useEffect(() => {
    if (!message) return;

    let announcementText = message;

    if (includeContext) {
      const context = [];

      if (sender) {
        context.push(t('From {{sender}}', { sender }));
      }

      if (timestamp) {
        context.push(
          t('at {{time}}', { time: timestamp.toLocaleTimeString() }),
        );
      }

      if (context.length > 0) {
        announcementText = `${context.join(' ')}: ${message}`;
      }
    }

    announce(announcementText, priority);
  }, [message, sender, timestamp, priority, includeContext, announce, t]);

  return null;
};

/**
 * Status Announcer Component
 * For general status updates
 */
interface StatusAnnouncerProps {
  status: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  persistent?: boolean;
}

export const StatusAnnouncer: React.FC<StatusAnnouncerProps> = ({
  status,
  type = 'info',
  persistent = false,
}) => {
  const { announce, announceError, announceSuccess } = useAnnouncer();

  useEffect(() => {
    if (!status) return;

    switch (type) {
      case 'error':
        announceError(status);
        break;
      case 'success':
        announceSuccess(status);
        break;
      default:
        announce(
          status,
          type === 'warning' ? 'assertive' : 'polite',
          persistent,
        );
    }
  }, [status, type, persistent, announce, announceError, announceSuccess]);

  return null;
};

/**
 * Form Validation Announcer Component
 */
interface FormValidationAnnouncerProps {
  errors: string[];
  fieldName?: string;
}

export const FormValidationAnnouncer: React.FC<
  FormValidationAnnouncerProps
> = ({ errors, fieldName }) => {
  const { t } = useTranslation('validation');
  const { announceError } = useAnnouncer();

  useEffect(() => {
    if (errors.length === 0) return;

    const errorMessage = fieldName
      ? t('{{field}} has {{count}} error(s): {{errors}}', {
          field: fieldName,
          count: errors.length,
          errors: errors.join(', '),
        })
      : t('{{count}} validation error(s): {{errors}}', {
          count: errors.length,
          errors: errors.join(', '),
        });

    announceError(errorMessage);
  }, [errors, fieldName, announceError, t]);

  return null;
};

/**
 * Loading State Announcer Component
 */
interface LoadingAnnouncerProps {
  isLoading: boolean;
  loadingMessage?: string;
  completedMessage?: string;
}

export const LoadingAnnouncer: React.FC<LoadingAnnouncerProps> = ({
  isLoading,
  loadingMessage = 'Loading...',
  completedMessage = 'Loading completed',
}) => {
  const { announce } = useAnnouncer();
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      announce(loadingMessage, 'polite');
      wasLoadingRef.current = true;
    } else if (!isLoading && wasLoadingRef.current) {
      announce(completedMessage, 'polite');
      wasLoadingRef.current = false;
    }
  }, [isLoading, loadingMessage, completedMessage, announce]);

  return null;
};

/**
 * Navigation Announcer Component
 */
interface NavigationAnnouncerProps {
  currentPage: string;
  announceOnMount?: boolean;
}

export const NavigationAnnouncer: React.FC<NavigationAnnouncerProps> = ({
  currentPage,
  announceOnMount = true,
}) => {
  const { t } = useTranslation('navigation');
  const { announce } = useAnnouncer();

  useEffect(() => {
    if (announceOnMount && currentPage) {
      announce(t('Navigated to {{page}}', { page: currentPage }), 'polite');
    }
  }, [currentPage, announceOnMount, announce, t]);

  return null;
};
