import React, { useState } from 'react';
import { useUserData } from '../context/UserDataContext';
import { CloseIcon, TrashIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface LearningPathsPanelProps {
    onClose: () => void;
    onTopicClick: (topic: string) => void;
}

const LearningPathsPanel: React.FC<LearningPathsPanelProps> = ({ onClose, onTopicClick }) => {
    const { t } = useLocalization();
    const { learningPaths, createLearningPath, deleteLearningPath, removeArticleFromPath } = useUserData();
    const [newPathName, setNewPathName] = useState('');
    const [expandedPathId, setExpandedPathId] = useState<number | null>(null);

    const handleCreatePath = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPathName.trim()) return;
        try {
            await createLearningPath(newPathName.trim());
            setNewPathName('');
        } catch (error) {
            console.error(error);
        }
    };
    
    return (
        <div className="fixed top-0 left-0 h-full w-full max-w-sm bg-gray-900/80 backdrop-blur-sm shadow-2xl z-40">
            <div className="flex flex-col h-full border-r border-gray-700">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{t('panels.learningPaths.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><CloseIcon className="w-6 h-6" /></button>
                </header>
                <main className="p-4 overflow-y-auto flex-grow">
                     {learningPaths.length === 0 ? (
                        <p className="text-gray-500 text-center mt-8">{t('panels.noEntries')}</p>
                    ) : (
                        <ul className="space-y-3">
                            {learningPaths.map(path => (
                                <li key={path.id} className="bg-gray-800/50 rounded-lg">
                                    <div className="flex items-center justify-between p-3">
                                        <button onClick={() => setExpandedPathId(expandedPathId === path.id ? null : path.id)} className="font-semibold text-left text-gray-200 hover:text-accent truncate flex-grow pr-2">
                                            {path.name} ({path.articles.length})
                                        </button>
                                        <button onClick={() => deleteLearningPath(path.id, path.name)} className="ml-2 p-1 text-gray-500 hover:text-red-400 flex-shrink-0">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {expandedPathId === path.id && (
                                        <div className="p-3 border-t border-gray-700">
                                            {path.articles.length > 0 ? (
                                            <ul className="space-y-2">
                                                {path.articles.map(article => (
                                                    <li key={article} className="group flex items-center justify-between text-sm">
                                                        <button onClick={() => onTopicClick(article)} className="text-left text-gray-300 hover:text-accent truncate">{article}</button>
                                                        <button onClick={() => removeArticleFromPath(path.id, path.name, article)} className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 flex-shrink-0"><TrashIcon className="w-4 h-4" /></button>
                                                    </li>
                                                ))}
                                            </ul>
                                            ) : <p className="text-xs text-gray-500">{t('article.addToPath.noPaths')}</p>}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </main>
                <footer className="p-4 border-t border-gray-700">
                    <form onSubmit={handleCreatePath} className="flex gap-2">
                        <input type="text" value={newPathName} onChange={e => setNewPathName(e.target.value)} placeholder={t('article.addToPath.newPathPlaceholder')} className="w-full bg-gray-700 border-gray-600 rounded-md text-sm px-2 py-1.5 focus:ring-accent focus:border-accent" />
                        <button type="submit" className="px-3 py-1.5 bg-accent text-accent-contrast rounded-md text-sm font-semibold hover:bg-accent-hover">{t('article.addToPath.create')}</button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default LearningPathsPanel;