// IndexedDB utility to store local attachments, bypassing Firestore's 1MB document size limit.

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SmartTaskFiles', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveFileToLocal = async (id: string, base64Url: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      store.put(base64Url, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('IndexedDB save failed, falling back to localStorage if small', err);
    try {
      localStorage.setItem(`smarttask_file_${id}`, base64Url);
    } catch (e) {
      console.error('localStorage fallback failed too', e);
    }
  }
};

export const getFileFromLocal = async (id: string): Promise<string | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || localStorage.getItem(`smarttask_file_${id}`) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('IndexedDB read failed, falling back to localStorage', err);
    return localStorage.getItem(`smarttask_file_${id}`);
  }
};
