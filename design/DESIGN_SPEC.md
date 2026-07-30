# Client design specification

## Source of truth

- Product requirements: [`../PRD.md`](../PRD.md)
- OpenAI ImageGen concept: [`anonteen-feedback-concept.png`](anonteen-feedback-concept.png)
- OpenAI ImageGen interactive direction: [`teen-interactive-concept.png`](teen-interactive-concept.png)
- OpenAI ImageGen production illustration: [`../public/youth-city-activities.png`](../public/youth-city-activities.png)
- OpenAI ImageGen welcome background: [`../public/teen-welcome-background.webp`](../public/teen-welcome-background.webp)
- OpenAI ImageGen question background: [`../public/teen-question-background.webp`](../public/teen-question-background.webp)

The concept is a layout, palette, component, and density reference. All shipped Hebrew text and controls remain code-native and must follow the PRD copy, even when the generated concept contains imperfect text.

## Mobbin patterns adapted

- [Duolingo onboarding](https://mobbin.com/flows/b0b4f93f-5637-46ec-9d77-49ecda6b991d): one prompt per screen, slim progress, large answer rows, sticky action.
- [Calm Sleep survey](https://mobbin.com/screens/251dfe23-3d4c-4013-8eaf-6ae79be086a5): selected rows use border, fill, and check—not color alone.
- [Plenty of Fish survey](https://mobbin.com/flows/8181f889-f1f9-40e7-ab3a-3d9a5f83aff4): explicitly distinguish single and multiple selection.
- [Quo additional feedback](https://mobbin.com/screens/de4e8264-54ed-44c1-8081-736f8acb94a2): optional multiline field, visible counter, stable submit action.
- [Tomorrow privacy reassurance](https://mobbin.com/screens/71f69c83-8bf8-4b42-a102-5e9d028e14e8): concise trust disclosure before the primary action.

Avoid long flows, dropdowns, star-only ratings, tiny chips, auto-advance, color-only selection, and mascot-heavy treatment.

## Visual direction

- Theme: clear, energetic, credible youth feedback.
- Canvas: true white, not cream or gray.
- Main architecture: one centered mobile column, open whitespace, no page-sized card wrapper.
- Signature motifs: slim segmented progress, confident outlined selection rows, cobalt bottom action, coral micro-accent.
- Media: full-screen activity backgrounds keep a completely calm white center and place
  youth-venue objects only around the edges.
- Motion: short screen entrance, selected-card spring, current-progress pulse, disclosure
  rotation, and tactile CTA feedback; all disabled when reduced motion is requested.

## Interaction rules

- Interactions reinforce real survey actions; they never add points, streaks, urgency, or
  pressure to answer positively.
- Single-choice answers do not auto-advance so teens can review their answer.
- Selected answers use border, fill, checkmark, elevation, and motion rather than color alone.
- The current progress segment may pulse subtly; completed segments remain still.
- Background imagery is decorative and must never intercept pointer events or reduce text
  contrast.
- Every screen includes a visually secondary Hebrew developer credit below the primary
  action: `פותח על ידי MSX`, linking to `https://msx.co.il/` in a new tab.
- The final optional idea field offers horizontally scrollable sentence starters. Choosing
  one inserts an unfinished phrase, moves focus to the textarea, and requires the teen to
  add their own words before submission. Leaving the field empty remains valid.

## Tokens

| Role | Value |
| --- | --- |
| Canvas | `#FFFFFF` |
| Text | `#0B1736` |
| Muted text | `#667085` |
| Primary | `#1458F5` |
| Primary hover | `#0D46CD` |
| Primary soft | `#EAF1FF` |
| Coral accent | `#FF5C4D` |
| Sky surface | `#EAF7FF` |
| Border | `#CBD3E1` |
| Border strong | `#8E9AAF` |
| Error | `#B42318` |
| Error soft | `#FEF3F2` |
| Warning | `#8A4B08` |
| Warning soft | `#FFF7E8` |
| Focus | `#7CA4FF` |

Radii: `12px` inputs, `16px` answer rows, `14px` primary buttons.  
Shadow: only the sticky action-zone separator and a restrained illustration shadow.  
Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40`.

## Typography

- Family: Rubik, delivered locally from the application bundle.
- Main question: 28–32px, weight 700, line-height 1.2.
- Supporting copy: 16–18px, weight 400–500, line-height 1.55.
- Answer rows: 17px, weight 500.
- Buttons: 18px, weight 700.
- Meta/progress/counters: 14px, weight 500.

## Component inventory

- `SurveyShell`: centered content, dynamic viewport, safe-area padding.
- `ProgressHeader`: RTL back action plus seven-part progress rail.
- `ChoiceCard`: native radio or checkbox input, full-row label, redundant selected indicator.
- `QuestionScreen`: heading, helper, options, inline error, sticky action.
- `TextAreaField`: label/helper, four visible rows, counter, PII reminder.
- `PrivacyDisclosure`: accessible expandable trust statement.
- `FeedbackNotice`: safety warning, configuration error, network error.
- `WelcomeScreen`, `IneligibleScreen`, and persistence-confirmed `SuccessScreen`.

## Allowed welcome copy

- `איך היה לך בעיר הנוער?`
- `מה היה טוב ומה כדאי לשנות?`
- `לא מבקשים שם או טלפון. השאלון לוקח פחות משתי דקות.`
- `מתחילים`
- `איך זה אנונימי?`

Do not add a badge, eyebrow, slogan, navigation, statistics, or extra call to action.

## Submit boundary

The client uses an injected direct-Supabase adapter. A success screen may appear only after Supabase confirms the insert. Without valid client configuration, submission must produce a designed configuration error while preserving all answers. No mock success is allowed in the production path.
