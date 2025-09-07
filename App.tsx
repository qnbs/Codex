import React, { useState, useCallback, useEffect } from 'react';
import { AppSettings, ArticleData, RelatedTopic, ChatMessage, StarterTopic, SessionSnapshot } from './types';
import { SettingsContext, defaultSettings } from './context/AppContext';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { UserDataProvider, useUserData } from './context/UserDataContext';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ArticleView from './components/ArticleView';
import AthenaCopilot from './components/AthenaCopilot';
import SynapseGraph from './components/SynapseGraph';
import EntryPortal from './components/EntryPortal';
import * as gemini from './services/geminiService';
import { Chat } from '@google/genai';
import LoadingSpinner from './components/LoadingSpinner';

const AppUI: React.FC = () => {
    const { settings } = React.useContext(SettingsContext)!;
    const [currentTopic, setCurrentTopic] = useState('');
    const [article, setArticle] = useState<ArticleData | null>(null);
    const [relatedTopics, setRelatedTopics] = useState<RelatedTopic[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [fullArticleText, setFullArticleText] = useState('');

    const { t, locale } = useLocalization();
    const { addNotification } = useNotification();
    const { addHistory, checkIfBookmarked } = useUserData();

    useEffect(() => {
        checkIfBookmarked(currentTopic);
    }, [currentTopic, checkIfBookmarked]);

    const handleSearch = useCallback(async (topic: string) => {
        if (!topic || isLoading) return;
        
        window.scrollTo(0, 0);
        setIsLoading(true);
        setCurrentTopic(topic);
        setArticle(null);
        setRelatedTopics([]);
        setMessages([]);
        setChat(null);
        
        try {
            await addHistory(topic);
            
            const articleData = await gemini.generateArticleContent(topic, settings, locale);
            setArticle(articleData);

            const articleText = [
                articleData.title,
                articleData.introduction,
                ...articleData.sections.map(s => `${s.heading}\n${s.content}`),
                articleData.conclusion
            ].join('\n\n');
            setFullArticleText(articleText);
            
            const newChat = gemini.startChat(articleText, locale, t);
            setChat(newChat);
            setMessages([{ role: 'model', parts: [{ text: t('athena.welcomeMessage', { title: articleData.title }) }] }]);

            if (settings.autoLoadImages) {
                // Non-blocking image generation
                Promise.all(articleData.sections.map(async (section, index) => {
                    if (section.imagePrompt) {
                        try {
                            const imageUrl = await gemini.generateImageForSection(section.imagePrompt, settings, locale);
                            setArticle(currentArticle => {
                                if (!currentArticle || currentArticle.title !== articleData.title) return currentArticle;
                                const newSections = [...currentArticle.sections];
                                newSections[index] = { ...newSections[index], imageUrl, isGeneratingImage: false };
                                return { ...currentArticle, sections: newSections };
                            });
                        } catch (imageError) {
                            console.error(`Failed to auto-load image for section ${index}:`, imageError);
                            // Optionally add a notification for failed auto-loads
                        }
                    }
                }));
            }
            
            const relTopics = await gemini.getRelatedTopics(topic, settings, locale);
            setRelatedTopics(relTopics);

        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : t('errors.articleCreationFailed', { topic });
            addNotification(message, 'error');
            setCurrentTopic(''); // Reset topic on failure
        } finally {
            setIsLoading(false);
        }
    }, [settings, locale, t, addNotification, addHistory, isLoading]);

    const handleSerendipity = useCallback(async () => {
        setIsLoading(true);
        addNotification(t('notifications.findingConnection'), 'info');
        try {
            const topic = await gemini.getSerendipitousTopic(currentTopic, locale);
            addNotification(t('notifications.cosmicLeapFound', { topic }), 'success');
            await handleSearch(topic);
        } catch (error) {
            console.error(error);
            const message = error instanceof Error ? error.message : t('errors.cosmicLeapFailed');
            addNotification(message, 'error');
            setIsLoading(false);
        }
    }, [currentTopic, locale, handleSearch, t, addNotification]);

    const handleRestoreSnapshot = useCallback((snapshot: SessionSnapshot) => {
        window.scrollTo(0, 0);
        setIsLoading(true);
        setCurrentTopic(snapshot.data.currentTopic);
        setArticle(snapshot.data.article);
        setRelatedTopics(snapshot.data.relatedTopics);
        setMessages(snapshot.data.messages);

        if (snapshot.data.article) {
             const articleText = [
                snapshot.data.article.title,
                snapshot.data.article.introduction,
                ...snapshot.data.article.sections.map(s => `${s.heading}\n${s.content}`),
                snapshot.data.article.conclusion
            ].join('\n\n');
            setFullArticleText(articleText);
            const newChat = gemini.startChat(articleText, locale, t);
            setChat(newChat);
        }
        addNotification(t('notifications.snapshotRestored', { name: snapshot.name }), 'success');
        setIsLoading(false);
    }, [addNotification, locale, t]);

    useEffect(() => {
      document.documentElement.lang = settings.language;
      const themeClasses = `theme-${settings.accentColor} font-${settings.fontFamily} text-${settings.textSize}`;
      document.body.className = `bg-gray-900 text-gray-200 min-h-screen ${themeClasses}`;
    }, [settings]);

    if (!isStarted) {
        return <EntryPortal onStart={() => setIsStarted(true)} />;
    }
    
    const sessionData = { currentTopic, article, relatedTopics, messages };

    return (
        <div className="flex flex-col min-h-screen">
            <Header onSearch={handleSearch} sessionData={sessionData} onRestore={handleRestoreSnapshot} />
            <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-3xl mx-auto">
                    <SearchBar onSearch={handleSearch} onSerendipity={handleSerendipity} isLoading={isLoading} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <div className="lg:col-span-2">
                        {isLoading && !article ? (
                             <div className="flex flex-col items-center justify-center h-96">
                                <LoadingSpinner text={t('article.creating')} />
                             </div>
                        ) : article ? (
                            <ArticleView 
                                key={currentTopic} // Force re-mount on topic change
                                article={article}
                                fullArticleText={fullArticleText}
                                settings={settings}
                                onArticleUpdate={setArticle}
                                onTopicClick={handleSearch}
                            />
                        ) : (
                            <WelcomeView onTopicSelect={handleSearch} />
                        )}
                    </div>
                    <div className="lg:sticky lg:top-28 lg:h-fit">
                        <AthenaCopilot 
                            article={article}
                            fullArticleText={fullArticleText}
                            chat={chat}
                            messages={messages}
                            setMessages={setMessages}
                            isLoadingArticle={isLoading && !article}
                            currentTopic={currentTopic}
                        />
                    </div>
                </div>

                {!isLoading && relatedTopics.length > 0 && (
                    <SynapseGraph 
                        currentTopic={currentTopic}
                        relatedTopics={relatedTopics}
                        onTopicClick={handleSearch}
                        onSerendipity={handleSerendipity}
                        isLoading={isLoading}
                    />
                )}
            </main>
        </div>
    );
};

const WelcomeView: React.FC<{onTopicSelect: (topic: string) => void;}> = ({ onTopicSelect }) => {
    const { t } = useLocalization();
    const starterTopics: StarterTopic[] = t('starterTopics');

    return (
        <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-white">{t('welcome.title')}</h1>
            <p className="text-gray-400 mt-2 max-w-xl mx-auto">{t('welcome.subtitle')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto">
                {starterTopics.map(topic => (
                    <button key={topic.title} onClick={() => onTopicSelect(topic.title)} className="text-left p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition-all transform hover:scale-105">
                        <h3 className="font-bold text-accent">{topic.title}</h3>
                        <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function App() {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const savedSettings = localStorage.getItem('codex-settings');
            return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        } catch {
            return defaultSettings;
        }
    });

    useEffect(() => {
        localStorage.setItem('codex-settings', JSON.stringify(settings));
    }, [settings]);

    return (
        <SettingsContext.Provider value={{ settings, setSettings }}>
            <NotificationProvider>
                <LocalizationProvider>
                    <UserDataProvider>
                        <AppUI />
                    </UserDataProvider>
                </LocalizationProvider>
            </NotificationProvider>
        </SettingsContext.Provider>
    );
}