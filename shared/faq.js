// Homepage FAQ, managed in the operations console (website_faqs).
// Editorial content only: a missing manual language falls back to the original.
export const faqCategories = ["account", "game", "payment", "event", "etc"];
export function selectFaq(row, target) {
  const manual = row.translations && typeof row.translations === "object" ? row.translations[target] : null;
  const use = manual && manual.question?.trim() && manual.answer?.trim();
  return {
    id: row.id,
    category: faqCategories.includes(row.category) ? row.category : "etc",
    question: use ? manual.question : row.question,
    answer: use ? manual.answer : row.answer,
    content_locale: use ? target : row.source_locale || "ko",
  };
}
