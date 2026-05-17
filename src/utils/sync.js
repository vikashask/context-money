import { db } from "../db";

/**
 * Export all data as a sync-ready JSON blob
 */
export async function exportSyncData() {
  const contexts = await db.contexts.toArray();
  const expenses = await db.expenses.toArray();
  const categories = await db.categories.toArray();

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    data: { contexts, expenses, categories },
  };
}

/**
 * Import sync data with merge/conflict resolution
 * Strategy: newer wins by createdAt, expenses merged by unique key (contextId+amount+date+category+note)
 */
export async function importSyncData(jsonData) {
  const incoming =
    typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

  if (!incoming?.data) throw new Error("Invalid sync data format");

  const stats = {
    contextsAdded: 0,
    expensesAdded: 0,
    expensesMerged: 0,
    categoriesAdded: 0,
  };

  // Merge categories
  const existingCats = await db.categories.toArray();
  const existingCatNames = new Set(
    existingCats.map((c) => c.name.toLowerCase()),
  );
  for (const cat of incoming.data.categories || []) {
    if (!existingCatNames.has(cat.name.toLowerCase())) {
      const { id, ...rest } = cat;
      await db.categories.add(rest);
      stats.categoriesAdded++;
    }
  }

  // Merge contexts by name
  const existingContexts = await db.contexts.toArray();
  const contextMap = new Map(); // old id → new id
  for (const ctx of incoming.data.contexts || []) {
    const existing = existingContexts.find(
      (c) => c.name.toLowerCase() === ctx.name.toLowerCase(),
    );
    if (existing) {
      contextMap.set(ctx.id, existing.id);
    } else {
      const { id, ...rest } = ctx;
      const newId = await db.contexts.add(rest);
      contextMap.set(ctx.id, newId);
      stats.contextsAdded++;
    }
  }

  // Merge expenses — use fingerprint to avoid duplicates
  const existingExpenses = await db.expenses.toArray();
  const fingerprints = new Set(
    existingExpenses.map((e) => expenseFingerprint(e)),
  );

  for (const exp of incoming.data.expenses || []) {
    const mappedContextId = contextMap.get(exp.contextId) || exp.contextId;
    const merged = { ...exp, contextId: mappedContextId };
    const fp = expenseFingerprint(merged);

    if (fingerprints.has(fp)) {
      stats.expensesMerged++;
    } else {
      const { id, ...rest } = merged;
      await db.expenses.add(rest);
      fingerprints.add(fp);
      stats.expensesAdded++;
    }
  }

  return stats;
}

function expenseFingerprint(e) {
  return `${e.contextId}|${e.amount}|${e.date}|${e.category}|${(e.note || "").trim().toLowerCase()}`;
}

/**
 * Generate a persistent device ID
 */
function getDeviceId() {
  let id = localStorage.getItem("contextmoney-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("contextmoney-device-id", id);
  }
  return id;
}

// ---- GitHub Gist Sync ----

const GIST_FILENAME = "contextmoney-sync.json";

/**
 * Save data to a GitHub Gist (create or update)
 */
export async function saveToGist(token, gistId = null) {
  const syncData = await exportSyncData();
  const body = {
    description: "ContextMoney Sync Data",
    public: false,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(syncData, null, 2),
      },
    },
  };

  const url = gistId
    ? `https://api.github.com/gists/${encodeURIComponent(gistId)}`
    : "https://api.github.com/gists";

  const res = await fetch(url, {
    method: gistId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Gist sync failed (${res.status})`);
  }

  const gist = await res.json();
  return { gistId: gist.id, url: gist.html_url };
}

/**
 * Load data from a GitHub Gist and merge
 */
export async function loadFromGist(token, gistId) {
  const res = await fetch(
    `https://api.github.com/gists/${encodeURIComponent(gistId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch gist (${res.status})`);
  }

  const gist = await res.json();
  const file = gist.files[GIST_FILENAME];
  if (!file) throw new Error("Sync file not found in gist");

  const data = JSON.parse(file.content);
  return importSyncData(data);
}
