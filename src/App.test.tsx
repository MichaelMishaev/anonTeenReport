import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

async function beginSurvey() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "מתחילים" }));
  return user;
}

describe("anonymous youth feedback flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the Hebrew MSX developer credit as an external link", () => {
    render(<App />);

    const credit = screen.getByRole("link", { name: "פותח על ידי MSX" });
    expect(credit).toHaveAttribute("href", "https://msx.co.il/");
    expect(credit).toHaveAttribute("target", "_blank");
  });

  it("opens the password-protected results view and loads feedback", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total: 1,
          by_overall_experience: { excellent: 1 },
          by_return_intent: { definitely: 1 },
          responses: [],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "כניסה לתוצאות" }));
    await user.type(screen.getByLabelText("סיסמה"), "6262");
    await user.click(screen.getByRole("button", { name: "כניסה" }));

    expect(await screen.findByRole("heading", { name: "תוצאות המשוב" })).toBeInTheDocument();
    expect(screen.getByText("סה״כ תשובות")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/admin/login", expect.objectContaining({ method: "POST" }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/admin/results");
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

  it("shares only the public questionnaire URL from the header", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { onLine: true, share });

    const user = await beginSurvey();
    await user.click(screen.getByRole("button", { name: "שיתוף השאלון" }));

    expect(share).toHaveBeenCalledWith({
      title: "משוב אנונימי על עיר הנוער",
      text: "כבר ביקרת בעיר הנוער? אפשר לשתף במשוב אנונימי קצר ולהשפיע.",
      url: "https://anon.netanya.club/",
    });
    expect(await screen.findByText("השיתוף הושלם")).toBeInTheDocument();
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

  it("never shows success when the submission API is unavailable", async () => {
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
      await screen.findByText("לא הצלחנו לשלוח כרגע."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "תודה על השיתוף" }),
    ).not.toBeInTheDocument();
  });

  it("invites teens to share the public URL after a successful submission", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
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
      await screen.findByRole("heading", { name: "תודה על השיתוף" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("המשוב נשלח בלי השם שלך ויעזור לשפר את עיר הנוער."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "יש חברים שגם היו בעיר הנוער?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "לשתף את השאלון עם אחרים" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "anon.netanya.club" })).toHaveAttribute(
      "href",
      "https://anon.netanya.club/",
    );
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
