import {
  configuration,
  database,
  type Request,
  type Response,
} from "../server/http.js";

/**
 * Public pre-registration total for the milestone gauge: website sign-ups plus an
 * operator-set offset (PREREGISTRATION_COUNT_OFFSET) for store pre-registrations
 * counted elsewhere, such as Google Play. Returns null instead of a guess when the
 * database is unavailable. Short CDN caching keeps page views off the database.
 */
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.setHeader("Cache-Control", "no-store");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const offsetValue = Number(process.env.PREREGISTRATION_COUNT_OFFSET ?? 0);
  const offset =
    Number.isFinite(offsetValue) && offsetValue > 0
      ? Math.floor(offsetValue)
      : 0;
  let count: number | null = null;
  try {
    if (configuration()) {
      const response = await database("website_preregistrations?select=id", {
        method: "HEAD",
        headers: { Prefer: "count=exact", Range: "0-0" },
      });
      const total = Number(
        response.headers.get("content-range")?.split("/")[1],
      );
      if (Number.isFinite(total) && total >= 0) count = total + offset;
    } else if (offset > 0) count = offset;
  } catch {
    count = null;
  }
  res.setHeader(
    "Cache-Control",
    count === null
      ? "no-store"
      : "public, s-maxage=60, stale-while-revalidate=300",
  );
  res.status(200).json({ count });
}
