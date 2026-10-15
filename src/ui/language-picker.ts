import { locales, type Locale } from "../content";
import { icon } from "./icons";
const names = { ko: "한국어", en: "English", ja: "日本語" };

export function languagePicker(locale: Locale): string {
  return `<div class="language-picker"><button type="button" class="language-trigger" role="combobox" aria-label="Language" aria-haspopup="listbox" aria-expanded="false" aria-controls="language-options">${icon("globe")}<span>${names[locale]}</span>${icon("chevron", "language-chevron")}</button><div class="language-menu" id="language-options" role="listbox" aria-label="Language" hidden><span class="language-menu-title" aria-hidden="true">LANGUAGE / 言語</span>${locales.map((value) => `<button type="button" role="option" id="language-${value}" data-language="${value}" aria-selected="${value === locale}" tabindex="-1"><span class="language-code">${value.toUpperCase()}</span><span lang="${value}">${names[value]}</span>${icon("check", "language-check")}</button>`).join("")}</div></div>`;
}

/** Return cleanup so a locale rerender never leaves document listeners behind. */
export function bindLanguagePicker(
  locale: Locale,
  onSelect: (locale: Locale) => void,
): () => void {
  const root = document.querySelector<HTMLElement>(".language-picker")!;
  const trigger = root.querySelector<HTMLButtonElement>(".language-trigger")!;
  const menu = root.querySelector<HTMLElement>("[role=listbox]")!;
  const options = [
    ...root.querySelectorAll<HTMLButtonElement>("[role=option]"),
  ];
  const listeners = new AbortController();
  let active = locales.indexOf(locale);
  let open = false;
  function update() {
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) trigger.setAttribute("aria-activedescendant", options[active].id);
    else trigger.removeAttribute("aria-activedescendant");
    options.forEach((button, i) =>
      button.classList.toggle("is-active", i === active && open),
    );
  }
  function close() {
    open = false;
    update();
  }
  function select(index: number) {
    const next = locales[index];
    close();
    if (next !== locale) onSelect(next);
    document
      .querySelector<HTMLButtonElement>(".language-trigger")
      ?.focus({ preventScroll: true });
  }
  trigger.addEventListener(
    "click",
    () => {
      open = !open;
      active = locales.indexOf(locale);
      update();
    },
    { signal: listeners.signal },
  );
  root.addEventListener(
    "keydown",
    (event) => {
      const keys = [
        "ArrowDown",
        "ArrowUp",
        "Home",
        "End",
        "Enter",
        " ",
        "Escape",
        "Tab",
      ];
      if (!keys.includes(event.key)) return;
      if (event.key === "Tab") {
        close();
        return;
      }
      event.preventDefault();
      if (event.key === "Escape") {
        close();
        trigger.focus({ preventScroll: true });
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        if (open) select(active);
        else {
          open = true;
          active = locales.indexOf(locale);
          update();
        }
        return;
      }
      if (event.key === "Home") active = 0;
      else if (event.key === "End") active = options.length - 1;
      else if (open)
        active =
          (active + (event.key === "ArrowDown" ? 1 : -1) + options.length) %
          options.length;
      else active = locales.indexOf(locale);
      open = true;
      update();
      trigger.focus({ preventScroll: true });
    },
    { signal: listeners.signal },
  );
  options.forEach((button, i) => {
    button.addEventListener("click", () => select(i), {
      signal: listeners.signal,
    });
    button.addEventListener(
      "pointermove",
      () => {
        active = i;
        update();
      },
      { signal: listeners.signal },
    );
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!root.contains(event.target as Node)) close();
    },
    { signal: listeners.signal },
  );
  root.addEventListener(
    "focusout",
    (event) => {
      if (!root.contains(event.relatedTarget as Node)) close();
    },
    { signal: listeners.signal },
  );
  return () => listeners.abort();
}
