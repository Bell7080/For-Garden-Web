// 브라우저 저장소 안내. 홈페이지는 언어·테마 기억 외에는 아무것도 저장하지 않으므로 동의를 묻는 배너가 아니라
// 무엇을 저장하는지 알리고 확인을 받는 얇은 띠다. 확인은 `fg-storage-notice`로만 기억한다(`/legal/cookies`에 적혀 있다).
// 앱에는 두지 않는다 — 앱은 브라우저 쿠키를 쓰지 않는다.
(function () {
  var KEY = "fg-storage-notice";
  try { if (localStorage.getItem(KEY) === "1") return; } catch (e) {}
  var lang = (document.documentElement.lang || "ko").slice(0, 2);
  var T = {
    ko: { text: "이 사이트는 언어·테마 선택을 기억하려고 브라우저 저장소만 사용하며 광고·분석 쿠키는 쓰지 않습니다.", more: "쿠키·저장소 정책", ok: "확인", label: "브라우저 저장소 안내" },
    en: { text: "This site only uses browser storage to remember your language and theme. It does not use advertising or analytics cookies.", more: "Cookie & storage policy", ok: "OK", label: "Browser storage notice" },
    ja: { text: "このサイトは言語とテーマの設定を記憶するためにブラウザの保存領域のみを使用し、広告・分析用のクッキーは使用しません。", more: "クッキー・保存領域のポリシー", ok: "確認", label: "ブラウザ保存領域のお知らせ" },
  };
  var t = T[lang] || T.ko;
  var style = document.createElement("style");
  style.textContent =
    ".fg-storage-notice{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;max-width:760px;margin:0 auto;padding:14px 18px;background:#24282e;color:#f2f0ec;border-top:3px solid #d8b978;box-shadow:0 10px 30px rgba(0,0,0,.35);font:500 14px/1.6 'NexonKart','Noto Sans KR',sans-serif}" +
    ".fg-storage-notice p{margin:0;flex:1 1 280px}" +
    ".fg-storage-notice a{color:#d8b978;text-underline-offset:4px}" +
    ".fg-storage-notice button{min-height:44px;min-width:88px;padding:0 20px;border:0;background:#d8b978;color:#1a1d21;font:700 15px 'NexonKart','Noto Sans KR',sans-serif;cursor:pointer;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)}" +
    ".fg-storage-notice button:hover{background:#e6cd94}" +
    ".fg-storage-notice a:focus-visible,.fg-storage-notice button:focus-visible{outline:3px solid #f2f0ec;outline-offset:3px}" +
    "@media (forced-colors:active){.fg-storage-notice{border:1px solid CanvasText}.fg-storage-notice button{border:1px solid ButtonText}}";
  var box = document.createElement("section");
  box.className = "fg-storage-notice";
  box.setAttribute("role", "region");
  box.setAttribute("aria-label", t.label);
  var p = document.createElement("p");
  p.textContent = t.text + " ";
  var a = document.createElement("a");
  a.href = "/legal/cookies";
  a.textContent = t.more;
  p.appendChild(a);
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = t.ok;
  b.addEventListener("click", function () {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
    box.remove();
    style.remove();
  });
  box.appendChild(p);
  box.appendChild(b);
  function mount() { document.head.appendChild(style); document.body.appendChild(box); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})();
