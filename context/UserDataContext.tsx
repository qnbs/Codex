import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import * as db from '../services/db';
import { HistoryItem, Bookmark, LearningPath, SessionSnapshot, UserDataContextType, SessionSnapshot as SnapshotData } from '../types';
import { useNotification } from './NotificationContext';
import { useLocalization } from './LocalizationContext';

const UserDataContext = createContext<UserDataContextType | null>(null);

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
    const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
    const [isBookmarked, setIsBookmarked] = useState(false);

    const { addNotification } = useNotification();
    const { t } = useLocalization();

    const refreshHistory = useCallback(async () => setHistory(await db.getHistory()), []);
    const refreshBookmarks = useCallback(async () => setBookmarks(await db.getBookmarks()), []);
    const refreshLearningPaths = useCallback(async () => setLearningPaths(await db.getLearningPaths()), []);
    const refreshSnapshots = useCallback(async () => setSnapshots(await db.getSnapshots()), []);
    
    const refreshAll = useCallback(async () => {
        await Promise.all([
            refreshHistory(),
            refreshBookmarks(),
            refreshLearningPaths(),
            refreshSnapshots()
        ]);
    }, [refreshHistory, refreshBookmarks, refreshLearningPaths, refreshSnapshots]);
    
    useEffect(() => {
        refreshAll();
    }, [refreshAll]);
    
    const checkIfBookmarked = useCallback(async (topic: string) => {
        if (topic) setIsBookmarked(await db.isBookmarked(topic));
        else setIsBookmarked(false);
    }, []);

    // --- Actions ---

    const addHistory = useCallback(async (topic: string) => {
        await db.addHistoryItem(topic);
        await refreshHistory();
    }, [refreshHistory]);

    const deleteHistoryItem = useCallback(async (id: number) => {
        await db.deleteHistoryItem(id);
        await refreshHistory();
    }, [refreshHistory]);

    const clearHistory = useCallback(async () => {
        if (window.confirm(t('prompts.confirmClearAll', { name: t('panels.history.title') }))) {
            await db.clearHistory();
            await refreshHistory();
            addNotification(t('notifications.clearedAll', { name: t('panels.history.title') }), 'info');
        }
    }, [refreshHistory, addNotification, t]);

    const toggleBookmark = useCallback(async (topic: string) => {
        if (!topic) return;
        const currentlyBookmarked = await db.isBookmarked(topic);
        if (currentlyBookmarked) {
            await db.removeBookmark(topic);
            addNotification(t('notifications.bookmarkRemoved', { topic }), 'info');
        } else {
            await db.addBookmark(topic);
            addNotification(t('notifications.bookmarkAdded', { topic }), 'success');
        }
        await refreshBookmarks();
        await checkIfBookmarked(topic);
    }, [refreshBookmarks, checkIfBookmarked, addNotification, t]);

    const clearBookmarks = useCallback(async () => {
        if (window.confirm(t('prompts.confirmClearAll', { name: t('panels.bookmarks.title') }))) {
            await db.clearBookmarks();
            await refreshBookmarks();
            addNotification(t('notifications.clearedAll', { name: t('panels.bookmarks.title') }), 'info');
        }
    }, [refreshBookmarks, addNotification, t]);
    
    const createLearningPath = useCallback(async (name: string) => {
        await db.createLearningPath(name);
        await refreshLearningPaths();
        addNotification(t('notifications.pathCreated', { pathName: name }), 'success');
    }, [refreshLearningPaths, addNotification, t]);

    const deleteLearningPath = useCallback(async (id: number, name: string) => {
        if (window.confirm(t('prompts.confirmDeletePath', { pathName: name }))) {
            await db.deleteLearningPath(id);
            await refreshLearningPaths();
            addNotification(t('notifications.pathDeleted', { pathName: name }), 'info');
        }
    }, [refreshLearningPaths, addNotification, t]);
    
    const addArticleToPath = useCallback(async (pathId: number, pathName: string, articleTopic: string) => {
        await db.addArticleToPath(pathId, articleTopic);
        await refreshLearningPaths();
        addNotification(t('notifications.articleAddedToPath', { articleTitle: articleTopic, pathName: pathName }), 'success');
    }, [refreshLearningPaths, addNotification, t]);
    
    const removeArticleFromPath = useCallback(async (pathId: number, pathName: string, articleTopic: string) => {
        await db.removeArticleFromPath(pathId, articleTopic);
        await refreshLearningPaths();
        addNotification(t('notifications.articleRemovedFromPath', { articleTitle: articleTopic, pathName }), 'info');
    }, [refreshLearningPaths, addNotification, t]);
    
    const clearLearningPaths = useCallback(async () => {
        if (window.confirm(t('prompts.confirmClearAll', { name: t('panels.learningPaths.title') }))) {
            await db.clearLearningPaths();
            await refreshLearningPaths();
            addNotification(t('notifications.clearedAll', { name: t('panels.learningPaths.title') }), 'info');
        }
    }, [refreshLearningPaths, addNotification, t]);
    
    const saveSnapshot = useCallback(async (name: string, data: SnapshotData['data']) => {
        await db.saveSnapshot(name, data);
        await refreshSnapshots();
        addNotification(t('notifications.snapshotSaved', { name: name }), 'success');
    }, [refreshSnapshots, addNotification, t]);

    const getSnapshot = useCallback(async (id: number) => {
        return await db.getSnapshot(id);
    }, []);

    const deleteSnapshot = useCallback(async (id: number, name: string) => {
        if (window.confirm(t('prompts.confirmDeleteSnapshot', { name }))) {
            await db.deleteSnapshot(id);
            await refreshSnapshots();
            addNotification(t('notifications.snapshotDeleted', { name }), 'info');
        }
    }, [refreshSnapshots, addNotification, t]);

    const clearSnapshots = useCallback(async () => {
        if (window.confirm(t('prompts.confirmClearAll', { name: t('panels.snapshots.title') }))) {
            await db.clearSnapshots();
            await refreshSnapshots();
            addNotification(t('notifications.clearedAll', { name: t('panels.snapshots.title') }), 'info');
        }
    }, [refreshSnapshots, addNotification, t]);
    
    const value = {
        history,
        bookmarks,
        learningPaths,
        snapshots,
        isBookmarked,
        addHistory,
        deleteHistoryItem,
        clearHistory,
        toggleBookmark,
        checkIfBookmarked,
        clearBookmarks,
        createLearningPath,
        deleteLearningPath,
        addArticleToPath,
        removeArticleFromPath,
        clearLearningPaths,
        saveSnapshot,
        getSnapshot,
        deleteSnapshot,
        clearSnapshots,
        refreshAll,
    };

    return (
        <UserDataContext.Provider value={value}>
            {children}
        </UserDataContext.Provider>
    );
};

export const useUserData = (): UserDataContextType => {
    const context = useContext(UserDataContext);
    if (!context) {
        throw new Error('useUserData must be used within a UserDataProvider');
    }
    return context;
};