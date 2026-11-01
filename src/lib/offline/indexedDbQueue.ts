export interface OfflineOperation {
  id: string;
  entity: string;
  operation: "insert" | "update" | "delete";
  payload: Record<string, unknown>;
  createdAt: string;
}

const DB_NAME = "streetflood-enterprise-offline";
const STORE = "operations";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed."));
  });
}

export async function enqueueOfflineOperation(operation: OfflineOperation) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).put(operation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function listOfflineOperations() {
  const db = await openDb();
  return new Promise<OfflineOperation[]>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as OfflineOperation[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeOfflineOperation(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const request = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
