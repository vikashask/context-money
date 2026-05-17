// Storage utility layer with versioning, migration, and fallback
const STORAGE_VERSION = 1;
const STORAGE_META_KEY = "contextmoney-storage-meta";
const MAX_STORAGE_BYTES = 5 * 1024 * 1024; // ~5MB localStorage limit
const WARN_THRESHOLD = 0.8; // Warn at 80% usage

// In-memory fallback when localStorage is unavailable
let memoryStore = {};
let useMemoryFallback = false;

function isLocalStorageAvailable() {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, "test");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

// Initialize — check availability, run migrations
export function initStorage() {
  if (!isLocalStorageAvailable()) {
    useMemoryFallback = true;
    console.warn(
      "[Storage] localStorage unavailable — using in-memory fallback. Data will not persist.",
    );
    return;
  }

  const meta = getItem(STORAGE_META_KEY);
  const currentVersion = meta?.version || 0;

  if (currentVersion < STORAGE_VERSION) {
    runMigrations(currentVersion, STORAGE_VERSION);
    setItem(STORAGE_META_KEY, {
      version: STORAGE_VERSION,
      migratedAt: new Date().toISOString(),
    });
  }
}

// Migration runner
function runMigrations(fromVersion, toVersion) {
  console.log(`[Storage] Migrating from v${fromVersion} to v${toVersion}`);

  // Migration 0 → 1: Initial schema, mark existing data
  if (fromVersion < 1) {
    // Nothing to migrate for v1, just stamp the version
    console.log("[Storage] Migration v0→v1: Initial schema stamped");
  }

  // Future migrations go here:
  // if (fromVersion < 2) { ... }
}

// Safe JSON get
export function getItem(key) {
  try {
    const raw = useMemoryFallback
      ? memoryStore[key]
      : localStorage.getItem(key);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw);
  } catch {
    console.warn(`[Storage] Failed to parse key "${key}"`);
    return null;
  }
}

// Safe JSON set with quota handling
export function setItem(key, value) {
  try {
    const serialized = JSON.stringify(value);
    if (useMemoryFallback) {
      memoryStore[key] = serialized;
    } else {
      localStorage.setItem(key, serialized);
    }
    return true;
  } catch (e) {
    if (e?.name === "QuotaExceededError" || e?.code === 22) {
      console.error("[Storage] localStorage quota exceeded");
      return false;
    }
    console.error("[Storage] Failed to set item:", e);
    return false;
  }
}

// Remove item
export function removeItem(key) {
  try {
    if (useMemoryFallback) {
      delete memoryStore[key];
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Silently fail
  }
}

// Get current storage usage info
export function getStorageUsage() {
  if (useMemoryFallback) {
    const total = Object.values(memoryStore).reduce(
      (s, v) => s + (v?.length || 0),
      0,
    );
    return {
      usedBytes: total * 2,
      totalBytes: MAX_STORAGE_BYTES,
      percentage: ((total * 2) / MAX_STORAGE_BYTES) * 100,
      isNearLimit: false,
    };
  }

  let usedBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      usedBytes += (key.length + (value?.length || 0)) * 2; // UTF-16
    }
  } catch {
    // Can't calculate
  }

  const percentage = (usedBytes / MAX_STORAGE_BYTES) * 100;
  return {
    usedBytes,
    totalBytes: MAX_STORAGE_BYTES,
    percentage,
    isNearLimit: percentage >= WARN_THRESHOLD * 100,
  };
}

// Format bytes for display
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Export all app data from Dexie + localStorage settings
export async function exportAllData(db) {
  const contexts = await db.contexts.toArray();
  const expenses = await db.expenses.toArray();
  const categories = await db.categories.toArray();
  const settings = getItem("contextmoney-settings");

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    storageVersion: STORAGE_VERSION,
    contexts,
    expenses,
    categories,
    settings,
  };
}

// Validate import data schema
export function validateImportData(data) {
  if (!data || typeof data !== "object")
    return { valid: false, error: "Invalid file format" };
  if (data.version !== "1.0")
    return { valid: false, error: `Unsupported version: ${data.version}` };
  if (!Array.isArray(data.contexts))
    return { valid: false, error: "Missing or invalid contexts data" };
  if (!Array.isArray(data.expenses))
    return { valid: false, error: "Missing or invalid expenses data" };
  if (!Array.isArray(data.categories))
    return { valid: false, error: "Missing or invalid categories data" };

  // Validate each expense has required fields
  for (const expense of data.expenses) {
    if (typeof expense.amount !== "number" || expense.amount < 0) {
      return { valid: false, error: "Invalid expense amount found" };
    }
    if (!expense.category || typeof expense.category !== "string") {
      return { valid: false, error: "Invalid expense category found" };
    }
  }

  // Validate contexts
  for (const ctx of data.contexts) {
    if (!ctx.name || typeof ctx.name !== "string") {
      return { valid: false, error: "Invalid context name found" };
    }
  }

  return { valid: true, error: null };
}

// Import data with validation
export async function importData(db, data, setActiveContextId) {
  const validation = validateImportData(data);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  await db.contexts.clear();
  await db.expenses.clear();
  await db.categories.clear();

  await db.contexts.bulkAdd(data.contexts);
  await db.expenses.bulkAdd(data.expenses);
  await db.categories.bulkAdd(data.categories);

  if (data.contexts.length > 0) {
    setActiveContextId(data.contexts[0].id);
  }

  return {
    contextsCount: data.contexts.length,
    expensesCount: data.expenses.length,
  };
}

// Clear all data
export async function clearAllData(db) {
  await db.contexts.clear();
  await db.expenses.clear();
  await db.categories.clear();
  if (!useMemoryFallback) {
    localStorage.clear();
  } else {
    memoryStore = {};
  }
}

export { STORAGE_VERSION, useMemoryFallback };
