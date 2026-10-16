import { createHmac } from "node:crypto";
import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
const categories = ["inquiry", "bug", "report", "other"];
// DB 함수가 한도·형식을 다시 검증한다. 여기서는 가볍게 걸러 불필요한 호출만 줄인다.
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
    if (Buffer.byteLength(raw) > 16384)
      return reply(res, 413, { error: "body_too_large" });
    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.email !== "string" ||
      data.email.length > 254 ||
      !/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
      !categories.includes(data.category) ||
      typeof data.subject !== "string" ||
      typeof data.body !== "string" ||
      !data.subject.trim() ||
      !data.body.trim() ||
      data.subject.length > 100 ||
      data.body.length > 4000 ||
      data.consent !== true
    )
      return reply(res, 400, { error: "invalid_request" });
    // 숨김 입력칸(봇 함정). 채워져 있으면 조용히 성공처럼 응답하고 저장하지 않는다.
    if (data.website) return reply(res, 200, { ok: true });
    const config = configuration();
    if (!config) return reply(res, 503, { error: "support_unavailable" });
    const forwarded =
      req.headers["x-vercel-forwarded-for"] ?? req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : "unknown";
    // IP 원문은 저장하지 않는다. 서버 비밀로 해시한 값만 속도 제한에 쓴다.
    const ipHash = createHmac("sha256", config.key).update(ip).digest("hex");
    const response = await database("rpc/web_submit_ticket", {
      method: "POST",
      body: JSON.stringify({
        p_email: data.email.trim(),
        p_category: data.category,
        p_subject: data.subject,
        p_body: data.body,
        p_ip_hash: ipHash,
      }),
    });
    const result = await response.json();
    if (result?.ok === true)
      return reply(res, 200, { ok: true, ticket_no: result.ticket_no });
    if (result?.error === "rate_limited")
      return reply(res, 429, { error: "rate_limited" });
    if (typeof result?.error === "string" && result.error.startsWith("invalid"))
      return reply(res, 400, { error: "invalid_request" });
    return reply(res, 503, { error: "support_unavailable" });
  } catch (error) {
    if (error instanceof SyntaxError)
      return reply(res, 400, { error: "invalid_json" });
    return reply(res, 503, { error: "support_unavailable" });
  }
}
