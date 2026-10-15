import {
  database,
  configuration,
  reply,
  type Request,
  type Response,
} from "../server/http";
import { languageIds } from "../shared/languages.js";
import { ensureTranslation } from "../shared/notice-translation.js";
export const config = { maxDuration: 60 };
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  const params = new URL(req.url ?? "/", "https://forgarden.invalid")
    .searchParams;
  const slug = params.get("slug") || "";
  const locale = params.get("lang") || "";
  if (!/^[a-z0-9][a-z0-9-]{0,100}$/.test(slug) || !languageIds.includes(locale))
    return reply(res, 400, { error: "invalid_input" });
  if (!configuration())
    return reply(res, 503, { error: "translation_not_configured" });
  try {
    // Never accept arbitrary text/URLs from a public visitor. Only due, published
    // content can reach the engine; drafts and scheduled notices stay private.
    const rows = await database(
      `website_notices?select=id,source_locale,website_notice_translations(locale,title,summary,body),website_notice_auto_translations(locale,source_hash,title,summary,body)&slug=eq.${slug}&status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&limit=1`,
    ).then((r) => r.json());
    if (!rows[0]) return reply(res, 404, { error: "notice_missing" });
    const translation = await ensureTranslation(database, rows[0], locale);
    return reply(res, 200, { translation });
  } catch (error) {
    const allowed = [
      "translation_not_configured",
      "unsupported_language_pair",
      "translation_busy",
    ];
    const code =
      error instanceof Error && allowed.includes(error.message)
        ? error.message
        : "translation_unavailable";
    return reply(res, 503, { error: code });
  }
}
