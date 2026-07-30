import { fileURLToPath } from "node:url";
import express from "express";
import pg from "pg";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be configured.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

const choiceSets = {
  visit_frequency: new Set(["once", "multiple"]),
  overall_experience: new Set(["excellent", "good", "not_great", "bad"]),
  liked_elements: new Set([
    "gaming",
    "football_sports",
    "table_games",
    "seating",
    "friends",
    "atmosphere",
    "staff",
    "none",
    "other",
  ]),
  problems: new Set([
    "crowded",
    "noisy",
    "waiting",
    "broken_equipment",
    "not_enough_equipment",
    "teen_behavior",
    "staff_treatment",
    "security_treatment",
    "not_enough_to_do",
    "hours",
    "transport",
    "cleanliness",
    "none",
    "other",
  ]),
  safety: new Set(["very_safe", "mostly_safe", "not_very_safe", "not_safe"]),
  return_intent: new Set(["definitely", "maybe", "no"]),
  completion_time_bucket: new Set(["under_60", "60_90", "91_180", "over_180"]),
};

function isText(value, maximum) {
  return (
    value === null ||
    (typeof value === "string" && Array.from(value).length <= maximum)
  );
}

function isChoiceList(value, allowedChoices) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 3) {
    return false;
  }
  if (
    new Set(value).size !== value.length ||
    !value.every((item) => allowedChoices.has(item))
  ) {
    return false;
  }
  return !value.includes("none") || value.length === 1;
}

function isSubmission(value) {
  if (!value || typeof value !== "object") return false;

  const likedHasOther =
    Array.isArray(value.liked_elements) && value.liked_elements.includes("other");
  const problemHasOther =
    Array.isArray(value.problems) && value.problems.includes("other");
  const likedOtherIsValid = likedHasOther
    ? typeof value.liked_other === "string" && value.liked_other.trim().length > 0
    : value.liked_other === null;
  const problemOtherIsValid = problemHasOther
    ? typeof value.problem_other === "string" && value.problem_other.trim().length > 0
    : value.problem_other === null;
  const safetyDetailIsValid = ["not_very_safe", "not_safe"].includes(
    value.safety,
  )
    ? isText(value.safety_detail, 500)
    : value.safety_detail === null;

  return (
    typeof value.submission_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.submission_id,
    ) &&
    typeof value.submission_day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.submission_day) &&
    choiceSets.visit_frequency.has(value.visit_frequency) &&
    choiceSets.overall_experience.has(value.overall_experience) &&
    isChoiceList(value.liked_elements, choiceSets.liked_elements) &&
    isText(value.liked_other, 150) &&
    likedOtherIsValid &&
    isChoiceList(value.problems, choiceSets.problems) &&
    isText(value.problem_other, 150) &&
    problemOtherIsValid &&
    choiceSets.safety.has(value.safety) &&
    isText(value.safety_detail, 500) &&
    safetyDetailIsValid &&
    choiceSets.return_intent.has(value.return_intent) &&
    isText(value.idea_or_change, 1000) &&
    choiceSets.completion_time_bucket.has(value.completion_time_bucket)
  );
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback_responses (
      submission_id uuid PRIMARY KEY,
      submission_day date NOT NULL,
      visit_frequency text NOT NULL,
      overall_experience text NOT NULL,
      liked_elements text[] NOT NULL,
      liked_other text,
      problems text[] NOT NULL,
      problem_other text,
      safety text NOT NULL,
      safety_detail text,
      return_intent text NOT NULL,
      idea_or_change text,
      completion_time_bucket text NOT NULL
    )
  `);
}

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

app.get("/health", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.status(200).json({ status: "ok" });
  } catch {
    response.status(503).json({ status: "unavailable" });
  }
});

app.post("/api/feedback", async (request, response) => {
  const submission = request.body;
  if (!isSubmission(submission)) {
    response.status(400).json({ error: "invalid_submission" });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO feedback_responses (
        submission_id, submission_day, visit_frequency, overall_experience,
        liked_elements, liked_other, problems, problem_other, safety,
        safety_detail, return_intent, idea_or_change, completion_time_bucket
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )`,
      [
        submission.submission_id,
        submission.submission_day,
        submission.visit_frequency,
        submission.overall_experience,
        submission.liked_elements,
        submission.liked_other,
        submission.problems,
        submission.problem_other,
        submission.safety,
        submission.safety_detail,
        submission.return_intent,
        submission.idea_or_change,
        submission.completion_time_bucket,
      ],
    );
  } catch (error) {
    if (error?.code !== "23505") {
      response.status(503).json({ error: "storage_unavailable" });
      return;
    }
  }

  response.status(204).end();
});

app.use(express.static(fileURLToPath(new URL("./dist", import.meta.url))));
app.get("/{*path}", (_request, response) => {
  response.sendFile(
    fileURLToPath(new URL("./dist/index.html", import.meta.url)),
  );
});

initializeDatabase()
  .then(() => {
    app.listen(port, "0.0.0.0");
  })
  .catch(() => {
    console.error("Database initialization failed.");
    process.exitCode = 1;
  });
