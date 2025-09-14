import React from 'react';
import { HistoryIcon, BookmarkIcon, PathIcon, CameraIcon, CogIcon, CommandIcon, LightbulbIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';
import { BottomNavBarProps } from '../types';


const BottomNavBar: React.FC<BottomNavBarProps> = ({ togglePanel }) => {
    const { t } = useLocalization();

    const navItems = [
        { id: 'history', icon: HistoryIcon, label: t('panels.history.title') },
        { id: 'bookmarks', icon: BookmarkIcon, label: t('panels.bookmarks.title') },
        { id: 'learningPaths', icon: PathIcon, label: t('panels.learningPaths.title') },
        { id: 'athena', icon: LightbulbIcon, label: t('athena.title') },
    ];

    return (
        <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 z-30">
            <nav className="flex justify-around items-center h-16">
                {navItems.map(item => (
                     <button 
                        key={item.id} 
                        onClick={() => togglePanel(item.id as any)}
                        className="flex flex-col items-center justify-center text-gray-400 hover:text-accent transition-colors p-2 w-1/5"
                        aria-label={item.label}
                    >
                        <item.icon className="w-6 h-6 mb-1" />
                        <span className="text-xs truncate">{item.label}</span>
                    </button>
                ))}
                 <button 
                    onClick={() => togglePanel('commandPalette')}
                    className="flex flex-col items-center justify-center text-gray-400 hover:text-accent transition-colors p-2 w-1/5"
                    aria-label={t('commandPalette.open')}
                >
                    <CommandIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs truncate">{t('commandPalette.open')}</span>
                </button>
            </nav>
        </footer>
    );
};

export default BottomNavBar;