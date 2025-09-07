import React, { useState, useEffect, useCallback } from 'react';
import { StoredImage } from '../types';
import { getAllImages, deleteImage, clearImages } from '../services/db';
import { CloseIcon, TrashIcon, DownloadIcon, ClipboardCopyIcon, ImageIcon } from './IconComponents';
import LoadingSpinner from './LoadingSpinner';
import { useLocalization } from '../context/LocalizationContext';
import { useNotification } from '../context/NotificationContext';

interface ImageLibraryProps {
    isOpen: boolean;
    onClose: () => void;
}

const ImageCard: React.FC<{ image: StoredImage, onDelete: (id: number) => void, t: (key: string) => string }> = ({ image, onDelete, t }) => {
    const { addNotification } = useNotification();
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(image.prompt);
        setIsCopied(true);
        addNotification(t('notifications.promptCopied'), 'success');
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleDelete = () => {
        if (window.confirm(t('prompts.confirmDeleteImage'))) {
            onDelete(image.id);
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = image.imageData;
        link.download = `codex-image-${image.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addNotification(t('notifications.imageDownloaded'), 'success');
    };

    return (
        <div className="group relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-md">
            <img src={image.imageData} alt={image.prompt} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                <div className="flex justify-end gap-2">
                    <button onClick={handleDownload} title={t('imageLibrary.download')} className="p-2 bg-black/50 rounded-full text-white hover:bg-accent transition-colors"><DownloadIcon className="w-5 h-5" /></button>
                    <button onClick={handleCopy} title={t('imageLibrary.copyPrompt')} className="p-2 bg-black/50 rounded-full text-white hover:bg-accent transition-colors"><ClipboardCopyIcon className="w-5 h-5" isCopied={isCopied} /></button>
                    <button onClick={handleDelete} title={t('imageLibrary.delete')} className="p-2 bg-black/50 rounded-full text-white hover:bg-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                </div>
                <div className="text-white text-xs bg-black/50 p-1.5 rounded-md truncate">
                    <p className="font-mono truncate" title={image.prompt}>{image.prompt}</p>
                    <p className="text-gray-400 mt-1">{new Date(image.timestamp).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

const ImageLibrary: React.FC<ImageLibraryProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();
    const { addNotification } = useNotification();
    const [images, setImages] = useState<StoredImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchImages = useCallback(async () => {
        setIsLoading(true);
        try {
            const storedImages = await getAllImages();
            setImages(storedImages);
        } catch (error) {
            console.error("Failed to fetch images from DB:", error);
            addNotification(t('errors.fetchImagesFailed'), 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addNotification, t]);

    useEffect(() => {
        if (isOpen) {
            fetchImages();
        }
    }, [isOpen, fetchImages]);

    const handleDeleteImage = async (id: number) => {
        try {
            await deleteImage(id);
            setImages(prev => prev.filter(img => img.id !== id));
            addNotification(t('notifications.imageDeleted'), 'info');
        } catch (error) {
            console.error("Failed to delete image:", error);
            addNotification(t('errors.deleteImageFailed'), 'error');
        }
    };
    
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 h-full w-full max-w-5xl mx-auto bg-gray-900/90 backdrop-blur-sm z-40 flex flex-col" role="dialog" aria-modal="true">
            <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <ImageIcon className="w-7 h-7 text-accent" />
                    <h2 className="text-2xl font-bold text-white">{t('imageLibrary.title')}</h2>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700" aria-label={t('common.close')}>
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>
            <main className="flex-grow p-4 md:p-6 overflow-y-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <LoadingSpinner text={t('imageLibrary.loading')} />
                    </div>
                ) : images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <ImageIcon className="w-24 h-24 mb-4" />
                        <h3 className="text-xl font-semibold">{t('imageLibrary.empty.title')}</h3>
                        <p className="max-w-sm mt-2">{t('imageLibrary.empty.description')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {images.map(img => (
                            <ImageCard key={img.id} image={img} onDelete={handleDeleteImage} t={t} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ImageLibrary;