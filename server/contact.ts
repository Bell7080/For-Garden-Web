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
export const PREREGISTRATION_CONSENT_VERSION = "preregistration-v4";

/**
 * 누가 봐도 지어낸 번호(같은 숫자 반복 · 0000/1234 꼴 가입자 번호). 문자 인증이 없는 동안 번호를 필수로 받는 이유가
 * 「한 사람 한 건」이므로, 아무 번호나 지어 적는 가장 흔한 방법만 막는다. 실제 번호를 막지 않도록 좁게 잡는다.
 */
export function implausiblePhone(e164: string): boolean {
  const digits = e164.replace(/^\+/, "");
  const local = digits.startsWith("82") ? digits.slice(2) : digits;
  const subscriber = local.slice(-8);
  if (/^(\d)\1+$/.test(subscriber)) return true;
  const SEQUENCES = ["12345678", "23456789", "87654321", "98765432", "01234567"];
  if (SEQUENCES.includes(subscriber)) return true;
  // 01X-0000-XXXX: 국번(가운데 넷)이 0000인 휴대폰 번호는 쓰지 않는다.
  if (digits.startsWith("821") && /^0000/.test(local.slice(-8))) return true;
  return false;
}

/**
 * 일회용(임시) 메일 도메인. 이메일은 선택이지만 적었다면 실제로 받을 수 있는 주소여야 출시 안내가 닿는다.
 * 흔히 쓰이는 것만 둔다 — 목록 밖 도메인은 막지 않는다.
 */
export const DISPOSABLE_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  "10minutemail.com", "10minutemail.net", "20minutemail.com", "33mail.com", "byom.de", "discard.email",
  "dispostable.com", "dropmail.me", "emailondeck.com", "fakeinbox.com", "fakemail.net", "getairmail.com",
  "getnada.com", "guerrillamail.biz", "guerrillamail.com", "guerrillamail.de", "guerrillamail.info",
  "guerrillamail.net", "guerrillamail.org", "guerrillamailblock.com", "harakirimail.com", "inboxkitten.com",
  "maildrop.cc", "mailinator.com", "mailinator.net", "mailnesia.com", "mailpoof.com", "mintemail.com",
  "mohmal.com", "moakt.com", "mytemp.email", "nada.email", "sharklasers.com", "spam4.me", "spamgourmet.com",
  "temp-mail.io", "temp-mail.org", "tempail.com", "tempmail.com", "tempmail.dev", "tempmail.net",
  "tempmailo.com", "tempr.email", "throwawaymail.com", "trashmail.com", "trashmail.de", "trashmail.net",
  "yopmail.com", "yopmail.fr", "yopmail.net", "grr.la", "pokemail.net", "mailcatch.com", "emailfake.com",
  "burnermail.io", "linshiyouxiang.net", "tmpmail.org", "tmpmail.net", "minuteinbox.com", "1secmail.com",
  "1secmail.net", "1secmail.org", "mail.tm", "mail.gw", "tmail.ws", "inboxbear.com", "luxusmail.org",
]);
export function disposableEmail(input: string): boolean {
  const email = input.trim().toLowerCase();
  const domain = email.slice(email.lastIndexOf("@") + 1);
  if (!domain) return false;
  for (const d of DISPOSABLE_EMAIL_DOMAINS) if (domain === d || domain.endsWith("." + d)) return true;
  return false;
}
