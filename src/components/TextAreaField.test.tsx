import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TextAreaField } from "./TextAreaField";

describe("TextAreaField moderation", () => {
  it("shows a blocking message for offensive language by default", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TextAreaField
        label="התשובה שלך"
        value=""
        onChange={onChange}
        maximum={150}
      />,
    );

    await user.type(screen.getByRole("textbox"), "מפגר");
    expect(onChange).toHaveBeenCalled();

    rerender(
      <TextAreaField
        label="התשובה שלך"
        value="מפגר"
        onChange={onChange}
        maximum={150}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText(
        "זיהינו מילה שעלולה לפגוע. צריך לנסח את התשובה בדרך מכבדת יותר.",
      ),
    ).toBeInTheDocument();
  });

  it("uses a non-blocking warning for safety reports", () => {
    render(
      <TextAreaField
        label="מה קרה?"
        value="מישהו קרא לי מפגר"
        onChange={vi.fn()}
        maximum={500}
        moderationMode="warn"
      />,
    );

    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    expect(
      screen.getByText(/אם זה תיאור של מה שקרה, אפשר להמשיך/),
    ).toBeInTheDocument();
  });
});
