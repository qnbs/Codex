import { StoredImage } from '../types';

const DB_NAME = 'CodexDB';
const DB_VERSION = 1;
const STORE_NAME = 'imageLibrary';

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const addImage = async (image: StoredImage): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(image);

    request.onsuccess = () => resolve();
    request.onerror = () => {
        console.error("Error adding image:", request.error);
        reject(request.error);
    };
  });
};

export const getAllImages = async (): Promise<StoredImage[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        // IndexedDB's getAll() does not guarantee order, so we sort by timestamp descending.
        resolve(request.result.sort((a, b) => b.timestamp - a.timestamp));
    };
    request.onerror = () => {
        console.error("Error getting all images:", request.error);
        reject(request.error);
    };
  });
};

export const deleteImage = async (id: number): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Error deleting image:", request.error);
            reject(request.error);
        };
    });
};

export const clearImages = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => {
            console.error("Error clearing images:", request.error);
            reject(request.error);
        };
    });
};

export const bulkAddImages = async (images: StoredImage[]): Promise<void> => {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const promises = images.map(image => {
        return new Promise<void>((resolve, reject) => {
            const request = store.add(image);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });

    await Promise.all(promises);
};
