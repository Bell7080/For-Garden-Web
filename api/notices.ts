import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http";
import { seedNotices } from "../server/seed-notices";
import { languageIds } from "../shared/languages.js";
import { availableTranslation } from "../shared/notice-translation.js";
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
    const query = (tier: number) =>
      `website_notices?select=slug,category,published_at${tier === 0 ? ",cover_image,pinned,template,source_locale,website_notice_auto_translations(locale,source_hash,title,summary,body)" : tier === 1 ? ",cover_image,pinned,template" : ""},website_notice_translations(locale,title,summary,body)&status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&order=${tier < 2 ? "pinned.desc," : ""}published_at.desc&limit=100`;
    async function compatibleQuery(tier: number): Promise<globalThis.Response> {
      try {return await database(query(tier));}
      catch(error) {
        // Retry missing columns/relationships, not network or authorization failures.
        if(tier<2 && error instanceof Error && /\((400|404)\)$/.test(error.message))return compatibleQuery(tier+1);
        throw error;
      }
    }
    const response = await compatibleQuery(0);
    const rows = await response.json();
    // No inner locale filter: an untranslated announcement must remain visible.
    return reply(res, 200, {
      notices: rows.flatMap((n: any) => {
        const t = availableTranslation(n, locale);
        if (!t) return [];
        return [
          {
            slug: n.slug,
            category: n.category,
            published_at: n.published_at,
            cover_image: n.cover_image,
            pinned: n.pinned,
            template: n.template,
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
