import {
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
import { verifyUnsubscribeToken } from "../server/unsubscribe.js";

/** 출시 알림 신청 삭제(수신거부). 서명된 링크로만 지우며, 이미 없어도 같은 성공을 돌려준다. */
export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (typeof origin === "string" && typeof host === "string") {
    try {
      if (new URL(origin).host !== host) return reply(res, 403, { error: "origin_not_allowed" });
    } catch {
      return reply(res, 403, { error: "origin_not_allowed" });
    }
  }
  const contentType = req.headers["content-type"];
  if (typeof contentType !== "string" || !contentType.toLowerCase().startsWith("application/json"))
    return reply(res, 415, { error: "json_required" });
  const secret = process.env.UNSUBSCRIBE_SECRET;
  if (!secret) return reply(res, 503, { error: "unsubscribe_unavailable" });
  try {
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(raw) > 2048) return reply(res, 413, { error: "body_too_large" });
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || typeof data.email !== "string" || typeof data.token !== "string" || data.email.length > 254)
      return reply(res, 400, { error: "invalid_request" });
    const email = data.email.trim().toLowerCase();
    if (!verifyUnsubscribeToken(email, data.token, secret)) return reply(res, 400, { error: "invalid_link" });
    await database(`website_preregistrations?email=eq.${encodeURIComponent(email)}`, { method: "DELETE" });
    return reply(res, 200, { ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return reply(res, 400, { error: "invalid_json" });
    return reply(res, 503, { error: "unsubscribe_unavailable" });
  }
}
