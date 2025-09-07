import { Dexie, type Table } from 'dexie';
import { HistoryItem, Bookmark, LearningPath, SessionSnapshot, StoredImage, AppSettings } from '../types';
import { defaultSettings } from '../context/AppContext';

export interface ExportData {
    settings: AppSettings;
    history: HistoryItem[];
    bookmarks: Bookmark[];
    learningPaths: LearningPath[];
    snapshots: SessionSnapshot[];
    images: StoredImage[];
}

class CodexDatabase extends Dexie {
    history!: Table<HistoryItem, number>;
    bookmarks!: Table<Bookmark, number>;
    learningPaths!: Table<LearningPath, number>;
    snapshots!: Table<SessionSnapshot, number>;
    images!: Table<StoredImage, number>;

    constructor() {
        super('CodexDatabase');
        this.version(1).stores({
            history: '++id, name, timestamp',
            bookmarks: '++id, &name, timestamp',
            learningPaths: '++id, &name, timestamp',
            snapshots: '++id, name, timestamp',
            images: '++id, timestamp'
        });
    }
}

export const db = new CodexDatabase();

// History
export const addHistoryItem = (topic: string) => db.history.put({ name: topic, timestamp: Date.now() });
export const getHistory = (): Promise<HistoryItem[]> => db.history.orderBy('timestamp').reverse().limit(100).toArray();
export const deleteHistoryItem = (id: number) => db.history.delete(id);
export const clearHistory = () => db.history.clear();

// Bookmarks
export const addBookmark = (topic: string) => db.bookmarks.put({ name: topic, timestamp: Date.now() });
export const removeBookmark = (topic: string) => db.bookmarks.where('name').equals(topic).delete();
export const getBookmarks = (): Promise<Bookmark[]> => db.bookmarks.orderBy('timestamp').reverse().toArray();
export const isBookmarked = async (topic: string) => (await db.bookmarks.where('name').equals(topic).count()) > 0;
export const clearBookmarks = () => db.bookmarks.clear();

// Learning Paths
export const createLearningPath = (name: string) => db.learningPaths.add({ name, articles: [], timestamp: Date.now() } as LearningPath);
export const getLearningPaths = (): Promise<LearningPath[]> => db.learningPaths.orderBy('timestamp').reverse().toArray();
export const deleteLearningPath = (id: number) => db.learningPaths.delete(id);
export const addArticleToPath = async (pathId: number, articleTopic: string) => {
    const path = await db.learningPaths.get(pathId);
    if (path && !path.articles.includes(articleTopic)) {
        return db.learningPaths.update(pathId, { articles: [...path.articles, articleTopic] });
    }
};
export const removeArticleFromPath = async (pathId: number, articleTopic: string) => {
    const path = await db.learningPaths.get(pathId);
    if (path) {
        return db.learningPaths.update(pathId, { articles: path.articles.filter(a => a !== articleTopic) });
    }
};
export const clearLearningPaths = () => db.learningPaths.clear();

// Snapshots
export const saveSnapshot = (name: string, data: SessionSnapshot['data']) => db.snapshots.add({ name, timestamp: Date.now(), data } as SessionSnapshot);
export const getSnapshots = (): Promise<SessionSnapshot[]> => db.snapshots.orderBy('timestamp').reverse().toArray();
export const deleteSnapshot = (id: number) => db.snapshots.delete(id);
export const getSnapshot = (id: number): Promise<SessionSnapshot | undefined> => db.snapshots.get(id);
export const clearSnapshots = () => db.snapshots.clear();

// Image Library Functions
export const addImage = (prompt: string, imageData: string): Promise<number> => {
    return db.images.add({ prompt, imageData, timestamp: Date.now() } as StoredImage);
};
export const getAllImages = (): Promise<StoredImage[]> => {
    return db.images.orderBy('timestamp').reverse().toArray();
};
export const deleteImage = (id: number): Promise<void> => {
    return db.images.delete(id);
};
export const clearImages = (): Promise<void> => {
    return db.images.clear();
};

// Data Import/Export
export const exportAllData = async (): Promise<ExportData> => {
    const settings = JSON.parse(localStorage.getItem('codex-settings') || JSON.stringify(defaultSettings));
    const history = await getHistory();
    const bookmarks = await getBookmarks();
    const learningPaths = await getLearningPaths();
    const snapshots = await getSnapshots();
    const images = await getAllImages();
    return { settings, history, bookmarks, learningPaths, snapshots, images };
};

export const importAllData = async (data: ExportData) => {
    // Validate data structure
    if (!data.settings || !Array.isArray(data.history) || !Array.isArray(data.bookmarks) || !Array.isArray(data.learningPaths) || !Array.isArray(data.snapshots) || !Array.isArray(data.images)) {
        throw new Error("Invalid backup file structure.");
    }

    localStorage.setItem('codex-settings', JSON.stringify(data.settings));

    // FIX: Pass tables as an array to the transaction method.
    await db.transaction('rw', [db.history, db.bookmarks, db.learningPaths, db.snapshots, db.images], async () => {
        await clearHistory();
        await clearBookmarks();
        await clearLearningPaths();
        await clearSnapshots();
        await clearImages();
        
        // Remove IDs to allow autoincrement
        await db.history.bulkAdd(data.history.map(({ id, ...rest }) => rest));
        await db.bookmarks.bulkAdd(data.bookmarks.map(({ id, ...rest }) => rest));
        await db.learningPaths.bulkAdd(data.learningPaths.map(({ id, ...rest }) => rest));
        await db.snapshots.bulkAdd(data.snapshots.map(({ id, ...rest }) => rest));
        await db.images.bulkAdd(data.images.map(({ id, ...rest }) => rest));
    });
};
