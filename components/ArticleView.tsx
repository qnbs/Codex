import React, { useState, useRef, useEffect, useMemo, useContext, useCallback } from 'react';
import { ArticleData, StarterTopic, AppSettings, TextSize, SummaryType, TimelineEvent } from '../types';
import { BookOpenIcon, SparklesIcon, TextSelectIcon, WandIcon, ImageIcon, CloseIcon, ClockIcon, ReloadIcon, ClipboardCopyIcon, TimelineIcon, SummarizeIcon, KeyPointsIcon, Eli5Icon, AnalogyIcon, PathIcon, PlusIcon, BookmarkIcon, VideoCameraIcon } from './IconComponents';
import LoadingSpinner from './LoadingSpinner';
import { explainOrDefine, generateSummary, constructImagePrompt } from '../services/geminiService';
import { SettingsContext, UserDataContext } from '../context/AppContext';
import { useLocalization } from '../context/LocalizationContext';

const WelcomeScreen = React.memo(({ starterTopics, onTopicClick, isLoadingTopics }: { starterTopics: StarterTopic[], onTopicClick: (topic: string) => void, isLoadingTopics: boolean }) => {
    const { t } = useLocalization();
    return (
        <div className="text-center p-8 flex flex-col items-center justify-center h-full">
            <SparklesIcon className="w-16 h-16 text-accent mb-6"/>
            <h1 className="text-4xl font-bold text-white mb-2">{t('welcome.title')}</h1>
            <p className="text-lg text-gray-400 max-w-2xl mb-8">{t('welcome.subtitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                {isLoadingTopics ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-gray-800/50 rounded-lg p-4 h-24 animate-pulse"></div>
                    ))
                ) : (
                    starterTopics.map(topic => (
                        <button key={topic.title} onClick={() => onTopicClick(topic.title)} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 text-left hover:bg-gray-700/50 hover:border-accent/50 transition-all duration-300 active:scale-[0.98]">
                            <h3 className="font-bold text-accent">{topic.title}</h3>
                            <p className="text-sm text-gray-400 mt-1">{topic.description}</p>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
});

interface MediaDisplayProps {
    imageUrl?: string;
    videoUrl?: string;
    prompt?: string;
    onGenerateImage: () => void;
    onGenerateVideo: () => void;
    isGeneratingImage: boolean;
    generatingVideoInfo: { index: number | null, status: string | null };
    onEdit: (prompt: string) => void;
    isEditing: boolean;
}

const MediaDisplay = ({ imageUrl, videoUrl, prompt, onGenerateImage, onGenerateVideo, isGeneratingImage, generatingVideoInfo, onEdit, isEditing }: MediaDisplayProps) => {
    const { settings } = useContext(SettingsContext)!;
    const { locale, t } = useLocalization();
    const [isCopied, setIsCopied] = useState(false);
    const [showEditUI, setShowEditUI] = useState(false);
    const [editPrompt, setEditPrompt] = useState('');
    const [videoStatusMessage, setVideoStatusMessage] = useState('');
    const isGeneratingVideo = generatingVideoInfo.index !== null;

    const videoLoadingMessages: string[] = t('article.video.loadingMessages');

    useEffect(() => {
        let intervalId: number;
        if (isGeneratingVideo) {
            // Set initial message from the hook
            setVideoStatusMessage(generatingVideoInfo.status || videoLoadingMessages[0]);
            
            // Cycle through generic messages
            let messageIndex = 0;
            intervalId = window.setInterval(() => {
                messageIndex = (messageIndex + 1) % videoLoadingMessages.length;
                setVideoStatusMessage(videoLoadingMessages[messageIndex]);
            }, 3000);
        }
        return () => clearInterval(intervalId);
    }, [isGeneratingVideo, videoLoadingMessages]);

    // Update message when a new specific status comes from the hook
    useEffect(() => {
        if (isGeneratingVideo && generatingVideoInfo.status) {
            setVideoStatusMessage(generatingVideoInfo.status);
        }
    }, [generatingVideoInfo.status, isGeneratingVideo]);


    if (!prompt) return null;

    const fullPrompt = constructImagePrompt(prompt, settings, locale);
    const styleModifiers = fullPrompt.replace(`${prompt}, `, '');

    const handleCopy = () => {
        navigator.clipboard.writeText(fullPrompt);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editPrompt.trim()) {
            onEdit(editPrompt.trim());
            setShowEditUI(false);
            setEditPrompt('');
        }
    };
    
    const renderContent = () => {
        if (videoUrl) {
            return <video src={videoUrl} controls className="w-full h-full object-cover" />;
        }
        if (imageUrl) {
            return (
                <>
                    <img src={imageUrl} alt={prompt} className="w-full h-full object-cover" />
                    {!isEditing && !showEditUI && (
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button 
                                onClick={() => setShowEditUI(true)}
                                className="p-2 bg-gray-900/60 backdrop-blur-sm rounded-full text-white hover:bg-accent hover:text-accent-contrast transition-all"
                                title={t('article.editImage.title')}
                            >
                                <WandIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                    {showEditUI && (
                         <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center p-4 animate-fade-in-down">
                            <form onSubmit={handleEditSubmit} className="w-full max-w-md">
                                <label className="text-white font-semibold mb-2 block text-center">{t('article.editImage.promptLabel')}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editPrompt}
                                        onChange={e => setEditPrompt(e.target.value)}
                                        placeholder={t('article.editImage.placeholder')}
                                        className="w-full bg-gray-800 border-2 border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent py-2 px-4"
                                        autoFocus
                                    />
                                    <button type="submit" className="px-4 py-2 bg-accent text-accent-contrast font-semibold rounded-full hover:bg-accent-hover">
                                        {t('article.generate')}
                                    </button>
                                </div>
                                <button type="button" onClick={() => setShowEditUI(false)} className="mt-3 text-gray-400 text-sm hover:text-white">{t('common.close')}</button>
                            </form>
                        </div>
                    )}
                </>
            );
        }
        if (isGeneratingVideo) {
            return <LoadingSpinner text={videoStatusMessage} />;
        }
        if (isGeneratingImage) {
            return <LoadingSpinner text={t('article.generatingImage')} />;
        }
        return (
             <div className="w-full h-full bg-gray-700/50 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-4">
                <div className="w-full text-left">
                     <div className="flex justify-between items-center">
                         <p className="text-xs text-gray-400 font-semibold uppercase">{t('article.imagePrompt')}</p>
                         <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-transform active:scale-95">
                             <ClipboardCopyIcon className="w-3.5 h-3.5" isCopied={isCopied} />
                             {isCopied ? t('common.copied') : t('common.copy')}
                         </button>
                     </div>
                     <p className="text-sm text-gray-300 mt-2 font-mono bg-gray-900/50 p-2 rounded-md">
                        <span className="text-gray-400">{prompt}, </span><span className="text-amber-300/80">{styleModifiers}</span>
                     </p>
                </div>
                 <div className="flex items-center gap-4 mt-4">
                    <button onClick={onGenerateImage} className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-contrast text-sm font-semibold rounded-full hover:bg-accent-hover transition-all transform active:scale-95 disabled:bg-gray-600">
                        <ImageIcon className="w-5 h-5" />
                        {t('article.generateImage')}
                    </button>
                    <button onClick={onGenerateVideo} className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-full hover:bg-rose-500 transition-all transform active:scale-95 disabled:bg-gray-600">
                        <VideoCameraIcon className="w-5 h-5" />
                        {t('article.generateVideo')}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="relative w-full aspect-video bg-gray-800 rounded-lg my-6 flex items-center justify-center overflow-hidden group">
             {isEditing && (
                <div className="absolute inset-0 bg-gray-900/80 z-20 flex items-center justify-center">
                    <LoadingSpinner text={t('article.editingImage')} />
                </div>
            )}
            {renderContent()}
        </div>
    );
};

const TimelineDisplay = React.memo(({ timeline, onEventClick }: { timeline?: TimelineEvent[], onEventClick: (topic: string) => void }) => {
    const { t } = useLocalization();
    if (!timeline || timeline.length === 0) return null;

    return (
        <div className="my-8 p-6 bg-gray-800/50 rounded-lg">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><TimelineIcon className="w-7 h-7 text-accent" /> {t('article.keyMoments')}</h3>
            <div className="relative border-l-2 border-accent/30 pl-6 space-y-8">
                {timeline.map((event, index) => (
                    <div key={index} className="relative">
                        <div className="absolute -left-[35px] top-1.5 w-4 h-4 bg-gray-800 border-2 border-accent rounded-full"></div>
                        <p className="text-accent font-semibold">{event.date}</p>
                        <h4 className="font-bold text-lg mt-1 text-gray-200">{event.title}</h4>
                        <p className="text-gray-400 mt-1">{event.description}</p>
                        <button onClick={() => onEventClick(event.title)} className="text-sm text-accent hover:underline mt-1">{t('article.learnMore')}</button>
                    </div>
                ))}
            </div>
        </div>
    );
});

const SummaryDisplay = ({ fullArticleText }: { fullArticleText: string }) => {
    const { t, locale } = useLocalization();
    const [summaryType, setSummaryType] = useState<SummaryType | null>(null);
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerateSummary = useCallback(async (type: SummaryType) => {
        setIsLoading(true);
        setSummaryType(type);
        try {
            const result = await generateSummary(fullArticleText, type, locale);
            setSummary(result);
        } catch (error) {
            setSummary(error instanceof Error ? error.message : "Summary could not be generated.");
        } finally {
            setIsLoading(false);
        }
    }, [fullArticleText, locale]);

    const summaryButtons = [
        { type: SummaryType.TLDR, label: t('summary.tldr'), icon: SummarizeIcon },
        { type: SummaryType.ELI5, label: t('summary.eli5'), icon: Eli5Icon },
        { type: SummaryType.KEY_POINTS, label: t('summary.keyPoints'), icon: KeyPointsIcon },
        { type: SummaryType.ANALOGY, label: t('summary.analogy'), icon: AnalogyIcon },
    ];
    
    return (
        <div className="my-6">
             <div className="flex flex-wrap gap-2">
                {summaryButtons.map(({ type, label, icon: Icon }) => (
                     <button 
                        key={type}
                        onClick={() => handleGenerateSummary(type)}
                        disabled={isLoading}
                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-all transform active:scale-95 ${summaryType === type ? 'bg-accent text-accent-contrast' : 'bg-gray-700/80 hover:bg-gray-600/80 text-gray-300'}`}
                    >
                        <Icon className="w-4 h-4"/>
                        {label}
                    </button>
                ))}
             </div>
             {summaryType && (
                <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                    {isLoading ? (
                        <LoadingSpinner text={t('summary.generating', { type: summaryType.toString() })} />
                    ) : (
                         <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{summary}</div>
                    )}
                </div>
             )}
        </div>
    );
}

const AddToPathDropdown = ({ articleTitle }: { articleTitle: string }) => {
    const { learningPaths, handleCreatePath, handleAddToPath } = useContext(UserDataContext)!;
    const { t } = useLocalization();
    const [isCreating, setIsCreating] = useState(false);
    const [newPathName, setNewPathName] = useState("");

    const handleCreate = () => {
        if (newPathName.trim()) {
            handleCreatePath(newPathName.trim());
            handleAddToPath(newPathName.trim(), articleTitle);
            setNewPathName("");
            setIsCreating(false);
        }
    };
    
    return (
        <div className="relative group">
            <button className="flex items-center gap-1.5 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/80 transition-colors" title={t('article.addToPath.title')}>
                <PathIcon className="w-6 h-6" />
                <PlusIcon className="w-4 h-4 -ml-2" />
            </button>
            <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
                <h4 className="text-sm font-semibold text-gray-300 px-2 mb-2">{t('article.addToPath.heading')}</h4>
                <div className="max-h-40 overflow-y-auto">
                {learningPaths.length > 0 ? learningPaths.map(path => {
                    const alreadyInPath = path.articles.some(a => a.title === articleTitle);
                    return (
                        <button key={path.name} onClick={() => handleAddToPath(path.name, articleTitle)} disabled={alreadyInPath} className="w-full text-left px-2 py-1.5 text-sm text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            {path.name} {alreadyInPath && "✓"}
                        </button>
                    )
                }) : <p className="text-xs text-gray-500 px-2">{t('article.addToPath.noPaths')}</p>}
                </div>
                <div className="border-t border-gray-700 mt-2 pt-2">
                    {isCreating ? (
                        <div className="flex items-center gap-1">
                            <input 
                                type="text"
                                value={newPathName}
                                onChange={(e) => setNewPathName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder={t('article.addToPath.newPathPlaceholder')}
                                className="w-full text-sm bg-gray-700 border border-gray-600 rounded-md py-1 px-2 focus:ring-1 focus:ring-accent"
                                autoFocus
                            />
                             <button onClick={handleCreate} className="px-2 py-1 bg-accent text-accent-contrast rounded-md text-sm">{t('common.ok')}</button>
                        </div>
                    ) : (
                         <button onClick={() => setIsCreating(true)} className="w-full text-left px-2 py-1.5 text-sm text-gray-300 rounded-md hover:bg-gray-700">
                            {t('article.addToPath.create')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

const TextInteractionModal = ({ text, mode, onClose, position }: { text: string, mode: 'Define' | 'Explain' | 'Visualize' | null, onClose: () => void, position: { top: number, left: number } }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const { settings } = useContext(SettingsContext)!;
    const { locale, t } = useLocalization();

    useEffect(() => {
        if (!mode || !text) {
            return;
        }

        setIsLoading(true);
        setResult('');
        setError(null);

        const handleRequest = async () => {
            try {
                const response = await explainOrDefine(text, mode, settings, locale);
                setResult(response);
            } catch (err: any) {
                setError(err.message || `Could not ${mode.toLowerCase()} "${text}".`);
            } finally {
                setIsLoading(false);
            }
        };

        handleRequest();

    }, [mode, text, settings, locale]);
    
    useEffect(() => {
        if (!mode) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }, 0);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, mode]);

    if (!mode || !text) {
        return null;
    }

    const titleMap = {
        'Define': t('interaction.modal.defineTitle', { text }),
        'Explain': t('interaction.modal.explainTitle', { text }),
        'Visualize': t('interaction.modal.visualizeTitle', { text }),
    };

    return (
        <div 
            ref={modalRef}
            style={{ top: `${position.top}px`, left: `${position.left}px` }} 
            className="fixed z-50 w-80 max-w-sm p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl animate-fade-in"
            role="dialog"
            aria-labelledby="interaction-modal-title"
            aria-modal="true"
        >
            <div className="flex justify-between items-center mb-3">
                <h3 id="interaction-modal-title" className="text-md font-semibold text-accent truncate pr-2" title={titleMap[mode]}>{titleMap[mode]}</h3>
                <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label={t('common.close')}>
                    <CloseIcon className="w-5 h-5"/>
                </button>
            </div>
            <div className="text-sm text-gray-300 max-h-60 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <LoadingSpinner text={mode === 'Visualize' ? t('interaction.modal.visualizing') : t('interaction.modal.thinking')} />
                    </div>
                ) : error ? (
                    <p className="text-red-400">{error}</p>
                ) : mode === 'Visualize' ? (
                     <img src={result} alt={t('interaction.modal.visualizeTitle', { text })} className="w-full h-auto object-cover rounded-md" />
                ) : (
                    <p>{result}</p>
                )}
            </div>
        </div>
    );
};


// Main Component
interface ArticleViewProps {
  article: ArticleData | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  starterTopics: StarterTopic[];
  isLoadingTopics: boolean;
  onTopicClick: (topic: string) => void;
  onGenerateImage: (sectionIndex: number) => void;
  onGenerateAllImages: () => void;
  onGenerateVideo: (sectionIndex: number) => void;
  generatingImages: number[];
  generatingVideoInfo: { index: number | null, status: string | null };
  onEditImage: (sectionIndex: number, prompt: string) => void;
  editingImageIndex: number | null;
  fullArticleText: string;
  isBookmarked: boolean;
}

const ArticleView: React.FC<ArticleViewProps> = ({ article, isLoading, error, onRetry, starterTopics, isLoadingTopics, onTopicClick, onGenerateImage, onGenerateAllImages, onGenerateVideo, generatingImages, generatingVideoInfo, onEditImage, editingImageIndex, fullArticleText, isBookmarked }) => {
    const { settings } = useContext(SettingsContext)!;
    const { toggleBookmark } = useContext(UserDataContext)!;
    const { t } = useLocalization();
    
    const [interaction, setInteraction] = useState<{ text: string, mode: 'Define' | 'Explain' | 'Visualize' | null, position: { top: number, left: number } }>({ text: '', mode: null, position: { top: 0, left: 0 }});
    const articleContentRef = useRef<HTMLDivElement>(null);

    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 1 && articleContentRef.current?.contains(selection.anchorNode)) {
            const selectedText = selection.toString().trim();
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            const popoverHeight = 50; 
            const spaceBelow = window.innerHeight - rect.bottom;
            const top = spaceBelow > popoverHeight + 20 
                ? rect.bottom + window.scrollY + 5 
                : rect.top + window.scrollY - popoverHeight - 5;
            
            setInteraction(prev => ({ ...prev, text: selectedText, position: { top, left: rect.left + window.scrollX + rect.width / 2 } }));
        } else {
             if (!interaction.mode) {
                 setInteraction(prev => ({ ...prev, text: '' }));
            }
        }
    }, [interaction.mode]);

    useEffect(() => {
        document.addEventListener('mouseup', handleTextSelection);
        return () => document.removeEventListener('mouseup', handleTextSelection);
    }, [handleTextSelection]);
    
    const openInteractionModal = (mode: 'Define' | 'Explain' | 'Visualize') => {
        if (interaction.text) {
             const modalTop = window.scrollY + window.innerHeight / 2 - 150; 
             const modalLeft = window.innerWidth / 2 - 160; 
            setInteraction(prev => ({ ...prev, mode, position: { top: modalTop, left: modalLeft } }));
        }
    };
    
     const closeInteractionModal = useCallback(() => {
        setInteraction({ text: '', mode: null, position: { top: 0, left: 0 }});
    }, []);

    const missingImagesCount = useMemo(() =>
        article?.sections.filter(s => s.imagePrompt && !s.imageUrl).length ?? 0,
    [article]);

    if (isLoading && !article) {
        return <div className="flex items-center justify-center h-96"><LoadingSpinner text={t('article.creating')} /></div>;
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-bold text-red-400 mb-2">{t('article.error.title')}</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <button onClick={onRetry} className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-accent text-accent-contrast font-semibold rounded-full hover:bg-accent-hover transition-colors">
                    <ReloadIcon className="w-5 h-5"/>
                    {t('common.retry')}
                </button>
            </div>
        );
    }

    if (!article) {
        return <WelcomeScreen starterTopics={starterTopics} onTopicClick={onTopicClick} isLoadingTopics={isLoadingTopics}/>;
    }
    
    const textSizeClass = {
        [TextSize.Small]: 'text-sm',
        [TextSize.Standard]: 'text-base',
        [TextSize.Large]: 'text-lg',
    };

    return (
        <div className={`prose prose-invert max-w-none prose-p:text-gray-300 prose-headings:text-gray-100 ${textSizeClass[settings.textSize]}`}>
            <div className="flex justify-between items-start">
                <h1 className="text-4xl font-bold mb-2">{article.title}</h1>
                <div className="flex items-center gap-2 not-prose">
                     <button 
                        onClick={() => toggleBookmark(article.title)} 
                        className={`p-2 rounded-full transition-colors hover:bg-gray-700/80 ${isBookmarked ? 'text-accent hover:text-accent-hover' : 'text-gray-400 hover:text-white'}`} 
                        title={isBookmarked ? t('article.bookmark.remove') : t('article.bookmark.add')}
                     >
                        <BookmarkIcon className="w-6 h-6" isFilled={isBookmarked} />
                    </button>
                    <AddToPathDropdown articleTitle={article.title} />
                </div>
            </div>

            <p className="lead text-gray-400">{article.introduction}</p>

            <SummaryDisplay fullArticleText={fullArticleText} />
            
            {missingImagesCount > 0 && (
                <div className="my-6 text-center not-prose">
                    <button 
                        onClick={onGenerateAllImages} 
                        disabled={generatingImages.length > 0}
                        className="inline-flex items-center justify-center gap-3 px-6 py-2 bg-accent/80 text-accent-contrast text-sm font-semibold rounded-full hover:bg-accent transition-all transform active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {generatingImages.length > 0 ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>{t('article.generatingAllImages', { count: generatingImages.length })}</span>
                            </>
                        ) : (
                            <>
                                <ImageIcon className="w-5 h-5" />
                                {t('article.generateAllImages', { count: missingImagesCount })}
                            </>
                        )}
                    </button>
                </div>
            )}

            <div ref={articleContentRef}>
                {article.sections.map((section, index) => (
                    <section key={index}>
                        <h2>{section.heading}</h2>
                        <p>{section.content}</p>
                        <MediaDisplay
                            imageUrl={section.imageUrl}
                            videoUrl={section.videoUrl}
                            prompt={section.imagePrompt}
                            onGenerateImage={() => onGenerateImage(index)}
                            onGenerateVideo={() => onGenerateVideo(index)}
                            isGeneratingImage={generatingImages.includes(index)}
                            generatingVideoInfo={generatingVideoInfo.index === index ? generatingVideoInfo : { index: null, status: null }}
                            onEdit={(prompt) => onEditImage(index, prompt)}
                            isEditing={editingImageIndex === index}
                        />
                    </section>
                ))}
            </div>

            <h2>{article.conclusion ? t('article.conclusion') : ""}</h2>
            <p>{article.conclusion}</p>
            
             <TimelineDisplay timeline={article.timeline} onEventClick={onTopicClick} />
            
             {interaction.text && !interaction.mode && (
                <div 
                    style={{ top: `${interaction.position.top}px`, left: `${interaction.position.left}px`, transform: 'translateX(-50%)' }}
                    className="fixed z-40 flex items-center gap-1 p-1 bg-gray-900 border border-gray-700 rounded-full shadow-lg animate-fade-in"
                    role="toolbar"
                    aria-label={t('interaction.toolbarLabel')}
                >
                    <button onClick={() => openInteractionModal('Define')} className="p-3 rounded-full hover:bg-gray-700" title={t('interaction.define')}><WandIcon className="w-5 h-5"/></button>
                    <button onClick={() => openInteractionModal('Explain')} className="p-3 rounded-full hover:bg-gray-700" title={t('interaction.explain')}><TextSelectIcon className="w-5 h-5"/></button>
                    <button onClick={() => openInteractionModal('Visualize')} className="p-3 rounded-full hover:bg-gray-700" title={t('interaction.visualize')}><ImageIcon className="w-5 h-5"/></button>
                </div>
            )}
            
            <TextInteractionModal 
                text={interaction.text}
                mode={interaction.mode}
                onClose={closeInteractionModal}
                position={interaction.position}
            />

        </div>
    );
};

export default ArticleView;