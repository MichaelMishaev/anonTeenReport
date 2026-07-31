import { describe, expect, it } from "vitest";
import {
  buildFeedbackPayload,
  getCompletionTimeBucket,
  INITIAL_DRAFT,
  toggleMultiChoice,
  validateStep,
  type SurveyDraft,
} from "./survey";
import {
  containsOffensiveLanguage,
  findOffensiveWord,
} from "./offensiveLanguage.js";
import {
  HEBREW_OFFENSIVE_VOCABULARY,
  LATIN_OFFENSIVE_VOCABULARY,
} from "./hebrewOffensiveVocabulary.js";

describe("offensive language detection", () => {
  it.each([
    ["זין ענק", "זין"],
    ["את זונה", "זונה"],
    ["הוא מפגר", "מפגר"],
    ["יא מטומטם", "מטומטם"],
    ["חתיכת חרא", "חרא"],
    ["לך תזדיין", "תזדיין"],
    ["כוס אמא שלך", "כוס אמא"],
    ["סוקה בליאט", "בליאט"],
    ["יא הומו", "יא הומו"],
    ["הלוואי שתמות", "הלוואי שתמות"],
    ["you are an asshole", "asshole"],
    ["go kill yourself", "go kill yourself"],
  ])("detects curated abusive text: %s", (text, expectedWord) => {
    expect(findOffensiveWord(text)).toBe(expectedWord);
  });

  it("detects common attempts to evade the filter", () => {
    expect(findOffensiveWord("זין ענק")).toBe("זין");
    expect(containsOffensiveLanguage("ז י ן ענק")).toBe(true);
    expect(containsOffensiveLanguage("את ז ו נ ה")).toBe(true);
    expect(containsOffensiveLanguage("ז.י.ן ענק")).toBe(true);
    expect(containsOffensiveLanguage("ז\u200bין ענק")).toBe(true);
    expect(containsOffensiveLanguage("מְפַגֵּר")).toBe(true);
    expect(containsOffensiveLanguage("מטומטםםם")).toBe(true);
    expect(containsOffensiveLanguage("f.u.c.k you")).toBe(true);
  });

  it("keeps the curated vocabulary large, unique, and fully matchable", () => {
    const vocabulary = [
      ...Object.values(HEBREW_OFFENSIVE_VOCABULARY).flat(),
      ...LATIN_OFFENSIVE_VOCABULARY,
    ];

    expect(vocabulary.length).toBeGreaterThanOrEqual(350);
    expect(new Set(vocabulary).size).toBe(vocabulary.length);
    for (const entry of vocabulary) {
      expect(containsOffensiveLanguage(entry), entry).toBe(true);
    }
  });

  it.each([
    "אני מאזין למוזיקה",
    "מערכת להזנת נתונים",
    "תזונה בריאה חשובה",
    "תשלום מזונות",
    "שלום לכולם",
    "כוס מים בבקשה",
    "יש לי כלב חמוד",
    "קיבלתי אפס תקלות",
    "הוא הומו ומרגיש בטוח כאן",
    "היא לסבית ומרגישה בטוחה כאן",
    "אני אוטיסט וצריך פחות רעש",
    "class starts at noon",
    "Dick is an English first name",
  ])("does not match innocent or neutral text: %s", (text) => {
    expect(containsOffensiveLanguage(text)).toBe(false);
  });
});

describe("toggleMultiChoice", () => {
  it("makes the none option exclusive", () => {
    expect(toggleMultiChoice(["gaming", "friends"], "none", "none")).toEqual({
      values: ["none"],
      limitReached: false,
    });
  });

  it("removes none when a concrete choice is selected", () => {
    expect(toggleMultiChoice(["none"], "gaming", "none")).toEqual({
      values: ["gaming"],
      limitReached: false,
    });
  });

  it("blocks a fourth concrete choice", () => {
    expect(
      toggleMultiChoice(["gaming", "friends", "staff"], "seating", "none"),
    ).toEqual({
      values: ["gaming", "friends", "staff"],
      limitReached: true,
    });
  });
});

describe("step validation", () => {
  it("requires text while Other is selected", () => {
    const draft: SurveyDraft = {
      ...INITIAL_DRAFT,
      likedElements: ["other"],
      likedOther: "   ",
    };

    expect(validateStep("liked", draft)).toBe(
      "צריך לכתוב מה היה הדבר האחר שאהבת.",
    );
  });

  it("allows the final optional idea field to be empty", () => {
    expect(validateStep("idea", INITIAL_DRAFT)).toBeNull();
  });

  it("blocks the reported offensive idea before submission", () => {
    const draft: SurveyDraft = {
      ...INITIAL_DRAFT,
      ideaOrChange: "זין ענק",
    };

    expect(validateStep("idea", draft)).toBe(
      "זיהינו מילה שעלולה לפגוע. צריך לנסח את התשובה בדרך מכבדת יותר.",
    );
  });

  it("blocks offensive language in regular free-text answers", () => {
    const draft: SurveyDraft = {
      ...INITIAL_DRAFT,
      problems: ["other"],
      problemOther: "הוא מפגר",
    };

    expect(validateStep("problems", draft)).toBe(
      "זיהינו מילה שעלולה לפגוע. צריך לנסח את התשובה בדרך מכבדת יותר.",
    );
  });

  it("does not block a safety report that quotes offensive language", () => {
    const draft: SurveyDraft = {
      ...INITIAL_DRAFT,
      safety: "not_safe",
      safetyDetail: "מישהו קרא לי מפגר",
    };

    expect(validateStep("safety", draft)).toBeNull();
  });
});

describe("payload construction", () => {
  it("includes only eligible, normalized survey data", () => {
    const draft: SurveyDraft = {
      visitFrequency: "multiple",
      overallExperience: "good",
      likedElements: ["gaming", "other"],
      likedOther: "  הופעה חיה  ",
      problems: ["none"],
      problemOther: "ignored",
      safety: "very_safe",
      safetyDetail: "ignored",
      returnIntent: "definitely",
      ideaOrChange: "  יותר טורנירים  ",
    };

    const payload = buildFeedbackPayload(
      draft,
      "b6073655-b706-48d9-b7f7-03e2f1d0e883",
      72_000,
    );

    expect(payload).toMatchObject({
      submission_id: "b6073655-b706-48d9-b7f7-03e2f1d0e883",
      visit_frequency: "multiple",
      overall_experience: "good",
      liked_elements: ["gaming", "other"],
      liked_other: "הופעה חיה",
      problems: ["none"],
      problem_other: null,
      safety: "very_safe",
      safety_detail: null,
      return_intent: "definitely",
      idea_or_change: "יותר טורנירים",
      completion_time_bucket: "60_90",
    });
  });

  it("uses coarse completion buckets", () => {
    expect(getCompletionTimeBucket(59_000)).toBe("under_60");
    expect(getCompletionTimeBucket(90_000)).toBe("60_90");
    expect(getCompletionTimeBucket(180_000)).toBe("91_180");
    expect(getCompletionTimeBucket(181_000)).toBe("over_180");
  });
});
