const labels = {
  ko: {
    nav: "공식 사이트 안내",
    links: [
      "프로젝트 소개",
      "개인정보 처리방침",
      "이용약관",
      "확률 정보",
      "정책·운영 안내",
      "문의하기",
      "사업자 정보",
    ],
  },
  en: {
    nav: "Official site information",
    links: [
      "About the project",
      "Privacy",
      "Terms",
      "Probabilities",
      "Policies",
      "Contact",
      "Business info",
    ],
  },
  ja: {
    nav: "公式サイトのご案内",
    links: [
      "プロジェクト紹介",
      "プライバシー",
      "利用規約",
      "提供割合",
      "規約・運営案内",
      "お問い合わせ",
      "事業者情報",
    ],
  },
};
export function renderFooterLinks(locale = "ko", currentPath = "") {
  const lang = Object.hasOwn(labels, locale) ? locale : "ko";
  const text = labels[lang];
  const paths = [
    lang === "ko" ? "/about" : `/about/${lang}`,
    "/privacy",
    "/terms",
    "/probabilities",
    "/legal",
    "/support.html",
    "/legal/business",
  ];
  return `<nav class="site-footer-links" aria-label="${text.nav}">${paths.map((path, i) => `<a href="${path}"${path === currentPath ? ' aria-current="page"' : ""}${i > 0 && i !== 5 && lang !== "ko" ? ' hreflang="ko"' : ""}>${text.links[i]}</a>`).join("")}</nav>`;
}
