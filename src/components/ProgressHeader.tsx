import { ChevronRight } from "lucide-react";

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
      <button className="back-button" type="button" onClick={onBack}>
        <ChevronRight size={22} strokeWidth={2.2} aria-hidden="true" />
        <span>חזרה</span>
      </button>

      <p className="progress-copy" aria-live="polite">
        שלב {current} מתוך {total}
      </p>

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
