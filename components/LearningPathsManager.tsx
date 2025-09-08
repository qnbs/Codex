import React, { useState, useContext, DragEvent, useRef } from 'react';
import { UserDataContext } from '../context/AppContext';
import { useLocalization } from '../context/LocalizationContext';
import { ChevronDownIcon, ChevronUpIcon, ReorderIcon, TrashIcon, BookOpenIcon, PathIcon } from './IconComponents';
import { LearningPath } from '../types';

interface LearningPathsManagerProps {
    handleSearch: (topic: string) => void;
    closePanel: () => void;
}

const LearningPathsManager: React.FC<LearningPathsManagerProps> = ({ handleSearch, closePanel }) => {
    const { learningPaths, toggleArticleCompletion, removeArticleFromPath, reorderArticlesInPath, clearLearningPathItem } = useContext(UserDataContext)!;
    const { t } = useLocalization();
    const [openPath, setOpenPath] = useState<string | null>(learningPaths.length > 0 ? learningPaths[0].name : null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const draggedItem = useRef<{ pathName: string; index: number } | null>(null);

    const handleDragStart = (e: DragEvent<HTMLLIElement>, pathName: string, index: number) => {
        draggedItem.current = { pathName, index };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML); // For firefox
    };

    const handleDragOver = (e: DragEvent<HTMLLIElement>, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };
    
    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: DragEvent<HTMLLIElement>, pathName: string, index: number) => {
        e.preventDefault();
        if (draggedItem.current && draggedItem.current.pathName === pathName) {
            reorderArticlesInPath(pathName, draggedItem.current.index, index);
        }
        draggedItem.current = null;
        setDragOverIndex(null);
    };

    const handleMoveArticle = (pathName: string, fromIndex: number, toIndex: number) => {
        reorderArticlesInPath(pathName, fromIndex, toIndex);
    };

    const toggleAccordion = (pathName: string) => {
        setOpenPath(prev => (prev === pathName ? null : pathName));
    };

    if (learningPaths.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
                <PathIcon className="w-16 h-16 mb-4"/>
                <h3 className="font-bold text-lg text-gray-400">{t('panels.learningPaths.noPathsTitle')}</h3>
                <p className="text-sm">{t('panels.learningPaths.noPathsDescription')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {learningPaths.map((path: LearningPath) => {
                const isExpanded = openPath === path.name;
                const total = path.articles.length;
                const completed = path.articles.filter(a => a.completed).length;
                const progress = total > 0 ? (completed / total) * 100 : 0;

                return (
                    <div key={path.name} className="bg-gray-800/50 rounded-lg">
                        <button onClick={() => toggleAccordion(path.name)} className="w-full flex items-center justify-between p-3 text-left">
                            <div className="flex-grow">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-200">{path.name}</span>
                                    <span className="text-xs text-gray-400">{t('panels.learningPaths.progress', { completed, total })}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                                    <div className="bg-accent h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <div className="flex items-center ml-4">
                               <button onClick={(e) => { e.stopPropagation(); clearLearningPathItem(path.name); }} className="p-1 text-gray-500 hover:text-red-400" title={t('panels.learningPaths.deletePath')} aria-label={t('panels.learningPaths.deletePath')}>
                                    <TrashIcon className="w-4 h-4" />
                               </button>
                               <ChevronDownIcon className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                        </button>
                        {isExpanded && (
                            <div className="p-3 border-t border-gray-700">
                                {path.articles.length > 0 ? (
                                    <ul className="space-y-2" onDragLeave={handleDragLeave}>
                                        {path.articles.map((article, index) => (
                                            <li
                                                key={article.title}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, path.name, index)}
                                                onDragOver={(e) => handleDragOver(e, index)}
                                                onDrop={(e) => handleDrop(e, path.name, index)}
                                                className={`flex items-center gap-2 p-2 rounded-md group bg-gray-700/50 transition-all ${draggedItem.current?.index === index ? 'opacity-50' : ''} ${dragOverIndex === index ? 'border-t-2 border-accent' : 'border-t-2 border-transparent'}`}
                                            >
                                                <div className="flex items-center">
                                                    <button className="cursor-move p-1 text-gray-500 touch-none" aria-label="Drag to reorder">
                                                        <ReorderIcon className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex flex-col">
                                                        <button
                                                            onClick={() => handleMoveArticle(path.name, index, index - 1)}
                                                            disabled={index === 0}
                                                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                                                            aria-label={t('panels.learningPaths.moveUp')}
                                                        >
                                                            <ChevronUpIcon className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMoveArticle(path.name, index, index + 1)}
                                                            disabled={index === path.articles.length - 1}
                                                            className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30"
                                                            aria-label={t('panels.learningPaths.moveDown')}
                                                        >
                                                            <ChevronDownIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={article.completed}
                                                    onChange={() => toggleArticleCompletion(path.name, article.title)}
                                                    className="h-4 w-4 rounded text-accent bg-gray-700 border-gray-600 focus:ring-accent"
                                                    aria-label={`Mark "${article.title}" as ${article.completed ? 'incomplete' : 'complete'}`}
                                                />
                                                <span className={`flex-grow text-sm truncate ${article.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                                    {article.title}
                                                </span>
                                                <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                                    <button onClick={() => { handleSearch(article.title); closePanel(); }} className="p-1 text-gray-400 hover:text-accent" title={t('panels.learningPaths.goToArticle')} aria-label={t('panels.learningPaths.goToArticle')}>
                                                        <BookOpenIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => removeArticleFromPath(path.name, article.title)} className="p-1 text-gray-400 hover:text-red-400" title={t('panels.learningPaths.removeFromPath')} aria-label={t('panels.learningPaths.removeFromPath')}>
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 text-center py-4">{t('panels.learningPaths.noArticles')}</p>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default LearningPathsManager;