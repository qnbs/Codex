
import { createContext, Dispatch, SetStateAction } from 'react';
import { AppSettings } from '../types';

export const defaultSettings: AppSettings = {
    language: 'en',
    articleLength: 'standard',
    imageStyle: 'photorealistic',
    autoLoadImages: false,
    synapseDensity: 5,
    accentColor: 'amber',
    fontFamily: 'modern',
    textSize: 'base',
};

export interface SettingsContextType {
    settings: AppSettings;
    setSettings: Dispatch<SetStateAction<AppSettings>>;
}

export const SettingsContext = createContext<SettingsContextType | null>(null);
