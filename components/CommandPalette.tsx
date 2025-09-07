import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { useUserData } from '../context/UserDataContext';
import { SearchIcon, CloseIcon, HistoryIcon, BookmarkIcon, PathIcon, CameraIcon, CogIcon, QuestionMarkCircleIcon, DownloadIcon, UploadIcon, ImageIcon, CosmicLeapIcon } from './IconComponents';
import { SessionSnapshot } from '../types';

interface Command {
    id: string;
    name: string;
    section: string;
    icon: React.FC<{className?: string}>;
    action: () => void;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (topic: string) => void;
    sessionData: SessionSnapshot['data'];
    actions: {
        openHistory: () => void;
        openBookmarks: () => void;
        openPaths: () => void;
        openSnapshots: () => void;
        openImages: () => void;
        openSettings: () => void;
        openHelp: () => void;
    }
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onSearch, sessionData, actions }) => {
    const { t } = useLocalization();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const { history, bookmarks, saveSnapshot } = useUserData();

    const staticCommands: Command[] = useMemo(() => [
        { id: 'viewHistory', name: t('commandPalette.command.viewHistory'), section: t('commandPalette.section.navigation'), icon: HistoryIcon, action: actions.openHistory },
        { id: 'viewBookmarks', name: t('commandPalette.command.viewBookmarks'), section: t('commandPalette.section.navigation'), icon: BookmarkIcon, action: actions.openBookmarks },
        { id: 'viewPaths', name: t('commandPalette.command.viewPaths'), section: t('commandPalette.section.navigation'), icon: PathIcon, action: actions.openPaths },
        { id: 'viewSnapshots', name: t('commandPalette.command.viewSnapshots'), section: t('commandPalette.section.navigation'), icon: CameraIcon, action: actions.openSnapshots },
        { id: 'viewImages', name: t('commandPalette.command.viewImages'), section: t('commandPalette.section.navigation'), icon: ImageIcon, action: actions.openImages },
        { id: 'openSettings', name: t('commandPalette.command.openSettings'), section: t('commandPalette.section.actions'), icon: CogIcon, action: actions.openSettings },
        { id: 'openHelp', name: t('commandPalette.command.viewHelp'), section: t('commandPalette.section.actions'), icon: QuestionMarkCircleIcon, action: actions.openHelp },
        { id: 'saveSnapshot', name: t('commandPalette.command.saveSnapshot'), section: t('commandPalette.section.data'), icon: CameraIcon, action: () => {
            const name = prompt(t('prompts.snapshotName'));
            if (name && sessionData.article) saveSnapshot(name, sessionData);
        }},
    ], [t, actions, sessionData, saveSnapshot]);

    const allCommands = useMemo(() => {
        const bookmarkCommands = bookmarks.map(b => ({
            id: `bookmark-${b.id}`,
            name: b.name,
            section: t('commandPalette.section.bookmarks'),
            icon: BookmarkIcon,
            action: () => onSearch(b.name),
        }));
        const historyCommands = history.map(h => ({
            id: `history-${h.id}`,
            name: h.name,
            section: t('commandPalette.section.history'),
            icon: HistoryIcon,
            action: () => onSearch(h.name),
        }));

        return [...staticCommands, ...bookmarkCommands, ...historyCommands];
    }, [staticCommands, bookmarks, history, t, onSearch]);

    const filteredCommands = query
        ? allCommands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()))
        : allCommands;

    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        (acc[cmd.section] = acc[cmd.section] || []).push(cmd);
        return acc;
    }, {} as Record<string, Command[]>);

    const sectionOrder = [
        t('commandPalette.section.navigation'),
        t('commandPalette.section.actions'),
        t('commandPalette.section.data'),
        t('commandPalette.section.bookmarks'),
        t('commandPalette.section.history'),
    ];

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setQuery('');
        }
    }, [isOpen]);
    
    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const command = filteredCommands[activeIndex];
            if (command) {
                command.action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [activeIndex, filteredCommands, onClose]);

    if (!isOpen) {
        return null;
    }
    
    let currentIndex = -1;

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-xl max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center p-2 border-b border-gray-700">
                    <SearchIcon className="w-5 h-5 text-gray-400 mx-2" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('commandPalette.placeholder')}
                        className="w-full bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none"
                    />
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white"><CloseIcon className="w-5 h-5" /></button>
                </div>
                <div className="overflow-y-auto">
                    {filteredCommands.length > 0 ? (
                        sectionOrder.map(section => {
                            if (!groupedCommands[section]) return null;
                            return (
                                <div key={section} className="p-2">
                                    <h3 className="text-xs font-semibold text-gray-500 px-2 mb-1">{section}</h3>
                                    <ul>
                                        {groupedCommands[section].map(cmd => {
                                            currentIndex++;
                                            const isActive = currentIndex === activeIndex;
                                            return (
                                                <li key={cmd.id}
                                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${isActive ? 'bg-accent/20 text-accent' : 'text-gray-300 hover:bg-gray-700/50'}`}
                                                    onClick={() => { cmd.action(); onClose(); }}
                                                    onMouseMove={() => setActiveIndex(currentIndex)}
                                                >
                                                    <cmd.icon className="w-5 h-5" />
                                                    <span>{cmd.name}</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )
                        })
                    ) : (
                        <p className="p-4 text-center text-gray-500">{t('commandPalette.noResults')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;