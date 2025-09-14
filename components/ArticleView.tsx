import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArticleData, ArticleSection, SummaryType, AppSettings, TimelineEvent } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import * as geminiService from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import {
    BookmarkIcon, ImageIcon, WandIcon, ClipboardCopyIcon, TextSelectIcon, SummarizeIcon,
    Eli5Icon, KeyPointsIcon, AnalogyIcon, TimelineIcon, PlusIcon, VideoCameraIcon,
    CloseIcon
} from './IconComponents';

type ArticleViewProps = {
    article: ArticleData;
    isLoading: boolean;
    currentTopic: string;
    isBookmarked: boolean;
    settings: AppSettings;
    onToggleBookmark: () => void;
    onAddToPath: (pathName: string) => void;
    onCreatePath: (pathName: string) => void;
    learningPaths: { name: string }[];
    onGenerateImage: (sectionIndex: number) => Promise<void>;
    onGenerateAllImages: () => void;
    onGenerateVideo: (sectionIndex: number, onStatusUpdate: (status: string) => void) => Promise<void>;
    addNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    addImageToLibrary: (imageData: { imageUrl: string; prompt: string; topic: string; }) => void;
    onSearch: (topic: string) => void;
};

// Sub-component for the text interaction toolbar
const InteractionToolbar: React.FC<{
    position: { top: number; left: number };
    onAction: (action: 'Define' | 'Explain' | 'Visualize') => void;
}> = ({ position, onAction }) => {
    const { t } = useLocalization();
    return (
        <div
            className="absolute z-30 bg-gray-800 border border-gray-700 rounded-lg shadow-lg flex items-center p-1"
            style={{ top: position.top, left: position.left, transform: 'translateY(-100%)' }}
        >
            <button onClick={() => onAction('Define')} className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md">{t('interaction.define')}</button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <button onClick={() => onAction('Explain')} className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md">{t('interaction.explain')}</button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <button onClick={() => onAction('Visualize')} className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-md">{t('interaction.visualize')}</button>
        </div>
    );
};

// Sub-component for displaying interaction results
const InteractionModal: React.FC<{
    mode: 'Define' | 'Explain' | 'Visualize' | null;
    text: string;
    onClose: () => void;
    settings: AppSettings;
}> = ({ mode, text, onClose, settings }) => {
    const [result, setResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const { t, locale } = useLocalization();

    useEffect(() => {
        if (!mode || !text) return;
        setIsLoading(true);
        setResult('');

        geminiService.explainOrDefine(text, mode, settings, locale)
            .then(setResult)
            .catch(err => setResult(err.message))
            .finally(() => setIsLoading(false));

    }, [mode, text, settings, locale]);

    if (!mode) return null;

    const titles = {
        Define: t('interaction.modal.defineTitle', { text }),
        Explain: t('interaction.modal.explainTitle', { text }),
        Visualize: t('interaction.modal.visualizeTitle', { text }),
    };
    const loadingText = mode === 'Visualize' ? t('interaction.modal.visualizing') : t('interaction.modal.thinking');

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white truncate">{titles[mode]}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {isLoading && <LoadingSpinner text={loadingText} />}
                    {result && (
                        mode === 'Visualize'
                            ? <img src={result} alt={text} className="rounded-lg w-full object-contain" />
                            : <p className="text-gray-300 whitespace-pre-wrap">{result}</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Edit Image Modal
const EditImageModal: React.FC<{
    imageUrl: string;
    onClose: () => void;
    onEditComplete: (newImageUrl: string, prompt: string) => void;
}> = ({ imageUrl, onClose, onEditComplete }) => {
    const [prompt, setPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const { t, locale } = useLocalization();

    const handleEdit = async () => {
        if (!prompt.trim()) return;
        setIsEditing(true);
        try {
            const newImageUrl = await geminiService.editImage(imageUrl, prompt, locale);
            onEditComplete(newImageUrl, prompt);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsEditing(false);
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-3xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-semibold text-white">{t('article.editImage.title')}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <img src={imageUrl} alt="Original" className="rounded-lg object-contain w-full max-h-80" />
                    <div className="flex flex-col">
                        <label htmlFor="edit-prompt" className="text-sm font-medium text-gray-300 mb-2">{t('article.editImage.promptLabel')}</label>
                        <textarea
                            id="edit-prompt"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t('article.editImage.placeholder')}
                            rows={4}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md text-gray-200 p-2 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button
                            onClick={handleEdit}
                            disabled={isEditing || !prompt.trim()}
                            className="mt-4 w-full bg-accent text-accent-contrast font-bold py-2 px-4 rounded-lg hover:bg-accent-hover disabled:bg-gray-600 transition-colors flex items-center justify-center"
                        >
                            {isEditing ? <LoadingSpinner text={t('article.editingImage')} /> : t('common.generate')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// Summary Widget
const SummaryWidget: React.FC<{ article: ArticleData, addNotification: ArticleViewProps['addNotification'] }> = ({ article, addNotification }) => {
    const [summary, setSummary] = useState<{ type: SummaryType; content: string } | null>(null);
    const [loadingSummary, setLoadingSummary] = useState<SummaryType | null>(null);
    const { t, locale } = useLocalization();

    const getSummary = async (type: SummaryType) => {
        setLoadingSummary(type);
        setSummary(null);
        try {
            const articleText = `${article.introduction}\n\n${article.sections.map(s => `## ${s.heading}\n${s.content}`).join('\n\n')}`;
            const result = await geminiService.generateSummary(articleText, type, locale);
            setSummary({ type, content: result });
        } catch (error: any) {
            addNotification(error.message, 'error');
        } finally {
            setLoadingSummary(null);
        }
    };

    const buttons = [
        { type: SummaryType.TLDR, icon: SummarizeIcon, label: t('summary.tldr') },
        { type: SummaryType.ELI5, icon: Eli5Icon, label: t('summary.eli5') },
        { type: SummaryType.KEY_POINTS, icon: KeyPointsIcon, label: t('summary.keyPoints') },
        { type: SummaryType.ANALOGY, icon: AnalogyIcon, label: t('summary.analogy') },
    ];

    return (
        <div className="my-6 p-4 bg-gray-800/50 rounded-lg">
            <div className="flex flex-wrap justify-center gap-2">
                {buttons.map(({ type, icon: Icon, label }) => (
                    <button
                        key={type}
                        onClick={() => getSummary(type)}
                        disabled={!!loadingSummary}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/60 text-gray-300 rounded-full hover:bg-gray-700 hover:text-white transition-colors text-sm disabled:opacity-50"
                    >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                    </button>
                ))}
            </div>
            {loadingSummary && <div className="mt-4"><LoadingSpinner text={t('summary.generating', { type: loadingSummary })} /></div>}
            {summary && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <h3 className="font-bold text-accent mb-2">{t(`summary.${summary.type}`)}</h3>
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">{summary.content}</div>
                </div>
            )}
        </div>
    );
};

// Timeline Widget
const Timeline: React.FC<{ events: TimelineEvent[], onSearch: (topic: string) => void }> = ({ events, onSearch }) => {
    const { t } = useLocalization();
    return (
        <div className="my-8">
            <h2 id="timeline" className="flex items-center gap-3 text-2xl font-bold text-gray-100 mb-6">
                <TimelineIcon className="w-7 h-7 text-accent" />
                <span>{t('article.keyMoments')}</span>
            </h2>
            <div className="relative border-l-2 border-accent/30 ml-4 pl-8 space-y-8">
                {events.map((event, index) => (
                    <div key={index} className="relative">
                        <div className="absolute -left-10 top-1.5 w-4 h-4 bg-gray-700 border-2 border-accent rounded-full"></div>
                        <p className="text-sm text-accent font-semibold">{event.date}</p>
                        <h4 className="font-bold text-lg text-gray-200 mt-1">{event.title}</h4>
                        <p className="text-gray-400 mt-1">{event.description}</p>
                         <button onClick={() => onSearch(event.title)} className="text-xs text-accent/80 hover:text-accent hover:underline mt-1">{t('article.learnMore')}</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Add to Path Dropdown
const AddToPathDropdown: React.FC<{
    learningPaths: { name: string }[];
    onAddToPath: (pathName: string) => void;
    onCreatePath: (pathName: string) => void;
}> = ({ learningPaths, onAddToPath, onCreatePath }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newPathName, setNewPathName] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { t } = useLocalization();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreate = () => {
        if (newPathName.trim()) {
            onCreatePath(newPathName.trim());
            onAddToPath(newPathName.trim());
            setNewPathName('');
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsOpen(!isOpen)} title={t('article.addToPath.title')} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                <PlusIcon className="w-6 h-6" />
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 p-2">
                    <h4 className="text-sm font-semibold px-2 pb-2">{t('article.addToPath.heading')}</h4>
                    <div className="max-h-40 overflow-y-auto mb-2">
                        {learningPaths.length > 0 ? (
                            learningPaths.map(path => (
                                <button key={path.name} onClick={() => { onAddToPath(path.name); setIsOpen(false); }} className="block w-full text-left px-2 py-1.5 text-gray-300 hover:bg-gray-700 rounded-md text-sm">
                                    {path.name}
                                </button>
                            ))
                        ) : (
                            <p className="px-2 py-1.5 text-gray-500 text-sm">{t('article.addToPath.noPaths')}</p>
                        )}
                    </div>
                    <div className="pt-2 border-t border-gray-700">
                        <div className="flex gap-2">
                             <input
                                type="text"
                                value={newPathName}
                                onChange={(e) => setNewPathName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                placeholder={t('article.addToPath.newPathPlaceholder')}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                            <button onClick={handleCreate} className="px-3 py-1 bg-accent text-accent-contrast rounded-md text-sm font-semibold hover:bg-accent-hover">{t('common.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TableOfContents: React.FC<{ sections: ArticleSection[], conclusionTitle: string, timelineTitle: string | null }> = ({ sections, conclusionTitle, timelineTitle }) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const observer = useRef<IntersectionObserver | null>(null);
    const { t } = useLocalization();

    useEffect(() => {
        const handleObserver = (entries: IntersectionObserverEntry[]) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveId(entry.target.id);
                }
            });
        };
        
        observer.current = new IntersectionObserver(handleObserver, {
            rootMargin: '-20% 0px -80% 0px', // Trigger when section is in the top 20% of the viewport
            threshold: 0
        });

        const elements = sections.map((_, index) => document.getElementById(`section-${index}`)).filter(Boolean);
        const conclusionEl = document.getElementById('conclusion');
        const timelineEl = document.getElementById('timeline');

        if (conclusionEl) elements.push(conclusionEl);
        if (timelineEl) elements.push(timelineEl);
        
        elements.forEach(el => observer.current?.observe(el!));

        return () => observer.current?.disconnect();
    }, [sections, conclusionTitle, timelineTitle]);

    const tocItems = [
        ...sections.map((section, index) => ({ id: `section-${index}`, title: section.heading })),
        { id: 'conclusion', title: conclusionTitle },
        ...(timelineTitle ? [{ id: 'timeline', title: timelineTitle }] : [])
    ];
    
    return (
        <nav className="toc">
            <h3 className="font-bold text-gray-300 text-sm uppercase tracking-wider mb-3">On this page</h3>
            <ul className="space-y-2">
                {tocItems.map(item => (
                    <li key={item.id}>
                        <a 
                            href={`#${item.id}`} 
                            className={`toc-link flex items-center gap-3 text-sm text-gray-400 hover:text-white p-1 rounded ${activeId === item.id ? 'active font-semibold' : ''}`}
                        >
                            <span className={`toc-dot w-1.5 h-1.5 bg-gray-600 rounded-full transition-all duration-200`}></span>
                            <span className="truncate">{item.title}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};


const ArticleView: React.FC<ArticleViewProps> = ({ article, onGenerateImage, onGenerateAllImages, onGenerateVideo, onToggleBookmark, isBookmarked, onAddToPath, onCreatePath, learningPaths, settings, addNotification, addImageToLibrary, onSearch }) => {
    const { t, locale } = useLocalization();
    const articleRef = useRef<HTMLDivElement>(null);
    const [selectedText, setSelectedText] = useState('');
    const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
    const [interactionMode, setInteractionMode] = useState<'Define' | 'Explain' | 'Visualize' | null>(null);
    const [isCopying, setIsCopying] = useState<number | null>(null);
    const [videoStatuses, setVideoStatuses] = useState<{ [key: number]: string }>({});
    const [editingImage, setEditingImage] = useState<{ sectionIndex: number, imageUrl: string } | null>(null);


    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() ?? '';
        if (text && articleRef.current?.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const articleRect = articleRef.current.getBoundingClientRect();
            setSelectedText(text);
            setToolbarPos({
                top: rect.top - articleRect.top,
                left: rect.left - articleRect.left + rect.width / 2,
            });
        } else {
            setSelectedText('');
            setToolbarPos(null);
        }
    }, []);

    const handleInteraction = (action: 'Define' | 'Explain' | 'Visualize') => {
        setInteractionMode(action);
        setToolbarPos(null);
    };

    const handleCopyPrompt = (prompt: string, index: number) => {
        navigator.clipboard.writeText(prompt);
        setIsCopying(index);
        setTimeout(() => setIsCopying(null), 2000);
    };

    const handleVideoGeneration = async (sectionIndex: number) => {
        const onStatusUpdate = (status: string) => {
            setVideoStatuses(prev => ({ ...prev, [sectionIndex]: status }));
        };

        try {
            await onGenerateVideo(sectionIndex, onStatusUpdate);
            setVideoStatuses(prev => {
                const newStatuses = { ...prev };
                delete newStatuses[sectionIndex];
                return newStatuses;
            });
        } catch (error) {
            setVideoStatuses(prev => ({ ...prev, [sectionIndex]: t('errors.videoGenerationFailed') }));
        }
    };

    const handleEditComplete = (newImageUrl: string, editPrompt: string, sectionIndex: number) => {
        const originalPrompt = article.sections[sectionIndex].imagePrompt || '';
        const combinedPrompt = t('panels.imageLibrary.editedPrompt', { editPrompt, originalPrompt });
        
        addImageToLibrary({
            imageUrl: newImageUrl,
            prompt: combinedPrompt,
            topic: article.title,
        });

        // The parent component (App.tsx) needs to update the article state.
        // For now, we rely on the parent's logic to handle the visual update.
        // A more direct state update could be implemented via a callback if needed.
    };

    const hasMissingImages = article.sections.some(s => s.imagePrompt && !s.imageUrl);
    const missingImageCount = article.sections.filter(s => s.imagePrompt && !s.imageUrl).length;
    const textBaseSize = settings.textSize === 'sm' ? 'text-sm' : settings.textSize === 'lg' ? 'text-lg' : 'text-base';


    return (
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 px-4 md:px-8">
            <div className="hidden lg:block col-span-3 py-8">
                <TableOfContents 
                    sections={article.sections}
                    conclusionTitle={t('article.conclusion')}
                    timelineTitle={article.timeline && article.timeline.length > 0 ? t('article.keyMoments') : null}
                />
            </div>
            <div className="col-span-12 lg:col-span-9">
                <main ref={articleRef} onMouseUp={handleMouseUp} className="prose prose-invert max-w-none lg:prose-lg py-8">
                    {toolbarPos && <InteractionToolbar position={toolbarPos} onAction={handleInteraction} />}
                    {interactionMode && <InteractionModal mode={interactionMode} text={selectedText} onClose={() => setInteractionMode(null)} settings={settings} />}
                    {editingImage && (
                        <EditImageModal
                            imageUrl={editingImage.imageUrl}
                            onClose={() => setEditingImage(null)}
                            onEditComplete={(newUrl, prompt) => handleEditComplete(newUrl, prompt, editingImage.sectionIndex)}
                        />
                    )}
                    
                    <div className="flex justify-between items-start gap-4">
                        <h1 className="mb-2">{article.title}</h1>
                        <div className="flex items-center gap-1 not-prose">
                            <button onClick={onToggleBookmark} title={isBookmarked ? t('article.bookmark.remove') : t('article.bookmark.add')} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                                <BookmarkIcon className="w-6 h-6" isFilled={isBookmarked} />
                            </button>
                            <AddToPathDropdown learningPaths={learningPaths} onAddToPath={onAddToPath} onCreatePath={onCreatePath}/>
                        </div>
                    </div>
                    <p className={`lead mt-0 ${textBaseSize}`}>{article.introduction}</p>

                    <SummaryWidget article={article} addNotification={addNotification} />

                    {hasMissingImages && (
                        <div className="not-prose text-center my-6">
                            <button onClick={onGenerateAllImages} className="px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors">
                                {t('article.generateAllImages', { count: missingImageCount })}
                            </button>
                        </div>
                    )}
                    
                    <div className={`space-y-8 ${textBaseSize}`}>
                        {article.sections.map((section, index) => (
                            <section key={index}>
                                <h2 id={`section-${index}`}>{section.heading}</h2>
                                <p>{section.content}</p>
                                {section.imagePrompt && (
                                    <div className="not-prose my-6 p-4 bg-gray-800/50 rounded-lg">
                                        {/* Image Display Area */}
                                        {section.imageUrl ? (
                                            <div className="relative group mb-4">
                                                <img src={section.imageUrl} alt={section.heading} className="rounded-lg w-full" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                                    <button 
                                                        onClick={() => setEditingImage({ sectionIndex: index, imageUrl: section.imageUrl! })}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30">
                                                        <WandIcon className="w-5 h-5" /> Edit
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                                                <div className="flex items-start gap-3 flex-grow">
                                                    <ImageIcon className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                                                    <p className="text-sm text-gray-400 italic">
                                                        <span className="font-bold text-gray-300">{t('article.imagePrompt')}:</span> "{section.imagePrompt}"
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button onClick={() => handleCopyPrompt(section.imagePrompt!, index)} className="p-2 text-gray-400 hover:text-white" title={t('common.copyPrompt')}>
                                                        {isCopying === index ? <span className="text-xs text-accent">{t('common.copied')}</span> : <ClipboardCopyIcon className="w-5 h-5" />}
                                                    </button>
                                                    <button onClick={() => onGenerateImage(index)} className="px-4 py-2 text-sm font-semibold bg-gray-700/80 text-gray-200 rounded-lg hover:bg-gray-700">
                                                        <div className="flex items-center gap-2">
                                                            <ImageIcon className="w-4 h-4" /> <span>{t('article.generateImage')}</span>
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Video Display Area */}
                                        <div className="border-t border-gray-700/50 pt-4">
                                            {section.videoUrl ? (
                                                <video controls src={section.videoUrl} className="w-full rounded-lg" />
                                            ) : videoStatuses[index] ? (
                                                <LoadingSpinner text={videoStatuses[index]} />
                                            ) : (
                                                <div className="flex justify-end">
                                                    <button onClick={() => handleVideoGeneration(index)} className="px-4 py-2 text-sm font-semibold bg-gray-700/80 text-gray-200 rounded-lg hover:bg-gray-700">
                                                        <div className="flex items-center gap-2">
                                                            <VideoCameraIcon className="w-4 h-4" /> <span>{t('article.generateVideo')}</span>
                                                        </div>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>

                    <h2 id="conclusion">{t('article.conclusion')}</h2>
                    <p>{article.conclusion}</p>
                    
                    {article.timeline && article.timeline.length > 0 && (
                        <Timeline events={article.timeline} onSearch={onSearch} />
                    )}
                </main>
            </div>
        </div>
    );
};

export default ArticleView;