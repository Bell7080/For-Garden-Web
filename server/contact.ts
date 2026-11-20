/**
 * 사전예약 연락처 규칙. 홈페이지 폼과 접수 API가 같은 함수를 읽는다(보여 준 판정과 저장 판정이 갈리지 않게).
 * 번호는 E.164(+국가번호…)로 굳혀 중복을 막는다 — 010-1234-5678과 +82 10 1234 5678은 같은 번호다.
 */

/** 저장·중복 판정에 쓰는 번호. 한국 휴대폰(01X)은 국가번호 없이 받고, 다른 나라는 +로 시작해야 한다. 틀리면 null. */
export function normalizePhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/[^0-9+\-().\s]/.test(raw)) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (raw.startsWith("+")) {
    if (!/^[1-9][0-9]{7,14}$/.test(digits)) return null;
    // +82 010 … 처럼 국가번호 뒤에 0을 남긴 입력도 받아 준다.
    if (digits.startsWith("820")) return normalizePhone(digits.slice(2));
    if (digits.startsWith("82") && !/^821[016789][0-9]{7,8}$/.test(digits)) return null;
    return "+" + digits;
  }
  if (/^01[016789][0-9]{7,8}$/.test(digits)) return "+82" + digits.slice(1);
  return null;
}

/** 이메일 형식. 서버 SQL의 정규식과 같은 뜻이다. */
export function validEmail(input: string): boolean {
  const email = input.trim();
  return email.length > 0 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 흔한 메일 도메인 오타. 고쳐 쓰지 않고 「혹시 이 주소인가요?」로만 묻는다. */
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com",
  "gmail.con": "gmail.com", "gmail.cmo": "gmail.com", "gmaill.com": "gmail.com", "gnail.com": "gmail.com",
  "naver.co": "naver.com", "naver.con": "naver.com", "navr.com": "naver.com", "nave.com": "naver.com",
  "naer.com": "naver.com", "naver.cmo": "naver.com", "daum.ent": "daum.net", "daum.com": "daum.net",
  "duam.net": "daum.net", "hanmial.net": "hanmail.net", "hanmail.com": "hanmail.net", "hanmai.net": "hanmail.net",
  "kakao.co": "kakao.com", "nate.co": "nate.com", "hotmial.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "yahoo.co": "yahoo.com", "yaho.com": "yahoo.com", "outlok.com": "outlook.com", "icloud.co": "icloud.com",
  "iclod.com": "icloud.com",
};
export function emailTypoSuggestion(input: string): string | null {
  const email = input.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at < 1) return null;
  const fix = DOMAIN_TYPOS[email.slice(at + 1)];
  return fix ? email.slice(0, at + 1) + fix : null;
}

/** 유입 경로(?ref=gstar). 소문자·숫자·-·_ 32자만 남기고 나머지는 버린다. */
export function normalizeSource(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim().toLowerCase();
  return /^[a-z0-9_-]{1,32}$/.test(v) ? v : null;
}

/** 동의 문서 버전. 안내 문구(/legal/preregistration-consent)를 고치면 함께 올린다. */
export const PREREGISTRATION_CONSENT_VERSION = "preregistration-v2";
