import React from 'react';
import { CloseIcon, TrashIcon } from './IconComponents';
import { useLocalization } from '../context/LocalizationContext';

interface ArticleLibraryProps {
    title: string;
    items: { id: string | number, name: string }[];
    onClose: () => void;
    onItemClick: (name: string) => void;
    onItemDelete?: (id: string | number) => void;
    onClearAll?: () => void;
    emptyMessage: string;
}

const ArticleLibrary: React.FC<ArticleLibraryProps> = ({
    title,
    items,
    onClose,
    onItemClick,
    onItemDelete,
    onClearAll,
    emptyMessage
}) => {
    const { t } = useLocalization();
    return (
        <div className="fixed top-0 left-0 h-full w-full max-w-sm bg-gray-900/80 backdrop-blur-sm shadow-2xl z-40 transform transition-transform duration-300 ease-in-out">
            <div className="flex flex-col h-full border-r border-gray-700">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label={`Close ${title}`}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-grow">
                    {items.length === 0 ? (
                        <p className="text-gray-500 text-center mt-8">{emptyMessage}</p>
                    ) : (
                        <ul className="space-y-2">
                            {items.map(item => (
                                <li key={item.id} className="group flex items-center justify-between bg-gray-800/50 p-2 rounded-md hover:bg-gray-800 transition-colors">
                                    <button onClick={() => onItemClick(item.name)} className="text-left text-gray-300 hover:text-accent truncate flex-grow pr-2">
                                        {item.name}
                                    </button>
                                    {onItemDelete && (
                                        <button onClick={() => onItemDelete(item.id)} className="ml-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" title={t('panels.deleteEntry')}>
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {onClearAll && items.length > 0 && (
                    <div className="p-4 border-t border-gray-700">
                        <button onClick={onClearAll} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 text-red-300 border border-red-500/30 rounded-lg hover:bg-red-600/40 transition-colors">
                            <TrashIcon className="w-5 h-5" /> {t('panels.clearAll', { title })}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArticleLibrary;