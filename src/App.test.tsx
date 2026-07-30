import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

async function beginSurvey() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "מתחילים" }));
  return user;
}

describe("anonymous youth feedback flow", () => {
  it("shows the Hebrew MSX developer credit as an external link", () => {
    render(<App />);

    const credit = screen.getByRole("link", { name: "פותח על ידי MSX" });
    expect(credit).toHaveAttribute("href", "https://msx.co.il/");
    expect(credit).toHaveAttribute("target", "_blank");
  });

  it("stops non-visitors before the experience questions", async () => {
    const user = await beginSurvey();
    await user.click(screen.getByRole("radio", { name: "עוד לא הגעתי" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));

    expect(
      screen.getByRole("heading", {
        name: "השאלון הזה מיועד למי שכבר ביקרו בעיר הנוער",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "איך היה הביקור בסך הכול?" }),
    ).not.toBeInTheDocument();
  });

  it("keeps safety detail conditional and clears it after a positive answer", async () => {
    const user = await beginSurvey();
    await user.click(screen.getByRole("radio", { name: "פעם אחת" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("radio", { name: "מעולה" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(
      screen.getByRole("checkbox", { name: "גיימינג וטכנולוגיה" }),
    );
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(
      screen.getByRole("checkbox", { name: "שום דבר לא הפריע" }),
    );
    await user.click(screen.getByRole("button", { name: "המשך" }));

    await user.click(
      screen.getByRole("radio", { name: "לא כל כך בטוח" }),
    );
    const detail = screen.getByRole("textbox", {
      name: /אפשר לספר מה גרם להרגשה הזאת/,
    });
    await user.type(detail, "היה צפוף");
    expect(detail).toHaveValue("היה צפוף");

    await user.click(screen.getByRole("radio", { name: "בטוח מאוד" }));
    expect(
      screen.queryByRole("textbox", {
        name: /אפשר לספר מה גרם להרגשה הזאת/,
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("radio", { name: "לא כל כך בטוח" }),
    );
    expect(
      screen.getByRole("textbox", {
        name: /אפשר לספר מה גרם להרגשה הזאת/,
      }),
    ).toHaveValue("");
  });

  it("never shows success when Supabase is not configured", async () => {
    const user = await beginSurvey();

    await user.click(screen.getByRole("radio", { name: "פעם אחת" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("radio", { name: "די טוב" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(
      screen.getByRole("checkbox", { name: "להיות עם חברים" }),
    );
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(
      screen.getByRole("checkbox", { name: "שום דבר לא הפריע" }),
    );
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("radio", { name: "די בטוח" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("radio", { name: "בטוח שכן" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("button", { name: "לשלוח" }));

    expect(
      await screen.findByText("השליחה עדיין לא מחוברת."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "תודה על השיתוף" }),
    ).not.toBeInTheDocument();
  });

  it("inserts a sentence starter and requires the teen to finish it", async () => {
    const user = await beginSurvey();

    await user.click(screen.getByRole("radio", { name: "פעם אחת" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("radio", { name: "די טוב" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(
      screen.getByRole("checkbox", { name: "להיות עם חברים" }),
    );
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(
      screen.getByRole("checkbox", { name: "שום דבר לא הפריע" }),
    );
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("radio", { name: "די בטוח" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));
    await user.click(screen.getByRole("radio", { name: "בטוח שכן" }));
    await user.click(screen.getByRole("button", { name: "המשך" }));

    await user.click(
      screen.getByRole("button", { name: "להוסיף עוד טורנירים של…" }),
    );
    const ideaField = screen.getByRole("textbox", {
      name: /התשובה שלך/,
    });

    expect(ideaField).toHaveFocus();
    expect(ideaField).toHaveValue("להוסיף עוד טורנירים של ");

    await user.click(screen.getByRole("button", { name: "לשלוח" }));
    expect(
      screen.getByText("צריך להמשיך את המשפט לפני השליחה."),
    ).toBeInTheDocument();

    await user.type(ideaField, "כדורגל");
    expect(
      screen.queryByRole("button", { name: "להוסיף עוד טורנירים של…" }),
    ).not.toBeInTheDocument();
  });
});
