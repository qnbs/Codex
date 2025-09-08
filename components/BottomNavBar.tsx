import React from 'react';
import { HistoryIcon, BookmarkIcon, PathIcon, ImageIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface BottomNavBarProps {
    activePanel: string | null;
    togglePanel: (panel: string) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activePanel, togglePanel }) => {
    const { t } = useLocalization();

    const navItems = [
        { id: 'history', icon: HistoryIcon, label: t('panels.history.title') },
        { id: 'bookmarks', icon: BookmarkIcon, label: t('panels.bookmarks.title') },
        { id: 'learningPaths', icon: PathIcon, label: t('panels.learningPaths.title') },
        { id: 'imageLibrary', icon: ImageIcon, label: t('panels.imageLibrary.title') },
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-30 shadow-lg">
            <div className="flex justify-around items-center h-16">
                {navItems.map(item => {
                    const isActive = activePanel === item.id;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => togglePanel(item.id)}
                            className={`flex flex-col items-center justify-center w-full h-full transition-colors duration-200 ${isActive ? 'text-accent' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Icon className="w-6 h-6" />
                            <span className="text-xs mt-1">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNavBar;
