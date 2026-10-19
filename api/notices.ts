import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
import { seedNotices } from "../server/seed-notices.js";
import { languageIds } from "../shared/languages.js";
import { selectNoticeContent } from "../shared/notice-content.js";
import { normalizeFrame, normalizeMeta } from "../shared/notice-style.js";
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  const raw = new URL(
    req.url ?? "/",
    "https://forgarden.invalid",
  ).searchParams.get("lang");
  const locale = raw && languageIds.includes(raw) ? raw : "ko";
  try {
    if (!configuration()) {
      const seedLocale = locale === "ja" ? "ja" : locale === "ko" ? "ko" : "en";
      return reply(res, 200, {
        notices: seedNotices[seedLocale].map((n) => ({
          ...n,
          published_at: "2026-10-16T00:00:00+09:00",
          translation: seedLocale === locale ? "manual" : "original",
          content_locale: seedLocale,
          source_locale: seedLocale,
        })),
        source: "editorial",
      });
    }
    // Tier 0 is the current schema; later tiers drop columns an older database lacks.
    const columns = [
      ",cover_image,pinned,template,source_locale,cover_frame,meta",
      ",cover_image,pinned,template,source_locale",
      ",cover_image,pinned,template",
      "",
    ];
    const query = (tier: number) =>
      `website_notices?select=slug,category,published_at${columns[tier]},website_notice_translations(locale,title,summary,body)&status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&order=${tier < 3 ? "pinned.desc," : ""}published_at.desc&limit=100`;
    async function compatibleQuery(tier: number): Promise<globalThis.Response> {
      try {
        return await database(query(tier));
      } catch (error) {
        // Retry missing columns/relationships, not network or authorization failures.
        if (
          tier < columns.length - 1 &&
          error instanceof Error &&
          /\((400|404)\)$/.test(error.message)
        )
          return compatibleQuery(tier + 1);
        throw error;
      }
    }
    const response = await compatibleQuery(0);
    const rows = await response.json();
    // No inner locale filter: an untranslated announcement must remain visible.
    return reply(res, 200, {
      notices: rows.flatMap((n: any) => {
        const t = selectNoticeContent(n, locale);
        if (!t) return [];
        return [
          {
            slug: n.slug,
            category: n.category,
            published_at: n.published_at,
            cover_image: n.cover_image,
            pinned: n.pinned,
            template: n.template,
            cover_frame: n.cover_frame ? normalizeFrame(n.cover_frame) : null,
            meta: normalizeMeta(n.meta),
            title: t.title,
            summary: t.summary,
            body: t.body,
            translation: t.translation,
            source_locale: t.source_locale,
            content_locale: t.content_locale,
          },
        ];
      }),
    });
  } catch {
    return reply(res, 503, { error: "news_unavailable" });
  }
}
