import React, { useState, useCallback, useEffect, useRef, useContext, useMemo } from 'react';
import SearchBar from './components/SearchBar';
import ArticleView from './components/ArticleView';
import AthenaCopilot from './components/AthenaCopilot';
import SynapseGraph from './components/SynapseGraph';
// FIX: Import `UserDataContextType` to resolve 'Cannot find name' error.
import { ArticleData, RelatedTopic, StarterTopic, AppSettings, AccentColor, FontFamily, ArticleLength, ImageStyle, TextSize, LearningPath, SessionSnapshot, ChatMessage, CodexBackupData, Notification, NotificationType, Language, UserDataContextType } from './types';
import { generateArticleContent, getRelatedTopics, generateImageForSection, getSerendipitousTopic, getStarterTopics, startChat } from './services/geminiService';
import { HistoryIcon, BookmarkIcon, CogIcon, CloseIcon, PathIcon, CameraIcon, TrashIcon, UploadIcon, DownloadIcon, QuestionMarkCircleIcon, SparklesIcon, CommandIcon } from './components/IconComponents';
import SettingsModal from './components/SettingsModal';
import HelpGuide from './components/HelpGuide';
import EntryPortal from './components/EntryPortal';
import CommandPalette from './components/CommandPalette';
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
        setLearningPaths(paths => paths.map(p => {
            // Check if article is already in the path.
            if (p.name === pathName && !p.articles.some(a => a.title === articleTitle)) {
                addNotification(t('notifications.articleAddedToPath', { articleTitle, pathName }), 'success');
                // Add a new ArticleInPath object to the 'articles' array.
                return { ...p, articles: [...p.articles, { title: articleTitle, completed: false }] };
            }
            return p;
        }));
    }, [addNotification, setLearningPaths, t]);

    const handleCreatePath = useCallback((pathName: string) => {
        setLearningPaths(paths => {
            if (!paths.some(p => p.name === pathName)) {
                addNotification(t('notifications.pathCreated', { pathName }), 'success');
                // A new LearningPath should have an 'articles' property, not 'articleTitles'.
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

    const makeClearer = useCallback((setter: React.Dispatch<React.SetStateAction<any[]>>, name: string) => () => {
        if (window.confirm(t('prompts.confirmClearAll', { name }))) {
            setter([]);
            addNotification(t('notifications.clearedAll', { name }), 'info');
        }
    }, [addNotification, t]);
    
    const makeClearItem = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, idProp: (item: T) => string) => (id: string) => {
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

    const handleExportData = useCallback(() => {
        const backupData: CodexBackupData = { settings, history, bookmarks, learningPaths, sessionSnapshots };
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
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error(t('errors.fileRead'));
                const data: CodexBackupData = JSON.parse(text);

                // Basic validation
                if (!data.settings || !Array.isArray(data.history)) {
                    throw new Error(t('errors.invalidBackup'));
                }

                setSettings(data.settings);
                setHistory(data.history);
                setBookmarks(data.bookmarks);
                setLearningPaths(data.learningPaths);
                setSessionSnapshots(data.sessionSnapshots);

                addNotification(t('notifications.importSuccess'), 'success');
            } catch (error) {
                console.error("Import failed:", error);
                addNotification(error instanceof Error ? error.message : t('errors.importFailed'), 'error');
            } finally {
                // Reset file input to allow re-uploading the same file
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    }, [addNotification, setSettings, setHistory, setBookmarks, setLearningPaths, setSessionSnapshots, t]);

    return useMemo(() => ({
        history, bookmarks, learningPaths, sessionSnapshots, setHistory,
        toggleBookmark, handleAddToPath, handleCreatePath, handleSaveSnapshot,
        clearHistory: makeClearer(setHistory, t('panels.history.title')),
        clearBookmarks: makeClearer(setBookmarks, t('panels.bookmarks.title')),
        clearLearningPaths: makeClearer(setLearningPaths, t('panels.learningPaths.title')),
        clearSnapshots: makeClearer(setSessionSnapshots, t('panels.snapshots.title')),
        clearHistoryItem: makeClearItem(setHistory, item => item),
        clearBookmarkItem: makeClearItem(setBookmarks, item => item),
        clearLearningPathItem,
        clearSnapshot: makeClearItem(setSessionSnapshots, item => item.name),
        handleExportData,
        handleImportData,
        handleTriggerImport,
        toggleArticleCompletion,
        reorderArticlesInPath,
        removeArticleFromPath,
    }), [
        history, bookmarks, learningPaths, sessionSnapshots, setHistory,
        toggleBookmark, handleAddToPath, handleCreatePath, handleSaveSnapshot, 
        makeClearer, setBookmarks, setLearningPaths, setSessionSnapshots, 
        makeClearItem, handleExportData, handleImportData, handleTriggerImport,
        toggleArticleCompletion, reorderArticlesInPath, removeArticleFromPath,
        clearLearningPathItem, t
    ]);
};

const HeaderPanel = ({ title, icon: Icon, children, isOpen, onClose, onClearAll, onRestore }: {
    title: string, icon: React.FC<{className?: string}>, children: React.ReactNode, isOpen: boolean,
    onClose: () => void, onClearAll: () => void, onRestore?: (item: any) => void
}) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const { t } = useLocalization();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            panelRef.current?.focus();
        }
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

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
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatRef = useRef<Chat | null>(null);
  const lastSearchedTopic = useRef<string>('');

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  
  const { settings, setSettings } = useContext(SettingsContext)!;
  const { addNotification } = useNotification();
  const { locale, t } = useLocalization();
  
  const closeAllPanels = useCallback(() => setActivePanel(null), []);
  
  const importInputRef = useRef<HTMLInputElement>(null);
  const handleTriggerImport = () => importInputRef.current?.click();

  const userData = useUserData(settings, setSettings, article, currentTopic, messages, relatedTopics, closeAllPanels, handleTriggerImport);
  
  const fullArticleText = useMemo(() => {
      if (!article) return '';
      return [article.title, article.introduction, ...article.sections.map(s => s.content), article.conclusion].join('\n\n');
  }, [article]);
  
  useEffect(() => {
    // On initial load or when returning to the welcome screen, ensure we are at the top.
    if (!article) {
        window.scrollTo(0, 0);
    }
  }, [article]);

  useEffect(() => {
    setIsLoadingTopics(true);
    setStarterTopics(getStarterTopics(t));
    setIsLoadingTopics(false);
  }, [t]);
  
  useEffect(() => {
        if (article) {
            chatRef.current = startChat(fullArticleText, locale, t);
            setMessages([
                { role: 'model', parts: [{ text: t('athena.welcomeMessage', { title: article.title }) }] }
            ]);
        } else {
            chatRef.current = null;
            setMessages([]);
        }
    }, [article, fullArticleText, locale, t]);
  
  const handleGenerateImage = useCallback(async (sectionIndex: number) => {
    if (!article) return;
    const section = article.sections[sectionIndex];
    if (!section?.imagePrompt) return;

    setGeneratingImages(prev => [...prev, sectionIndex]);
    try {
      const imageUrl = await generateImageForSection(section.imagePrompt, settings, locale);
      setArticle(prevArticle => {
        if (!prevArticle) return null;
        const newSections = [...prevArticle.sections];
        newSections[sectionIndex] = { ...newSections[sectionIndex], imageUrl };
        return { ...prevArticle, sections: newSections };
      });
    } catch (err) {
      addNotification(err instanceof Error ? err.message : t('errors.imageGenerationFailed'), 'error');
    } finally {
      setGeneratingImages(prev => prev.filter(idx => idx !== sectionIndex));
    }
  }, [article, settings, addNotification, locale, t]);

  useEffect(() => {
    if (settings.autoLoadImages && article) {
      const sectionsToLoad = article.sections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => section.imagePrompt && !section.imageUrl);
      
      if (sectionsToLoad.length > 0) {
        handleGenerateAllImages();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.autoLoadImages, article]);

  const handleSearch = useCallback(async (topic: string) => {
    if (isLoading) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsLoading(true);
    setError(null);
    setArticle(null);
    setRelatedTopics([]);
    setCurrentTopic(topic);
    lastSearchedTopic.current = topic;
    
    // Add to history
    if (!userData.history.includes(topic)) {
        userData.setHistory(prev => [topic, ...prev].slice(0, 50));
    }

    try {
      const [articleData, relatedData] = await Promise.all([
        generateArticleContent(topic, settings, locale),
        getRelatedTopics(topic, settings, locale),
      ]);

      setArticle(articleData);
      setRelatedTopics(relatedData);

    } catch (err: any) {
      setError(err.message || t('errors.unknown'));
      addNotification(err.message || t('errors.articleCreationFailed', { topic }), 'error');
      setArticle(null);
      setRelatedTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, settings, addNotification, userData, locale, t]);

  const handleRetry = useCallback(() => {
    if (lastSearchedTopic.current) {
      handleSearch(lastSearchedTopic.current);
    }
  }, [handleSearch]);
  
  const handleGenerateAllImages = useCallback(async () => {
    if (!article) return;

    const sectionsToGenerate = article.sections
        .map((section, index) => ({ section, index }))
        .filter(({ section }) => section.imagePrompt && !section.imageUrl);

    if (sectionsToGenerate.length === 0) {
        addNotification(t('notifications.allImagesGenerated'), 'info');
        return;
    }

    const indicesToGenerate = sectionsToGenerate.map(({ index }) => index);
    setGeneratingImages(indicesToGenerate);

    const generationPromises = sectionsToGenerate.map(({ section, index }) =>
        generateImageForSection(section.imagePrompt!, settings, locale).then(imageUrl => ({ imageUrl, index }))
    );

    const results = await Promise.allSettled(generationPromises);

    let successfulUpdates = 0;
    setArticle(prevArticle => {
        if (!prevArticle) return null;
        const newSections = [...prevArticle.sections];

        results.forEach((result, promiseIndex) => {
            const originalSectionIndex = sectionsToGenerate[promiseIndex].index;
            const originalSectionHeading = sectionsToGenerate[promiseIndex].section.heading;
            
            if (result.status === 'fulfilled') {
                newSections[originalSectionIndex] = { ...newSections[originalSectionIndex], imageUrl: result.value.imageUrl };
                successfulUpdates++;
            } else {
                addNotification(t('errors.imageGenSectionFailed', { section: originalSectionHeading }), 'error');
                console.error(`Image generation failed for section ${originalSectionHeading}:`, result.reason);
            }
        });

        return { ...prevArticle, sections: newSections };
    });

    if (successfulUpdates > 0) {
         addNotification(t('notifications.imagesGeneratedSuccess', { count: successfulUpdates }), 'success');
    }

    setGeneratingImages([]);
  }, [article, settings, addNotification, locale, t]);
  
  const handleSerendipity = useCallback(async () => {
    addNotification(t('notifications.findingConnection'), 'info');
    try {
        const serendipitousTopic = await getSerendipitousTopic(currentTopic || "knowledge discovery", locale);
        addNotification(t('notifications.cosmicLeapFound', { topic: serendipitousTopic }), 'success');
        handleSearch(serendipitousTopic);
    } catch (err) {
        addNotification(err instanceof Error ? err.message : t('errors.cosmicLeapFailed'), 'error');
    }
  }, [currentTopic, addNotification, handleSearch, locale, t]);

  const handleRestoreSnapshot = useCallback((snapshot: SessionSnapshot) => {
        setCurrentTopic(snapshot.topic);
        setArticle(snapshot.article);
        setRelatedTopics(snapshot.relatedTopics);
        setMessages(snapshot.chatHistory);
        setError(null);
        closeAllPanels();
        addNotification(t('notifications.snapshotRestored', { name: snapshot.name }), 'success');
  }, [addNotification, closeAllPanels, t]);
  
  const togglePanel = (panel: string) => {
    setActivePanel(prev => (prev === panel ? null : panel));
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isBookmarked = useMemo(() => userData.bookmarks.includes(currentTopic), [userData.bookmarks, currentTopic]);

  if (!hasStarted) {
    return <EntryPortal onStart={() => setHasStarted(true)} />;
  }

  const panelData = [
    { name: 'history', title: t('panels.history.title'), icon: HistoryIcon, data: userData.history, onClearAll: userData.clearHistory, onClearItem: userData.clearHistoryItem, render: (item: string) => <span className="truncate">{item}</span>, onClick: handleSearch },
    { name: 'bookmarks', title: t('panels.bookmarks.title'), icon: BookmarkIcon, data: userData.bookmarks, onClearAll: userData.clearBookmarks, onClearItem: userData.clearBookmarkItem, render: (item: string) => <span className="truncate">{item}</span>, onClick: handleSearch },
    { name: 'learningPaths', title: t('panels.learningPaths.title'), icon: PathIcon, data: userData.learningPaths, onClearAll: userData.clearLearningPaths, onClearItem: userData.clearLearningPathItem, render: (path: LearningPath) => (
        <details className="w-full">
            <summary className="font-semibold cursor-pointer">{path.name} ({path.articles.length})</summary>
            <ul className="pl-4 mt-2 space-y-1 list-disc list-inside">
                {path.articles.map(article => (
                    <li key={article.title} onClick={() => handleSearch(article.title)} className="text-gray-400 hover:text-accent cursor-pointer">{article.title}</li>
                ))}
            </ul>
        </details>
    ), onClick: () => {} },
    { name: 'snapshots', title: t('panels.snapshots.title'), icon: CameraIcon, data: userData.sessionSnapshots, onClearAll: userData.clearSnapshots, onClearItem: userData.clearSnapshot, render: (snap: SessionSnapshot) => `${snap.name} - ${new Date(snap.timestamp).toLocaleDateString()}`, onClick: handleRestoreSnapshot },
  ];

  return (
    <UserDataContext.Provider value={userData}>
      <div className="min-h-screen">
          <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-20">
                <div className="flex items-center gap-3">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-accent"><circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="3"></circle><path d="M23 23C20.5 26.5 15 27.5 11 23C7 18.5 8.5 11.5 14 8.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"></path></svg>
                  <span className="text-2xl font-bold text-white">Codex</span>
                </div>
                <div className="w-full max-w-xl">
                  <SearchBar onSearch={handleSearch} onSerendipity={handleSerendipity} isLoading={isLoading} />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setIsCommandPaletteOpen(true)} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700" title={t('commandPalette.open') + ' (Ctrl+K)'}><CommandIcon className="w-6 h-6"/></button>
                  {panelData.map(p => (
                    <button key={p.name} onClick={() => togglePanel(p.name)} className={`p-2 rounded-full transition-colors ${activePanel === p.name ? 'text-accent bg-accent/20' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`} title={p.title}><p.icon className="w-6 h-6"/></button>
                  ))}
                  <button onClick={() => togglePanel('settings')} className={`p-2 rounded-full transition-colors ${activePanel === 'settings' ? 'text-accent bg-accent/20' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`} title={t('panels.settings.title')}><CogIcon className="w-6 h-6"/></button>
                  <button onClick={() => togglePanel('help')} className={`p-2 rounded-full transition-colors ${activePanel === 'help' ? 'text-accent bg-accent/20' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`} title={t('panels.help.title')}><QuestionMarkCircleIcon className="w-6 h-6"/></button>
                </div>
              </div>
            </div>
          </header>

          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
             <input type="file" ref={importInputRef} onChange={userData.handleImportData} accept=".json" className="hidden" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2 bg-gray-800/20 border border-gray-700/30 rounded-lg p-6 md:p-8">
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
                  generatingImages={generatingImages}
                  fullArticleText={fullArticleText}
                  isBookmarked={isBookmarked}
                />
              </div>
              <AthenaCopilot 
                article={article}
                fullArticleText={fullArticleText}
                chat={chatRef.current}
                messages={messages}
                setMessages={setMessages}
                isLoadingArticle={isLoading}
                currentTopic={currentTopic}
              />
            </div>
            <SynapseGraph
              currentTopic={currentTopic}
              relatedTopics={relatedTopics}
              onTopicClick={handleSearch}
              onSerendipity={handleSerendipity}
              isLoading={isLoading}
            />
          </main>
      </div>

      <CommandPalette 
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSearch={handleSearch}
          togglePanel={togglePanel}
          onSerendipity={handleSerendipity}
          article={article}
          onGenerateAllImages={handleGenerateAllImages}
          {...userData}
      />
      <SettingsModal isVisible={activePanel === 'settings'} onClose={closeAllPanels} />
      <HelpGuide isVisible={activePanel === 'help'} onClose={closeAllPanels} />
      
      {panelData.map(p => (
        <MemoizedHeaderPanel 
          key={p.name}
          title={p.title} 
          icon={p.icon} 
          isOpen={activePanel === p.name} 
          onClose={closeAllPanels} 
          onClearAll={p.onClearAll}
        >
          {p.data.length === 0 ? <p className="text-gray-500">{t('panels.noEntries')}</p> : (
              p.data.map((item: any, index: number) => (
                <div key={p.name + index} className="group flex items-center justify-between gap-2 p-2 rounded-md hover:bg-gray-700/50">
                    <div onClick={() => p.onClick(item)} className="flex-grow text-left text-gray-300 hover:text-accent transition-colors w-full min-w-0 cursor-pointer">
                      {p.render(item)}
                    </div>
                    <button onClick={() => p.onClearItem(item.name || item)} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400" title={t('panels.deleteEntry')}><TrashIcon className="w-4 h-4"/></button>
                </div>
              ))
          )}
        </MemoizedHeaderPanel>
      ))}

    </UserDataContext.Provider>
  );
}

export default function App() {
    return (
        <NotificationProvider>
            <SettingsProvider>
                <LocalizationProvider>
                    <CodexApp />
                </LocalizationProvider>
            </SettingsProvider>
        </NotificationProvider>
    );
}