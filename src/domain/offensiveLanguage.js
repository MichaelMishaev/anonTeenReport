import {
  HEBREW_OFFENSIVE_VOCABULARY,
  LATIN_OFFENSIVE_VOCABULARY,
} from "./hebrewOffensiveVocabulary.js";

const HEBREW_LETTER_RANGE = "\u05d0-\u05ea";
const HEBREW_PREFIXES = "[והבכלש]{0,2}";
const HEBREW_MARKS = /[\u0591-\u05bd\u05bf-\u05c7]/g;
const ZERO_WIDTH_CHARACTERS = /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;
const EVASION_SEPARATORS = "[\\s.\\-_*~|/\\\\·•]+";

const HEBREW_OFFENSIVE_WORDS = [
  ...new Set(Object.values(HEBREW_OFFENSIVE_VOCABULARY).flat()),
];

function escapePattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compileHebrewPattern(word) {
  const prefixes = word.includes(" ") ? "" : HEBREW_PREFIXES;
  const escaped = word
    .split(/\s+/)
    .map(escapePattern)
    .join(EVASION_SEPARATORS);
  return new RegExp(
    `(?<![${HEBREW_LETTER_RANGE}])${prefixes}${escaped}(?![${HEBREW_LETTER_RANGE}])`,
    "i",
  );
}

function compileLatinPattern(word) {
  const escaped = word
    .split(/\s+/)
    .map(escapePattern)
    .join(EVASION_SEPARATORS);
  return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, "i");
}

const patterns = [
  ...HEBREW_OFFENSIVE_WORDS.map((word) => ({
    word,
    pattern: compileHebrewPattern(word),
  })),
  ...LATIN_OFFENSIVE_VOCABULARY.map((word) => ({
    word,
    pattern: compileLatinPattern(word),
  })),
];

function collapseEvasionRuns(text, letterRange) {
  const run = new RegExp(
    `(?<![${letterRange}])(?:[${letterRange}]${EVASION_SEPARATORS}){2,}[${letterRange}](?![${letterRange}])`,
    "gi",
  );
  return text.replace(run, (match) =>
    match.replace(/[\s.\-_*~|/\\·•]+/g, ""),
  );
}

function normalizeInput(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(HEBREW_MARKS, "")
    .replace(ZERO_WIDTH_CHARACTERS, "");
}

function buildCandidates(value) {
  const normalized = normalizeInput(value);
  const candidates = new Set([normalized]);
  candidates.add(collapseEvasionRuns(normalized, HEBREW_LETTER_RANGE));
  candidates.add(collapseEvasionRuns(normalized, "a-z"));

  for (const candidate of [...candidates]) {
    // Catch deliberate elongation such as "מטומטםםם" while preserving a
    // two-letter candidate for words whose standard spelling has doubles.
    candidates.add(candidate.replace(/([\u05d0-\u05eaa-z])\1{2,}/gi, "$1"));
    candidates.add(candidate.replace(/([\u05d0-\u05eaa-z])\1{2,}/gi, "$1$1"));
  }

  return candidates;
}

export function findOffensiveWord(value) {
  if (typeof value !== "string" || value.length < 3) return null;

  const candidates = [...buildCandidates(value)];

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
