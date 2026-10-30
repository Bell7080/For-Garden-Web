import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 출시 알림 수신거부 링크의 서명. 메일을 보내는 쪽(아직 없음)이 이 함수로 링크를 만든다 —
 * `/unsubscribe#e=<이메일>&t=<서명>`. 서명이 없으면 남의 이메일로 신청을 지울 수 있으므로 서버가 다시 검증한다.
 * 비밀값은 `UNSUBSCRIBE_SECRET`이며 서비스 역할 키와 따로 둔다.
 */
export function unsubscribeToken(email: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${email.trim().toLowerCase()}`).digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string, secret: string): boolean {
  if (!secret || !/^[0-9a-f]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(unsubscribeToken(email, secret)), Buffer.from(token));
}

/** 메일 하단에 넣을 수신거부 주소. */
export function unsubscribeLink(origin: string, email: string, secret: string): string {
  const url = new URL("/unsubscribe", origin);
  url.hash = `e=${encodeURIComponent(email.trim().toLowerCase())}&t=${unsubscribeToken(email, secret)}`;
  return url.toString();
}
