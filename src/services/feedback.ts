import { createClient } from "@supabase/supabase-js";
import type { FeedbackPayload } from "../domain/survey";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

const supabase =
  supabaseUrl && supabasePublishableKey
    ? createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

export class SubmissionNotConfiguredError extends Error {
  constructor() {
    super("Supabase client configuration is missing.");
    this.name = "SubmissionNotConfiguredError";
  }
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  if (!supabase) {
    throw new SubmissionNotConfiguredError();
  }

  const { error } = await supabase
    .from("feedback_responses")
    .insert(payload);

  if (error?.code === "23505") {
    return;
  }

  if (error) {
    throw error;
  }
}

