import { AlertCircle } from "lucide-react";
import { useId, type RefObject } from "react";
import { clampCharacters, countCharacters } from "../domain/survey";
import { containsOffensiveLanguage } from "../domain/offensiveLanguage.js";

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximum: number;
  rows?: number;
  optional?: boolean;
  placeholder?: string;
  privacyReminder?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  moderationMode?: "block" | "warn";
}

export function TextAreaField({
  label,
  value,
  onChange,
  maximum,
  rows = 4,
  optional = false,
  placeholder,
  privacyReminder = true,
  inputRef,
  moderationMode = "block",
}: TextAreaFieldProps) {
  const fieldId = useId();
  const helperId = `${fieldId}-helper`;
  const moderationId = `${fieldId}-moderation`;
  const hasOffensiveLanguage = containsOffensiveLanguage(value);

  return (
    <div className="text-field">
      <label className="text-field__label" htmlFor={fieldId}>
        {label}
        {optional ? <span>לא חייבים לענות</span> : null}
      </label>
      <textarea
        ref={inputRef}
        id={fieldId}
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-describedby={
          hasOffensiveLanguage ? `${helperId} ${moderationId}` : helperId
        }
        aria-invalid={
          hasOffensiveLanguage && moderationMode === "block" ? true : undefined
        }
        onChange={(event) =>
          onChange(clampCharacters(event.target.value, maximum))
        }
      />
      <div className="text-field__meta" id={helperId}>
        {privacyReminder ? (
          <span>לא לכתוב שמות, טלפון או פרטים מזהים.</span>
        ) : (
          <span />
        )}
        <bdi>{countCharacters(value)}/{maximum}</bdi>
      </div>
      {hasOffensiveLanguage ? (
        <div
          className="feedback-notice feedback-notice--warning"
          id={moderationId}
          role="status"
        >
          <AlertCircle size={20} aria-hidden="true" />
          <span>
            {moderationMode === "warn"
              ? "זיהינו מילה שעלולה לפגוע. אם זה תיאור של מה שקרה, אפשר להמשיך; אחרת כדאי לנסח מחדש."
              : "זיהינו מילה שעלולה לפגוע. צריך לנסח את התשובה בדרך מכבדת יותר."}
          </span>
        </div>
      ) : null}
    </div>
  );
}
