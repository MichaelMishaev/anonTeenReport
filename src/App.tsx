import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  LockKeyhole,
  MessageCircle,
  WifiOff,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChoiceCard } from "./components/ChoiceCard";
import { ProgressHeader } from "./components/ProgressHeader";
import { TextAreaField } from "./components/TextAreaField";
import {
  buildFeedbackPayload,
  INITIAL_DRAFT,
  isQuestionStep,
  LIKED_OPTIONS,
  OVERALL_OPTIONS,
  PROBLEM_OPTIONS,
  questionNumber,
  QUESTION_STEPS,
  RETURN_OPTIONS,
  SAFETY_OPTIONS,
  toggleMultiChoice,
  validateStep,
  VISIT_OPTIONS,
  type OverallExperience,
  type QuestionStep,
  type ReturnIntent,
  type SafetyRating,
  type Screen,
  type SurveyDraft,
  type VisitFrequency,
} from "./domain/survey";
import { submitFeedback } from "./services/feedback";

const STORAGE_KEY = "anon-teen-city-feedback-draft";

const IDEA_STARTERS = [
  {
    label: "להוסיף עוד טורנירים של…",
    value: "להוסיף עוד טורנירים של",
  },
  {
    label: "לשים יותר…",
    value: "לשים יותר",
  },
  {
    label: "הצוות צריך…",
    value: "הצוות צריך",
  },
  {
    label: "כדאי לשנות את…",
    value: "כדאי לשנות את",
  },
  {
    label: "היה יותר כיף אם…",
    value: "היה יותר כיף אם",
  },
  {
    label: "חשוב להשאיר את…",
    value: "חשוב להשאיר את",
  },
] as const;

interface StoredSurvey {
  screen: Screen;
  draft: SurveyDraft;
}

interface QuestionPageProps {
  step: QuestionStep;
  title: string;
  helper?: string;
  onBack: () => void;
  onAction: () => void;
  actionLabel?: string;
  busy?: boolean;
  validationMessage?: string | null;
  submitMessage?: ReactNode;
  children: ReactNode;
}

function DeveloperCredit() {
  return (
    <a
      className="developer-credit"
      href="https://msx.co.il/"
      target="_blank"
      rel="noreferrer"
      aria-label="פותח על ידי MSX"
    >
      <span>פותח על ידי</span>
      <strong dir="ltr">MSX</strong>
      <ExternalLink size={13} strokeWidth={2.2} aria-hidden="true" />
    </a>
  );
}

function readStoredSurvey(): StoredSurvey | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredSurvey>;
    if (!parsed.draft || !parsed.screen || !isQuestionStep(parsed.screen)) {
      return null;
    }

    return {
      screen: parsed.screen,
      draft: {
        ...INITIAL_DRAFT,
        ...parsed.draft,
        likedElements: Array.isArray(parsed.draft.likedElements)
          ? parsed.draft.likedElements
          : [],
        problems: Array.isArray(parsed.draft.problems)
          ? parsed.draft.problems
          : [],
      },
    };
  } catch {
    return null;
  }
}

function QuestionPage({
  step,
  title,
  helper,
  onBack,
  onAction,
  actionLabel = "המשך",
  busy = false,
  validationMessage,
  submitMessage,
  children,
}: QuestionPageProps) {
  return (
    <div
      className="screen-frame screen-frame--question"
      data-step={step}
      aria-busy={busy}
    >
      <ProgressHeader
        current={questionNumber(step)}
        total={QUESTION_STEPS.length}
        onBack={onBack}
      />

      <main className="question-content">
        <div className="question-heading">
          <h1 data-screen-heading tabIndex={-1}>
            {title}
          </h1>
          {helper ? <p>{helper}</p> : null}
        </div>

        {children}

        <div className="message-region" aria-live="assertive">
          {validationMessage ? (
            <div className="feedback-notice feedback-notice--error" role="alert">
              <AlertCircle size={20} aria-hidden="true" />
              <span>{validationMessage}</span>
            </div>
          ) : null}
          {submitMessage}
        </div>
      </main>

      <footer className="action-zone">
        <button
          className="primary-button"
          type="button"
          onClick={onAction}
          disabled={busy}
        >
          {busy ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              שולחים...
            </>
          ) : (
            actionLabel
          )}
        </button>
        <DeveloperCredit />
      </footer>
    </div>
  );
}

export function App() {
  const restored = useRef(readStoredSurvey()).current;
  const [screen, setScreen] = useState<Screen>(restored?.screen ?? "welcome");
  const [draft, setDraft] = useState<SurveyDraft>(
    restored?.draft ?? INITIAL_DRAFT,
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<ReactNode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const startedAt = useRef(Date.now());
  const submissionId = useRef<string | null>(null);
  const submittedDraftHash = useRef<string | null>(null);
  const ideaFieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isQuestionStep(screen)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ screen, draft }));
    }
  }, [draft, screen]);

  useEffect(() => {
    setValidationMessage(null);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: "auto" });
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>(
        "[data-screen-heading]",
      );
      heading?.focus({ preventScroll: true });
    });
  }, [screen]);

  function updateDraft(patch: Partial<SurveyDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationMessage(null);
    setSubmitError(null);
  }

  function resetSurvey() {
    sessionStorage.removeItem(STORAGE_KEY);
    setDraft(INITIAL_DRAFT);
    setScreen("welcome");
    setValidationMessage(null);
    setSubmitError(null);
    setIsSubmitting(false);
    startedAt.current = Date.now();
    submissionId.current = null;
    submittedDraftHash.current = null;
  }

  function goToNextStep(step: QuestionStep) {
    const error = validateStep(step, draft);
    if (error) {
      setValidationMessage(error);
      return;
    }

    if (step === "visit" && draft.visitFrequency === "not_yet") {
      sessionStorage.removeItem(STORAGE_KEY);
      setScreen("ineligible");
      return;
    }

    const currentIndex = QUESTION_STEPS.indexOf(step);
    const next = QUESTION_STEPS[currentIndex + 1];
    if (next) setScreen(next);
  }

  function goBack(step: QuestionStep) {
    const currentIndex = QUESTION_STEPS.indexOf(step);
    if (currentIndex <= 0) {
      setScreen("welcome");
      return;
    }
    setScreen(QUESTION_STEPS[currentIndex - 1]);
  }

  function changeMultiChoice(
    field: "likedElements" | "problems",
    otherField: "likedOther" | "problemOther",
    value: string,
  ) {
    const result = toggleMultiChoice(draft[field], value, "none", 3);

    if (result.limitReached) {
      setValidationMessage("אפשר לבחור עד 3 תשובות.");
      return;
    }

    updateDraft({
      [field]: result.values,
      ...(!result.values.includes("other") ? { [otherField]: "" } : {}),
    });
  }

  async function handleSubmit() {
    const error = validateStep("idea", draft);
    if (error) {
      setValidationMessage(error);
      return;
    }

    const unfinishedStarter = IDEA_STARTERS.some(
      (starter) => draft.ideaOrChange.trim() === starter.value,
    );
    if (unfinishedStarter) {
      setValidationMessage("צריך להמשיך את המשפט לפני השליחה.");
      ideaFieldRef.current?.focus();
      return;
    }

    if (!isOnline) {
      setSubmitError(
        <div className="feedback-notice feedback-notice--error" role="alert">
          <WifiOff size={20} aria-hidden="true" />
          <span>
            <strong>אין כרגע חיבור לאינטרנט.</strong>
            התשובות עדיין כאן. אפשר להתחבר ולנסות שוב.
          </span>
        </div>,
      );
      return;
    }

    const currentDraftHash = JSON.stringify(draft);
    if (
      !submissionId.current ||
      submittedDraftHash.current !== currentDraftHash
    ) {
      submissionId.current = crypto.randomUUID();
      submittedDraftHash.current = currentDraftHash;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildFeedbackPayload(
        draft,
        submissionId.current,
        Date.now() - startedAt.current,
      );
      await submitFeedback(payload);
      sessionStorage.removeItem(STORAGE_KEY);
      setScreen("success");
    } catch (caughtError) {
      setSubmitError(
        <div className="feedback-notice feedback-notice--error" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <span>
            <strong>לא הצלחנו לשלוח כרגע.</strong>
            התשובות עדיין כאן. אפשר לבדוק את החיבור ולנסות שוב.
          </span>
        </div>,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderQuestion() {
    if (!isQuestionStep(screen)) return null;

    switch (screen) {
      case "visit":
        return (
          <QuestionPage
            step="visit"
            title="כמה פעמים יצא לך להגיע לעיר הנוער?"
            onBack={() => goBack("visit")}
            onAction={() => goToNextStep("visit")}
            validationMessage={validationMessage}
          >
            <fieldset className="choice-list" aria-describedby="visit-helper">
              <legend className="sr-only">
                כמה פעמים יצא לך להגיע לעיר הנוער?
              </legend>
              <p className="choice-instruction" id="visit-helper">
                בחירה אחת
              </p>
              {VISIT_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  option={option}
                  name="visit-frequency"
                  type="radio"
                  selected={draft.visitFrequency === option.id}
                  onChange={() =>
                    updateDraft({
                      visitFrequency: option.id as VisitFrequency,
                    })
                  }
                />
              ))}
            </fieldset>
          </QuestionPage>
        );

      case "overall":
        return (
          <QuestionPage
            step="overall"
            title="איך היה הביקור בסך הכול?"
            onBack={() => goBack("overall")}
            onAction={() => goToNextStep("overall")}
            validationMessage={validationMessage}
          >
            <fieldset className="choice-list">
              <legend className="sr-only">איך היה הביקור בסך הכול?</legend>
              <p className="choice-instruction">בחירה אחת</p>
              {OVERALL_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  option={option}
                  name="overall-experience"
                  type="radio"
                  selected={draft.overallExperience === option.id}
                  onChange={() =>
                    updateDraft({
                      overallExperience: option.id as OverallExperience,
                    })
                  }
                />
              ))}
            </fieldset>
          </QuestionPage>
        );

      case "liked":
        return (
          <QuestionPage
            step="liked"
            title="מה היה הכי טוב?"
            helper="אפשר לבחור עד 3."
            onBack={() => goBack("liked")}
            onAction={() => goToNextStep("liked")}
            validationMessage={validationMessage}
          >
            <fieldset className="choice-list">
              <legend className="sr-only">מה היה הכי טוב?</legend>
              <p className="choice-instruction">
                אפשר לבחור כמה · נבחרו {draft.likedElements.length} מתוך 3
              </p>
              {LIKED_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  option={option}
                  name="liked-elements"
                  type="checkbox"
                  selected={draft.likedElements.includes(option.id)}
                  onChange={() =>
                    changeMultiChoice(
                      "likedElements",
                      "likedOther",
                      option.id,
                    )
                  }
                />
              ))}
            </fieldset>

            {draft.likedElements.includes("other") ? (
              <TextAreaField
                label="מה היה הדבר האחר שאהבת?"
                value={draft.likedOther}
                onChange={(likedOther) => updateDraft({ likedOther })}
                maximum={150}
                rows={2}
                placeholder="אפשר לכתוב כאן..."
              />
            ) : null}
          </QuestionPage>
        );

      case "problems":
        return (
          <QuestionPage
            step="problems"
            title="מה היה פחות טוב?"
            helper="אפשר לבחור עד 3."
            onBack={() => goBack("problems")}
            onAction={() => goToNextStep("problems")}
            validationMessage={validationMessage}
          >
            <fieldset className="choice-list">
              <legend className="sr-only">מה היה פחות טוב?</legend>
              <p className="choice-instruction">
                אפשר לבחור כמה · נבחרו {draft.problems.length} מתוך 3
              </p>
              {PROBLEM_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  option={option}
                  name="problems"
                  type="checkbox"
                  selected={draft.problems.includes(option.id)}
                  onChange={() =>
                    changeMultiChoice("problems", "problemOther", option.id)
                  }
                />
              ))}
            </fieldset>

            {draft.problems.includes("other") ? (
              <TextAreaField
                label="מה היה הדבר האחר שהפריע?"
                value={draft.problemOther}
                onChange={(problemOther) => updateDraft({ problemOther })}
                maximum={150}
                rows={2}
                placeholder="אפשר לכתוב כאן..."
              />
            ) : null}
          </QuestionPage>
        );

      case "safety": {
        const needsSafetyDetail =
          draft.safety === "not_very_safe" || draft.safety === "not_safe";

        return (
          <QuestionPage
            step="safety"
            title="עד כמה המקום הרגיש בטוח?"
            onBack={() => goBack("safety")}
            onAction={() => goToNextStep("safety")}
            validationMessage={validationMessage}
          >
            <fieldset className="choice-list">
              <legend className="sr-only">
                עד כמה המקום הרגיש בטוח?
              </legend>
              <p className="choice-instruction">בחירה אחת</p>
              {SAFETY_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  option={option}
                  name="safety"
                  type="radio"
                  selected={draft.safety === option.id}
                  onChange={() => {
                    const safety = option.id as SafetyRating;
                    updateDraft({
                      safety,
                      ...(!["not_very_safe", "not_safe"].includes(safety)
                        ? { safetyDetail: "" }
                        : {}),
                    });
                  }}
                />
              ))}
            </fieldset>

            {needsSafetyDetail ? (
              <div className="conditional-region">
                <TextAreaField
                  label="אפשר לספר מה גרם להרגשה הזאת"
                  value={draft.safetyDetail}
                  onChange={(safetyDetail) => updateDraft({ safetyDetail })}
                  maximum={500}
                  optional
                  placeholder="אפשר לכתוב כאן..."
                />
                <div
                  className="feedback-notice feedback-notice--warning"
                  role="note"
                >
                  <AlertCircle size={20} aria-hidden="true" />
                  <span>
                    אם יש סכנה עכשיו, כדאי לפנות מיד לאיש או אשת צוות במקום או
                    למבוגר שסומכים עליו. הטופס לא נבדק בזמן אמת.
                  </span>
                </div>
              </div>
            ) : null}
          </QuestionPage>
        );
      }

      case "return":
        return (
          <QuestionPage
            step="return"
            title="יש סיכוי לעוד ביקור?"
            onBack={() => goBack("return")}
            onAction={() => goToNextStep("return")}
            validationMessage={validationMessage}
          >
            <fieldset className="choice-list">
              <legend className="sr-only">יש סיכוי לעוד ביקור?</legend>
              <p className="choice-instruction">בחירה אחת</p>
              {RETURN_OPTIONS.map((option) => (
                <ChoiceCard
                  key={option.id}
                  option={option}
                  name="return-intent"
                  type="radio"
                  selected={draft.returnIntent === option.id}
                  onChange={() =>
                    updateDraft({
                      returnIntent: option.id as ReturnIntent,
                    })
                  }
                />
              ))}
            </fieldset>
          </QuestionPage>
        );

      case "idea":
        {
          const normalizedIdea = draft.ideaOrChange.trim();
          const activeStarter = IDEA_STARTERS.find(
            (starter) => starter.value === normalizedIdea,
          );
          const showStarters = !normalizedIdea || Boolean(activeStarter);

          function chooseIdeaStarter(starter: (typeof IDEA_STARTERS)[number]) {
            const ideaOrChange = `${starter.value} `;
            ideaFieldRef.current?.focus();
            updateDraft({ ideaOrChange });
            requestAnimationFrame(() => {
              ideaFieldRef.current?.setSelectionRange(
                ideaOrChange.length,
                ideaOrChange.length,
              );
            });
          }

        return (
          <QuestionPage
            step="idea"
            title="מה הדבר הראשון שכדאי להוסיף או לשנות?"
            helper="אפשר לכתוב רעיון חדש או להסביר משהו שכדאי לתקן."
            onBack={() => goBack("idea")}
            onAction={handleSubmit}
            actionLabel="לשלוח"
            busy={isSubmitting}
            validationMessage={validationMessage}
            submitMessage={submitError}
          >
            {showStarters ? (
              <section
                className="idea-starters"
                aria-labelledby="idea-starters-title"
              >
                <p id="idea-starters-title">
                  אפשר לבחור התחלה ולהמשיך לכתוב:
                </p>
                <div
                  className="idea-starters__scroller"
                  role="group"
                  aria-label="התחלות אפשריות למשפט"
                >
                  {IDEA_STARTERS.map((starter) => (
                    <button
                      className={`idea-starter${activeStarter === starter ? " is-selected" : ""}`}
                      key={starter.value}
                      type="button"
                      onClick={() => chooseIdeaStarter(starter)}
                    >
                      {starter.label}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}
            <TextAreaField
              inputRef={ideaFieldRef}
              label="התשובה שלך"
              value={draft.ideaOrChange}
              onChange={(ideaOrChange) => updateDraft({ ideaOrChange })}
              maximum={1000}
              optional
              placeholder="אפשר לכתוב כאן..."
            />
          </QuestionPage>
        );
        }
    }
  }

  if (screen === "welcome") {
    return (
      <div className="screen-frame welcome-screen">
        <main className="welcome-content">
          <div className="welcome-copy">
            <h1 data-screen-heading tabIndex={-1}>
              איך היה לך בעיר הנוער?
            </h1>
            <p className="welcome-lead">מה היה טוב ומה כדאי לשנות?</p>
            <p className="welcome-support">
              לא מבקשים שם או טלפון. השאלון לוקח פחות משתי דקות.
            </p>
          </div>

          <details className="privacy-disclosure">
            <summary>
              <LockKeyhole size={18} aria-hidden="true" />
              <span>איך זה אנונימי?</span>
              <ChevronDown
                className="privacy-disclosure__chevron"
                size={20}
                aria-hidden="true"
              />
            </summary>
            <p>
              הטופס לא מבקש שם, טלפון, דוא״ל, בית ספר או התחברות. בתשובות
              הפתוחות חשוב לא לכתוב פרטים שמזהים אותך או אנשים אחרים.
            </p>
          </details>
        </main>

        <footer className="action-zone action-zone--welcome">
          <button
            className="primary-button"
            type="button"
            onClick={() => setScreen("visit")}
          >
            מתחילים
          </button>
          <DeveloperCredit />
        </footer>
      </div>
    );
  }

  if (screen === "ineligible") {
    return (
      <div className="screen-frame terminal-screen">
        <main className="terminal-content">
          <div className="terminal-icon terminal-icon--info" aria-hidden="true">
            <AlertCircle size={30} />
          </div>
          <h1 data-screen-heading tabIndex={-1}>
            השאלון הזה מיועד למי שכבר ביקרו בעיר הנוער
          </h1>
          <p>נשמח לשמוע ממך אחרי הביקור.</p>
        </main>
        <footer className="action-zone">
          <button className="primary-button" type="button" onClick={resetSurvey}>
            חזרה להתחלה
          </button>
          <DeveloperCredit />
        </footer>
      </div>
    );
  }

  if (screen === "success") {
    return (
      <div className="screen-frame terminal-screen">
        <main className="terminal-content">
          <div
            className="terminal-icon terminal-icon--success"
            aria-hidden="true"
          >
            <CheckCircle2 size={34} />
          </div>
          <img
            className="success-illustration"
            src="/youth-city-activities.png"
            alt=""
          />
          <h1 data-screen-heading tabIndex={-1}>
            תודה על השיתוף
          </h1>
          <p>המשוב נשלח בלי השם שלך ויעזור לשפר את עיר הנוער.</p>
          <a
            className="whatsapp-group-link"
            href="https://chat.whatsapp.com/KuBIAtFiMMOEbVMByJzywJ?mode=gi_t"
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={20} aria-hidden="true" />
            <span>להצטרפות לקבוצת הוואטסאפ</span>
          </a>
        </main>
        <footer className="action-zone">
          <button className="primary-button" type="button" onClick={resetSurvey}>
            סיימתי
          </button>
          <DeveloperCredit />
        </footer>
      </div>
    );
  }

  return renderQuestion();
}
