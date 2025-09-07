
import React from 'react';
import { NotificationType } from '../context/NotificationContext';
import { CloseIcon } from './IconComponents';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const baseClasses = "flex items-center justify-between gap-4 px-4 py-2 rounded-md shadow-lg text-white text-sm animate-fade-in-right";
  const typeClasses = {
    success: "bg-emerald-500/90 border border-emerald-400/50",
    error: "bg-rose-500/90 border border-rose-400/50",
    info: "bg-sky-500/90 border border-sky-400/50",
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <span>{message}</span>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-black/20">
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Notification;
