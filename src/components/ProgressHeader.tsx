import { Check, ChevronRight, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const SURVEY_SHARE_URL = "https://anon.netanya.club/";

type ShareStatus = "idle" | "shared" | "copied" | "error";

interface SurveyShareButtonProps {
  variant?: "header" | "success";
}

export function SurveyShareButton({
  variant = "header",
}: SurveyShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  function showStatus(nextStatus: ShareStatus) {
    setStatus(nextStatus);
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setStatus("idle"), 3200);
  }

  async function copyShareUrl() {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(SURVEY_SHARE_URL);
    showStatus("copied");
    return true;
  }

  async function handleShare() {
    const shareData = {
      title: "משוב אנונימי על עיר הנוער",
      text: "כבר ביקרת בעיר הנוער? אפשר לשתף במשוב אנונימי קצר ולהשפיע.",
      url: SURVEY_SHARE_URL,
    };

    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData);
        showStatus("shared");
        return;
      }

      if (!(await copyShareUrl())) {
        showStatus("error");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;

      try {
        if (await copyShareUrl()) return;
      } catch {
        // The visible URL on the success page remains available as a fallback.
      }

      showStatus("error");
    }
  }

  const statusMessage = {
    idle: "",
    shared: "השיתוף הושלם",
    copied: "הקישור הועתק",
    error: "לא הצלחנו לשתף כרגע",
  }[status];

  return (
    <div className={`share-control share-control--${variant}`}>
      <button
        className={`share-button share-button--${variant}`}
        type="button"
        onClick={handleShare}
        aria-label={
          variant === "header" ? "שיתוף השאלון" : "לשתף את השאלון עם אחרים"
        }
      >
        {status === "copied" || status === "shared" ? (
          <Check size={18} strokeWidth={2.4} aria-hidden="true" />
        ) : (
          <Share2 size={18} strokeWidth={2.2} aria-hidden="true" />
        )}
        <span>{variant === "header" ? "שיתוף" : "לשתף את השאלון"}</span>
      </button>
      <span className="share-button__status" role="status" aria-live="polite">
        {statusMessage}
      </span>
    </div>
  );
}

interface ProgressHeaderProps {
  current: number;
  total: number;
  onBack: () => void;
}

export function ProgressHeader({
  current,
  total,
  onBack,
}: ProgressHeaderProps) {
  return (
    <header className="progress-header">
      <div className="progress-header__top">
        <button className="back-button" type="button" onClick={onBack}>
          <ChevronRight size={22} strokeWidth={2.2} aria-hidden="true" />
          <span>חזרה</span>
        </button>

        <p className="progress-copy" aria-live="polite">
          שלב {current} מתוך {total}
        </p>

        <SurveyShareButton />
      </div>

      <div
        className="progress-rail"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`שלב ${current} מתוך ${total}`}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            className={[
              index < current ? "is-complete" : "",
              index === current - 1 ? "is-current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={index}
            aria-hidden="true"
          />
        ))}
      </div>
    </header>
  );
}
