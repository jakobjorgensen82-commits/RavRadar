const DB_NAME = "ravradar-userdata";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";
const SNAPSHOT_KEY = "latest";
const KEY_PREFIX = "ravradar-";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB kunne ikke åbnes."));
  });
}

function collectRavRadarStorage() {
  const values = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(KEY_PREFIX)) values[key] = localStorage.getItem(key);
  }
  return values;
}

function runTransaction(db, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Brugerdata kunne ikke gemmes."));
  });
}

async function readSnapshot(db) {
  if (!db) return null;
  return runTransaction(db, "readonly", store => store.get(SNAPSHOT_KEY));
}

async function writeSnapshot(db) {
  if (!db) return;
  const snapshot = {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    values: collectRavRadarStorage()
  };
  await runTransaction(db, "readwrite", store => store.put(snapshot, SNAPSHOT_KEY));
}

function restoreMissingValues(snapshot) {
  if (!snapshot?.values || typeof snapshot.values !== "object") return 0;
  let restored = 0;
  for (const [key, value] of Object.entries(snapshot.values)) {
    if (!key.startsWith(KEY_PREFIX) || value == null || localStorage.getItem(key) !== null) continue;
    localStorage.setItem(key, value);
    restored += 1;
  }
  return restored;
}

export async function initializeUserDataSafety() {
  let db = null;
  try {
    db = await openDatabase();
    const previousSnapshot = await readSnapshot(db);
    const restored = restoreMissingValues(previousSnapshot);
    await writeSnapshot(db);

    let pending = null;
    const scheduleBackup = () => {
      clearTimeout(pending);
      pending = setTimeout(() => writeSnapshot(db).catch(error => console.warn("RavRadar-backup fejlede", error)), 250);
    };

    addEventListener("storage", scheduleBackup);
    addEventListener("pagehide", () => writeSnapshot(db).catch(() => {}));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") writeSnapshot(db).catch(() => {});
    });
    setInterval(scheduleBackup, 15000);

    return { available: Boolean(db), restored };
  } catch (error) {
    console.warn("RavRadar kunne ikke aktivere lokal sikkerhedskopi", error);
    return { available: false, restored: 0 };
  }
}
