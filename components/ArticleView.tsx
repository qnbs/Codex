import React, { useState, useCallback } from 'react';
import { ArticleData, SummaryType, TimelineEvent, AppSettings } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { useLocalization } from '../context/LocalizationContext';
import { generateSummary, generateImageForSection } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import { ClipboardCopyIcon, CameraIcon, BookmarkIcon } from './IconComponents';
import { useNotification } from '../context/NotificationContext';
import { useUserData } from '../context/UserDataContext';

type SummaryState = {
    [key in SummaryType]?: string | null; // null for loading, string for content
};

const SummarySection: React.FC<{ fullArticleText: string }> = ({ fullArticleText }) => {
    const { t, locale } = useLocalization();
    const { addNotification } = useNotification();
    const [summaries, setSummaries] = useState<SummaryState>({});
    const summaryTypes: SummaryType[] = ['tldr', 'eli5', 'keyPoints', 'analogy'];

    const handleGenerateSummary = async (type: SummaryType) => {
        if (summaries[type] !== undefined) return; 
        setSummaries(prev => ({ ...prev, [type]: null }));
        try {
            const result = await generateSummary(fullArticleText, type, locale);
            setSummaries(prev => ({ ...prev, [type]: result }));
        } catch (error) {
            console.error(error);
            addNotification(error instanceof Error ? error.message : "Failed to generate summary", "error");
            setSummaries(prev => ({ ...prev, [type]: undefined })); 
        }
    };

    return (
        <div className="my-8 bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {summaryTypes.map(type => (
                    <button key={type} onClick={() => handleGenerateSummary(type)}
                        className="px-3 py-2 text-sm bg-gray-700 rounded-md hover:bg-accent disabled:bg-gray-800 disabled:text-gray-500 transition-colors"
                        disabled={summaries[type] !== undefined}>
                        {t(`summary.${type}`)}
                    </button>
                ))}
            </div>
            {summaryTypes.some(type => summaries[type] !== undefined) && (
                 <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                    {summaryTypes.map(type => summaries[type] !== undefined && (
                        <div key={type}>
                            <h3 className="font-bold text-accent">{t(`summary.${type}`)}</h3>
                            <div className="prose prose-invert prose-sm max-w-none mt-2">
                                {summaries[type] === null ? <LoadingSpinner text={t('summary.generating', { type })} /> : <MarkdownRenderer content={summaries[type] || ''} />}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TimelineSection: React.FC<{ timeline: TimelineEvent[], onTopicClick: (topic: string) => void }> = ({ timeline, onTopicClick }) => {
    const { t } = useLocalization();
    return (
        <section className="my-12">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">{t('article.keyMoments')}</h2>
            <div className="relative border-l-2 border-accent/30 ml-4 md:ml-0 md:before:absolute md:before:left-1/2 md:before:top-0 md:before:h-full md:before:w-0.5 md:before:bg-gray-700">
                {timeline.map((event, index) => (
                    <div key={index} className="mb-8 pl-8 md:pl-0 relative group">
                        <div className="absolute top-1 -left-2 md:left-1/2 md:-translate-x-1/2 bg-accent rounded-full w-4 h-4 border-4 border-gray-900 z-10"></div>
                        <div className={`md:w-5/12 ${index % 2 === 0 ? 'md:ml-auto md:pl-8' : 'md:mr-auto md:pr-8 md:text-right'}`}>
                            <p className="text-sm text-gray-400">{event.date}</p>
                            <h3 className="font-bold text-lg text-white mt-1">{event.title}</h3>
                            <p className="text-gray-300 mt-1">{event.description}</p>
                            <button onClick={() => onTopicClick(event.title)} className="text-accent text-sm mt-2 hover:underline">
                                {t('article.learnMore')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

interface ArticleViewProps {
    article: ArticleData;
    fullArticleText: string;
    settings: AppSettings;
    // FIX: Update prop type to correctly handle React state setters, including functional updates.
    onArticleUpdate: React.Dispatch<React.SetStateAction<ArticleData | null>>;
    onTopicClick: (topic: string) => void;
}

const ArticleView: React.FC<ArticleViewProps> = ({ article, fullArticleText, settings, onArticleUpdate, onTopicClick }) => {
    const { t, locale } = useLocalization();
    const { addNotification } = useNotification();
    const { isBookmarked, toggleBookmark } = useUserData();
    const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);

    const handleGenerateImage = useCallback(async (sectionIndex: number) => {
        const articleCopy = JSON.parse(JSON.stringify(article));
        const section = articleCopy.sections[sectionIndex];
        if (!section || section.imageUrl || section.isGeneratingImage) return;

        section.isGeneratingImage = true;
        onArticleUpdate(articleCopy);

        try {
            const imageUrl = await generateImageForSection(section.imagePrompt, settings, locale);
            setCopiedPrompt(null);
            // FIX: Add null check for prevArticle to align with the updated prop type.
            onArticleUpdate(prevArticle => {
                if (!prevArticle) return prevArticle;
                const newSections = [...prevArticle.sections];
                newSections[sectionIndex] = { ...newSections[sectionIndex], imageUrl, isGeneratingImage: false };
                return { ...prevArticle, sections: newSections };
            });
        } catch (error) {
            console.error(error);
            addNotification(error instanceof Error ? error.message : t('errors.imageGenSectionFailed', { section: section.heading }), "error");
            // FIX: Add null check for prevArticle to align with the updated prop type.
            onArticleUpdate(prevArticle => {
                if (!prevArticle) return prevArticle;
                const newSections = [...prevArticle.sections];
                newSections[sectionIndex] = { ...newSections[sectionIndex], isGeneratingImage: false };
                return { ...prevArticle, sections: newSections };
            });
        }
    }, [article, onArticleUpdate, settings, locale, addNotification, t]);

    const handleCopyPrompt = (prompt: string, index: number) => {
        navigator.clipboard.writeText(prompt);
        setCopiedPrompt(index);
        addNotification(t('common.copied'), 'success');
        setTimeout(() => setCopiedPrompt(null), 2000);
    };

    return (
        <article className="max-w-none">
            <header className="mb-8 border-b-2 border-gray-700/50 pb-8">
                <div className="flex justify-between items-start">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight flex-grow">{article.title}</h1>
                    <button 
                        onClick={() => toggleBookmark(article.title)} 
                        title={isBookmarked ? t('article.bookmark.remove') : t('article.bookmark.add')}
                        className={`p-2 rounded-full transition-colors duration-200 ${isBookmarked ? 'text-accent bg-accent/20' : 'text-gray-500 hover:bg-gray-700/50'}`}
                    >
                        <BookmarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                    <MarkdownRenderer content={article.introduction} />
                </div>
            </header>

            <SummarySection fullArticleText={fullArticleText} />

            <main>
                {article.sections.map((section, index) => (
                    <section key={index} className="mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold text-accent mb-4 pb-2">{section.heading}</h2>

                        <div className="mb-6 group">
                            {section.imageUrl ? (
                                <img src={section.imageUrl} alt={section.imagePrompt} className="w-full rounded-lg shadow-lg aspect-video object-cover" />
                            ) : (
                                <div className="aspect-video bg-gray-800/50 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center p-4">
                                    {section.isGeneratingImage ? (
                                        <LoadingSpinner text={t('article.generatingImage')} />
                                    ) : (
                                        <>
                                            <CameraIcon className="w-12 h-12 text-gray-600 mb-2" />
                                            <button onClick={() => handleGenerateImage(index)} className="px-4 py-2 bg-accent text-accent-contrast font-semibold rounded-full hover:bg-accent-hover transition-transform transform hover:scale-105 active:scale-100">
                                                {t('article.generateImage')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <p className="text-xs text-gray-500 font-mono flex-grow mr-2 truncate" title={section.imagePrompt}>{section.imagePrompt}</p>
                                <button onClick={() => handleCopyPrompt(section.imagePrompt, index)} title={t('common.copy')}>
                                    <ClipboardCopyIcon isCopied={copiedPrompt === index} className="w-4 h-4 text-gray-500 hover:text-gray-200" />
                                </button>
                            </div>
                        </div>

                        <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                            <MarkdownRenderer content={section.content} />
                        </div>
                    </section>
                ))}
            </main>

            {article.timeline.length > 0 && <TimelineSection timeline={article.timeline} onTopicClick={onTopicClick} />}

            <footer className="mt-12 pt-8 border-t border-gray-700">
                <h2 className="text-3xl font-bold text-white mb-4">{t('article.conclusion')}</h2>
                <div className="prose prose-invert prose-lg max-w-none text-gray-300">
                    <MarkdownRenderer content={article.conclusion} />
                </div>
            </footer>
        </article>
    );
};

export default ArticleView;
