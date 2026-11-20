import { describe, expect, it } from "vitest";
import { disposableEmail, emailTypoSuggestion, implausiblePhone, normalizePhone, normalizeSource, validEmail } from "../server/contact";

describe("사전예약 연락처 규칙", () => {
  it("같은 번호는 어떻게 적어도 하나로 굳는다", () => {
    for (const v of ["010-1234-5678", "01012345678", "010 1234 5678", "+82 10-1234-5678", "+82 010 1234 5678"])
      expect(normalizePhone(v)).toBe("+821012345678");
    expect(normalizePhone("+1 555 123 4567")).toBe("+15551234567");
  });
  it("휴대폰이 아닌 번호와 이상한 글자는 받지 않는다", () => {
    for (const v of ["02-123-4567", "12345", "010-12a4-5678", "+82 2 123 4567", "", "+0123456789"])
      expect(normalizePhone(v)).toBeNull();
  });
  it("흔한 메일 도메인 오타만 묻는다", () => {
    expect(emailTypoSuggestion("me@gmial.com")).toBe("me@gmail.com");
    expect(emailTypoSuggestion("me@naver.co")).toBe("me@naver.com");
    expect(emailTypoSuggestion("me@gmail.com")).toBeNull();
    expect(validEmail("me@gmail.com")).toBe(true);
    expect(validEmail("me@gmail")).toBe(false);
  });
  it("유입 경로는 짧은 소문자 태그만 남긴다", () => {
    expect(normalizeSource("GSTAR")).toBe("gstar");
    expect(normalizeSource("<script>")).toBeNull();
    expect(normalizeSource(42)).toBeNull();
  });
  it("누가 봐도 지어낸 번호만 막는다", () => {
    for (const v of ["+821011111111", "+821000000000", "+821012345678", "+821087654321", "+821000001234"])
      expect(implausiblePhone(v)).toBe(true);
    for (const v of ["+821027418853", "+821058392047", "+15551234567", "+819012345679"])
      expect(implausiblePhone(v)).toBe(false);
  });
  it("일회용 메일 도메인은 하위 도메인까지 막고 흔한 메일은 통과시킨다", () => {
    expect(disposableEmail("a@mailinator.com")).toBe(true);
    expect(disposableEmail("a@x.yopmail.com")).toBe(true);
    for (const v of ["a@gmail.com", "a@naver.com", "a@mail.com", "a@notmailinator.com"])
      expect(disposableEmail(v)).toBe(false);
  });
});
