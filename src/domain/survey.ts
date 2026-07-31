import { containsOffensiveLanguage } from "./offensiveLanguage.js";

export type VisitFrequency = "once" | "multiple" | "not_yet";
export type OverallExperience = "excellent" | "good" | "not_great" | "bad";
export type SafetyRating = "very_safe" | "mostly_safe" | "not_very_safe" | "not_safe";
export type ReturnIntent = "definitely" | "maybe" | "no";

export type QuestionStep =
  | "visit"
  | "overall"
  | "liked"
  | "problems"
  | "safety"
  | "return"
  | "idea";

export type Screen =
  | "welcome"
  | QuestionStep
  | "ineligible"
  | "success"
  | "admin-login"
  | "admin-results";

export interface SurveyDraft {
  visitFrequency: VisitFrequency | null;
  overallExperience: OverallExperience | null;
  likedElements: string[];
  likedOther: string;
  problems: string[];
  problemOther: string;
  safety: SafetyRating | null;
  safetyDetail: string;
  returnIntent: ReturnIntent | null;
  ideaOrChange: string;
}

export interface FeedbackPayload {
  submission_id: string;
  submission_day: string;
  visit_frequency: Exclude<VisitFrequency, "not_yet">;
  overall_experience: OverallExperience;
  liked_elements: string[];
  liked_other: string | null;
  problems: string[];
  problem_other: string | null;
  safety: SafetyRating;
  safety_detail: string | null;
  return_intent: ReturnIntent;
  idea_or_change: string | null;
  completion_time_bucket: "under_60" | "60_90" | "91_180" | "over_180";
}

export interface ChoiceOption {
  id: string;
  label: string;
  emoji?: string;
}

export const QUESTION_STEPS: QuestionStep[] = [
  "visit",
  "overall",
  "liked",
  "problems",
  "safety",
  "return",
  "idea",
];

export const VISIT_OPTIONS: ChoiceOption[] = [
  { id: "once", label: "פעם אחת" },
  { id: "multiple", label: "יותר מפעם אחת" },
  { id: "not_yet", label: "עוד לא הגעתי" },
];

export const OVERALL_OPTIONS: ChoiceOption[] = [
  { id: "excellent", label: "מעולה", emoji: "🤩" },
  { id: "good", label: "די טוב", emoji: "🙂" },
  { id: "not_great", label: "לא משהו", emoji: "😐" },
  { id: "bad", label: "ממש לא טוב", emoji: "🙁" },
];

export const LIKED_OPTIONS: ChoiceOption[] = [
  { id: "gaming", label: "גיימינג וטכנולוגיה" },
  { id: "football_sports", label: "כדורגל וספורט" },
  { id: "table_games", label: "פינג פונג ומשחקי שולחן" },
  { id: "seating", label: "פינות הישיבה" },
  { id: "friends", label: "להיות עם חברים" },
  { id: "atmosphere", label: "האווירה" },
  { id: "staff", label: "הצוות במקום" },
  { id: "none", label: "לא היה משהו שאהבתי" },
  { id: "other", label: "משהו אחר" },
];

export const PROBLEM_OPTIONS: ChoiceOption[] = [
  { id: "crowded", label: "היה צפוף מדי" },
  { id: "noisy", label: "היה רועש מדי" },
  { id: "waiting", label: "חיכיתי הרבה לפעילויות" },
  { id: "broken_equipment", label: "ציוד לא עבד" },
  { id: "not_enough_equipment", label: "לא היה מספיק ציוד" },
  { id: "teen_behavior", label: "ההתנהגות של בני נוער אחרים" },
  { id: "staff_treatment", label: "היחס של אנשי הצוות" },
  { id: "security_treatment", label: "היחס של אנשי האבטחה" },
  { id: "not_enough_to_do", label: "לא היו מספיק דברים לעשות" },
  { id: "hours", label: "השעות לא התאימו" },
  { id: "transport", label: "ההסעה חזרה" },
  { id: "cleanliness", label: "הניקיון" },
  { id: "none", label: "שום דבר לא הפריע" },
  { id: "other", label: "משהו אחר" },
];

export const SAFETY_OPTIONS: ChoiceOption[] = [
  { id: "very_safe", label: "בטוח מאוד" },
  { id: "mostly_safe", label: "די בטוח" },
  { id: "not_very_safe", label: "לא כל כך בטוח" },
  { id: "not_safe", label: "בכלל לא בטוח" },
];

export const RETURN_OPTIONS: ChoiceOption[] = [
  { id: "definitely", label: "בטוח שכן" },
  { id: "maybe", label: "אולי" },
  { id: "no", label: "לא" },
];

export const INITIAL_DRAFT: SurveyDraft = {
  visitFrequency: null,
  overallExperience: null,
  likedElements: [],
  likedOther: "",
  problems: [],
  problemOther: "",
  safety: null,
  safetyDetail: "",
  returnIntent: null,
  ideaOrChange: "",
};

export function countCharacters(value: string): number {
  return Array.from(value).length;
}

export function clampCharacters(value: string, maximum: number): string {
  return Array.from(value).slice(0, maximum).join("");
}

export function toggleMultiChoice(
  current: string[],
  value: string,
  exclusiveValue: string,
  maximum = 3,
): { values: string[]; limitReached: boolean } {
  if (current.includes(value)) {
    return {
      values: current.filter((item) => item !== value),
      limitReached: false,
    };
  }

  if (value === exclusiveValue) {
    return { values: [value], limitReached: false };
  }

  const withoutExclusive = current.filter((item) => item !== exclusiveValue);
  if (withoutExclusive.length >= maximum) {
    return { values: current, limitReached: true };
  }

  return {
    values: [...withoutExclusive, value],
    limitReached: false,
  };
}

export function validateStep(step: QuestionStep, draft: SurveyDraft): string | null {
  const offensiveLanguageMessage =
    "זיהינו מילה שעלולה לפגוע. צריך לנסח את התשובה בדרך מכבדת יותר.";

  switch (step) {
    case "visit":
      return draft.visitFrequency ? null : "צריך לבחור תשובה כדי להמשיך.";
    case "overall":
      return draft.overallExperience ? null : "צריך לבחור איך היה הביקור.";
    case "liked":
      if (draft.likedElements.length === 0) {
        return "צריך לבחור לפחות תשובה אחת.";
      }
      if (draft.likedElements.includes("other") && !draft.likedOther.trim()) {
        return "צריך לכתוב מה היה הדבר האחר שאהבת.";
      }
      if (
        draft.likedElements.includes("other") &&
        containsOffensiveLanguage(draft.likedOther)
      ) {
        return offensiveLanguageMessage;
      }
      return null;
    case "problems":
      if (draft.problems.length === 0) {
        return "צריך לבחור לפחות תשובה אחת.";
      }
      if (draft.problems.includes("other") && !draft.problemOther.trim()) {
        return "צריך לכתוב מה היה הדבר האחר שהפריע.";
      }
      if (
        draft.problems.includes("other") &&
        containsOffensiveLanguage(draft.problemOther)
      ) {
        return offensiveLanguageMessage;
      }
      return null;
    case "safety":
      return draft.safety ? null : "צריך לבחור עד כמה המקום הרגיש בטוח.";
    case "return":
      return draft.returnIntent ? null : "צריך לבחור תשובה כדי להמשיך.";
    case "idea":
      return containsOffensiveLanguage(draft.ideaOrChange)
        ? offensiveLanguageMessage
        : null;
  }
}

export function getCompletionTimeBucket(
  elapsedMilliseconds: number,
): FeedbackPayload["completion_time_bucket"] {
  const seconds = elapsedMilliseconds / 1000;
  if (seconds < 60) return "under_60";
  if (seconds <= 90) return "60_90";
  if (seconds <= 180) return "91_180";
  return "over_180";
}

export function getSubmissionDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function buildFeedbackPayload(
  draft: SurveyDraft,
  submissionId: string,
  elapsedMilliseconds: number,
): FeedbackPayload {
  if (
    !draft.visitFrequency ||
    draft.visitFrequency === "not_yet" ||
    !draft.overallExperience ||
    !draft.safety ||
    !draft.returnIntent
  ) {
    throw new Error("Cannot build a payload from an incomplete survey.");
  }

  return {
    submission_id: submissionId,
    submission_day: getSubmissionDay(),
    visit_frequency: draft.visitFrequency,
    overall_experience: draft.overallExperience,
    liked_elements: draft.likedElements,
    liked_other: draft.likedElements.includes("other")
      ? draft.likedOther.trim()
      : null,
    problems: draft.problems,
    problem_other: draft.problems.includes("other")
      ? draft.problemOther.trim()
      : null,
    safety: draft.safety,
    safety_detail:
      draft.safety === "not_very_safe" || draft.safety === "not_safe"
        ? draft.safetyDetail.trim() || null
        : null,
    return_intent: draft.returnIntent,
    idea_or_change: draft.ideaOrChange.trim() || null,
    completion_time_bucket: getCompletionTimeBucket(elapsedMilliseconds),
  };
}

export function isQuestionStep(screen: Screen): screen is QuestionStep {
  return QUESTION_STEPS.includes(screen as QuestionStep);
}

export function questionNumber(step: QuestionStep): number {
  return QUESTION_STEPS.indexOf(step) + 1;
}
