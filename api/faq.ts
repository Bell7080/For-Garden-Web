import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
import { languageIds } from "../shared/languages.js";
import { selectFaq } from "../shared/faq.js";
// Public FAQ for the support page. Only published rows; the service key stays on the server.
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  const raw = new URL(req.url ?? "/", "https://forgarden.invalid").searchParams.get("lang");
  const locale = raw && languageIds.includes(raw) ? raw : "ko";
  if (!configuration()) return reply(res, 200, { faqs: [] });
  try {
    const response = await database(
      "website_faqs?select=id,category,sort,question,answer,translations,source_locale&published=eq.true&order=category,sort,updated_at&limit=200",
    );
    const rows = (await response.json()) as Parameters<typeof selectFaq>[0][];
    return reply(res, 200, { faqs: rows.map((row) => selectFaq(row, locale)) });
  } catch (error) {
    // Before the FAQ table exists the page simply shows no FAQ section.
    if (error instanceof Error && /\((400|404)\)$/.test(error.message)) return reply(res, 200, { faqs: [] });
    return reply(res, 503, { error: "unavailable" });
  }
}
