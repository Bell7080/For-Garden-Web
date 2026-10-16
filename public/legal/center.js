(() => {
  const button = document.getElementById("theme");
  let selected = "system";
  try {
    const v = localStorage.getItem("fg-theme");
    if (v === "dark" || v === "light") selected = v;
  } catch {}
  const language = document.documentElement.lang;
  const labels =
    language === "en"
      ? { prefix: "Theme: ", system: "Device", dark: "Dark", light: "Light" }
      : language === "ja"
        ? {
            prefix: "テーマ：",
            system: "端末設定",
            dark: "ダーク",
            light: "ライト",
          }
        : {
            prefix: "테마: ",
            system: "장치 설정",
            dark: "다크",
            light: "라이트",
          };
  const media = matchMedia("(prefers-color-scheme:dark)");
  const update = () => {
    document.documentElement.dataset.theme =
      selected === "system" ? (media.matches ? "dark" : "light") : selected;
    if (button) button.textContent = labels.prefix + labels[selected];
  };
  button?.addEventListener("click", () => {
    selected = { system: "dark", dark: "light", light: "system" }[selected];
    try {
      localStorage.setItem("fg-theme", selected);
    } catch {}
    update();
  });
  media.addEventListener("change", update);
  update();
})();
