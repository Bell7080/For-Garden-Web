import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
// Live maintenance notice from the same app_config row the game reads.
async function maintenance() {
  try {
    const response = await database(
      "app_config?select=maintenance,maintenance_message,maintenance_ends_at&id=eq.1",
    );
    const [row] = (await response.json()) as {
      maintenance?: boolean;
      maintenance_message?: string | null;
      maintenance_ends_at?: string | null;
    }[];
    if (!row?.maintenance) return null;
    return {
      message: row.maintenance_message || null,
      endsAt: row.maintenance_ends_at || null,
    };
  } catch {
    return null;
  }
}
export default async function handler(req: Request, res: Response) {
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
    maintenance: configured ? await maintenance() : null,
  });
}
