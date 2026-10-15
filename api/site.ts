import {
  configuration,
  reply,
  type Request,
  type Response,
} from "../server/http";
export default function handler(req: Request, res: Response) {
  if (req.method !== "GET")
    return reply(res, 405, { error: "method_not_allowed" });
  let configured = false;
  try {
    configured = Boolean(configuration());
  } catch {}
  reply(res, 200, {
    registrationOpen:
      configured &&
      process.env.PREREGISTRATION_ENABLED === "true" &&
      Boolean(process.env.PRIVACY_CONTACT_EMAIL) &&
      Boolean(process.env.SITE_OPERATOR_NAME),
    operator: process.env.SITE_OPERATOR_NAME ?? null,
    privacyContact: process.env.PRIVACY_CONTACT_EMAIL ?? null,
  });
}
