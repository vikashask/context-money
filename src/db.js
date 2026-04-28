import Dexie from 'dexie';

export const db = new Dexie('ContextMoneyDB');

db.version(1).stores({
  contexts: '++id, name, isArchived',
  expenses: '++id, contextId, category, date, createdAt',
  categories: '++id, name',
});

export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: '🍕', color: '#ef4444', keywords: ['swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'lunch', 'dinner', 'breakfast', 'grocery'] },
  { name: 'Rent', icon: '🏠', color: '#8b5cf6', keywords: ['rent', 'housing', 'apartment'] },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', keywords: ['uber', 'ola', 'metro', 'bus', 'fuel', 'petrol', 'taxi', 'auto'] },
  { name: 'Shopping', icon: '🛒', color: '#f59e0b', keywords: ['amazon', 'flipkart', 'shopping', 'clothes'] },
  { name: 'Utilities', icon: '💡', color: '#10b981', keywords: ['electricity', 'water', 'gas', 'wifi', 'internet', 'phone', 'mobile', 'recharge'] },
  { name: 'Entertainment', icon: '🎬', color: '#ec4899', keywords: ['netflix', 'movie', 'spotify', 'subscription', 'game'] },
  { name: 'Health', icon: '🏥', color: '#14b8a6', keywords: ['medicine', 'doctor', 'hospital', 'pharmacy', 'gym', 'health'] },
  { name: 'Education', icon: '📚', color: '#6366f1', keywords: ['course', 'book', 'udemy', 'learning'] },
  { name: 'Travel', icon: '✈️', color: '#0ea5e9', keywords: ['flight', 'hotel', 'trip', 'travel', 'vacation'] },
  { name: 'Savings', icon: '💰', color: '#22c55e', keywords: ['invest', 'mutual fund', 'sip', 'fd', 'savings'] },
  { name: 'Other', icon: '📦', color: '#6b7280', keywords: [] },
];

// Default monthly expenses for city living — user can review and customize
export const DEFAULT_EXPENSES_TEMPLATE = [
  { category: 'Rent', amount: 15000, note: 'Monthly rent', isRecurring: true },
  { category: 'Food', amount: 6000, note: 'Groceries & cooking', isRecurring: true },
  { category: 'Food', amount: 3000, note: 'Eating out & ordering', isRecurring: false },
  { category: 'Transport', amount: 2500, note: 'Daily commute (metro/bus/auto)', isRecurring: true },
  { category: 'Utilities', amount: 1500, note: 'Electricity bill', isRecurring: true },
  { category: 'Utilities', amount: 800, note: 'WiFi / Internet', isRecurring: true },
  { category: 'Utilities', amount: 500, note: 'Mobile recharge', isRecurring: true },
  { category: 'Entertainment', amount: 500, note: 'Netflix / Spotify', isRecurring: true },
  { category: 'Health', amount: 1000, note: 'Gym membership', isRecurring: true },
  { category: 'Shopping', amount: 2000, note: 'Essentials & personal care', isRecurring: false },
  { category: 'Savings', amount: 5000, note: 'SIP / Mutual funds', isRecurring: true },
];

export async function seedCategories() {
  const count = await db.categories.count();
  if (count === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  } else {
    // Deduplicate categories if they exist
    const all = await db.categories.toArray();
    const seen = new Set();
    const dupeIds = [];
    for (const cat of all) {
      if (seen.has(cat.name)) {
        dupeIds.push(cat.id);
      } else {
        seen.add(cat.name);
      }
    }
    if (dupeIds.length > 0) {
      await db.categories.bulkDelete(dupeIds);
    }
  }
}

export async function addDefaultExpenses(contextId, expenses) {
  const today = new Date().toISOString().split('T')[0];
  const entries = expenses.map((e) => ({
    contextId,
    amount: e.amount,
    category: e.category,
    note: e.note || '',
    date: today,
    isRecurring: e.isRecurring || false,
    createdAt: new Date(),
  }));
  await db.expenses.bulkAdd(entries);
}

export async function initDB() {
  await seedCategories();
}
