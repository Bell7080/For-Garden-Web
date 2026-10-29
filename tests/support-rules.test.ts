import { describe, expect, it } from "vitest";
import { TICKET_BODY_MAX, TICKET_CATEGORIES, TICKET_EMAIL_MAX, TICKET_SUBJECT_MAX, isTicketCategory } from "../server/support-rules";

describe("문의 접수 규칙", () => {
  it("게임·DB와 같은 값을 쓴다", () => {
    expect([...TICKET_CATEGORIES]).toEqual(["inquiry", "bug", "report", "privacy", "other"]);
    expect(TICKET_SUBJECT_MAX).toBe(100);
    expect(TICKET_BODY_MAX).toBe(4000);
    expect(TICKET_EMAIL_MAX).toBe(254);
  });
  it("모르는 종류는 거절한다", () => {
    expect(isTicketCategory("bug")).toBe(true);
    expect(isTicketCategory("spam")).toBe(false);
  });
});
