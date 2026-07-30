import { useId, type RefObject } from "react";
import { clampCharacters, countCharacters } from "../domain/survey";

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
}: TextAreaFieldProps) {
  const fieldId = useId();
  const helperId = `${fieldId}-helper`;

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
        aria-describedby={helperId}
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
    </div>
  );
}
