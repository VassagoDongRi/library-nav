/* ==========================================================================
   ui.js — 通用工具：DOM 简写、转义、格式化、本地存储、主题
   --------------------------------------------------------------------------
   这里不碰数据和视图，只放「任何模块都可能用到」的纯函数。
   ========================================================================== */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** 转义为 HTML 文本/属性，拼模板字符串时一律走这里 */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

/** 从 URL 猜扩展名（PDF / HTML / DOCX…） */
export function extOf(url) {
  const clean = String(url || '').split(/[?#]/)[0];
  const match = /\.([a-z0-9]{1,8})$/i.exec(clean);
  return match ? match[1].toUpperCase() : 'FILE';
}

/** 展示用格式徽章：优先用数据里的 format，否则看扩展名 */
export function formatOf(item) {
  const raw = String(item.format || '').trim() || extOf(item.url);
  return raw.toUpperCase();
}

/** 日期只显示到天，避免时区把 11-16 变成 11-15 */
export function dateText(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : text;
}

/** #rrggbb → rgba()，用于卡片色条的浅色底（比 color-mix 兼容性稳） */
export function hexToRgba(hex, alpha) {
  const raw = String(hex || '').replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return `rgba(31, 111, 92, ${alpha})`;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
}

/** 只接受 #rgb / #rrggbb，防止数据里的颜色串进 style 属性 */
export function safeColor(value, fallback = '#1f6f5c') {
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(value || '').trim())
    ? String(value).trim()
    : fallback;
}

export function debounce(fn, ms = 120) {
  let timer = 0;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}

/* ── 本地存储（隐私模式下静默失败，不阻塞页面） ─────────────── */
const PREFIX = 'library:';

export const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }
};

/* ── 主题：auto / light / dark ──────────────────────────────── */
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function systemTheme() {
  return media && media.matches ? 'dark' : 'light';
}

export function effectiveTheme() {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark' || attr === 'light' ? attr : systemTheme();
}

export function applyTheme(mode) {
  if (mode === 'dark' || mode === 'light') {
    document.documentElement.setAttribute('data-theme', mode);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function initTheme() {
  const saved = store.get('theme', 'auto');
  applyTheme(saved === 'dark' || saved === 'light' ? saved : 'auto');
  return saved;
}

export function toggleTheme() {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  store.set('theme', next);
  return next;
}

/** 系统主题变化时，如果用户没手动选过，就跟着变 */
export function watchSystemTheme(onChange) {
  if (!media) return;
  const handler = () => {
    if (!document.documentElement.hasAttribute('data-theme')) onChange(systemTheme());
  };
  if (media.addEventListener) media.addEventListener('change', handler);
  else if (media.addListener) media.addListener(handler);
}
