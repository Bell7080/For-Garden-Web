import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";

// 홈페이지 쿠폰 등록. 게임이 발급한 15분짜리 연결 티켓으로만 계정을 안다 — UID나 닉네임을
// 입력받지 않는다(남의 UID로 한정 코드를 소진시키거나 계정을 바꿔 가며 대입할 수 있다).
// 쿠폰 규칙·실패 제한·우편 지급은 게임과 같은 DB 함수(`private.redeem_coupon_for`)가 한다.
const TICKET = /^[0-9a-f]{48}$/;
const ERRORS = new Set([
  "invalid_ticket",
  "no_player",
  "account_restricted",
  "rate_limited",
  "invalid_code",
  "unavailable",
  "already_redeemed",
  "already_used",
  "exhausted",
]);

export function normalizeCode(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (typeof origin === "string" && typeof host === "string") {
    try {
      if (new URL(origin).host !== host)
        return reply(res, 403, { error: "origin_not_allowed" });
    } catch {
      return reply(res, 403, { error: "origin_not_allowed" });
    }
  }
  const contentType = req.headers["content-type"];
  if (
    typeof contentType !== "string" ||
    !contentType.toLowerCase().startsWith("application/json")
  )
    return reply(res, 415, { error: "json_required" });
  try {
    const raw =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(raw) > 1024)
      return reply(res, 413, { error: "body_too_large" });
    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.ticket !== "string" ||
      !TICKET.test(data.ticket) ||
      (data.action !== "info" && data.action !== "redeem")
    )
      return reply(res, 400, { error: "invalid_request" });
    let code = "";
    if (data.action === "redeem") {
      if (typeof data.code !== "string" || data.code.length > 64)
        return reply(res, 400, { error: "invalid_request" });
      code = normalizeCode(data.code);
      if (code.length < 4 || code.length > 32)
        return reply(res, 400, { error: "invalid_code" });
    }
    if (!configuration())
      return reply(res, 503, { error: "coupon_unavailable" });
    const response = await database(
      data.action === "info"
        ? "rpc/server_coupon_ticket_info"
        : "rpc/server_redeem_coupon_ticket",
      {
        method: "POST",
        body: JSON.stringify(
          data.action === "info"
            ? { p_ticket: data.ticket }
            : { p_ticket: data.ticket, p_code: code },
        ),
      },
    );
    const result = (await response.json()) as Record<string, unknown> | null;
    if (!result || typeof result !== "object")
      return reply(res, 503, { error: "coupon_unavailable" });
    if (result.ok !== true) {
      const error = String(result.error);
      return reply(res, error === "rate_limited" ? 429 : 400, {
        error: ERRORS.has(error) ? error : "coupon_unavailable",
      });
    }
    if (data.action === "info")
      return reply(res, 200, {
        ok: true,
        uid: String(result.uid ?? ""),
        nickname: typeof result.nickname === "string" ? result.nickname : "",
        expires_at: result.expires_at ?? null,
      });
    return reply(res, 200, { ok: true, name: String(result.name ?? "") });
  } catch (error) {
    if (error instanceof SyntaxError)
      return reply(res, 400, { error: "invalid_json" });
    return reply(res, 503, { error: "coupon_unavailable" });
  }
}
