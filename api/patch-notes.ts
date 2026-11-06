import {
  configuration,
  database,
  reply,
  type Request,
  type Response,
} from "../server/http.js";
import { selectPatchNote } from "../shared/patch-notes.js";
// Public patch notes. Only released, non-deleted rows; the service key stays on the server.
export default async function handler(req: Request, res: Response) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return reply(res, 405, { error: "method_not_allowed" });
  }
  if (!configuration()) return reply(res, 200, { notes: [] });
  try {
    const now = encodeURIComponent(new Date().toISOString());
    const response = await database(
      `patch_notes?select=version,title,released_at,items,note&deleted_at=is.null&released_at=lte.${now}&order=released_at.desc&limit=50`,
    );
    const rows = (await response.json()) as Parameters<typeof selectPatchNote>[0][];
    return reply(res, 200, { notes: rows.map((row) => selectPatchNote(row)) });
  } catch (error) {
    // Before the table exists the page simply shows no notes.
    if (error instanceof Error && /\((400|404)\)$/.test(error.message)) return reply(res, 200, { notes: [] });
    return reply(res, 503, { error: "unavailable" });
  }
}
