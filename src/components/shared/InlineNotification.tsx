import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface InlineNotification {
  id: string;
  type: NotificationType;
  message: string;
  description?: string;
  duration?: number; // milliseconds, 0 or undefined = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface InlineNotificationItemProps {
  notification: InlineNotification;
  onDismiss: (id: string) => void;
}

const notificationStyles: Record<NotificationType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-800 dark:text-green-200',
    icon: <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    icon: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-800 dark:text-yellow-200',
    icon: <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
  }
};

export const InlineNotificationItem: React.FC<InlineNotificationItemProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const style = notificationStyles[notification.type];

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto dismiss
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  return (
    <div
      className={cn(
        'mb-3 rounded-lg border p-4 shadow-md transition-all duration-300',
        style.bg,
        style.border,
        isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2',
        isLeaving && 'opacity-0 -translate-y-2'
      )}
      role="alert"
      aria-live={notification.type === 'error' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', style.text)}>
            {notification.message}
          </p>
          {notification.description && (
            <p className={cn('mt-1 text-sm', style.text, 'opacity-90')}>
              {notification.description}
            </p>
          )}
          {notification.action && (
            <button
              onClick={() => {
                notification.action!.onClick();
                handleDismiss();
              }}
              className={cn(
                'mt-2 text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded',
                style.text
              )}
            >
              {notification.action.label}
            </button>
          )}
        </div>
        {(notification.dismissible !== false) && (
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2',
              style.text
            )}
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

interface InlineNotificationContainerProps {
  notifications: InlineNotification[];
  onDismiss: (id: string) => void;
  position?: 'top' | 'bottom';
  className?: string;
}

export const InlineNotificationContainer: React.FC<InlineNotificationContainerProps> = ({
  notifications,
  onDismiss,
  position = 'top',
  className
}) => {
  if (notifications.length === 0) return null;

  return (
    <div
      className={cn(
        'w-full max-w-full mx-auto z-40',
        position === 'top' ? 'mb-4' : 'mt-4',
        className
      )}
    >
      {notifications.map((notification) => (
        <InlineNotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
