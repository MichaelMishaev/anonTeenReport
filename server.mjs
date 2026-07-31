import { fileURLToPath } from "node:url";
import { randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import pg from "pg";
import { containsOffensiveLanguage } from "./src/domain/offensiveLanguage.js";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT ?? 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD ?? "6262";
const adminSessions = new Map();
const loginAttempts = new Map();
const sessionDuration = 1000 * 60 * 60 * 8;
const maxLoginAttempts = 5;
const loginWindow = 1000 * 60 * 15;

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

function hasBlockedOffensiveLanguage(submission) {
  return [
    submission.liked_other,
    submission.problem_other,
    submission.idea_or_change,
  ].some(containsOffensiveLanguage);
}

function readCookie(request, name) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  const prefix = `${name}=`;
  const cookie = cookies.find((item) => item.trim().startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.trim().slice(prefix.length)) : null;
}

function isAdminRequest(request) {
  const token = readCookie(request, "admin_session");
  if (!token) return false;
  const expiresAt = adminSessions.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

function passwordsMatch(value) {
  if (typeof value !== "string") return false;
  const entered = Buffer.from(value);
  const expected = Buffer.from(adminPassword);
  return entered.length === expected.length && timingSafeEqual(entered, expected);
}

function clientKey(request) {
  return request.ip ?? "unknown";
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
      completion_time_bucket text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(
    "ALTER TABLE feedback_responses ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()",
  );
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
  if (hasBlockedOffensiveLanguage(submission)) {
    response.status(422).json({ error: "offensive_language" });
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

app.post("/api/admin/login", (request, response) => {
  const key = clientKey(request);
  const attempt = loginAttempts.get(key);
  const now = Date.now();
  const recentAttempt = attempt && now - attempt.startedAt < loginWindow;

  if (recentAttempt && attempt.count >= maxLoginAttempts) {
    response.status(429).json({ error: "too_many_attempts" });
    return;
  }

  if (!passwordsMatch(request.body?.password)) {
    loginAttempts.set(key, {
      startedAt: recentAttempt ? attempt.startedAt : now,
      count: recentAttempt ? attempt.count + 1 : 1,
    });
    response.status(401).json({ error: "invalid_password" });
    return;
  }

  loginAttempts.delete(key);
  const token = randomBytes(32).toString("base64url");
  adminSessions.set(token, now + sessionDuration);
  response.cookie("admin_session", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionDuration,
    path: "/",
  });
  response.status(204).end();
});

app.get("/api/admin/results", async (request, response) => {
  if (!isAdminRequest(request)) {
    response.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const [totalResult, overallResult, returnResult, responses] = await Promise.all([
      pool.query("SELECT count(*)::int AS total FROM feedback_responses"),
      pool.query(
        "SELECT overall_experience, count(*)::int AS count FROM feedback_responses GROUP BY overall_experience",
      ),
      pool.query(
        "SELECT return_intent, count(*)::int AS count FROM feedback_responses GROUP BY return_intent",
      ),
      pool.query(`
        SELECT submission_id, submission_day, visit_frequency, overall_experience,
          liked_elements, liked_other, problems, problem_other, safety,
          safety_detail, return_intent, idea_or_change, created_at
        FROM feedback_responses
        ORDER BY created_at DESC
        LIMIT 250
      `),
    ]);
    const overall = Object.fromEntries(
      overallResult.rows.map((row) => [row.overall_experience, row.count]),
    );
    const returns = Object.fromEntries(
      returnResult.rows.map((row) => [row.return_intent, row.count]),
    );
    response.json({
      total: Number(totalResult.rows[0].total),
      by_overall_experience: overall,
      by_return_intent: returns,
      responses: responses.rows,
    });
  } catch {
    response.status(503).json({ error: "results_unavailable" });
  }
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
