import React, { useState, useCallback, useEffect, useRef, useContext, useMemo } from 'react';
import SearchBar from './components/SearchBar';
import ArticleView from './components/ArticleView';
import AthenaCopilot from './components/AthenaCopilot';
import SynapseGraph from './components/SynapseGraph';
import { ArticleData, RelatedTopic, StarterTopic, AppSettings, AccentColor, FontFamily, ArticleLength, ImageStyle, TextSize, LearningPath, SessionSnapshot, ChatMessage, CodexBackupData, Notification, NotificationType, Language, UserDataContextType, StoredImage } from './types';
import { generateArticleContent, getRelatedTopics, generateImageForSection, getSerendipitousTopic, getStarterTopics, startChat, editImage, generateVideoForSection } from './services/geminiService';
import { addImage, getAllImages, deleteImage, clearImages, bulkAddImages } from './services/dbService';
import { HistoryIcon, BookmarkIcon, CogIcon, CloseIcon, PathIcon, CameraIcon, TrashIcon, UploadIcon, DownloadIcon, QuestionMarkCircleIcon, SparklesIcon, CommandIcon, ImageIcon, SearchIcon, MoreVerticalIcon } from './components/IconComponents';
import SettingsModal from './components/SettingsModal';
import HelpGuide from './components/HelpGuide';
import EntryPortal from './components/EntryPortal';
import CommandPalette from './components/CommandPalette';
import LearningPathsManager from './components/LearningPathsManager';
import BottomNavBar from './components/BottomNavBar';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { SettingsContext, UserDataContext, NotificationContext } from './context/AppContext';
import type { Chat } from '@google/genai';


// HOOKS
const useNotification = () => useContext(NotificationContext)!;

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
        return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
};

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
};

// Provider Components
const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
    const [settings, setSettings] = useLocalStorage<AppSettings>('codex-settings', defaultSettings);
    const mergedSettings = useMemo(() => ({ ...defaultSettings, ...settings }), [settings]);

    useEffect(() => {
        const root = document.documentElement;
        const colorMap = {
            [AccentColor.Amber]: { color: '#f59e0b', hover: '#fbbf24', text: '#1f2937' },
            [AccentColor.Sky]: { color: '#38bdf8', hover: '#7dd3fc', text: '#ffffff' },
            [AccentColor.Rose]: { color: '#f43f5e', hover: '#fb7185', text: '#ffffff' },
            [AccentColor.Emerald]: { color: '#10b981', hover: '#34d399', text: '#ffffff' },
        };
        const selectedColor = colorMap[mergedSettings.accentColor];
        root.style.setProperty('--accent-color', selectedColor.color);
        root.style.setProperty('--accent-color-hover', selectedColor.hover);
        root.style.setProperty('--accent-text', selectedColor.text);

        document.body.classList.remove('font-artistic', 'font-modern');
        document.body.classList.add(mergedSettings.fontFamily === FontFamily.Artistic ? 'font-artistic' : 'font-modern');
        
        document.documentElement.lang = mergedSettings.language;

    }, [mergedSettings.accentColor, mergedSettings.fontFamily, mergedSettings.language]);

    return (
        <SettingsContext.Provider value={{ settings: mergedSettings, setSettings }}>
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
            <div className="fixed bottom-4 right-4 z-[100] w-full max-w-xs space-y-2">
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
    settings: AppSettings, 
    setSettings: (value: AppSettings | ((val: AppSettings) => AppSettings)) => void,
    article: ArticleData | null, 
    currentTopic: string, 
    messages: ChatMessage[], 
    relatedTopics: RelatedTopic[], 
    closeAllPanels: () => void,
    handleTriggerImport: () => void,
): UserDataContextType => {
    const { addNotification } = useNotification();
    const { t } = useLocalization();
    const [history, setHistory] = useLocalStorage<string[]>('codex-history', []);
    const [bookmarks, setBookmarks] = useLocalStorage<string[]>('codex-bookmarks', []);
    const [learningPaths, setLearningPaths] = useLocalStorage<LearningPath[]>('codex-learning-paths', []);
    const [sessionSnapshots, setSessionSnapshots] = useLocalStorage<SessionSnapshot[]>('codex-session-snapshots', []);
    const [imageLibrary, setImageLibrary] = useState<StoredImage[]>([]);

    useEffect(() => {
        getAllImages().then(setImageLibrary).catch(err => {
            console.error("Failed to load images from DB", err);
            addNotification(t('errors.dbLoadFailed'), 'error');
        });
    }, [addNotification, t]);

    const toggleBookmark = useCallback((topic: string) => {
        setBookmarks(prev => {
            const isBookmarked = prev.includes(topic);
            if (isBookmarked) {
                addNotification(t('notifications.bookmarkRemoved', { topic }), 'info');
                return prev.filter(b => b !== topic);
            } else {
                addNotification(t('notifications.bookmarkAdded', { topic }), 'success');
                return [topic, ...prev];
            }
        });
    }, [addNotification, setBookmarks, t]);

    const handleAddToPath = useCallback((pathName: string, articleTitle: string) => {
        setLearningPaths(paths => {
            let articleAdded = false;
            const updatedPaths = paths.map(p => {
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
                addNotification(t('notifications.articleAddedToPath', { articleTitle, pathName }), 'success');
            }
            return updatedPaths;
        });
    }, [addNotification, setLearningPaths, t]);


    const handleCreatePath = useCallback((pathName: string) => {
        setLearningPaths(paths => {
            if (!paths.some(p => p.name === pathName)) {
                addNotification(t('notifications.pathCreated', { pathName }), 'success');
                return [...paths, { name: pathName, articles: [] }];
            }
            return paths;
        });
    }, [addNotification, setLearningPaths, t]);

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
            setSessionSnapshots(prev => [snapshot, ...prev]);
            closeAllPanels();
            addNotification(t('notifications.snapshotSaved', { name }), 'success');
        }
    }, [addNotification, article, currentTopic, messages, relatedTopics, setSessionSnapshots, closeAllPanels, t]);

    const toggleArticleCompletion = useCallback((pathName: string, articleTitle: string) => {
        setLearningPaths(paths => paths.map(path => {
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
        }));
    }, [setLearningPaths]);
    
    const reorderArticlesInPath = useCallback((pathName: string, startIndex: number, endIndex: number) => {
        setLearningPaths(paths => paths.map(path => {
            if (path.name === pathName) {
                const newArticles = Array.from(path.articles);
                const [removed] = newArticles.splice(startIndex, 1);
                newArticles.splice(endIndex, 0, removed);
                return { ...path, articles: newArticles };
            }
            return path;
        }));
    }, [setLearningPaths]);

    const removeArticleFromPath = useCallback((pathName: string, articleTitle: string) => {
        setLearningPaths(paths => paths.map(path => {
            if (path.name === pathName) {
                const initialLength = path.articles.length;
                const newArticles = path.articles.filter(article => article.title !== articleTitle);
                if (newArticles.length < initialLength) {
                    addNotification(t('notifications.articleRemovedFromPath', { articleTitle, pathName }), 'info');
                }
                return {
                    ...path,
                    articles: newArticles
                };
            }
            return path;
        }));
    }, [addNotification, setLearningPaths, t]);

    const addImageToLibrary = useCallback(async (imageData: { imageUrl: string; prompt: string; topic: string; }) => {
        const now = Date.now();
        const newImage: StoredImage = {
            id: now,
            timestamp: now,
            ...imageData,
        };
        try {
            await addImage(newImage);
            setImageLibrary(prev => [newImage, ...prev]);
        } catch (error) {
            addNotification(t('errors.dbSaveFailed'), 'error');
        }
    }, [addNotification, t]);

    const clearImageLibraryItem = useCallback(async (id: number) => {
        try {
            await deleteImage(id);
            setImageLibrary(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            addNotification(t('errors.dbDeleteFailed'), 'error');
        }
    }, [addNotification, t]);

    const clearImageLibrary = useCallback(() => {
        const name = t('panels.imageLibrary.title');
        if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            clearImages().then(() => {
                setImageLibrary([]);
                addNotification(t('notifications.clearedAll', { name }), 'info');
            }).catch(() => {
                addNotification(t('errors.dbClearFailed'), 'error');
            });
        }
    }, [addNotification, t]);

    const makeClearer = useCallback((setter: React.Dispatch<React.SetStateAction<any[]>>, name: string) => () => {
        if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            setter([]);
            addNotification(t('notifications.clearedAll', { name }), 'info');
        }
    }, [addNotification, t]);
    
    const makeClearItem = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, idProp: (item: T) => string | number) => (id: string | number) => {
        setter(prev => prev.filter(item => idProp(item) !== id));
    }, []);

    const clearLearningPathItem = useCallback((pathName: string) => {
        if (window.confirm(t('prompts.confirmDeletePath', { pathName }))) {
            setLearningPaths(prev => {
                const updatedPaths = prev.filter(p => p.name !== pathName);
                if (updatedPaths.length < prev.length) {
                    addNotification(t('notifications.pathDeleted', { pathName }), 'info');
                }
                return updatedPaths;
            });
        }
    }, [addNotification, setLearningPaths, t]);

    const handleExportData = useCallback(async () => {
        const imagesFromDb = await getAllImages();
        const backupData: CodexBackupData = { settings, history, bookmarks, learningPaths, sessionSnapshots, imageLibrary: imagesFromDb };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `codex_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addNotification(t('notifications.exportSuccess'), 'success');
    }, [settings, history, bookmarks, learningPaths, sessionSnapshots, addNotification, t]);

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

                setSettings(data.settings);
                setHistory(data.history);
                setBookmarks(data.bookmarks);
                setLearningPaths(data.learningPaths);
                setSessionSnapshots(data.sessionSnapshots);
                
                await clearImages();
                if (data.imageLibrary && Array.isArray(data.imageLibrary)) {
                    await bulkAddImages(data.imageLibrary);
                    const sortedImages = data.imageLibrary.sort((a, b) => b.timestamp - a.timestamp);
                    setImageLibrary(sortedImages);
                } else {
                    setImageLibrary([]);
                }

                addNotification(t('notifications.importSuccess'), 'success');
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
    }, [addNotification, setSettings, setHistory, setBookmarks, setLearningPaths, setSessionSnapshots, t]);

    return useMemo(() => ({
        history, bookmarks, learningPaths, sessionSnapshots, imageLibrary, setHistory,
        toggleBookmark, handleAddToPath, handleCreatePath, handleSaveSnapshot, addImageToLibrary,
        clearHistory: makeClearer(setHistory, t('panels.history.title')),
        clearBookmarks: makeClearer(setBookmarks, t('panels.bookmarks.title')),
        clearLearningPaths: makeClearer(setLearningPaths, t('panels.learningPaths.title')),
        clearSnapshots: makeClearer(setSessionSnapshots, t('panels.snapshots.title')),
        clearImageLibrary,
        clearHistoryItem: makeClearItem(setHistory, item => item),
        clearBookmarkItem: makeClearItem(setBookmarks, item => item),
        clearLearningPathItem,
        clearSnapshot: makeClearItem(setSessionSnapshots, item => item.name),
        clearImageLibraryItem,
        handleExportData,
        handleImportData,
        handleTriggerImport,
        toggleArticleCompletion,
        reorderArticlesInPath,
        removeArticleFromPath,
    }), [
        history, bookmarks, learningPaths, sessionSnapshots, imageLibrary, setHistory,
        toggleBookmark, handleAddToPath, handleCreatePath, handleSaveSnapshot, addImageToLibrary, 
        makeClearer, setBookmarks, setLearningPaths, setSessionSnapshots,
        makeClearItem, handleExportData, handleImportData, handleTriggerImport,
        toggleArticleCompletion, reorderArticlesInPath, removeArticleFromPath,
        clearLearningPathItem, t, clearImageLibrary, clearImageLibraryItem
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
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
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


function CodexApp() {
  const [hasStarted, setHasStarted] = useLocalStorage('codex-has-started', false);
  const [currentTopic, setCurrentTopic] = useState<string>('');
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [relatedTopics, setRelatedTopics] = useState<RelatedTopic[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [starterTopics, setStarterTopics] = useState<StarterTopic[]>([]);
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
  
  const { settings, setSettings } = useContext(SettingsContext)!;
  const { addNotification } = useNotification();
  const { locale, t } = useLocalization();

  const importFileRef = useRef<HTMLInputElement>(null);
  
  const closeAllPanels = useCallback(() => setActivePanel(null), []);

  const handleTriggerImport = () => {
      importFileRef.current?.click();
  };
  
  const userData = useUserData(
      settings, setSettings, article, currentTopic, messages, relatedTopics, closeAllPanels, handleTriggerImport
  );
  
  const { history, bookmarks, imageLibrary, addImageToLibrary } = userData;

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
          const welcomeMessage = t('athena.welcomeMessage', { title: article.title });
          setMessages([{ role: 'model', parts: [{ text: welcomeMessage }] }]);
          setChat(startChat(fullArticleText, locale, t));
      } else {
          setMessages([]);
          setChat(null);
      }
  }, [article, fullArticleText, locale, t]);

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
        
        if (!history.includes(topic)) {
            userData.setHistory(prev => [topic, ...prev].slice(0, 100));
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

  const handleGenerateImage = useCallback((sectionIndex: number) => {
    if (generatingImages.includes(sectionIndex) || imageQueue.includes(sectionIndex)) {
        return;
    }
    setImageQueue(prev => [...prev, sectionIndex]);
  }, [generatingImages, imageQueue]);

  const handleGenerateAllImages = useCallback(() => {
    if (!article) return;
    const missingImageIndices = article.sections
        .map((_, index) => index)
        .filter(index => {
            const section = article.sections[index];
            return section.imagePrompt && !section.imageUrl;
        });

    if (missingImageIndices.length === 0) {
        if (!generatingImages.length && !imageQueue.length) {
            addNotification(t('notifications.allImagesGenerated'), 'info');
        }
        return;
    }

    setImageQueue(prevQueue => {
        const newIndices = missingImageIndices.filter(
            index => !prevQueue.includes(index) && !generatingImages.includes(index)
        );
        return [...prevQueue, ...newIndices];
    });
  }, [article, generatingImages, imageQueue, addNotification, t]);
  
    const handleEditImage = useCallback(async (sectionIndex: number, editPrompt: string) => {
        if (!article || !article.sections[sectionIndex]?.imageUrl) return;

        setEditingImageIndex(sectionIndex);
        try {
            const originalImageUrl = article.sections[sectionIndex].imageUrl!;
            const newImageUrl = await editImage(originalImageUrl, editPrompt, locale);

            addImageToLibrary({
                imageUrl: newImageUrl,
                prompt: `(Edit) ${editPrompt} -- Original: ${article.sections[sectionIndex].imagePrompt}`,
                topic: article.title,
            });
            
            setArticle(prevArticle => {
                if (!prevArticle) return null;
                const newSections = [...prevArticle.sections];
                newSections[sectionIndex] = { ...newSections[sectionIndex], imageUrl: newImageUrl };
                return { ...prevArticle, sections: newSections };
            });

            addNotification(t('notifications.imageEditedSuccess'), 'success');

        } catch (error: any) {
            addNotification(error.message || t('errors.imageEditFailed'), 'error');
        } finally {
            setEditingImageIndex(null);
        }
    }, [article, locale, addNotification, t, addImageToLibrary]);

    const handleGenerateVideo = useCallback(async (sectionIndex: number) => {
        if (!article || generatingVideoInfo.index !== null) return;
        
        const prompt = article.sections[sectionIndex].imagePrompt;
        if (!prompt) {
            addNotification(t('errors.noPromptForVideo'), 'error');
            return;
        }

        setGeneratingVideoInfo({ index: sectionIndex, status: t('article.video.status.start') });
        try {
            const videoUrl = await generateVideoForSection(prompt, settings, locale, (status) => {
                setGeneratingVideoInfo({ index: sectionIndex, status });
            });

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
    }, [article, generatingVideoInfo.index, settings, locale, addNotification, t]);

  useEffect(() => {
    if (generatingImages.length > 0 || imageQueue.length === 0) {
        return;
    }

    const processQueue = async () => {
        const nextIndex = imageQueue[0];
        
        if (article && article.sections[nextIndex]) {
            setGeneratingImages([nextIndex]);

            try {
                const prompt = article.sections[nextIndex].imagePrompt;
                if (!prompt) throw new Error("No prompt for this section.");
                
                const imageUrl = await generateImageForSection(prompt, settings, locale);

                addImageToLibrary({
                    imageUrl,
                    prompt: prompt,
                    topic: article.title,
                });

                setArticle(prevArticle => {
                    if (!prevArticle) return null;
                    const newSections = [...prevArticle.sections];
                    newSections[nextIndex] = { ...newSections[nextIndex], imageUrl };
                    return { ...prevArticle, sections: newSections };
                });
            } catch (error: any) {
                addNotification(error.message || t('errors.imageGenSectionFailed', { section: article.sections[nextIndex].heading }), 'error');
            } finally {
                setImageQueue(prev => prev.slice(1));
                setGeneratingImages([]);
            }
        } else {
            setImageQueue(prev => prev.slice(1));
        }
    };

    processQueue();

  }, [imageQueue, generatingImages, article, settings, locale, addNotification, t, addImageToLibrary]);

  useEffect(() => {
    if (settings.autoLoadImages && article && !isLoading) {
        const hasMissingImages = article.sections.some(s => s.imagePrompt && !s.imageUrl);
        if (hasMissingImages && generatingImages.length === 0 && imageQueue.length === 0) {
            handleGenerateAllImages();
        }
    }
  }, [settings.autoLoadImages, article, isLoading, handleGenerateAllImages, generatingImages.length, imageQueue.length]);

  const togglePanel = (panel: string) => {
      setActivePanel(prev => (prev === panel ? null : panel));
  };
  
  const handleRestoreSnapshot = useCallback((snapshot: SessionSnapshot) => {
      setCurrentTopic(snapshot.topic);
      setArticle(snapshot.article);
      setRelatedTopics(snapshot.relatedTopics);
      setMessages(snapshot.chatHistory);
      closeAllPanels();
      addNotification(t('notifications.snapshotRestored', { name: snapshot.name }), 'success');
  }, [closeAllPanels, addNotification, t]);

  if (!hasStarted) {
    return <EntryPortal onStart={() => setHasStarted(true)} />;
  }
  
  return (
    <UserDataContext.Provider value={userData}>
      <>
        <div className="min-h-screen">
            <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-gray-700/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
                    <div className="flex items-center gap-2">
                         <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent">
                            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3"/>
                            <path d="M23 23C20.5 26.5 15 27.5 11 23C7 18.5 8.5 11.5 14 8.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                         </svg>
                         <span className="text-2xl font-bold text-white">Codex</span>
                    </div>
                    <div className="w-full max-w-lg mx-4">
                      <SearchBar onSearch={handleSearch} onSerendipity={handleSerendipity} isLoading={isLoading} />
                    </div>
                    <nav className="flex items-center">
                        {/* --- Desktop Navigation --- */}
                        <div className="hidden md:flex items-center gap-1.5">
                            <button onClick={() => setCommandPaletteOpen(true)} title={t('commandPalette.open')} className="flex items-center gap-2 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors">
                                <CommandIcon className="w-5 h-5" />
                                <span className="text-sm">⌘K</span>
                            </button>
                            <button onClick={() => togglePanel('history')} title={t('panels.history.title')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"><HistoryIcon className="w-6 h-6"/></button>
                            <button onClick={() => togglePanel('bookmarks')} title={t('panels.bookmarks.title')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"><BookmarkIcon className="w-6 h-6"/></button>
                            <button onClick={() => togglePanel('learningPaths')} title={t('panels.learningPaths.title')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"><PathIcon className="w-6 h-6"/></button>
                            <button onClick={() => togglePanel('imageLibrary')} title={t('panels.imageLibrary.title')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"><ImageIcon className="w-6 h-6"/></button>
                            <button onClick={() => togglePanel('snapshots')} title={t('panels.snapshots.title')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"><CameraIcon className="w-6 h-6"/></button>
                            <button onClick={() => togglePanel('help')} title={t('panels.help.title')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"><QuestionMarkCircleIcon className="w-6 h-6"/></button>
                            <button onClick={() => togglePanel('settings')} title={t('panels.settings.title')} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors"><CogIcon className="w-6 h-6"/></button>
                        </div>
                        
                        {/* --- Mobile Navigation --- */}
                        <MobileHeaderMenu togglePanel={togglePanel} setCommandPaletteOpen={setCommandPaletteOpen} />
                    </nav>
                </div>
            </header>

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:pb-8 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 bg-gray-800/20 p-6 md:p-8 rounded-lg border border-gray-700/30">
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
                       <SynapseGraph 
                          currentTopic={article?.title || ''} 
                          relatedTopics={relatedTopics} 
                          onTopicClick={handleSearch} 
                          onSerendipity={handleSerendipity}
                          isLoading={isLoading}
                       />
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
        
        {/* Side Panels */}
         <MemoizedHeaderPanel title={t('panels.history.title')} icon={HistoryIcon} isOpen={activePanel === 'history'} onClose={closeAllPanels} onClearAll={userData.clearHistory}>
            {history.length > 0 ? history.map(item => (
                <div key={item} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md group">
                    <button onClick={() => { handleSearch(item); closeAllPanels(); }} className="font-semibold text-gray-300 hover:text-accent truncate flex-grow text-left">{item}</button>
                    <button onClick={() => userData.clearHistoryItem(item)} title={t('panels.deleteEntry')} className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                </div>
            )) : <p className="text-gray-500">{t('panels.noEntries')}</p>}
        </MemoizedHeaderPanel>

        <MemoizedHeaderPanel title={t('panels.bookmarks.title')} icon={BookmarkIcon} isOpen={activePanel === 'bookmarks'} onClose={closeAllPanels} onClearAll={userData.clearBookmarks}>
            {bookmarks.length > 0 ? bookmarks.map(item => (
                <div key={item} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md group">
                    <button onClick={() => { handleSearch(item); closeAllPanels(); }} className="font-semibold text-gray-300 hover:text-accent truncate flex-grow text-left">{item}</button>
                     <button onClick={() => userData.clearBookmarkItem(item)} title={t('panels.deleteEntry')} className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                </div>
            )) : <p className="text-gray-500">{t('panels.noEntries')}</p>}
        </MemoizedHeaderPanel>

        <MemoizedHeaderPanel title={t('panels.imageLibrary.title')} icon={ImageIcon} isOpen={activePanel === 'imageLibrary'} onClose={closeAllPanels} onClearAll={userData.clearImageLibrary}>
            {imageLibrary.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {imageLibrary.map(img => (
                        <div key={img.id} className="aspect-square bg-gray-700 rounded-md overflow-hidden cursor-pointer group relative" onClick={() => setLightboxImage(img)}>
                            <img src={img.imageUrl} alt={img.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <SearchIcon className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p className="text-gray-500">{t('panels.noEntries')}</p>}
        </MemoizedHeaderPanel>
        
        <MemoizedHeaderPanel title={t('panels.snapshots.title')} icon={CameraIcon} isOpen={activePanel === 'snapshots'} onClose={closeAllPanels} onClearAll={userData.clearSnapshots}>
            {userData.sessionSnapshots.length > 0 ? userData.sessionSnapshots.map(item => (
                <div key={item.name} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md group">
                    <button onClick={() => handleRestoreSnapshot(item)} className="text-left flex-grow">
                       <p className="font-semibold text-gray-300 hover:text-accent truncate">{item.name}</p>
                       <p className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</p>
                    </button>
                     <button onClick={() => userData.clearSnapshot(item.name)} title={t('panels.deleteEntry')} className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                </div>
            )) : <p className="text-gray-500">{t('panels.noEntries')}</p>}
        </MemoizedHeaderPanel>
        
        <MemoizedHeaderPanel title={t('panels.learningPaths.title')} icon={PathIcon} isOpen={activePanel === 'learningPaths'} onClose={closeAllPanels} onClearAll={userData.clearLearningPaths}>
            <LearningPathsManager handleSearch={handleSearch} closePanel={closeAllPanels} />
        </MemoizedHeaderPanel>

        {/* More complex panels that don't fit the generic component */}
        <SettingsModal isVisible={activePanel === 'settings'} onClose={closeAllPanels} />
        <HelpGuide isVisible={activePanel === 'help'} onClose={closeAllPanels} />
        <CommandPalette 
            isOpen={isCommandPaletteOpen} 
            onClose={() => setCommandPaletteOpen(false)}
            onSearch={(topic) => handleSearch(topic)}
            togglePanel={togglePanel}
            onSerendipity={handleSerendipity}
            article={article}
            onGenerateAllImages={handleGenerateAllImages}
            {...userData}
        />
        
        {/* File input for import */}
        <input type="file" ref={importFileRef} onChange={userData.handleImportData} accept=".json" className="hidden" />

        {/* Lightbox Modal for Image Library */}
        {lightboxImage && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setLightboxImage(null)}>
                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative" onClick={e => e.stopPropagation()}>
                    <img src={lightboxImage.imageUrl} alt={lightboxImage.prompt} className="w-full h-auto object-contain flex-grow rounded-t-lg bg-gray-900" />
                    <div className="p-4 bg-gray-900/50 rounded-b-lg border-t border-gray-700">
                        <p className="text-xs text-gray-400 font-semibold uppercase">{t('article.imagePrompt')}</p>
                        <p className="text-sm text-gray-300 mt-1 font-mono">{lightboxImage.prompt}</p>
                        <p className="text-xs text-gray-500 mt-2">{t('panels.imageLibrary.sourceArticle')}: {lightboxImage.topic}</p>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                         <button 
                            onClick={() => {
                                if (window.confirm(t('panels.imageLibrary.confirmDelete'))) {
                                    userData.clearImageLibraryItem(lightboxImage.id);
                                    setLightboxImage(null);
                                }
                            }} 
                            className="p-2 bg-red-800/80 text-white rounded-full hover:bg-red-700 transition-colors"
                            title={t('panels.deleteEntry')}
                        >
                            <TrashIcon className="w-5 h-5"/>
                        </button>
                         <button onClick={() => setLightboxImage(null)} className="p-2 bg-gray-900/80 text-white rounded-full hover:bg-gray-700 transition-colors" aria-label={t('common.close')}>
                            <CloseIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
            </div>
        )}

        <BottomNavBar activePanel={activePanel} togglePanel={togglePanel} />
      </>
    </UserDataContext.Provider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <LocalizationProvider>
        <NotificationProvider>
            <CodexApp />
        </NotificationProvider>
      </LocalizationProvider>
    </SettingsProvider>
  );
}

export default App;