import type { FeedbackPayload } from "../domain/survey";

export interface FeedbackResponse {
  submission_id: string;
  submission_day: string;
  visit_frequency: string;
  overall_experience: string;
  liked_elements: string[];
  liked_other: string | null;
  problems: string[];
  problem_other: string | null;
  safety: string;
  safety_detail: string | null;
  return_intent: string;
  idea_or_change: string | null;
  created_at: string;
}

export interface FeedbackResults {
  total: number;
  by_overall_experience: Record<string, number>;
  by_return_intent: Record<string, number>;
  responses: FeedbackResponse[];
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Submission failed with status ${response.status}.`);
  }
}

export async function loginToResults(password: string): Promise<void> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}.`);
  }
}

export async function getFeedbackResults(): Promise<FeedbackResults> {
  const response = await fetch("/api/admin/results");
  if (!response.ok) {
    throw new Error(`Results request failed with status ${response.status}.`);
  }
  return response.json() as Promise<FeedbackResults>;
}
