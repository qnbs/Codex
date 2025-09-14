import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppSettings, ArticleData, RelatedTopic, ChatMessage, Language, AccentColor, FontFamily, TextSize, ArticleLength, ImageStyle, Notification, NotificationType, LearningPath, SessionSnapshot, StoredImage, StarterTopic, CodexBackupData, ActivePanel, AthenaCopilotRef } from './types';
import * as dbService from './services/dbService';
import * as geminiService from './services/geminiService';
import { SettingsContext, UserDataContext, NotificationContext } from './context/AppContext';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';

import SearchBar from './components/SearchBar';
import ArticleView from './components/ArticleView';
import AthenaCopilot from './components/AthenaCopilot';
import SynapseGraph from './components/SynapseGraph';
import LoadingSpinner from './components/LoadingSpinner';
import SettingsModal from './components/SettingsModal';
import HelpGuide from './components/HelpGuide';
import EntryPortal from './components/EntryPortal';
import CommandPalette from './components/CommandPalette';
import BottomNavBar from './components/BottomNavBar';
import MobilePanel from './components/MobilePanel';
import { HistoryIcon, BookmarkIcon, PathIcon, CameraIcon, CogIcon, QuestionMarkCircleIcon, CommandIcon, ExclamationTriangleIcon, InformationCircleIcon } from './components/IconComponents';

const DEFAULT_SETTINGS: AppSettings = {
    language: Language.English,
    accentColor: AccentColor.Sky,
    fontFamily: FontFamily.Modern,
    textSize: TextSize.Standard,
    articleLength: ArticleLength.Standard,
    imageStyle: ImageStyle.Photorealistic,
    autoLoadImages: false,
    synapseDensity: 5,
    hasOnboarded: false,
};

// Main App component containing providers and view logic
const AppContent: React.FC = () => {
    const { settings, setSettings } = React.useContext(SettingsContext)!;
    const {
        history, bookmarks, learningPaths, sessionSnapshots, imageLibrary,
        toggleBookmark, handleAddToPath, handleCreatePath,
        handleSaveSnapshot: performSaveSnapshot,
        handleExportData, handleTriggerImport, addImageToLibrary,
        setHistory: setHistoryData,
        ...userDataRest
    } = React.useContext(UserDataContext)!;
    const { addNotification } = React.useContext(NotificationContext)!;
    const { t, isLoading: isLocalizationLoading } = useLocalization();

    // App State
    const [currentTopic, setCurrentTopic] = useState<string | null>(null);
    const [article, setArticle] = useState<ArticleData | null>(null);
    const [relatedTopics, setRelatedTopics] = useState<RelatedTopic[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [loadedSnapshotHistory, setLoadedSnapshotHistory] = useState<ChatMessage[] | undefined>(undefined);

    // UI State
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [isHelpVisible, setIsHelpVisible] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    const mainContentRef = useRef<HTMLDivElement>(null);
    const athenaRef = useRef<AthenaCopilotRef>(null);
    
    // Derived State
    const isBookmarked = useMemo(() => !!currentTopic && bookmarks.includes(currentTopic), [currentTopic, bookmarks]);


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
    
    if (isLocalizationLoading) {
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    }

    const setHistory = useCallback((topic: string) => {
        setHistoryData(prev => {
            const newHistory = [topic, ...prev.filter(t => t !== topic)];
            return newHistory.length > 100 ? newHistory.slice(0, 100) : newHistory;
        });
        dbService.addHistoryItem(topic);
    }, [setHistoryData]);

    const handleSearch = useCallback(async (topic: string) => {
        if (!topic || isLoading) return;

        setIsLoading(true);
        setArticle(null);
        setCurrentTopic(topic);
        setRelatedTopics([]);
        setActivePanel(null);
        setLoadedSnapshotHistory(undefined); // Clear snapshot history on new search
        mainContentRef.current?.scrollTo(0, 0);

        try {
            setLoadingMessage(t('article.creating'));
            const articleData = await geminiService.generateArticleContent(topic, settings, settings.language);
            setArticle(articleData);
            setHistory(topic);

            if (settings.autoLoadImages) {
                generateAllImages(articleData);
            }
            
            const related = await geminiService.getRelatedTopics(topic, settings, settings.language);
            setRelatedTopics(related);

        } catch (error: any) {
            console.error(error);
            addNotification(error.message || t('errors.articleCreationFailed', { topic }), 'error');
            setCurrentTopic(null);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, settings, setHistory, t, addNotification]);
    
    const handleGoHome = () => {
        setArticle(null);
        setCurrentTopic(null);
        setRelatedTopics([]);
        setActivePanel(null);
        setLoadedSnapshotHistory(undefined);
    };

    const handleSerendipity = useCallback(async () => {
        setIsLoading(true);
        setLoadingMessage(t('notifications.findingConnection'));
        try {
            const newTopic = await geminiService.getSerendipitousTopic(currentTopic ?? 'philosophy', settings.language);
            addNotification(t('notifications.cosmicLeapFound', { topic: newTopic }), 'info');
            handleSearch(newTopic);
        } catch (error: any) {
            addNotification(error.message || t('errors.cosmicLeapFailed'), 'error');
            setIsLoading(false);
        }
    }, [currentTopic, settings.language, addNotification, handleSearch, t]);

    const generateImage = useCallback(async (sectionIndex: number, currentArticle: ArticleData) => {
        const section = currentArticle.sections[sectionIndex];
        if (!section.imagePrompt) return;

        try {
            const imageUrl = await geminiService.generateImageForSection(section.imagePrompt, settings, settings.language);
            setArticle(prev => {
                if (!prev) return null;
                const newSections = [...prev.sections];
                newSections[sectionIndex].imageUrl = imageUrl;
                return { ...prev, sections: newSections };
            });
             addImageToLibrary({
                imageUrl: imageUrl,
                prompt: section.imagePrompt,
                topic: currentArticle.title,
            });

        } catch (error: any) {
            addNotification(error.message || t('errors.imageGenSectionFailed', { section: section.heading }), 'error');
        }
    }, [settings, addNotification, t, addImageToLibrary]);

    const generateAllImages = useCallback(async (articleToProcess: ArticleData | null = article) => {
        if (!articleToProcess) return;

        const indicesToGenerate = articleToProcess.sections
            .map((s, i) => (s.imagePrompt && !s.imageUrl) ? i : -1)
            .filter(i => i !== -1);

        if (indicesToGenerate.length === 0) {
            addNotification(t('notifications.allImagesGenerated'), 'info');
            return;
        }

        addNotification(t('article.generatingAllImages', { count: indicesToGenerate.length }), 'info');
        
        await Promise.all(indicesToGenerate.map(index => generateImage(index, articleToProcess)));
        addNotification(t('notifications.imagesGeneratedSuccess', { count: indicesToGenerate.length }), 'success');
    }, [article, generateImage, addNotification, t]);

     const generateVideo = useCallback(async (sectionIndex: number, onStatusUpdate: (status: string) => void) => {
        if (!article) return;
        const section = article.sections[sectionIndex];
        if (!section.imagePrompt) {
            addNotification(t('errors.noPromptForVideo'), 'error');
            return;
        }

        try {
            const videoUrl = await geminiService.generateVideoForSection(section.imagePrompt, settings, settings.language, onStatusUpdate);
            setArticle(prev => {
                if (!prev) return null;
                const newSections = [...prev.sections];
                newSections[sectionIndex].videoUrl = videoUrl;
                return { ...prev, sections: newSections };
            });
            addNotification(t('notifications.videoGeneratedSuccess'), 'success');
        } catch (error: any) {
             addNotification(error.message || t('errors.videoGenerationFailed'), 'error');
             throw error; // Re-throw to be caught in ArticleView
        }
    }, [article, settings, addNotification, t]);


    const handleSaveSnapshot = () => {
        if (!article || !currentTopic) return;
        const name = prompt(t('prompts.snapshotName'), `${currentTopic} - ${new Date().toLocaleString()}`);
        if (name) {
            const chatHistory = athenaRef.current?.getChatHistory() || [];
            performSaveSnapshot({
                name,
                timestamp: Date.now(),
                topic: currentTopic,
                article,
                relatedTopics,
                chatHistory: chatHistory,
            });
        }
    };
    
    const handleLoadSnapshot = (snapshot: SessionSnapshot) => {
        setArticle(snapshot.article);
        setCurrentTopic(snapshot.topic);
        setRelatedTopics(snapshot.relatedTopics);
        setLoadedSnapshotHistory(snapshot.chatHistory);
        setActivePanel(null); // Close panel after loading
        addNotification(t('notifications.snapshotRestored', { name: snapshot.name }), 'success');
    };
    
    const handleStart = () => {
        setSettings(s => ({...s, hasOnboarded: true}));
    };

    if (!settings.hasOnboarded) {
        return <EntryPortal onStart={handleStart} />;
    }
    
    const WelcomeScreen = () => {
        const { t } = useLocalization();
        const starterTopicCategories = geminiService.getStarterTopics(t);

        return (
            <div className="text-center p-4 md:p-8">
                <h1 className="text-4xl font-bold text-accent mb-2">{t('welcome.title')}</h1>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">{t('welcome.subtitle')}</p>
                <div className="mt-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(starterTopicCategories).map(([category, topics]) => (
                        <div key={category}>
                             <h3 className="text-xl font-semibold text-gray-200 mb-3">{category}</h3>
                             <div className="space-y-4">
                                {topics.map((topic: StarterTopic) => (
                                    <button
                                        key={topic.title}
                                        onClick={() => handleSearch(topic.title)}
                                        className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-left hover:bg-gray-800 hover:border-accent transition-colors"
                                    >
                                        <h4 className="font-bold text-gray-100">{topic.title}</h4>
                                        <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const togglePanel = (panel: ActivePanel) => {
        if (panel === 'commandPalette') {
            setIsCommandPaletteOpen(p => !p);
            return;
        }
        if (panel === 'settings') {
            setIsSettingsVisible(p => !p);
            return;
        }
        if (panel === 'help') {
            setIsHelpVisible(p => !p);
            return;
        }
        setActivePanel(prev => prev === panel ? null : panel);
    };

    return (
       <div className={`font-${settings.fontFamily} bg-gray-900 text-gray-200 min-h-screen flex flex-col md:flex-row transition-colors duration-500 accent-${settings.accentColor}`}>
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                onSearch={handleSearch}
                togglePanel={togglePanel}
                onSerendipity={handleSerendipity}
                article={article}
                onGenerateAllImages={() => generateAllImages()}
                history={history}
                bookmarks={bookmarks}
                handleSaveSnapshot={handleSaveSnapshot}
                handleExportData={handleExportData}
                handleTriggerImport={handleTriggerImport}
            />
            <SettingsModal isVisible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
            <HelpGuide isVisible={isHelpVisible} onClose={() => setIsHelpVisible(false)} />

            <MobilePanel
                activePanel={activePanel}
                onClose={() => setActivePanel(null)}
                handleSearch={handleSearch}
                handleLoadSnapshot={handleLoadSnapshot}
                athenaProps={{ article, isLoading, currentTopic, history }}
                athenaRef={athenaRef}
                initialChatHistory={loadedSnapshotHistory}
            />

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col h-screen overflow-hidden">
                <header className="p-4 flex-shrink-0 w-full max-w-5xl mx-auto z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={handleGoHome} className="text-2xl font-bold text-gray-200 hover:text-accent transition-colors">Codex</button>
                        <div className="flex-grow">
                             <SearchBar onSearch={handleSearch} onSerendipity={handleSerendipity} isLoading={isLoading} />
                        </div>
                        <div className="hidden md:flex items-center gap-2">
                             <button onClick={() => setIsCommandPaletteOpen(true)} title={t('commandPalette.open')} className="p-2.5 rounded-full hover:bg-gray-700 transition-colors"><CommandIcon className="w-5 h-5" /></button>
                             <button onClick={() => setIsSettingsVisible(true)} title={t('panels.settings.title')} className="p-2.5 rounded-full hover:bg-gray-700 transition-colors"><CogIcon className="w-5 h-5" /></button>
                             <button onClick={() => setIsHelpVisible(true)} title={t('panels.help.title')} className="p-2.5 rounded-full hover:bg-gray-700 transition-colors"><QuestionMarkCircleIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                </header>

                <div ref={mainContentRef} className="flex-grow overflow-y-auto pb-20 md:pb-0">
                    {isLoading && !article && (
                        <div className="flex items-center justify-center h-full">
                            <LoadingSpinner text={loadingMessage} />
                        </div>
                    )}
                    {!isLoading && !article && <WelcomeScreen />}
                    {article && (
                         <div className={`text-${settings.textSize}`}>
                            <ArticleView
                                article={article}
                                isLoading={isLoading}
                                currentTopic={currentTopic!}
                                isBookmarked={isBookmarked}
                                settings={settings}
                                onToggleBookmark={() => toggleBookmark(currentTopic!)}
                                onAddToPath={(path) => handleAddToPath(path, article.title)}
                                onCreatePath={(path) => handleCreatePath(path)}
                                learningPaths={learningPaths}
                                onGenerateImage={(idx) => generateImage(idx, article)}
                                onGenerateAllImages={() => generateAllImages(article)}
                                onGenerateVideo={generateVideo}
                                addNotification={addNotification}
                                addImageToLibrary={addImageToLibrary}
                                onSearch={handleSearch}
                            />
                            <SynapseGraph
                                relatedTopics={relatedTopics}
                                currentTopic={currentTopic!}
                                onTopicSelect={handleSearch}
                                onSerendipity={handleSerendipity}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar (Athena + Panels) */}
            <aside className="w-full md:w-96 lg:w-[440px] flex-shrink-0 h-screen border-l border-gray-700/50 hidden md:flex">
                <AthenaCopilot 
                    ref={athenaRef}
                    key={article?.title} // Force re-mount on new article to reset state
                    article={article} 
                    isLoading={isLoading} 
                    currentTopic={currentTopic} 
                    history={history} 
                    initialChatHistory={loadedSnapshotHistory}
                />
            </aside>
            <BottomNavBar 
                togglePanel={togglePanel}
            />
       </div>
    );
};

// Component that sets up all contexts
const App: React.FC = () => {
    // Settings state
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        dbService.getSettings(DEFAULT_SETTINGS).then(s => {
            setSettings(s);
            setIsInitialLoad(false);
        });
    }, []);

    useEffect(() => {
        if (!isInitialLoad) {
            dbService.saveSettings(settings);
        }
    }, [settings, isInitialLoad]);

    // User data state
    const [history, setHistory] = useState<string[]>([]);
    const [bookmarks, setBookmarks] = useState<string[]>([]);
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [sessionSnapshots, setSessionSnapshots] = useState<SessionSnapshot[]>([]);
    const [imageLibrary, setImageLibrary] = useState<StoredImage[]>([]);
    const importFileRef = useRef<HTMLInputElement | null>(null);

     useEffect(() => {
        dbService.getHistory().then(setHistory);
        dbService.getBookmarks().then(setBookmarks);
        dbService.getLearningPaths().then(setLearningPaths);
        dbService.getSessionSnapshots().then(setSessionSnapshots);
        dbService.getAllImages().then(setImageLibrary);
    }, []);

    // Notifications state
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Date.now();
        setNotifications(n => [...n, { id, message, type }]);
        setTimeout(() => {
            setNotifications(n => n.filter(notif => notif.id !== id));
        }, 5000);
    }, []);

    // User data handlers
    const toggleBookmark = useCallback((topic: string) => {
        setBookmarks(prev => {
            if (prev.includes(topic)) {
                addNotification(`Removed bookmark for "${topic}".`);
                dbService.deleteBookmark(topic);
                return prev.filter(b => b !== topic);
            } else {
                addNotification(`Added "${topic}" to bookmarks.`, 'success');
                dbService.addBookmark(topic);
                return [topic, ...prev];
            }
        });
    }, [addNotification]);

    const handleCreatePath = useCallback((pathName: string) => {
        if (learningPaths.some(p => p.name === pathName)) return;
        const newPath: LearningPath = { name: pathName, articles: [] };
        setLearningPaths(prev => {
            const updated = [...prev, newPath];
            dbService.saveLearningPaths(updated);
            return updated;
        });
        addNotification(`Created learning path "${pathName}".`, 'success');
    }, [learningPaths, addNotification]);

    const handleAddToPath = useCallback((pathName: string, articleTitle: string) => {
        setLearningPaths(prev => {
            const pathExists = prev.some(p => p.name === pathName);
            if (!pathExists) return prev;

            const newPaths = prev.map(p => {
                if (p.name === pathName) {
                    if (p.articles.some(a => a.title === articleTitle)) {
                         addNotification(`"${articleTitle}" is already in the path "${pathName}".`, 'info');
                        return p;
                    }
                    addNotification(`Added "${articleTitle}" to learning path "${pathName}".`, 'success');
                    return { ...p, articles: [...p.articles, { title: articleTitle, completed: false }] };
                }
                return p;
            });
            dbService.saveLearningPaths(newPaths);
            return newPaths;
        });
    }, [addNotification]);
    
    const handleSaveSnapshot = useCallback((snapshot: SessionSnapshot) => {
        setSessionSnapshots(prev => {
            const updated = [snapshot, ...prev.filter(s => s.name !== snapshot.name)];
            dbService.saveSessionSnapshots(updated);
            return updated;
        });
        addNotification(`Snapshot "${snapshot.name}" saved!`, 'success');
    }, [addNotification]);

    const addImageToLibrary = useCallback((imageData: { imageUrl: string, prompt: string, topic: string }) => {
        const newImage: StoredImage = {
            id: Date.now(),
            timestamp: Date.now(),
            ...imageData,
        };
        setImageLibrary(prev => {
            const updated = [newImage, ...prev];
            dbService.addImage(newImage);
            return updated;
        });
    }, []);

    const clearUserData = useCallback((clearFunc: () => Promise<void>, setData: React.Dispatch<any>, name: string) => {
        if (window.confirm(`Are you sure you want to delete all ${name}? This cannot be undone.`)) {
            clearFunc();
            setData([]);
            addNotification(`All ${name} cleared.`, 'success');
        }
    }, [addNotification]);

    const handleExportData = useCallback(() => {
        const backupData: CodexBackupData = {
            settings, history, bookmarks, learningPaths, sessionSnapshots, imageLibrary
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `codex_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        addNotification('Data exported successfully!', 'success');
    }, [settings, history, bookmarks, learningPaths, sessionSnapshots, imageLibrary, addNotification]);

    const handleImportData = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error('File could not be read');
                const data: CodexBackupData = JSON.parse(text);

                if (!data.settings || !data.history || !data.bookmarks) {
                    throw new Error('Invalid backup file structure.');
                }

                // Apply imported data
                setSettings(data.settings);
                setHistory(data.history);
                setBookmarks(data.bookmarks);
                setLearningPaths(data.learningPaths || []);
                setSessionSnapshots(data.sessionSnapshots || []);
                setImageLibrary(data.imageLibrary || []);

                // Save to DB
                await dbService.saveSettings(data.settings);
                await dbService.clearHistory(); data.history.forEach(h => dbService.addHistoryItem(h));
                await dbService.clearBookmarks(); data.bookmarks.forEach(b => dbService.addBookmark(b));
                await dbService.saveLearningPaths(data.learningPaths || []);
                await dbService.saveSessionSnapshots(data.sessionSnapshots || []);
                await dbService.clearImages();
                if(data.imageLibrary) await dbService.bulkAddImages(data.imageLibrary);

                addNotification('Data imported successfully!', 'success');
                window.location.reload(); // Reload to apply all settings and data cleanly

            } catch (error: any) {
                addNotification(error.message || 'Failed to import data.', 'error');
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    }, [addNotification]);

    const handleTriggerImport = useCallback(() => importFileRef.current?.click(), []);

    const userDataContextValue = useMemo(() => {
        const createClearItemHandler = (
            clearDbFunc: (key: any) => Promise<void>, 
            setData: React.Dispatch<React.SetStateAction<any[]>>,
            keyProp: string
        ) => (key: any) => {
            clearDbFunc(key);
            setData(prev => prev.filter(item => item[keyProp] !== key));
        };

        return {
            history, bookmarks, learningPaths, sessionSnapshots, imageLibrary,
            setHistory, toggleBookmark, handleAddToPath, handleCreatePath,
            handleSaveSnapshot, addImageToLibrary, handleExportData, handleTriggerImport, handleImportData,
            clearHistory: () => clearUserData(dbService.clearHistory, setHistory, 'History'),
            clearBookmarks: () => clearUserData(dbService.clearBookmarks, setBookmarks, 'Bookmarks'),
            clearLearningPaths: () => clearUserData(dbService.clearLearningPaths, setLearningPaths, 'Learning Paths'),
            clearSnapshots: () => clearUserData(dbService.clearSessionSnapshots, setSessionSnapshots, 'Snapshots'),
            clearImageLibrary: () => clearUserData(dbService.clearImages, setImageLibrary, 'Image Library'),
            clearHistoryItem: (topic: string) => {
                dbService.deleteHistoryItem(topic);
                setHistory(prev => prev.filter(h => h !== topic));
            },
            clearBookmarkItem: (topic: string) => {
                dbService.deleteBookmark(topic);
                setBookmarks(prev => prev.filter(b => b !== topic));
            },
            clearLearningPathItem: createClearItemHandler(dbService.deleteLearningPath, setLearningPaths, 'name'),
            clearSnapshot: createClearItemHandler(dbService.deleteSessionSnapshot, setSessionSnapshots, 'name'),
            clearImageLibraryItem: createClearItemHandler(dbService.deleteImage, setImageLibrary, 'id'),
            toggleArticleCompletion: (pathName: string, articleTitle: string) => {
                setLearningPaths(prev => {
                    const newPaths = prev.map(p => {
                        if (p.name === pathName) {
                            return { ...p, articles: p.articles.map(a => a.title === articleTitle ? { ...a, completed: !a.completed } : a) };
                        }
                        return p;
                    });
                    dbService.saveLearningPaths(newPaths);
                    return newPaths;
                });
            },
            reorderArticlesInPath: (pathName: string, startIndex: number, endIndex: number) => {
                setLearningPaths(prev => {
                    const newPaths = [...prev];
                    const pathIndex = newPaths.findIndex(p => p.name === pathName);
                    if (pathIndex === -1 || startIndex === endIndex) return prev;
            
                    const path = newPaths[pathIndex];
                    const newArticles = Array.from(path.articles);
                    const [removed] = newArticles.splice(startIndex, 1);
                    newArticles.splice(endIndex, 0, removed);
                    
                    newPaths[pathIndex] = { ...path, articles: newArticles };
                    dbService.saveLearningPaths(newPaths);
                    return newPaths;
                });
            },
            removeArticleFromPath: (pathName: string, articleTitle: string) => {
                setLearningPaths(prev => {
                    const newPaths = prev.map(p => {
                        if (p.name === pathName) {
                            return { ...p, articles: p.articles.filter(a => a.title !== articleTitle) };
                        }
                        return p;
                    });
                    dbService.saveLearningPaths(newPaths);
                    addNotification(`"${articleTitle}" removed from "${pathName}".`);
                    return newPaths;
                });
            },
        };
    }, [history, bookmarks, learningPaths, sessionSnapshots, imageLibrary, setHistory, toggleBookmark, handleAddToPath, handleCreatePath, handleSaveSnapshot, addImageToLibrary, handleExportData, handleTriggerImport, handleImportData, clearUserData, addNotification]);
    
    const notificationContextValue = useMemo(() => ({ addNotification }), [addNotification]);

    if (isInitialLoad) {
        return <div className="bg-gray-900 min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
    }
    
    return (
        <SettingsContext.Provider value={{ settings, setSettings }}>
            <UserDataContext.Provider value={userDataContextValue}>
                <LocalizationProvider>
                     <NotificationContext.Provider value={notificationContextValue}>
                         <div className={`theme-${settings.accentColor}`}>
                            <input type="file" ref={importFileRef} onChange={handleImportData} className="hidden" accept=".json" />
                            <AppContent />
                            <div className="fixed bottom-20 md:bottom-4 right-4 z-[100] space-y-2">
                                {notifications.map(n => (
                                    <div key={n.id} className={`flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg text-sm font-semibold text-white animate-fade-in-down ${n.type === 'error' ? 'bg-red-500' : n.type === 'success' ? 'bg-emerald-500' : 'bg-sky-500'}`}>
                                        {n.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5" />}
                                        {n.type === 'info' && <InformationCircleIcon className="w-5 h-5" />}
                                        <span>{n.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </NotificationContext.Provider>
                </LocalizationProvider>
            </UserDataContext.Provider>
        </SettingsContext.Provider>
    );
};

export default App;