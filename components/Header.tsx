import React, { useState, useMemo } from 'react';
import { HistoryIcon, BookmarkIcon, PathIcon, CogIcon, QuestionMarkCircleIcon, CameraIcon, UploadIcon, DownloadIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';
import SettingsModal from './SettingsModal';
import HelpGuide from './HelpGuide';
import ArticleLibrary from './ArticleLibrary';
import { useUserData } from '../context/UserDataContext';
import LearningPathsPanel from './LearningPathsPanel';
import SnapshotsPanel from './SnapshotsPanel';
import ImageLibrary from './ImageLibrary';
// FIX: Import HistoryItem and Bookmark types to use in type assertions.
import { SessionSnapshot, HistoryItem, Bookmark } from '../types';
import CommandPalette from './CommandPalette';

type PanelType = 'history' | 'bookmarks' | 'paths' | 'snapshots' | 'images' | null;

interface HeaderProps {
    onSearch: (topic: string) => void;
    sessionData: SessionSnapshot['data'];
    onRestore: (snapshot: SessionSnapshot) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch, sessionData, onRestore }) => {
    const { t } = useLocalization();
    const [activePanel, setActivePanel] = useState<PanelType>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

    const { history, bookmarks, deleteHistoryItem, clearHistory, clearBookmarks } = useUserData();
    
    const closeAllPanels = () => {
        setActivePanel(null);
        setIsSettingsOpen(false);
        setIsHelpOpen(false);
    };

    const handleItemClick = (name: string) => {
        onSearch(name);
        closeAllPanels();
    };
    
    const commands = useMemo(() => [
        // Add commands here if needed, or manage them inside CommandPalette
    ], []);

    // Open command palette with Ctrl+K or Cmd+K
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCmdPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (
        <>
            <header className="bg-gray-900/50 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-700/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex-shrink-0">
                            <span className="text-2xl font-bold text-white">Codex</span>
                        </div>
                        <div className="flex items-center">
                             <button onClick={() => setIsCmdPaletteOpen(true)} className="hidden sm:block mr-4 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-400 hover:bg-gray-700">
                                {t('commandPalette.open')} <span className="ml-2 text-xs bg-gray-600 rounded px-1.5 py-0.5">⌘K</span>
                            </button>
                            <nav className="flex items-center space-x-1 sm:space-x-2">
                                <button onClick={() => setActivePanel('history')} title={t('panels.history.title')} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"><HistoryIcon className="w-6 h-6" /></button>
                                <button onClick={() => setActivePanel('bookmarks')} title={t('panels.bookmarks.title')} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"><BookmarkIcon className="w-6 h-6" /></button>
                                <button onClick={() => setActivePanel('paths')} title={t('panels.learningPaths.title')} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"><PathIcon className="w-6 h-6" /></button>
                                <button onClick={() => setActivePanel('snapshots')} title={t('panels.snapshots.title')} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"><CameraIcon className="w-6 h-6" /></button>
                                <div className="w-px h-6 bg-gray-700 mx-1"></div>
                                <button onClick={() => setIsSettingsOpen(true)} title={t('panels.settings.title')} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"><CogIcon className="w-6 h-6" /></button>
                                <button onClick={() => setIsHelpOpen(true)} title={t('panels.help.title')} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/50 transition-colors"><QuestionMarkCircleIcon className="w-6 h-6" /></button>
                            </nav>
                        </div>
                    </div>
                </div>
            </header>
            
            {/* FIX: Cast history items to have a required `id` to match ArticleLibrary's prop type. This is safe because items from the DB will always have an id. */}
            {activePanel === 'history' && <ArticleLibrary title={t('panels.history.title')} items={history as Required<HistoryItem>[]} onClose={() => setActivePanel(null)} onItemClick={handleItemClick} onItemDelete={deleteHistoryItem} onClearAll={clearHistory} emptyMessage={t('panels.noEntries')} />}
            {/* FIX: Cast bookmark items to have a required `id` to match ArticleLibrary's prop type. This is safe because items from the DB will always have an id. */}
            {activePanel === 'bookmarks' && <ArticleLibrary title={t('panels.bookmarks.title')} items={bookmarks as Required<Bookmark>[]} onClose={() => setActivePanel(null)} onItemClick={handleItemClick} onClearAll={clearBookmarks} emptyMessage={t('panels.noEntries')} />}
            {activePanel === 'paths' && <LearningPathsPanel onClose={() => setActivePanel(null)} onTopicClick={handleItemClick} />}
            {activePanel === 'snapshots' && <SnapshotsPanel onClose={() => setActivePanel(null)} onRestore={(snap) => { onRestore(snap); closeAllPanels(); }} />}
            {activePanel === 'images' && <ImageLibrary isOpen={true} onClose={() => setActivePanel(null)} />}
            
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <HelpGuide isVisible={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <CommandPalette 
                isOpen={isCmdPaletteOpen} 
                onClose={() => setIsCmdPaletteOpen(false)}
                onSearch={onSearch}
                sessionData={sessionData}
                actions={{
                    openHistory: () => setActivePanel('history'),
                    openBookmarks: () => setActivePanel('bookmarks'),
                    openPaths: () => setActivePanel('paths'),
                    openSnapshots: () => setActivePanel('snapshots'),
                    openImages: () => setActivePanel('images'),
                    openSettings: () => setIsSettingsOpen(true),
                    openHelp: () => setIsHelpOpen(true),
                }}
            />
        </>
    );
};

export default Header;