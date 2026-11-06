// Public patch-note shape. Rows come from the admin console's patch_notes table (Korean original only).
const KINDS = new Set(["new", "improve", "fix", "balance", "etc"]);
export function selectPatchNote(row) {
  const items = Array.isArray(row?.items) ? row.items : [];
  return {
    version: String(row?.version ?? ""),
    title: String(row?.title ?? ""),
    released_at: row?.released_at ?? null,
    note: String(row?.note ?? ""),
    items: items
      .filter((item) => item && typeof item.text === "string" && item.text.trim())
      .map((item) => ({ kind: KINDS.has(item.kind) ? item.kind : "etc", text: item.text.trim() })),
  };
}
