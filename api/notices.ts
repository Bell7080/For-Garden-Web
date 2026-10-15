import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http";
import { seedNotices } from "../server/seed-notices";
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  const raw = new URL(
    req.url ?? "/",
    "https://forgarden.invalid",
  ).searchParams.get("lang");
  const locale = raw === "en" || raw === "ja" ? raw : "ko";
  try {
    if (!configuration())
      return reply(res, 200, {
        notices: seedNotices[locale].map((n) => ({
          ...n,
          published_at: "2026-10-16T00:00:00+09:00",
        })),
        source: "editorial",
      });
    const query = (extra: boolean) =>
      `website_notices?select=slug,category,published_at${extra ? ",cover_image,pinned,template" : ""},website_notice_translations!inner(title,summary,body)&status=eq.published&published_at=lte.${encodeURIComponent(new Date().toISOString())}&website_notice_translations.locale=eq.${locale}&order=${extra ? "pinned.desc," : ""}published_at.desc&limit=100`;
    // 어드민 확장 칼럼이 아직 없는 DB에서도 공지가 멈추지 않게 기본 칼럼으로 한 번 더 시도한다.
    const response = await database(query(true)).catch(() => database(query(false)));
    const rows = await response.json();
    return reply(res, 200, {
      notices: rows.map(
        (n: {
          slug: string;
          category: string;
          published_at: string;
          cover_image: string | null;
          pinned: boolean;
          template: string;
          website_notice_translations: {
            title: string;
            summary: string;
            body: string;
          }[];
        }) => ({
          slug: n.slug,
          category: n.category,
          published_at: n.published_at,
          cover_image: n.cover_image,
          pinned: n.pinned,
          template: n.template,
          ...n.website_notice_translations[0],
        }),
      ),
    });
  } catch {
    return reply(res, 503, { error: "news_unavailable" });
  }
}
