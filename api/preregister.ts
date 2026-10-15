import { createHmac } from "node:crypto";
import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
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
    if (Buffer.byteLength(raw) > 4096)
      return reply(res, 413, { error: "body_too_large" });
    const data = JSON.parse(raw);
    if (
      !data ||
      typeof data !== "object" ||
      typeof data.email !== "string" ||
      data.email.length > 254 ||
      !/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
      data.consent !== true ||
      !["android", "ios", "both"].includes(data.platform) ||
      !["ko", "en", "ja"].includes(data.locale)
    )
      return reply(res, 400, { error: "invalid_request" });
    if (data.website) return reply(res, 400, { error: "invalid_request" });
    const config = configuration();
    if (
      process.env.PREREGISTRATION_ENABLED !== "true" ||
      !process.env.PRIVACY_CONTACT_EMAIL ||
      !process.env.SITE_OPERATOR_NAME ||
      !config
    )
      return reply(res, 503, { error: "registration_not_open" });
    const forwarded =
      req.headers["x-vercel-forwarded-for"] ?? req.headers["x-forwarded-for"];
    const ip =
      typeof forwarded === "string"
        ? forwarded.split(",")[0].trim()
        : "unknown";
    const fingerprint = createHmac("sha256", config.key)
      .update(ip)
      .digest("hex");
    const response = await database("rpc/register_website_interest", {
      method: "POST",
      body: JSON.stringify({
        p_email: data.email.trim().toLowerCase(),
        p_platform: data.platform,
        p_locale: data.locale,
        p_fingerprint: fingerprint,
      }),
    });
    const result = await response.json();
    if (result === "rate_limited")
      return reply(res, 429, { error: "rate_limited" });
    if (result !== "accepted")
      return reply(res, 503, { error: "registration_unavailable" });
    return reply(res, 200, { ok: true });
  } catch (error) {
    if (error instanceof SyntaxError)
      return reply(res, 400, { error: "invalid_json" });
    return reply(res, 503, { error: "registration_unavailable" });
  }
}
