import { Check } from "lucide-react";
import type { ChoiceOption } from "../domain/survey";

interface ChoiceCardProps {
  option: ChoiceOption;
  name: string;
  type: "radio" | "checkbox";
  selected: boolean;
  onChange: () => void;
}

export function ChoiceCard({
  option,
  name,
  type,
  selected,
  onChange,
}: ChoiceCardProps) {
  function handleChange() {
    onChange();
  }

  return (
    <label
      className={`choice-card${selected ? " is-selected" : ""}`}
      data-selected={selected ? "true" : "false"}
    >
      <input
        className="choice-input"
        type={type}
        name={name}
        value={option.id}
        checked={selected}
        onChange={handleChange}
      />
      <span className="choice-copy">
        {option.emoji ? (
          <span className="choice-emoji" aria-hidden="true">
            {option.emoji}
          </span>
        ) : null}
        <span>{option.label}</span>
      </span>
      <span
        className={`choice-indicator choice-indicator--${type}`}
        aria-hidden="true"
      >
        {selected ? <Check size={18} strokeWidth={3} /> : null}
      </span>
    </label>
  );
}
