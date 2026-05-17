import {
  format,
  previousFriday,
  previousMonday,
  previousSaturday,
  previousSunday,
  previousThursday,
  previousTuesday,
  previousWednesday,
  setDate,
  subDays,
} from "date-fns";

// Comprehensive keyword → category mapping (Indian context aware)
const KEYWORD_MAP = {
  Food: [
    "food",
    "lunch",
    "dinner",
    "breakfast",
    "snack",
    "snacks",
    "brunch",
    "swiggy",
    "zomato",
    "restaurant",
    "cafe",
    "coffee",
    "tea",
    "chai",
    "biriyani",
    "biryani",
    "dosa",
    "idli",
    "paratha",
    "thali",
    "meals",
    "pizza",
    "burger",
    "sandwich",
    "noodles",
    "momos",
    "samosa",
    "pani puri",
    "grocery",
    "groceries",
    "vegetables",
    "fruits",
    "milk",
    "bread",
    "eggs",
    "chicken",
    "mutton",
    "fish",
    "rice",
    "dal",
    "atta",
    "oil",
    "blinkit",
    "zepto",
    "bigbasket",
    "instamart",
    "dunzo",
    "dominos",
    "mcdonalds",
    "kfc",
    "starbucks",
    "chaayos",
    "maggi",
    "juice",
    "lassi",
    "buttermilk",
    "curd",
    "paneer",
    "bakery",
    "cake",
    "sweets",
    "mithai",
    "ice cream",
    "kulfi",
  ],
  Transport: [
    "uber",
    "ola",
    "rapido",
    "metro",
    "bus",
    "auto",
    "rickshaw",
    "taxi",
    "cab",
    "fuel",
    "petrol",
    "diesel",
    "cng",
    "gas",
    "parking",
    "toll",
    "fastag",
    "train",
    "railway",
    "irctc",
    "flight",
    "lyft",
    "grab",
    "commute",
    "drive",
    "bike",
    "scooter",
    "ev charging",
  ],
  Rent: [
    "rent",
    "housing",
    "apartment",
    "flat",
    "pg",
    "hostel",
    "maintenance",
    "society",
    "broker",
    "deposit",
  ],
  Shopping: [
    "amazon",
    "flipkart",
    "myntra",
    "ajio",
    "meesho",
    "nykaa",
    "shopping",
    "clothes",
    "shoes",
    "shirt",
    "jeans",
    "dress",
    "watch",
    "bag",
    "accessories",
    "gadget",
    "electronics",
    "furniture",
    "decor",
    "home",
    "kitchen",
  ],
  Utilities: [
    "electricity",
    "electric",
    "water",
    "gas",
    "wifi",
    "internet",
    "phone",
    "mobile",
    "recharge",
    "bill",
    "broadband",
    "jio",
    "airtel",
    "vi",
    "bsnl",
    "postpaid",
    "prepaid",
    "dth",
    "tata sky",
    "dish tv",
  ],
  Entertainment: [
    "netflix",
    "movie",
    "movies",
    "cinema",
    "pvr",
    "inox",
    "spotify",
    "youtube",
    "prime",
    "hotstar",
    "disney",
    "subscription",
    "gaming",
    "game",
    "playstation",
    "xbox",
    "concert",
    "show",
    "event",
    "party",
    "club",
    "bar",
    "pub",
    "bookmyshow",
    "drinks",
    "beer",
    "wine",
    "alcohol",
  ],
  Health: [
    "medicine",
    "doctor",
    "hospital",
    "pharmacy",
    "medical",
    "gym",
    "health",
    "fitness",
    "yoga",
    "clinic",
    "dentist",
    "eye",
    "checkup",
    "lab",
    "test",
    "scan",
    "xray",
    "apollo",
    "pharmeasy",
    "netmeds",
    "1mg",
    "practo",
    "insurance",
    "health insurance",
  ],
  Education: [
    "course",
    "book",
    "books",
    "udemy",
    "coursera",
    "learning",
    "tuition",
    "coaching",
    "class",
    "exam",
    "school",
    "college",
    "university",
    "fees",
    "stationery",
    "notebook",
    "unacademy",
    "byjus",
    "upgrad",
  ],
  Travel: [
    "flight",
    "hotel",
    "trip",
    "travel",
    "vacation",
    "holiday",
    "airbnb",
    "makemytrip",
    "goibibo",
    "booking",
    "resort",
    "oyo",
    "luggage",
    "visa",
    "passport",
    "tourism",
  ],
  Savings: [
    "invest",
    "investment",
    "mutual fund",
    "sip",
    "fd",
    "savings",
    "ppf",
    "nps",
    "stocks",
    "shares",
    "zerodha",
    "groww",
    "gold",
    "rd",
    "fixed deposit",
    "crypto",
  ],
  Subscriptions: [
    "subscription",
    "monthly",
    "annual",
    "plan",
    "premium",
    "apple",
    "google one",
    "icloud",
    "notion",
    "chatgpt",
    "linkedin",
    "medium",
    "canva",
  ],
  Gifts: [
    "gift",
    "gifts",
    "birthday",
    "anniversary",
    "present",
    "donation",
    "charity",
    "tip",
    "shagun",
  ],
  Work: [
    "office",
    "work",
    "coworking",
    "laptop",
    "mouse",
    "keyboard",
    "monitor",
    "desk",
    "chair",
    "stationery",
    "printing",
  ],
};

// Date parsing patterns
const DATE_PATTERNS = [
  { pattern: /\byesterday\b/i, resolve: () => subDays(new Date(), 1) },
  { pattern: /\btoday\b/i, resolve: () => new Date() },
  {
    pattern: /\bday before yesterday\b/i,
    resolve: () => subDays(new Date(), 2),
  },
  { pattern: /\blast monday\b/i, resolve: () => previousMonday(new Date()) },
  { pattern: /\blast tuesday\b/i, resolve: () => previousTuesday(new Date()) },
  {
    pattern: /\blast wednesday\b/i,
    resolve: () => previousWednesday(new Date()),
  },
  {
    pattern: /\blast thursday\b/i,
    resolve: () => previousThursday(new Date()),
  },
  { pattern: /\blast friday\b/i, resolve: () => previousFriday(new Date()) },
  {
    pattern: /\blast saturday\b/i,
    resolve: () => previousSaturday(new Date()),
  },
  { pattern: /\blast sunday\b/i, resolve: () => previousSunday(new Date()) },
  {
    pattern: /\bon\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
    resolve: (match) => {
      const day = parseInt(match[1], 10);
      const now = new Date();
      let date = setDate(now, day);
      if (date > now) date = setDate(subDays(now, 30), day);
      return date;
    },
  },
  {
    pattern: /\b(\d{1,2})\/(\d{1,2})\b/,
    resolve: (match) => {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      return new Date(new Date().getFullYear(), month, day);
    },
  },
];

// Recurring markers
const RECURRING_PATTERNS =
  /\b(recurring|monthly|weekly|yearly|every month|every week|subscription|auto-?debit)\b/i;

// Amount-based category hints
function guessFromAmount(amount) {
  if (amount >= 10 && amount <= 50) return "Food"; // chai, snacks range
  if (amount >= 100 && amount <= 300) return "Transport"; // auto/uber short ride
  return null;
}

// Time-of-day based hints
function guessFromTime() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour <= 10) return "Food"; // breakfast/chai time
  if (hour >= 12 && hour <= 14) return "Food"; // lunch
  if (hour >= 19 && hour <= 22) return "Food"; // dinner
  return null;
}

/**
 * Enhanced expense parser with NLP-like capabilities
 * Handles: amounts, categories, notes, dates, recurring, multiple expenses
 */
export function parseExpense(input, categories = []) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check for multiple expenses (comma or "and" separated)
  if (trimmed.includes(",") || /\band\b/i.test(trimmed)) {
    const parts = trimmed
      .split(/,|\band\b/i)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) {
      const results = parts
        .map((p) => parseSingle(p, categories))
        .filter(Boolean);
      return results.length > 0 ? results : null;
    }
  }

  const result = parseSingle(trimmed, categories);
  return result ? [result] : null;
}

function parseSingle(input, categories) {
  let text = input.trim().toLowerCase();
  if (!text) return null;

  // Strip currency symbols
  text = text.replace(/[₹$€£]/g, "").trim();

  // Extract amount — try different positions
  let amount = null;
  let textWithoutAmount = text;

  // Amount at start: "500 food"
  const startMatch = text.match(/^(\d+(?:\.\d+)?)\s*/);
  // Amount at end: "food 500"
  const endMatch = text.match(/\s*(\d+(?:\.\d+)?)$/);
  // Amount in middle: "food 500 lunch"
  const midMatch = text.match(/\s(\d+(?:\.\d+)?)\s/);

  if (startMatch) {
    amount = parseFloat(startMatch[1]);
    textWithoutAmount = text.slice(startMatch[0].length).trim();
  } else if (endMatch) {
    amount = parseFloat(endMatch[1]);
    textWithoutAmount = text.slice(0, -endMatch[0].length).trim();
  } else if (midMatch) {
    amount = parseFloat(midMatch[1]);
    textWithoutAmount = text
      .replace(midMatch[1], "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (!amount || amount <= 0 || isNaN(amount)) return null;

  // Extract date
  let date = format(new Date(), "yyyy-MM-dd");
  let remaining = textWithoutAmount;

  for (const dp of DATE_PATTERNS) {
    const match = remaining.match(dp.pattern);
    if (match) {
      const resolved = dp.resolve(match);
      date = format(resolved, "yyyy-MM-dd");
      remaining = remaining.replace(match[0], "").trim();
      break;
    }
  }

  // Extract recurring flag
  let isRecurring = false;
  const recurMatch = remaining.match(RECURRING_PATTERNS);
  if (recurMatch) {
    isRecurring = true;
    remaining = remaining.replace(recurMatch[0], "").trim();
  }

  // Match category from keyword map first (comprehensive)
  let matchedCategory = null;
  let note = remaining;

  // Try keyword map
  for (const [catName, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (remaining.includes(keyword)) {
        // Find the matching DB category, or use the keyword map name
        const dbCat = categories.find((c) => c.name === catName);
        if (dbCat) {
          matchedCategory = dbCat.name;
        } else {
          // Try fuzzy match with DB categories
          matchedCategory = catName;
        }
        note = remaining.replace(keyword, "").trim();
        break;
      }
    }
    if (matchedCategory) break;
  }

  // Fallback: try DB category keywords
  if (!matchedCategory) {
    for (const cat of categories) {
      if (!cat.keywords?.length) continue;
      for (const keyword of cat.keywords) {
        if (remaining.includes(keyword.toLowerCase())) {
          matchedCategory = cat.name;
          note = remaining.replace(keyword.toLowerCase(), "").trim();
          break;
        }
      }
      if (matchedCategory) break;
    }
  }

  // Fallback: try category name directly
  if (!matchedCategory) {
    for (const cat of categories) {
      if (remaining.includes(cat.name.toLowerCase())) {
        matchedCategory = cat.name;
        note = remaining.replace(cat.name.toLowerCase(), "").trim();
        break;
      }
    }
  }

  // Fallback: amount-based guessing
  if (!matchedCategory) {
    matchedCategory = guessFromAmount(amount) || guessFromTime();
  }

  // Clean up note
  note = note
    .replace(/\s+/g, " ")
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();

  return {
    amount,
    category: matchedCategory || null,
    note: note || "",
    date,
    isRecurring,
  };
}

/**
 * Smart category suggestions based on history, time, and amount
 */
export function suggestCategory(
  note,
  amount,
  recentExpenses = [],
  categories = [],
) {
  const suggestions = [];
  const lowerNote = (note || "").toLowerCase();

  // 1. Keyword map match
  for (const [catName, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const keyword of keywords) {
      if (lowerNote.includes(keyword)) {
        suggestions.push({
          category: catName,
          confidence: 0.9,
          reason: "keyword",
        });
        break;
      }
    }
  }

  // 2. History match — find similar notes
  if (lowerNote && recentExpenses.length > 0) {
    const noteWords = lowerNote.split(/\s+/);
    const historyCounts = {};
    for (const exp of recentExpenses) {
      const expNote = (exp.note || "").toLowerCase();
      const overlap = noteWords.filter(
        (w) => w.length > 2 && expNote.includes(w),
      ).length;
      if (overlap > 0) {
        historyCounts[exp.category] =
          (historyCounts[exp.category] || 0) + overlap;
      }
    }
    const best = Object.entries(historyCounts).sort((a, b) => b[1] - a[1])[0];
    if (best) {
      suggestions.push({
        category: best[0],
        confidence: 0.7,
        reason: "history",
      });
    }
  }

  // 3. Amount range heuristic
  if (amount) {
    if (amount >= 10 && amount <= 80)
      suggestions.push({ category: "Food", confidence: 0.4, reason: "amount" });
    else if (amount >= 100 && amount <= 400)
      suggestions.push({
        category: "Transport",
        confidence: 0.3,
        reason: "amount",
      });
    else if (amount >= 5000 && amount <= 30000)
      suggestions.push({ category: "Rent", confidence: 0.3, reason: "amount" });
  }

  // 4. Time of day
  const timeGuess = guessFromTime();
  if (timeGuess) {
    suggestions.push({ category: timeGuess, confidence: 0.2, reason: "time" });
  }

  // Deduplicate and sort by confidence
  const seen = new Set();
  return suggestions
    .filter((s) => {
      if (seen.has(s.category)) return false;
      seen.add(s.category);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

export { KEYWORD_MAP };
