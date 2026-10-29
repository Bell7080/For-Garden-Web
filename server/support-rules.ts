// 문의 접수 규칙. 게임(`src/core/supportDraft.ts`)과 DB(`submit_ticket`·`web_submit_ticket`)가 쓰는 값과 같아야 한다.
// 한쪽을 바꾸면 세 곳을 함께 바꾼다 — `tests/support-rules.test.ts`가 이 표를 고정한다.
export const TICKET_CATEGORIES = ["inquiry", "bug", "report", "privacy", "other"] as const;
export const TICKET_SUBJECT_MAX = 100;
export const TICKET_BODY_MAX = 4000;
export const TICKET_EMAIL_MAX = 254;

export function isTicketCategory(value: unknown): boolean {
  return (TICKET_CATEGORIES as readonly unknown[]).includes(value);
}
