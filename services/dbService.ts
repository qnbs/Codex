import { StoredImage, AppSettings, LearningPath, SessionSnapshot } from '../types';

const DB_NAME = 'CodexDB';
const DB_VERSION = 2;

const STORES = {
    IMAGE_LIBRARY: 'imageLibrary',
    SETTINGS: 'settings',
    HISTORY: 'history',
    BOOKMARKS: 'bookmarks',
    LEARNING_PATHS: 'learningPaths',
    SNAPSHOTS: 'sessionSnapshots',
};

let db: IDBDatabase;

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", request.error);
      reject("IndexedDB error");
    };

    request.onsuccess = (event) => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      if (oldVersion < 1) { // Fresh install
        db.createObjectStore(STORES.IMAGE_LIBRARY, { keyPath: 'id' });
      }
      if (oldVersion < 2) { // Migration to v2 (or fresh install)
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
            db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
            const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'topic' });
            historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.BOOKMARKS)) {
            db.createObjectStore(STORES.BOOKMARKS, { keyPath: 'topic' });
        }
        if (!db.objectStoreNames.contains(STORES.LEARNING_PATHS)) {
            db.createObjectStore(STORES.LEARNING_PATHS, { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
            db.createObjectStore(STORES.SNAPSHOTS, { keyPath: 'name' });
        }
      }
    };
  });
};

const performTransaction = <T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest, onComplete?: () => void): Promise<T> => {
    return initDB().then(db => new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        transaction.oncomplete = onComplete;
        transaction.onerror = () => {
            console.error(`Error in transaction for store ${storeName}:`, transaction.error);
            reject(transaction.error);
        };
        const store = transaction.objectStore(storeName);
        const request = action(store);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error); // Note: transaction.onerror will likely catch this first.
    }));
};

// --- Settings ---
export const getSettings = async <T>(defaultValue: T): Promise<T> => {
    try {
        const settingsWrapper = await performTransaction<{ id: string, value: T }>(STORES.SETTINGS, 'readonly', store => store.get('default'));
        return settingsWrapper ? settingsWrapper.value : defaultValue;
    } catch (e) {
        console.error("Failed to get settings, returning default.", e);
        return defaultValue;
    }
};
export const saveSettings = <T>(settings: T): Promise<void> => {
    return performTransaction<void>(STORES.SETTINGS, 'readwrite', store => store.put({ id: 'default', value: settings }));
};

// --- History ---
export const getHistory = async (): Promise<string[]> => {
    const items = await performTransaction<{ topic: string, timestamp: number }[]>(STORES.HISTORY, 'readonly', store => store.index('timestamp').getAll());
    return items.sort((a, b) => b.timestamp - a.timestamp).map(item => item.topic);
};

export const addHistoryItem = async (topic: string): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORES.HISTORY, 'readwrite');
    const store = transaction.objectStore(STORES.HISTORY);
    store.put({ topic, timestamp: Date.now() }); // put() handles insert or update, perfect for history

    // Trim history to 100 items
    const countRequest = store.count();
    countRequest.onsuccess = () => {
        if (countRequest.result > 100) {
            const index = store.index('timestamp');
            index.openCursor(null, 'next').onsuccess = (event) => {
                const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                if(cursor) {
                    cursor.delete();
                }
            };
        }
    };
};
export const deleteHistoryItem = (topic: string): Promise<void> => performTransaction(STORES.HISTORY, 'readwrite', store => store.delete(topic));
export const clearHistory = (): Promise<void> => performTransaction(STORES.HISTORY, 'readwrite', store => store.clear());

// --- Bookmarks ---
export const getBookmarks = async (): Promise<string[]> => {
    const items = await performTransaction<{ topic: string }[]>(STORES.BOOKMARKS, 'readonly', store => store.getAll());
    return items.map(item => item.topic).reverse(); // Newest first
};
export const addBookmark = (topic: string): Promise<void> => performTransaction(STORES.BOOKMARKS, 'readwrite', store => store.add({ topic }));
export const deleteBookmark = (topic: string): Promise<void> => performTransaction(STORES.BOOKMARKS, 'readwrite', store => store.delete(topic));
export const clearBookmarks = (): Promise<void> => performTransaction(STORES.BOOKMARKS, 'readwrite', store => store.clear());

// --- Generic Functions for Complex Objects (Learning Paths, Snapshots) ---
export const getAllData = <T>(storeName: string): Promise<T[]> => performTransaction<T[]>(storeName, 'readonly', store => store.getAll());
export const saveData = async <T>(storeName: string, data: T[]): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.clear();
    for (const item of data) {
        store.put(item);
    }
};
export const clearData = (storeName: string): Promise<void> => performTransaction(storeName, 'readwrite', store => store.clear());
export const deleteDataItem = (storeName: string, key: string): Promise<void> => performTransaction(storeName, 'readwrite', store => store.delete(key));

export const getLearningPaths = (): Promise<LearningPath[]> => getAllData<LearningPath>(STORES.LEARNING_PATHS);
export const saveLearningPaths = (paths: LearningPath[]): Promise<void> => saveData(STORES.LEARNING_PATHS, paths);
export const clearLearningPaths = (): Promise<void> => clearData(STORES.LEARNING_PATHS);
export const deleteLearningPath = (name: string): Promise<void> => deleteDataItem(STORES.LEARNING_PATHS, name);

export const getSessionSnapshots = (): Promise<SessionSnapshot[]> => getAllData<SessionSnapshot>(STORES.SNAPSHOTS);
export const saveSessionSnapshots = (snapshots: SessionSnapshot[]): Promise<void> => saveData(STORES.SNAPSHOTS, snapshots);
export const clearSessionSnapshots = (): Promise<void> => clearData(STORES.SNAPSHOTS);
export const deleteSessionSnapshot = (name: string): Promise<void> => deleteDataItem(STORES.SNAPSHOTS, name);


// --- Image Library ---
export const addImage = (image: StoredImage): Promise<void> => performTransaction(STORES.IMAGE_LIBRARY, 'readwrite', store => store.add(image));
export const getAllImages = async (): Promise<StoredImage[]> => {
    const images = await performTransaction<StoredImage[]>(STORES.IMAGE_LIBRARY, 'readonly', store => store.getAll());
    return images.sort((a, b) => b.timestamp - a.timestamp);
};
export const deleteImage = (id: number): Promise<void> => performTransaction(STORES.IMAGE_LIBRARY, 'readwrite', store => store.delete(id));
export const clearImages = (): Promise<void> => performTransaction(STORES.IMAGE_LIBRARY, 'readwrite', store => store.clear());
export const bulkAddImages = async (images: StoredImage[]): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORES.IMAGE_LIBRARY, 'readwrite');
    const store = transaction.objectStore(STORES.IMAGE_LIBRARY);
    images.forEach(image => store.add(image));
};
