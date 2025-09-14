import React, { useContext, useEffect, useRef } from 'react';
import { MobilePanelProps } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { UserDataContext } from '../context/AppContext';
import { 
    CloseIcon, TrashIcon, BookOpenIcon, CameraIcon, DownloadIcon, HistoryIcon, BookmarkIcon, PathIcon, ImageIcon
} from './IconComponents';
import LearningPathsManager from './LearningPathsManager';
import AthenaCopilot from './AthenaCopilot';

const PanelHeader: React.FC<{ title: string; onClose: () => void }> = ({ title, onClose }) => (
    <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close panel">
            <CloseIcon className="w-6 h-6" />
        </button>
    </div>
);

const MobilePanel: React.FC<MobilePanelProps> = ({ activePanel, onClose, handleSearch, handleLoadSnapshot, athenaProps, athenaRef, initialChatHistory }) => {
    const { t } = useLocalization();
    const userData = useContext(UserDataContext);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (activePanel) {
            const panelNode = panelRef.current;
            if (!panelNode) return;

            const focusableElements = Array.from(
                panelNode.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
            ).filter(el => el.offsetParent !== null); // only visible elements

            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            firstElement.focus();

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key !== 'Tab') return;

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            };

            panelNode.addEventListener('keydown', handleKeyDown);
            return () => panelNode.removeEventListener('keydown', handleKeyDown);
        }
    }, [activePanel]);


    const panelTitles: { [key: string]: string } = {
        history: t('panels.history.title'),
        bookmarks: t('panels.bookmarks.title'),
        learningPaths: t('panels.learningPaths.title'),
        snapshots: t('panels.snapshots.title'),
        imageLibrary: t('panels.imageLibrary.title'),
        athena: t('athena.title'),
    };
    
    const renderContent = () => {
        if (!userData || !activePanel) return null;
        
        const { history, bookmarks, sessionSnapshots, imageLibrary, clearHistoryItem, clearBookmarkItem, clearSnapshot, clearImageLibraryItem } = userData;

        switch (activePanel) {
            case 'history':
                return <SimpleList items={history} onSelect={handleSearch} onDelete={clearHistoryItem} icon={HistoryIcon} emptyText={t('panels.noEntries')} />;
            case 'bookmarks':
                return <SimpleList items={bookmarks} onSelect={handleSearch} onDelete={clearBookmarkItem} icon={BookmarkIcon} emptyText={t('panels.noEntries')} />;
            case 'learningPaths':
                return <div className="p-2"><LearningPathsManager handleSearch={handleSearch} closePanel={onClose} /></div>;
            case 'snapshots':
                return <SnapshotList items={sessionSnapshots} onLoad={handleLoadSnapshot} onDelete={clearSnapshot} emptyText={t('panels.noEntries')} />;
            case 'imageLibrary':
                return <ImageLibraryGrid items={imageLibrary} onDelete={clearImageLibraryItem} emptyText={t('panels.noEntries')} />;
            case 'athena':
                 return (
                    <AthenaCopilot 
                        ref={athenaRef}
                        key={athenaProps.article?.title}
                        article={athenaProps.article}
                        isLoading={athenaProps.isLoading}
                        currentTopic={athenaProps.currentTopic}
                        history={athenaProps.history}
                        initialChatHistory={initialChatHistory}
                    />
                );
            default:
                return null;
        }
    };
    
    const isFullScreen = activePanel === 'athena';

    return (
        <div 
            className={`fixed inset-0 z-40 md:hidden transition-colors duration-300 ${activePanel ? 'bg-black/60' : 'bg-transparent pointer-events-none'}`}
            onClick={onClose}
        >
            <div 
                ref={panelRef}
                className={`absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${activePanel ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ height: isFullScreen ? 'calc(100% - 4rem)' : '75%' }}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={activePanel && !isFullScreen ? 'panel-title' : undefined}
                tabIndex={-1}
            >
                {!isFullScreen && activePanel && <PanelHeader title={panelTitles[activePanel]} onClose={onClose} />}
                <div className="flex-grow overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

// Sub-components for list rendering
const SimpleList: React.FC<{ items: string[], onSelect: (item: string) => void, onDelete: (item: string) => void, icon: React.FC<{className?:string}>, emptyText: string }> = ({ items, onSelect, onDelete, icon: Icon, emptyText }) => {
    if (items.length === 0) return <div className="text-center text-gray-500 p-8">{emptyText}</div>;
    return (
        <ul className="p-2">
            {items.map(item => (
                <li key={item} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 group">
                    <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <button onClick={() => onSelect(item)} className="flex-grow text-left text-gray-300 truncate">{item}</button>
                    <button onClick={() => onDelete(item)} className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </li>
            ))}
        </ul>
    );
};

const SnapshotList: React.FC<{ items: any[], onLoad: (item: any) => void, onDelete: (name: string) => void, emptyText: string }> = ({ items, onLoad, onDelete, emptyText }) => {
    if (items.length === 0) return <div className="text-center text-gray-500 p-8">{emptyText}</div>;
    return (
        <ul className="p-2">
            {items.map(snap => (
                <li key={snap.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 group">
                    <CameraIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-grow">
                        <p className="text-gray-300 font-semibold truncate">{snap.name}</p>
                        <p className="text-xs text-gray-500">{new Date(snap.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => onLoad(snap)} className="p-1 text-gray-400 hover:text-accent" title="Load Snapshot">
                            <DownloadIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(snap.name)} className="p-1 text-gray-500 hover:text-red-400" title="Delete Snapshot">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </li>
            ))}
        </ul>
    );
};

const ImageLibraryGrid: React.FC<{ items: any[], onDelete: (id: number) => void, emptyText: string }> = ({ items, onDelete, emptyText }) => {
    if (items.length === 0) return <div className="text-center text-gray-500 p-8">{emptyText}</div>;
    return (
        <div className="grid grid-cols-2 gap-2 p-2">
            {items.map(image => (
                <div key={image.id} className="relative group">
                    <img src={image.imageUrl} alt={image.prompt} className="w-full h-32 object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-center">
                        <p className="text-xs text-white/80 line-clamp-3 mb-2">{image.prompt}</p>
                        <button onClick={() => onDelete(image.id)} className="p-2 bg-red-600/50 rounded-full text-white">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default MobilePanel;