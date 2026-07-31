const HEBREW_LETTER_RANGE = "\u0590-\u05ff";
const HEBREW_PREFIXES = "[והבכלש]{0,2}";

const OFFENSIVE_WORDS = [
  "זונה",
  "זונות",
  "זונוט",
  "בנזונה",
  "בטזונה",
  "בן זונה",
  "בן של זונה",
  "בת זונה",
  "מפגר",
  "מפגרת",
  "מפגרים",
  "מפגרות",
];

function compilePattern(word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?<![${HEBREW_LETTER_RANGE}])${HEBREW_PREFIXES}${escaped}(?![${HEBREW_LETTER_RANGE}])`,
    "i",
  );
}

const patterns = OFFENSIVE_WORDS.map((word) => ({
  word,
  pattern: compilePattern(word),
}));

function collapseEvasionRuns(text) {
  const run = new RegExp(
    `(?<![${HEBREW_LETTER_RANGE}])(?:[${HEBREW_LETTER_RANGE}][\\s.\\-_]+){2,}[${HEBREW_LETTER_RANGE}](?![${HEBREW_LETTER_RANGE}])`,
    "g",
  );
  return text.replace(run, (match) => match.replace(/[\s.\-_]+/g, ""));
}

export function findOffensiveWord(value) {
  if (typeof value !== "string" || value.length < 3) return null;

  const normalized = value.normalize("NFKC").toLowerCase();
  const candidates = [normalized];
  const collapsed = collapseEvasionRuns(normalized);
  if (collapsed !== normalized) candidates.push(collapsed);

  for (const { word, pattern } of patterns) {
    if (candidates.some((candidate) => pattern.test(candidate))) {
      return word;
    }
  }

  return null;
}

export function containsOffensiveLanguage(value) {
  return findOffensiveWord(value) !== null;
}
