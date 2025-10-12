import { useState, useCallback } from 'react';
import { InlineNotification, NotificationType } from '../components/shared/InlineNotification';

export const useInlineNotifications = () => {
  const [notifications, setNotifications] = useState<InlineNotification[]>([]);

  const addNotification = useCallback((
    type: NotificationType,
    message: string,
    options?: {
      description?: string;
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
      dismissible?: boolean;
    }
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const notification: InlineNotification = {
      id,
      type,
      message,
      description: options?.description,
      duration: options?.duration !== undefined ? options.duration : (type === 'success' ? 4000 : type === 'info' ? 5000 : 0),
      action: options?.action,
      dismissible: options?.dismissible !== false
    };

    setNotifications(prev => [...prev, notification]);
    return id;
  }, []);

  const success = useCallback((message: string, description?: string, options?: any) => {
    return addNotification('success', message, { description, ...options });
  }, [addNotification]);

  const error = useCallback((message: string, description?: string, options?: any) => {
    return addNotification('error', message, { description, ...options });
  }, [addNotification]);

  const warning = useCallback((message: string, description?: string, options?: any) => {
    return addNotification('warning', message, { description, ...options });
  }, [addNotification]);

  const info = useCallback((message: string, description?: string, options?: any) => {
    return addNotification('info', message, { description, ...options });
  }, [addNotification]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
    addNotification
  };
};
