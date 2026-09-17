/** Minimal promise-based IndexedDB wrapper (~80 lines, own code, no deps). */

export function openDb(
  name: string,
  version: number,
  upgrade: (db: IDBDatabase, oldVersion: number) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => upgrade(req.result, req.transaction ? 0 : 0);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
  });
}

export async function putAll<T>(
  db: IDBDatabase,
  store: string,
  values: T[],
): Promise<void> {
  if (values.length === 0) return;
  const tx = db.transaction(store, "readwrite");
  const os = tx.objectStore(store);
  for (const v of values) os.put(v);
  await txDone(tx);
}

export async function putOne<T>(
  db: IDBDatabase,
  store: string,
  value: T,
): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).put(value);
  await txDone(tx);
}

export async function getOne<T>(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllByIndex<T>(
  db: IDBDatabase,
  store: string,
  index: string,
  key: IDBValidKey | IDBKeyRange,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).index(index).getAll(key);
    req.onsuccess = () => resolve((req.result ?? []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOne(
  db: IDBDatabase,
  store: string,
  key: IDBValidKey,
): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).delete(key);
  await txDone(tx);
}

export async function clearStore(
  db: IDBDatabase,
  store: string,
): Promise<void> {
  const tx = db.transaction(store, "readwrite");
  tx.objectStore(store).clear();
  await txDone(tx);
}
