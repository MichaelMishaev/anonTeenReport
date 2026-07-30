import type { FeedbackPayload } from "../domain/survey";

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
