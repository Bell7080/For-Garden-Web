import { createHmac } from "node:crypto";
import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
import {
  normalizePhone,
  normalizeSource,
  PREREGISTRATION_CONSENT_VERSION,
  validEmail,
} from "../server/contact.js";

/**
 * 사전예약 접수. 이메일·휴대폰 중 하나 이상, 만 14세 이상 확인과 개인정보 수집·이용 동의(필수),
 * 번호를 줄 때는 광고성 정보(문자) 수신 동의가 함께 있어야 한다 — 출시·보상 안내 문자가 광고성 정보이기 때문이다.
 * 같은 이메일·번호는 409(duplicate)로 알리고 기존 신청을 바꾸지 않는다.
 */
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
    if (!data || typeof data !== "object")
      return reply(res, 400, { error: "invalid_request" });
    const emailText = typeof data.email === "string" ? data.email.trim() : "";
    const phoneText = typeof data.phone === "string" ? data.phone.trim() : "";
    if (data.email != null && typeof data.email !== "string")
      return reply(res, 400, { error: "invalid_request" });
    if (data.phone != null && typeof data.phone !== "string")
      return reply(res, 400, { error: "invalid_request" });
    const phone = phoneText ? normalizePhone(phoneText) : null;
    const marketing = data.marketing === true;
    if (
      (!emailText && !phoneText) ||
      (emailText && !validEmail(emailText)) ||
      (phoneText && !phone) ||
      (phone && !marketing) ||
      data.consent !== true ||
      data.ageConfirmed !== true ||
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
    const response = await database("rpc/register_website_interest_v2", {
      method: "POST",
      body: JSON.stringify({
        p_email: emailText ? emailText.toLowerCase() : null,
        p_phone: phone,
        p_platform: data.platform,
        p_locale: data.locale,
        p_fingerprint: fingerprint,
        p_marketing: marketing,
        p_source: normalizeSource(data.source),
        p_consent_version: PREREGISTRATION_CONSENT_VERSION,
      }),
    });
    const result = await response.json();
    if (result === "rate_limited")
      return reply(res, 429, { error: "rate_limited" });
    if (result === "duplicate") return reply(res, 409, { error: "duplicate" });
    if (result !== "accepted")
      return reply(res, 503, { error: "registration_unavailable" });
    return reply(res, 200, { ok: true });
  } catch (error) {
    if (error instanceof SyntaxError)
      return reply(res, 400, { error: "invalid_json" });
    return reply(res, 503, { error: "registration_unavailable" });
  }
}
