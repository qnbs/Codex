
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Notification from '../components/Notification';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationMessage {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

let id = 0;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const removeNotification = (idToRemove: number) => {
    setNotifications(prev => prev.filter(n => n.id !== idToRemove));
  };

  const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const newNotification = { id: id++, message, type };
    setNotifications(prev => [...prev, newNotification]);
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, 5000);
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed top-5 right-5 z-[200] space-y-2">
        {notifications.map(n => (
          <Notification key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
