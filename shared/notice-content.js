// Editorial content only: an absent language falls back to the original.
// This selector never reads generated caches or contacts a translation service.
export function sourceOf(notice) {
  const rows = notice.website_notice_translations || [];
  const complete = (t) => t.title?.trim() && t.body?.trim();
  return (
    rows.find((t) => t.locale === notice.source_locale && complete(t)) ||
    rows.find((t) => t.locale === "ko" && complete(t)) ||
    rows.find(complete)
  );
}
export function selectNoticeContent(notice, target) {
  const source = sourceOf(notice);
  if (!source) return null;
  const manual = (notice.website_notice_translations || []).find(
    (t) => t.locale === target && t.title?.trim() && t.body?.trim(),
  );
  return {
    ...(manual || source),
    translation: manual ? "manual" : "original",
    source_locale: source.locale,
    content_locale: manual ? target : source.locale,
  };
}
