/** Angular strokes follow For-Garden/src/ui/glyphs.ts and sprites/ui/back.svg.
 * No Unicode/emoji icons: consistent silhouettes across browsers and languages. */
const paths = {
  globe:
    '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8zM12 2l4.2 10L12 22 7.8 12 12 2M2 12h20"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  check:
    '<path fill="currentColor" stroke="none" d="m2.8 11.8 3-3L10 13l8-9 3 3-11 12z"/>',
  arrow: '<path d="M5 19 19 5M8 5h11v11"/>',
  down: '<path d="M12 3v17m-6-6 6 6 6-6"/>',
  up: '<path d="M12 21V4m-6 6 6-6 6 6"/>',
  left: '<path fill="currentColor" stroke="none" d="m12.5 4-8 8 8 8v-5H20V9h-7.5z"/>',
  right:
    '<path fill="currentColor" stroke="none" d="m11.5 4 8 8-8 8v-5H4V9h7.5z"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  menu: '<path d="M3 5h18M3 12h18M3 19h18"/>',
  pin: '<path d="M6 3h12v18l-6-4-6 4V3z"/>',
  star: '<path fill="currentColor" stroke="none" d="m12 1 2.5 8.5L23 12l-8.5 2.5L12 23l-2.5-8.5L1 12l8.5-2.5z"/>',
  archive: '<path d="m3 6 3-3h15v17H3zM7 8h10M7 12h10M7 16h6M16 3v4h5"/>',
  emblem:
    '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8zM12 5l5 7-5 7-5-7zM2 12h5m10 0h5"/>',
  retry: '<path d="M20 9a8 8 0 1 0 0 7M20 3v6h-6"/>',
} as const;
export type IconName = keyof typeof paths;
export function icon(name: IconName, className = ""): string {
  return `<svg class="game-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
