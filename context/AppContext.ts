import { createContext } from 'react';
import { SettingsContextType, UserDataContextType, NotificationContextType } from '../types';

export const SettingsContext = createContext<SettingsContextType | null>(null);
export const UserDataContext = createContext<UserDataContextType | null>(null);
export const NotificationContext = createContext<NotificationContextType | null>(null);
