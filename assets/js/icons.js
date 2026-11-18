/* ==========================================================================
   icons.js — 内联 SVG 图标库
   --------------------------------------------------------------------------
   所有图标统一 24×24 视框、1.7 线宽、currentColor 描边，跟随文字颜色。
   需要新图标：往 ICONS 里加一条，路径坐标系 24×24 即可。
   ========================================================================== */

const ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>',

  book:
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>' +
    '<path d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z"/>',

  pencil:
    '<path d="M12 20h9"/>' +
    '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',

  note:
    '<rect x="5" y="3" width="14" height="18" rx="2"/>' +
    '<path d="M9 8h6M9 12h6M9 16h4"/>',

  paper:
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/>' +
    '<path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',

  sun:
    '<circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',

  moon: '<path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.9 6.9 0 0 0 10.8 10.8Z"/>',

  'arrow-up-right': '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',

  x: '<path d="m6 6 12 12M18 6 6 18"/>',

  dot: '<circle cx="12" cy="12" r="3"/>'
};

/**
 * 生成一个 SVG 图标字符串。
 * @param {string} name ICONS 中的键
 * @param {string} [cls] 追加的 class
 */
export function icon(name, cls = '') {
  const body = ICONS[name] || ICONS.dot;
  const className = cls ? `icon ${cls}` : 'icon';
  return (
    `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`
  );
}
