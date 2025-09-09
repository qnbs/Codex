import React, { useState, useCallback, useEffect, useRef, useContext, useMemo } from 'react';
import SearchBar from './components/SearchBar';
import ArticleView from './components/ArticleView';
import AthenaCopilot from './components/AthenaCopilot';
import SynapseGraph from './components/SynapseGraph';
import { ArticleData, RelatedTopic, StarterTopic, AppSettings, AccentColor, FontFamily, ArticleLength, ImageStyle, TextSize, LearningPath, SessionSnapshot, ChatMessage, CodexBackupData, Notification, NotificationType, Language, UserDataContextType, StoredImage } from './types';
import { generateArticleContent, getRelatedTopics, generateImageForSection, getSerendipitousTopic, getStarterTopics, startChat, editImage, generateVideoForSection, constructImagePrompt } from './services/geminiService';
import * as db from './services/dbService';
import { HistoryIcon, BookmarkIcon, CogIcon, CloseIcon, PathIcon, CameraIcon, TrashIcon, UploadIcon, DownloadIcon, QuestionMarkCircleIcon, SparklesIcon, CommandIcon, ImageIcon, SearchIcon, MoreVerticalIcon, ClipboardCopyIcon, BookOpenIcon } from './components/IconComponents';
import SettingsModal from './components/SettingsModal';
import HelpGuide from './components/HelpGuide';
import EntryPortal from './components/EntryPortal';
import CommandPalette from './components/CommandPalette';
import LearningPathsManager from './components/LearningPathsManager';
import BottomNavBar from './components/BottomNavBar';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { SettingsContext, UserDataContext, NotificationContext } from './context/AppContext';
import type { Chat } from '@google/genai';
import LoadingSpinner from './components/LoadingSpinner';


// HOOKS
const useNotification = () => useContext(NotificationContext)!;

const getInitialLocale = (): Language => {
    if (typeof window === 'undefined') return Language.English;
    const browserLang = window.navigator.language.split('-')[0];
    return browserLang === 'de' ? Language.German : Language.English;
};

const defaultSettings: AppSettings = {
    language: getInitialLocale(),
    accentColor: AccentColor.Amber,
    fontFamily: FontFamily.Artistic,
    textSize: TextSize.Standard,
    articleLength: ArticleLength.Standard,
    imageStyle: ImageStyle.Photorealistic,
    autoLoadImages: true,
    synapseDensity: 5,
    hasOnboarded: false,
};

// Provider Components
const SettingsProvider = ({ children, initialSettings }: { children: React.ReactNode, initialSettings: AppSettings }) => {
    const [settings, setSettingsState] = useState<AppSettings>(initialSettings);

    const setSettings = useCallback((value: AppSettings | ((val: AppSettings) => AppSettings)) => {
        const newSettings = value instanceof Function ? value(settings) : value;
        db.saveSettings(newSettings)
          .then(() => setSettingsState(newSettings))
          .catch(err => console.error("Failed to save settings", err));
    }, [settings]);

    useEffect(() => {
        const root = document.documentElement;
        const colorMap = {
            [AccentColor.Amber]: { color: '#f59e0b', hover: '#fbbf24', text: '#1f2937' },
            [AccentColor.Sky]: { color: '#38bdf8', hover: '#7dd3fc', text: '#ffffff' },
            [AccentColor.Rose]: { color: '#f43f5e', hover: '#fb7185', text: '#ffffff' },
            [AccentColor.Emerald]: { color: '#10b981', hover: '#34d399', text: '#ffffff' },
        };
        const selectedColor = colorMap[settings.accentColor];
        root.style.setProperty('--accent-color', selectedColor.color);
        root.style.setProperty('--accent-color-hover', selectedColor.hover);
        root.style.setProperty('--accent-text', selectedColor.text);

        document.body.classList.remove('font-artistic', 'font-modern');
        document.body.classList.add(settings.fontFamily === FontFamily.Artistic ? 'font-artistic' : 'font-modern');
        
        document.documentElement.lang = settings.language;

    }, [settings.accentColor, settings.fontFamily, settings.language]);

    return (
        <SettingsContext.Provider value={{ settings, setSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const notificationIdRef = useRef(0);

    const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = notificationIdRef.current++;
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 4000);
    }, []);

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <div className="fixed bottom-4 right-4 sm:bottom-4 sm:right-4 md:bottom-auto md:top-24 md:right-4 z-[100] w-full max-w-xs space-y-2">
                {notifications.map(n => {
                    const typeClasses = {
                        success: 'bg-emerald-500 border-emerald-400',
                        error: 'bg-rose-500 border-rose-400',
                        info: 'bg-sky-500 border-sky-400',
                    };
                    return (
                        <div key={n.id} className={`flex items-center text-white text-sm font-semibold px-4 py-3 rounded-lg shadow-lg border-b-4 ${typeClasses[n.type]}`}>
                           {n.message}
                        </div>
                    );
                })}
            </div>
        </NotificationContext.Provider>
    );
};

const useUserData = (
    initialData: {
        history: string[];
        bookmarks: string[];
        learningPaths: LearningPath[];
        sessionSnapshots: SessionSnapshot[];
        imageLibrary: StoredImage[];
    },
    article: ArticleData | null, 
    currentTopic: string, 
    messages: ChatMessage[], 
    relatedTopics: RelatedTopic[], 
    closeAllPanels: () => void,
    handleTriggerImport: () => void,
): UserDataContextType => {
    const { addNotification } = useNotification();
    const { t } = useLocalization();
    const [history, setHistory] = useState<string[]>(initialData.history);
    const [bookmarks, setBookmarks] = useState<string[]>(initialData.bookmarks);
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>(initialData.learningPaths);
    const [sessionSnapshots, setSessionSnapshots] = useState<SessionSnapshot[]>(initialData.sessionSnapshots);
    const [imageLibrary, setImageLibrary] = useState<StoredImage[]>(initialData.imageLibrary);
    
    // This effect ensures state is updated if initialData changes after first render (e.g. after import)
    useEffect(() => {
        setHistory(initialData.history);
        setBookmarks(initialData.bookmarks);
        setLearningPaths(initialData.learningPaths);
        setSessionSnapshots(initialData.sessionSnapshots);
        setImageLibrary(initialData.imageLibrary);
    }, [initialData]);

    const toggleBookmark = useCallback((topic: string) => {
        const isBookmarked = bookmarks.includes(topic);
        if (isBookmarked) {
            db.deleteBookmark(topic)
                .then(() => {
                    setBookmarks(prev => prev.filter(b => b !== topic));
                    addNotification(t('notifications.bookmarkRemoved', { topic }), 'info');
                })
                .catch(err => console.error("Failed to delete bookmark", err));
        } else {
            db.addBookmark(topic)
                .then(() => {
                    setBookmarks(prev => [topic, ...prev]);
                    addNotification(t('notifications.bookmarkAdded', { topic }), 'success');
                })
                .catch(err => console.error("Failed to add bookmark", err));
        }
    }, [bookmarks, addNotification, t]);

    const updateLearningPaths = useCallback((newPaths: LearningPath[]) => {
        db.saveLearningPaths(newPaths)
            .then(() => setLearningPaths(newPaths))
            .catch(err => console.error("Failed to save learning paths", err));
    }, []);

    const handleAddToPath = useCallback((pathName: string, articleTitle: string) => {
        let articleAdded = false;
        const updatedPaths = learningPaths.map(p => {
            if (p.name === pathName) {
                if (!p.articles.some(a => a.title === articleTitle)) {
                    articleAdded = true;
                    return { ...p, articles: [...p.articles, { title: articleTitle, completed: false }] };
                } else {
                    addNotification(t('notifications.articleAlreadyInPath', { articleTitle, pathName }), 'info');
                }
            }
            return p;
        });
        if (articleAdded) {
            updateLearningPaths(updatedPaths);
            addNotification(t('notifications.articleAddedToPath', { articleTitle, pathName }), 'success');
        }
    }, [learningPaths, addNotification, t, updateLearningPaths]);


    const handleCreatePath = useCallback((pathName: string) => {
        if (!learningPaths.some(p => p.name === pathName)) {
            const newPaths = [...learningPaths, { name: pathName, articles: [] }];
            updateLearningPaths(newPaths);
            addNotification(t('notifications.pathCreated', { pathName }), 'success');
        }
    }, [learningPaths, addNotification, t, updateLearningPaths]);

    const handleSaveSnapshot = useCallback(() => {
        if (!article || !currentTopic) return;
        const name = prompt(t('prompts.snapshotName'), `${currentTopic} - ${new Date().toLocaleDateString()}`);
        if (name) {
            const snapshot: SessionSnapshot = {
                name,
                timestamp: Date.now(),
                topic: currentTopic,
                article,
                relatedTopics,
                chatHistory: messages,
            };
            const newSnapshots = [snapshot, ...sessionSnapshots];
            db.saveSessionSnapshots(newSnapshots)
                .then(() => {
                    setSessionSnapshots(newSnapshots);
                    closeAllPanels();
                    addNotification(t('notifications.snapshotSaved', { name }), 'success');
                })
                .catch(err => console.error("Failed to save snapshots", err));
        }
    }, [addNotification, article, currentTopic, messages, relatedTopics, sessionSnapshots, closeAllPanels, t]);

    const toggleArticleCompletion = useCallback((pathName: string, articleTitle: string) => {
        const newPaths = learningPaths.map(path => {
            if (path.name === pathName) {
                return {
                    ...path,
                    articles: path.articles.map(article => 
                        article.title === articleTitle 
                            ? { ...article, completed: !article.completed } 
                            : article
                    )
                };
            }
            return path;
        });
        updateLearningPaths(newPaths);
    }, [learningPaths, updateLearningPaths]);
    
    const reorderArticlesInPath = useCallback((pathName: string, startIndex: number, endIndex: number) => {
        const newPaths = learningPaths.map(path => {
            if (path.name === pathName) {
                const newArticles = Array.from(path.articles);
                const [removed] = newArticles.splice(startIndex, 1);
                newArticles.splice(endIndex, 0, removed);
                return { ...path, articles: newArticles };
            }
            return path;
        });
        updateLearningPaths(newPaths);
    }, [learningPaths, updateLearningPaths]);

    const removeArticleFromPath = useCallback((pathName: string, articleTitle: string) => {
        const newPaths = learningPaths.map(path => {
            if (path.name === pathName) {
                const initialLength = path.articles.length;
                const newArticles = path.articles.filter(article => article.title !== articleTitle);
                if (newArticles.length < initialLength) {
                    addNotification(t('notifications.articleRemovedFromPath', { articleTitle, pathName }), 'info');
                }
                return { ...path, articles: newArticles };
            }
            return path;
        });
        updateLearningPaths(newPaths);
    }, [addNotification, learningPaths, t, updateLearningPaths]);

    const addImageToLibrary = useCallback(async (imageData: { imageUrl: string; prompt: string; topic: string; }) => {
        const now = Date.now();
        const newImage: StoredImage = { id: now, timestamp: now, ...imageData };
        try {
            await db.addImage(newImage);
            setImageLibrary(prev => [newImage, ...prev]);
        } catch (error) {
            addNotification(t('errors.dbSaveFailed'), 'error');
        }
    }, [addNotification, t]);

    const clearImageLibraryItem = useCallback(async (id: number) => {
        try {
            await db.deleteImage(id);
            setImageLibrary(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            addNotification(t('errors.dbDeleteFailed'), 'error');
        }
    }, [addNotification, t]);

    const clearImageLibrary = useCallback(() => {
        const name = t('panels.imageLibrary.title');
        if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            db.clearImages().then(() => {
                setImageLibrary([]);
                addNotification(t('notifications.clearedAll', { name }), 'info');
            }).catch(() => addNotification(t('errors.dbClearFailed'), 'error'));
        }
    }, [addNotification, t]);
    
    const clearHistory = useCallback(() => {
        const name = t('panels.history.title');
        if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            db.clearHistory().then(() => {
                setHistory([]);
                addNotification(t('notifications.clearedAll', { name }), 'info');
            });
        }
    }, [addNotification, t]);

    const clearHistoryItem = useCallback((topic: string) => {
        db.deleteHistoryItem(topic).then(() => {
            setHistory(prev => prev.filter(item => item !== topic));
        });
    }, []);

    const clearBookmarks = useCallback(() => {
        const name = t('panels.bookmarks.title');
        if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            db.clearBookmarks().then(() => {
                setBookmarks([]);
                addNotification(t('notifications.clearedAll', { name }), 'info');
            });
        }
    }, [addNotification, t]);

    const clearBookmarkItem = useCallback((topic: string) => {
        db.deleteBookmark(topic).then(() => {
            setBookmarks(prev => prev.filter(item => item !== topic));
        });
    }, []);

    const clearLearningPaths = useCallback(() => {
        const name = t('panels.learningPaths.title');
         if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            db.clearLearningPaths().then(() => {
                setLearningPaths([]);
                addNotification(t('notifications.clearedAll', { name }), 'info');
            });
        }
    }, [addNotification, t]);

    const clearLearningPathItem = useCallback((pathName: string) => {
        if (window.confirm(t('prompts.confirmDeletePath', { pathName }))) {
            db.deleteLearningPath(pathName).then(() => {
                 setLearningPaths(prev => prev.filter(p => p.name !== pathName));
                 addNotification(t('notifications.pathDeleted', { pathName }), 'info');
            });
        }
    }, [addNotification, t]);
    
    const clearSnapshots = useCallback(() => {
        const name = t('panels.snapshots.title');
        if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            db.clearSessionSnapshots().then(() => {
                setSessionSnapshots([]);
                addNotification(t('notifications.clearedAll', { name }), 'info');
            });
        }
    }, [addNotification, t]);

    const clearSnapshot = useCallback((name: string) => {
        db.deleteSessionSnapshot(name).then(() => {
            setSessionSnapshots(prev => prev.filter(item => item.name !== name));
        });
    }, []);

    const handleExportData = useCallback(async () => {
        try {
            const settings = await db.getSettings(defaultSettings);
            const history = await db.getHistory();
            const bookmarks = await db.getBookmarks();
            const learningPaths = await db.getLearningPaths();
            const sessionSnapshots = await db.getSessionSnapshots();
            const imagesFromDb = await db.getAllImages();
            
            const backupData: CodexBackupData = { settings, history, bookmarks, learningPaths, sessionSnapshots, imageLibrary: imagesFromDb };
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `codex_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addNotification(t('notifications.exportSuccess'), 'success');
        } catch (error) {
             addNotification(t('errors.importFailed'), 'error');
        }
    }, [addNotification, t]);

    const handleImportData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error(t('errors.fileRead'));
                const data: CodexBackupData = JSON.parse(text);

                if (!data.settings || !Array.isArray(data.history)) {
                    throw new Error(t('errors.invalidBackup'));
                }
                
                // Clear old data and save new data
                await Promise.all([
                    db.saveSettings(data.settings),
                    db.clearHistory().then(() => Promise.all(data.history.map(db.addHistoryItem))),
                    db.clearBookmarks().then(() => Promise.all(data.bookmarks.map(db.addBookmark))),
                    db.saveLearningPaths(data.learningPaths || []),
                    db.saveSessionSnapshots(data.sessionSnapshots || []),
                    db.clearImages().then(() => db.bulkAddImages(data.imageLibrary || []))
                ]);
                
                // Force a reload to fetch new data from DB
                addNotification(t('notifications.importSuccess') + ' Reloading...', 'success');
                setTimeout(() => window.location.reload(), 1500);

            } catch (error) {
                console.error("Import failed:", error);
                addNotification(error instanceof Error ? error.message : t('errors.importFailed'), 'error');
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    }, [addNotification, t]);

    return useMemo(() => ({
        history, bookmarks, learningPaths, sessionSnapshots, imageLibrary, 
        setHistory,
        toggleBookmark, handleAddToPath, handleCreatePath, handleSaveSnapshot, addImageToLibrary,
        clearHistory, clearBookmarks, clearLearningPaths, clearSnapshots, clearImageLibrary,
        clearHistoryItem, clearBookmarkItem, clearLearningPathItem, clearSnapshot, clearImageLibraryItem,
        handleExportData, handleImportData, handleTriggerImport,
        toggleArticleCompletion, reorderArticlesInPath, removeArticleFromPath,
    }), [
        history, bookmarks, learningPaths, sessionSnapshots, imageLibrary, setHistory,
        toggleBookmark, handleAddToPath, handleCreatePath, handleSaveSnapshot, addImageToLibrary, 
        clearHistory, clearBookmarks, clearLearningPaths, clearSnapshots, clearImageLibrary,
        clearHistoryItem, clearBookmarkItem, clearLearningPathItem, clearSnapshot, clearImageLibraryItem,
        handleExportData, handleImportData, handleTriggerImport,
        toggleArticleCompletion, reorderArticlesInPath, removeArticleFromPath,
    ]);
};

const HeaderPanel = ({ title, icon: Icon, children, isOpen, onClose, onClearAll }: {
    title: string, icon: React.FC<{className?: string}>, children: React.ReactNode, isOpen: boolean,
    onClose: () => void, onClearAll: () => void
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const { t } = useLocalization();
    const memoizedOnClose = useCallback(onClose, [onClose]);

    useEffect(() => {
        if (isOpen) {
            const panelNode = panelRef.current;
            if (!panelNode) return;

            const focusableElements = Array.from(panelNode.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ));
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    memoizedOnClose();
                }
                if (e.key === 'Tab') {
                     if (e.shiftKey) { // Shift + Tab
                        if (document.activeElement === firstElement) {
                            lastElement?.focus();
                            e.preventDefault();
                        }
                    } else { // Tab
                        if (document.activeElement === lastElement) {
                            firstElement?.focus();
                            e.preventDefault();
                        }
                    }
                }
            };
            
            firstElement?.focus();
            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, memoizedOnClose]);

    return (
        <div 
            className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-900/80 backdrop-blur-sm shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            role="dialog" aria-modal="true" ref={panelRef} tabIndex={-1}
        >
            <div className="flex flex-col h-full border-l border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                     <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-accent" />
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white" aria-label={t('common.close')}><CloseIcon className="w-6 h-6"/></button>
                </div>
                <div className="flex-grow overflow-y-auto p-4">
                    {children}
                </div>
                <div className="p-4 border-t border-gray-700">
                    <button onClick={onClearAll} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/40 transition-colors">
                        <TrashIcon className="w-4 h-4" />
                        {t('panels.clearAll', { title })}
                    </button>
                </div>
            </div>
        </div>
    );
};

const MemoizedHeaderPanel = React.memo(HeaderPanel);

const MobileHeaderMenu = ({ togglePanel, setCommandPaletteOpen }: { togglePanel: (panel: string) => void, setCommandPaletteOpen: (isOpen: boolean) => void }) => {
    const { t } = useLocalization();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const menuItems = useMemo(() => [
        { id: 'commandPalette', title: t('commandPalette.open'), icon: CommandIcon, action: () => setCommandPaletteOpen(true) },
        { id: 'snapshots', title: t('panels.snapshots.title'), icon: CameraIcon, action: () => togglePanel('snapshots') },
        { id: 'help', title: t('panels.help.title'), icon: QuestionMarkCircleIcon, action: () => togglePanel('help') },
        { id: 'settings', title: t('panels.settings.title'), icon: CogIcon, action: () => togglePanel('settings') },
    ], [t, togglePanel, setCommandPaletteOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMenuOpen]);

    return (
        <div className="relative md:hidden" ref={menuRef}>
            <button
                onClick={() => setIsMenuOpen(prev => !prev)}
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                aria-label={t('common.openMenu')}
            >
                <MoreVerticalIcon className="w-6 h-6" />
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 origin-top-right bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-1 z-20 animate-fade-in-down">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                item.action();
                                setIsMenuOpen(false);
                            }}
                            title={item.title}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left text-gray-300 rounded-md hover:bg-gray-700/80"
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.title}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const EmptyState = ({ icon: Icon, text }: { icon: React.FC<{className?: string}>, text: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
        <Icon className="w-16 h-16 mb-4"/>
        <p className="text-sm">{text}</p>
    </div>
);

interface InitialUserData {
    history: string[];
    bookmarks: string[];
    learningPaths: LearningPath[];
    sessionSnapshots: SessionSnapshot[];
    imageLibrary: StoredImage[];
}
function CodexApp({ initialUserData }: { initialUserData: InitialUserData }) {
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [relatedTopics, setRelatedTopics] = useState<RelatedTopic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // FIX: Updated state type to match the categorized data structure expected by the UI.
  const [starterTopics, setStarterTopics] = useState<{ [key: string]: StarterTopic[] }>({});
  const [isLoadingTopics, setIsLoadingTopics] = useState(true);
  const [generatingImages, setGeneratingImages] = useState<number[]>([]);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [imageQueue, setImageQueue] = useState<number[]>([]);
  const [generatingVideoInfo, setGeneratingVideoInfo] = useState<{ index: number | null, status: string | null }>({ index: null, status: null });
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<StoredImage | null>(null);
  const [isLightboxCopied, setIsLightboxCopied] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<{ title: string; introduction: string }[]>([]);
  
  const { settings, setSettings } = useContext(SettingsContext)!;
  const { addNotification } = useNotification();
  const { locale, t } = useLocalization();
  const importFileRef = useRef<HTMLInputElement>(null);
  
  const closeAllPanels = useCallback(() => setActivePanel(null), []);
  const handleTriggerImport = () => importFileRef.current?.click();
  
  const userData = useUserData(
      initialUserData, article, currentTopic, messages, relatedTopics, closeAllPanels, handleTriggerImport
  );
  
  const { history, bookmarks, imageLibrary, addImageToLibrary, learningPaths, sessionSnapshots } = userData;

  const isBookmarked = useMemo(() => {
    if (!article) return false;
    return bookmarks.includes(article.title);
  }, [article, bookmarks]);

  const fullArticleText = useMemo(() => {
      if (!article) return '';
      return [
          article.title,
          article.introduction,
          ...article.sections.map(s => `${s.heading}\n${s.content}`),
          article.conclusion
      ].join('\n\n');
  }, [article]);
  
  useEffect(() => {
    if (article) {
        const previousArticles = sessionHistory.slice(0,3);
        let previousArticlesContext = '';

        if (previousArticles.length > 0) {
            const contextText = previousArticles.map(article => `Topic: "${article.title}", Summary: "${article.introduction}"`).join('; ');
            previousArticlesContext = t('athena.previousArticleContextPreamble', { context: contextText });
        }

        const welcomeMessage = t('athena.welcomeMessage', { title: article.title });
        setMessages([{ role: 'model', parts: [{ text: welcomeMessage }] }]);
        setChat(startChat(fullArticleText, locale, t, previousArticlesContext));
    } else {
        setMessages([]);
        setChat(null);
    }
  }, [article, fullArticleText, locale, t, sessionHistory]);

  useEffect(() => {
    setIsLoadingTopics(true);
    setStarterTopics(getStarterTopics(t));
    setIsLoadingTopics(false);
  }, [t, locale]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setCommandPaletteOpen(isOpen => !isOpen);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
        if (article) { 
            article.sections.forEach(section => {
                if (section.videoUrl && section.videoUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(section.videoUrl);
                }
            });
        }
    };
  }, [article]);

  const handleSearch = useCallback(async (topic: string, isRetry = false) => {
    if (isLoading) return;

    window.scrollTo(0, 0);
    setIsLoading(true);
    setError(null);
    
    if (isRetry || topic !== currentTopic) {
        setArticle(null);
        setRelatedTopics([]);
    }
    setCurrentTopic(topic);

    try {
        const articleDataPromise = generateArticleContent(topic, settings, locale);
        const relatedTopicsPromise = getRelatedTopics(topic, settings, locale);

        const [articleData, relatedTopicsData] = await Promise.all([
            articleDataPromise,
            relatedTopicsPromise
        ]);
        
        setArticle(articleData);
        setRelatedTopics(relatedTopicsData);
        
        setSessionHistory(prev => {
            const isAlreadyPresent = prev.some(item => item.title === articleData.title);
            if (isAlreadyPresent) {
                return prev;
            }
            const newHistory = [{ title: articleData.title, introduction: articleData.introduction }, ...prev];
            return newHistory.slice(0, 3);
        });

        if (!history.includes(topic)) {
            db.addHistoryItem(topic).then(() => {
                userData.setHistory(prev => [topic, ...prev].slice(0, 100));
            });
        }

    } catch (error: any) {
        setArticle(null);
        setRelatedTopics([]);
        setError(error.message || t('errors.unknown'));
        console.error("Error during search:", error);
    } finally {
        setIsLoading(false);
    }
  }, [isLoading, settings, history, userData, t, locale, currentTopic]);

  
  const handleRetry = () => {
      if (currentTopic) {
          handleSearch(currentTopic, true);
      }
  };

  const handleSerendipity = useCallback(async () => {
    addNotification(t('notifications.findingConnection'), 'info');
    try {
      const serendipityTopic = await getSerendipitousTopic(currentTopic || 'philosophy', locale);
      addNotification(t('notifications.cosmicLeapFound', { topic: serendipityTopic }), 'success');
      handleSearch(serendipityTopic);
    } catch (error: any) {
      addNotification(error.message || t('errors.cosmicLeapFailed'), 'error');
    }
  }, [currentTopic, handleSearch, addNotification, t, locale]);

  const handleGenerateImage = useCallback(async (sectionIndex: number) => {
    if (!article || generatingImages.includes(sectionIndex)) return;

    const section = article.sections[sectionIndex];
    if (!section.imagePrompt) return;

    setGeneratingImages(prev => [...prev, sectionIndex]);

    try {
        const imageUrl = await generateImageForSection(section.imagePrompt, settings, locale);
        setArticle(prevArticle => {
            if (!prevArticle) return null;
            const newSections = [...prevArticle.sections];
            newSections[sectionIndex] = { ...newSections[sectionIndex], imageUrl };
            return { ...prevArticle, sections: newSections };
        });
        addImageToLibrary({
            imageUrl,
            prompt: section.imagePrompt,
            topic: article.title,
        });
    } catch (error: any) {
        addNotification(error.message || t('errors.imageGenSectionFailed', { section: section.heading }), 'error');
    } finally {
        setGeneratingImages(prev => prev.filter(i => i !== sectionIndex));
        setImageQueue(prev => prev.filter(i => i !== sectionIndex));
    }
  }, [article, generatingImages, settings, addNotification, t, locale, addImageToLibrary]);
  
  useEffect(() => {
    if (settings.autoLoadImages && article && generatingImages.length === 0 && imageQueue.length === 0) {
        const missingImageIndices = article.sections
            .map((s, i) => (s.imagePrompt && !s.imageUrl ? i : -1))
            .filter(i => i !== -1);
        if (missingImageIndices.length > 0) {
            setImageQueue(missingImageIndices);
        }
    }
  }, [article, settings.autoLoadImages, generatingImages.length, imageQueue.length]);

  useEffect(() => {
    if (imageQueue.length > 0 && generatingImages.length === 0) {
      handleGenerateImage(imageQueue[0]);
    }
  }, [imageQueue, generatingImages, handleGenerateImage]);

  const handleGenerateAllImages = useCallback(() => {
    if (!article) return;
    const missingImageIndices = article.sections
        .map((s, i) => (s.imagePrompt && !s.imageUrl ? i : -1))
        .filter(i => i !== -1);
    
    if (missingImageIndices.length === 0) {
        addNotification(t('notifications.allImagesGenerated'), 'info');
        return;
    }
    
    setImageQueue(prev => [...missingImageIndices.filter(i => !prev.includes(i))]);
  }, [article, addNotification, t]);

  const handleGenerateVideo = useCallback(async (sectionIndex: number) => {
    if (!article || generatingVideoInfo.index !== null) return;

    const section = article.sections[sectionIndex];
    if (!section.imagePrompt) {
        addNotification(t('errors.noPromptForVideo'), 'error');
        return;
    }

    setGeneratingVideoInfo({ index: sectionIndex, status: t('article.video.status.start') });

    try {
        const onStatusUpdate = (status: string) => {
             setGeneratingVideoInfo({ index: sectionIndex, status });
        };
        const videoUrl = await generateVideoForSection(section.imagePrompt, settings, locale, onStatusUpdate);
        
        setArticle(prevArticle => {
            if (!prevArticle) return null;
            const newSections = [...prevArticle.sections];
            newSections[sectionIndex] = { ...newSections[sectionIndex], videoUrl };
            return { ...prevArticle, sections: newSections };
        });
        addNotification(t('notifications.videoGeneratedSuccess'), 'success');
    } catch (error: any) {
        addNotification(error.message || t('errors.videoGenerationFailed'), 'error');
    } finally {
        setGeneratingVideoInfo({ index: null, status: null });
    }
  }, [article, generatingVideoInfo.index, settings, addNotification, t, locale]);

  const handleEditImage = useCallback(async (sectionIndex: number, prompt: string) => {
    if (!article || editingImageIndex !== null) return;

    const section = article.sections[sectionIndex];
    const originalImageUrl = section.imageUrl;
    if (!originalImageUrl) return;

    setEditingImageIndex(sectionIndex);
    try {
        const newImageUrl = await editImage(originalImageUrl, prompt, locale);
        setArticle(prevArticle => {
            if (!prevArticle) return null;
            const newSections = [...prevArticle.sections];
            newSections[sectionIndex] = { ...newSections[sectionIndex], imageUrl: newImageUrl };
            return { ...prevArticle, sections: newSections };
        });
        addImageToLibrary({
            imageUrl: newImageUrl,
            prompt: t('panels.imageLibrary.editedPrompt', { editPrompt: prompt, originalPrompt: section.imagePrompt }),
            topic: article.title,
        });
        addNotification(t('notifications.imageEditedSuccess'), 'success');
    } catch (error: any) {
        addNotification(error.message || t('errors.imageEditFailed'), 'error');
    } finally {
        setEditingImageIndex(null);
    }
  }, [article, editingImageIndex, addImageToLibrary, addNotification, t, locale]);
  
  const togglePanel = (panel: string) => {
    setActivePanel(prev => (prev === panel ? null : panel));
  };
  
  const handleRestoreSnapshot = (snapshot: SessionSnapshot) => {
    setCurrentTopic(snapshot.topic);
    setArticle(snapshot.article);
    setRelatedTopics(snapshot.relatedTopics);
    setMessages(snapshot.chatHistory);
    closeAllPanels();
    addNotification(t('notifications.snapshotRestored', { name: snapshot.name }), 'success');
  };
  
  const commandPaletteActions = {
      ...userData,
      onClose: () => setCommandPaletteOpen(false),
      onSearch: (topic: string) => { handleSearch(topic); setCommandPaletteOpen(false); },
      togglePanel: (panel: string) => { togglePanel(panel); setCommandPaletteOpen(false); },
      onSerendipity: handleSerendipity,
      article: article,
      onGenerateAllImages: handleGenerateAllImages,
  };
  
  const lightboxCopy = () => {
      if (lightboxImage) {
          const promptToCopy = lightboxImage.prompt.startsWith('(Edit)') ? lightboxImage.prompt : constructImagePrompt(lightboxImage.prompt, settings, locale);
          navigator.clipboard.writeText(promptToCopy);
          setIsLightboxCopied(true);
          setTimeout(() => setIsLightboxCopied(false), 2000);
      }
  };

  return (
    <UserDataContext.Provider value={userData}>
      {!settings.hasOnboarded && <EntryPortal onStart={() => setSettings(s => ({ ...s, hasOnboarded: true }))} />}
      
      <CommandPalette {...commandPaletteActions} isOpen={isCommandPaletteOpen} />
      
      <SettingsModal isVisible={activePanel === 'settings'} onClose={closeAllPanels} />
      <HelpGuide isVisible={activePanel === 'help'} onClose={closeAllPanels} />
      
      <MemoizedHeaderPanel title={t('panels.history.title')} icon={HistoryIcon} isOpen={activePanel === 'history'} onClose={closeAllPanels} onClearAll={userData.clearHistory}>
          {history.length > 0 ? history.map(item => (
              <div key={item} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md group">
                  <button onClick={() => { handleSearch(item); closeAllPanels(); }} className="truncate hover:text-accent">{item}</button>
                  <button onClick={() => userData.clearHistoryItem(item)} className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100" title={t('panels.deleteEntry')}><TrashIcon className="w-4 h-4"/></button>
              </div>
          )) : <EmptyState icon={HistoryIcon} text={t('panels.noEntries')} />}
      </MemoizedHeaderPanel>
      
      <MemoizedHeaderPanel title={t('panels.bookmarks.title')} icon={BookmarkIcon} isOpen={activePanel === 'bookmarks'} onClose={closeAllPanels} onClearAll={userData.clearBookmarks}>
          {bookmarks.length > 0 ? bookmarks.map(item => (
              <div key={item} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md group">
                  <button onClick={() => { handleSearch(item); closeAllPanels(); }} className="truncate hover:text-accent">{item}</button>
                  <button onClick={() => userData.clearBookmarkItem(item)} className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100" title={t('panels.deleteEntry')}><TrashIcon className="w-4 h-4"/></button>
              </div>
          )) : <EmptyState icon={BookmarkIcon} text={t('panels.noEntries')} />}
      </MemoizedHeaderPanel>

      <MemoizedHeaderPanel title={t('panels.learningPaths.title')} icon={PathIcon} isOpen={activePanel === 'learningPaths'} onClose={closeAllPanels} onClearAll={userData.clearLearningPaths}>
          <LearningPathsManager handleSearch={handleSearch} closePanel={closeAllPanels}/>
      </MemoizedHeaderPanel>
      
      <MemoizedHeaderPanel title={t('panels.snapshots.title')} icon={CameraIcon} isOpen={activePanel === 'snapshots'} onClose={closeAllPanels} onClearAll={userData.clearSnapshots}>
          {sessionSnapshots.length > 0 ? sessionSnapshots.map(item => (
              <div key={item.name} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md group">
                  <div className="flex-grow truncate">
                    <button onClick={() => handleRestoreSnapshot(item)} className="text-left hover:text-accent">
                        <p className="font-semibold truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 truncate">{item.topic}</p>
                    </button>
                  </div>
                  <button onClick={() => userData.clearSnapshot(item.name)} className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100" title={t('panels.deleteEntry')}><TrashIcon className="w-4 h-4"/></button>
              </div>
          )) : <EmptyState icon={CameraIcon} text={t('panels.noEntries')} />}
      </MemoizedHeaderPanel>

      <MemoizedHeaderPanel title={t('panels.imageLibrary.title')} icon={ImageIcon} isOpen={activePanel === 'imageLibrary'} onClose={closeAllPanels} onClearAll={userData.clearImageLibrary}>
          {imageLibrary.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
                {imageLibrary.map(img => (
                    <button key={img.id} onClick={() => setLightboxImage(img)} className="aspect-square bg-gray-700 rounded-md overflow-hidden relative group">
                        <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                           <p className="text-xs text-white text-center line-clamp-3">{img.prompt}</p>
                        </div>
                    </button>
                ))}
            </div>
          ) : <EmptyState icon={ImageIcon} text={t('panels.noEntries')} />}
      </MemoizedHeaderPanel>


      <div className={`min-h-screen pb-16 md:pb-0 ${activePanel ? 'md:pr-[28rem]' : ''} transition-all duration-300`}>
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
               <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent flex-shrink-0"><circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3"></circle><path d="M23 23C20.5 26.5 15 27.5 11 23C7 18.5 8.5 11.5 14 8.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path></svg>
               <h1 className="hidden sm:block text-2xl font-bold text-white tracking-wider">Codex</h1>
            </div>
            <div className="flex-grow max-w-2xl mx-2 sm:mx-8">
              <SearchBar onSearch={handleSearch} onSerendipity={handleSerendipity} isLoading={isLoading} />
            </div>
            <div className="hidden md:flex items-center gap-1">
                <button onClick={() => setCommandPaletteOpen(true)} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('commandPalette.open')}><CommandIcon className="w-6 h-6"/></button>
                <button onClick={() => togglePanel('history')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('panels.history.title')}><HistoryIcon className="w-6 h-6"/></button>
                <button onClick={() => togglePanel('bookmarks')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('panels.bookmarks.title')}><BookmarkIcon className="w-6 h-6"/></button>
                <button onClick={() => togglePanel('learningPaths')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('panels.learningPaths.title')}><PathIcon className="w-6 h-6"/></button>
                <button onClick={() => togglePanel('imageLibrary')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('panels.imageLibrary.title')}><ImageIcon className="w-6 h-6"/></button>
                <span className="w-px h-6 bg-gray-700 mx-2"></span>
                <button onClick={() => togglePanel('snapshots')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('panels.snapshots.title')}><CameraIcon className="w-6 h-6"/></button>
                <button onClick={() => togglePanel('help')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('panels.help.title')}><QuestionMarkCircleIcon className="w-6 h-6"/></button>
                <button onClick={() => togglePanel('settings')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80" title={t('panels.settings.title')}><CogIcon className="w-6 h-6"/></button>
            </div>
            <MobileHeaderMenu togglePanel={togglePanel} setCommandPaletteOpen={setCommandPaletteOpen} />
          </div>
        </header>

        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 mb-8 lg:mb-0">
              <ArticleView
                  article={article}
                  isLoading={isLoading}
                  error={error}
                  onRetry={handleRetry}
                  starterTopics={starterTopics}
                  isLoadingTopics={isLoadingTopics}
                  onTopicClick={handleSearch}
                  onGenerateImage={handleGenerateImage}
                  onGenerateAllImages={handleGenerateAllImages}
                  onGenerateVideo={handleGenerateVideo}
                  generatingImages={generatingImages}
                  generatingVideoInfo={generatingVideoInfo}
                  onEditImage={handleEditImage}
                  editingImageIndex={editingImageIndex}
                  fullArticleText={fullArticleText}
                  isBookmarked={isBookmarked}
              />
              {relatedTopics.length > 0 && (
                <SynapseGraph
                    currentTopic={currentTopic}
                    relatedTopics={relatedTopics}
                    onTopicClick={handleSearch}
                    onSerendipity={handleSerendipity}
                    isLoading={isLoading}
                />
              )}
            </div>
            <div className="lg:col-span-1">
              <AthenaCopilot
                article={article}
                fullArticleText={fullArticleText}
                chat={chat}
                messages={messages}
                setMessages={setMessages}
                isLoadingArticle={isLoading}
                currentTopic={currentTopic}
              />
            </div>
          </div>
        </main>
      </div>
      <input
        type="file"
        ref={importFileRef}
        onChange={userData.handleImportData}
        className="hidden"
        accept=".json"
      />
      <BottomNavBar activePanel={activePanel} togglePanel={togglePanel} />

      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <img src={lightboxImage.imageUrl} alt={lightboxImage.prompt} className="max-w-full max-h-[90vh] object-contain rounded-lg"/>
                <div className="absolute -bottom-14 left-0 w-full text-center p-2 text-white">
                    <p className="text-sm bg-black/50 p-2 rounded-md inline-block max-w-full truncate">{lightboxImage.prompt}</p>
                    <div className="mt-2 flex items-center justify-center gap-4">
                        <button onClick={lightboxCopy} className="flex items-center gap-1.5 text-sm text-sky-400 hover:text-sky-300 transition-transform active:scale-95">
                             <ClipboardCopyIcon className="w-4 h-4" isCopied={isLightboxCopied} />
                             {isLightboxCopied ? t('common.copied') : t('common.copyPrompt')}
                         </button>
                         <button onClick={() => userData.clearImageLibraryItem(lightboxImage.id)} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-transform active:scale-95">
                             <TrashIcon className="w-4 h-4" /> {t('panels.deleteEntry')}
                         </button>
                    </div>
                </div>
                <button onClick={() => setLightboxImage(null)} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-white/20">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>
        </div>
      )}
    </UserDataContext.Provider>
  );
}

interface InitialUserData {
    history: string[];
    bookmarks: string[];
    learningPaths: LearningPath[];
    sessionSnapshots: SessionSnapshot[];
    imageLibrary: StoredImage[];
}

const App = () => {
    const [initialSettings, setInitialSettings] = useState<AppSettings | null>(null);
    const [initialUserData, setInitialUserData] = useState<InitialUserData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const settings = await db.getSettings(defaultSettings);
                const history = await db.getHistory();
                const bookmarks = await db.getBookmarks();
                const learningPaths = await db.getLearningPaths();
                const sessionSnapshots = await db.getSessionSnapshots();
                const imageLibrary = await db.getAllImages();
                
                setInitialSettings(settings);
                setInitialUserData({ history, bookmarks, learningPaths, sessionSnapshots, imageLibrary });
            } catch (err) {
                console.error("Failed to load data from IndexedDB", err);
                setError("Could not load application data. Please ensure your browser supports IndexedDB and is not in private mode.");
                setInitialSettings(defaultSettings); // Use defaults on error
                setInitialUserData({ history: [], bookmarks: [], learningPaths: [], sessionSnapshots: [], imageLibrary: [] });
            }
        };
        loadInitialData();
    }, []);

    if (!initialSettings || !initialUserData) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
                <LoadingSpinner text="Initializing Codex..." />
            </div>
        );
    }

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-red-400 p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">Application Error</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <SettingsProvider initialSettings={initialSettings}>
            <LocalizationProvider>
                <NotificationProvider>
                    <CodexApp initialUserData={initialUserData} />
                </NotificationProvider>
            </LocalizationProvider>
        </SettingsProvider>
    );
};

export default App;