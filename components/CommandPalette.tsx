import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArticleData, UserDataContextType } from '../types';
import { 
    HistoryIcon, BookmarkIcon, PathIcon, CameraIcon, CogIcon, QuestionMarkCircleIcon, 
    CosmicLeapIcon, ImageIcon, DownloadIcon, UploadIcon, SearchIcon
} from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

type Command = {
    id: string;
    name: string;
    keywords?: string;
    section: string;
    action: () => void;
    icon: React.FC<{ className?: string }>;
    condition?: () => boolean;
};

interface CommandPaletteProps extends Omit<UserDataContextType, 'handleImportData'> {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (topic: string) => void;
    togglePanel: (panel: string) => void;
    onSerendipity: () => void;
    article: ArticleData | null;
    onGenerateAllImages: () => void;
}

const useCommands = (props: CommandPaletteProps): Command[] => {
    const {
        onClose, onSearch, togglePanel, onSerendipity, article, onGenerateAllImages,
        bookmarks, history, handleSaveSnapshot, handleExportData, handleTriggerImport
    } = props;
    const { t } = useLocalization();

    const execute = (fn: () => void) => {
        return () => {
            fn();
            onClose();
        };
    };

    const commands: Command[] = useMemo(() => [
        // Navigation
        { id: 'nav-history', name: t('commandPalette.command.viewHistory'), keywords: t('panels.history.title'), section: t('commandPalette.section.navigation'), action: execute(() => togglePanel('history')), icon: HistoryIcon },
        { id: 'nav-bookmarks', name: t('commandPalette.command.viewBookmarks'), keywords: t('panels.bookmarks.title'), section: t('commandPalette.section.navigation'), action: execute(() => togglePanel('bookmarks')), icon: BookmarkIcon },
        { id: 'nav-paths', name: t('commandPalette.command.viewPaths'), keywords: t('panels.learningPaths.title'), section: t('commandPalette.section.navigation'), action: execute(() => togglePanel('learningPaths')), icon: PathIcon },
        { id: 'nav-snapshots', name: t('commandPalette.command.viewSnapshots'), keywords: t('panels.snapshots.title'), section: t('commandPalette.section.navigation'), action: execute(() => togglePanel('snapshots')), icon: CameraIcon },
        { id: 'nav-settings', name: t('commandPalette.command.openSettings'), keywords: t('panels.settings.title'), section: t('commandPalette.section.navigation'), action: execute(() => togglePanel('settings')), icon: CogIcon },
        { id: 'nav-help', name: t('commandPalette.command.viewHelp'), keywords: t('panels.help.title'), section: t('commandPalette.section.navigation'), action: execute(() => togglePanel('help')), icon: QuestionMarkCircleIcon },
        
        // Article Actions
        { id: 'action-cosmic-leap', name: t('commandPalette.command.cosmicLeap'), keywords: 'serendipity random surprise', section: t('commandPalette.section.actions'), action: execute(onSerendipity), icon: CosmicLeapIcon },
        { id: 'action-gen-images', name: t('commandPalette.command.genImages'), keywords: 'generate all images visualize', section: t('commandPalette.section.actions'), action: execute(onGenerateAllImages), icon: ImageIcon, condition: () => !!article && article.sections.some(s => s.imagePrompt && !s.imageUrl) },
        { id: 'action-save-snapshot', name: t('commandPalette.command.saveSnapshot'), keywords: 'save snapshot session', section: t('commandPalette.section.actions'), action: execute(handleSaveSnapshot), icon: CameraIcon, condition: () => !!article },

        // Data Management
        { id: 'data-export', name: t('commandPalette.command.exportData'), keywords: 'export backup save', section: t('commandPalette.section.data'), action: execute(handleExportData), icon: DownloadIcon },
        { id: 'data-import', name: t('commandPalette.command.importData'), keywords: 'import restore load', section: t('commandPalette.section.data'), action: execute(handleTriggerImport), icon: UploadIcon },
    ], [onClose, togglePanel, onSerendipity, article, onGenerateAllImages, handleSaveSnapshot, handleExportData, handleTriggerImport, t]);

    const dynamicCommands = useMemo(() => {
        const bookmarkCommands: Command[] = bookmarks.map(b => ({
            id: `bookmark-${b}`, name: b, section: t('commandPalette.section.bookmarks'), action: execute(() => onSearch(b)), icon: BookmarkIcon
        }));
        const historyCommands: Command[] = history.map(h => ({
            id: `history-${h}`, name: h, section: t('commandPalette.section.history'), action: execute(() => onSearch(h)), icon: HistoryIcon
        }));

        return [...commands, ...bookmarkCommands, ...historyCommands];
    }, [bookmarks, history, commands, execute, onSearch, t]);

    return dynamicCommands;
};


const CommandPalette: React.FC<CommandPaletteProps> = (props) => {
    const { isOpen, onClose } = props;
    const { t } = useLocalization();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const allCommands = useCommands(props);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const filteredCommands = useMemo(() => {
        const baseCommands = allCommands.filter(c => c.condition ? c.condition() : true);
        if (!query) return baseCommands;
        
        const lowerCaseQuery = query.toLowerCase();
        return baseCommands
            .filter(c => 
                c.name.toLowerCase().includes(lowerCaseQuery) || 
                c.keywords?.toLowerCase().includes(lowerCaseQuery) ||
                c.section.toLowerCase().includes(lowerCaseQuery)
            );
    }, [query, allCommands]);

    useEffect(() => {
        setActiveIndex(0);
    }, [filteredCommands]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[activeIndex]) {
                    filteredCommands[activeIndex].action();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, activeIndex, filteredCommands]);
    
    useEffect(() => {
        resultsRef.current?.children[activeIndex]?.scrollIntoView({
            block: 'nearest',
        });
    }, [activeIndex]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-start pt-24" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="relative">
                    <SearchIcon className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('commandPalette.placeholder')}
                        className="w-full bg-transparent text-lg text-white placeholder-gray-500 py-4 pl-12 pr-4 focus:outline-none"
                    />
                </div>
                <div ref={resultsRef} className="border-t border-gray-700 max-h-[60vh] overflow-y-auto">
                    {filteredCommands.length > 0 ? (
                        Object.entries(
                           filteredCommands.reduce((acc, cmd) => {
                                if (!acc[cmd.section]) acc[cmd.section] = [];
                                acc[cmd.section].push(cmd);
                                return acc;
                            }, {} as Record<string, Command[]>)
                        ).map(([section, commands]) => (
                            <div key={section} className="p-2">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 mb-1">{section}</h3>
                                {commands.map((cmd) => {
                                    const globalIndex = filteredCommands.findIndex(c => c.id === cmd.id);
                                    const Icon = cmd.icon;
                                    return (
                                        <button
                                            key={cmd.id}
                                            onClick={cmd.action}
                                            className={`w-full flex items-center gap-3 text-left p-2 rounded-md transition-colors ${activeIndex === globalIndex ? 'bg-accent/20 text-accent' : 'text-gray-300 hover:bg-gray-700/50'}`}
                                        >
                                            <Icon className="w-5 h-5 flex-shrink-0"/>
                                            <span className="truncate">{cmd.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    ) : (
                        <p className="p-4 text-center text-gray-500">{t('commandPalette.noResults')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;