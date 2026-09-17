/** Minimal promise-based IndexedDB wrapper (own code, no deps). */

export type UpgradeFn = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number,
  tx: IDBTransaction | null,
) => void;

export function openDb(
  name: string,
  version: number,
  upgrade: UpgradeFn,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = (e) => {
      const evt = e as IDBVersionChangeEvent;
      upgrade(
        req.result,
        evt.oldVersion,
        evt.newVersion ?? version,
        req.transaction,
      );
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(
        new Error(
          "Close other Lift Log tabs to finish the upgrade, then reload.",
        ),
      );
  });
}

/**
 * Run fn inside a single transaction spanning storeNames.
 * The transaction commits atomically: either all queued requests apply
 * or (on error/abort/crash) none do.
 */
export function runTx(
  db: IDBDatabase,
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("transaction aborted"));
    try {
      fn(tx);
    } catch (err) {
      try {
        tx.abort();
      } catch {
        /* abort itself failed; onabort handler will reject */
      }
      reject(err);
    }
  });
}

export async function putAll<T>(
  db: IDBDatabase,
  store: string,
  values: T[],
): Promise<void> {
  if (values.length === 0) return;
  await runTx(db, store, "readwrite", (tx) => {
    const os = tx.objectStore(store);
    for (const v of values) os.put(v);
  });
}

export async function putOne<T>(
  db: IDBDatabase,
  store: string,
  value: T,
): Promise<void> {
  await runTx(db, store, "readwrite", (tx) => {
    tx.objectStore(store).put(value);
  });
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
  await runTx(db, store, "readwrite", (tx) => {
    tx.objectStore(store).delete(key);
  });
}

export async function clearStore(
  db: IDBDatabase,
  store: string,
): Promise<void> {
  await runTx(db, store, "readwrite", (tx) => {
    tx.objectStore(store).clear();
  });
}
