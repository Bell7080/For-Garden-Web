import { describe, expect, it } from "vitest";
import { emailTypoSuggestion, normalizePhone, normalizeSource, validEmail } from "../server/contact";

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
});
