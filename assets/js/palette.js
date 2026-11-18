/* ==========================================================================
   palette.js — 搜索浮层（OI Wiki 那种：输入即出、按键直达）
   --------------------------------------------------------------------------
   只负责「结果列表的打开 / 高亮 / 关闭」，检索本身在 search.js 里。
   键盘事件由 app.js 转进来，避免和输入框抢焦点。
   ========================================================================== */

import { esc, formatOf } from './ui.js';
import { searchHits, tokenize } from './search.js';
import { icon } from './icons.js';

/**
 * @param {object} options
 * @param {HTMLInputElement} options.input
 * @param {HTMLElement} options.panel
 * @param {HTMLElement} options.list
 * @param {HTMLElement} options.foot
 * @param {HTMLElement} options.countEl
 * @param {HTMLElement} options.applyBtn
 * @param {(item:object)=>string} options.typeLabel
 * @param {()=>void} [options.onApply]
 */
export function createPalette({ input, panel, list, foot, countEl, applyBtn, typeLabel, onApply }) {
  let hits = [];
  let active = 0;

  const isOpen = () => panel.hidden === false;

  function open() {
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  function paint() {
    Array.from(list.children).forEach((node, i) => {
      node.setAttribute('aria-selected', String(i === active));
      if (i === active) node.scrollIntoView({ block: 'nearest' });
    });
  }

  function render(rawQuery) {
    const query = String(rawQuery || '').trim();
    if (!query) {
      close();
      return;
    }

    hits = searchHits(query);
    active = 0;

    if (!hits.length) {
      list.innerHTML = `<li class="palette-empty">没有匹配「${esc(query)}」的资料</li>`;
      foot.hidden = true;
      open();
      return;
    }

    const terms = tokenize(query);
    list.innerHTML = hits.map((hit, i) => hitHTML(hit, i, terms)).join('');
    countEl.textContent = `共 ${hits.length} 条`;
    foot.hidden = false;
    open();
    paint();
  }

  function hitHTML(hit, index, terms) {
    const path = [hit.stage.name, hit.group.name].filter(Boolean).join(' › ');
    return `<li class="hit" role="option" id="hit-${index}" data-url="${esc(hit.item.url)}" aria-selected="${
      index === active
    }">
  <span class="hit-type">${esc(typeLabel(hit.item))}</span>
  <span class="hit-main">
    <span class="hit-title">${markTerms(hit.item.title, terms)}</span>
    <span class="hit-path">${esc(path)}</span>
  </span>
  <span class="hit-meta">${esc(formatOf(hit.item))}</span>
</li>`;
  }

  function markTerms(text, terms) {
    const safe = esc(text);
    if (!terms.length) return safe;
    const pattern = terms
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .sort((a, b) => b.length - a.length)
      .join('|');
    if (!pattern) return safe;
    try {
      return safe.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
    } catch {
      return safe;
    }
  }

  function move(delta) {
    if (!hits.length) return;
    active = (active + delta + hits.length) % hits.length;
    paint();
  }

  function openHit(index = active) {
    const hit = hits[index];
    if (!hit) return;
    window.open(hit.item.url, '_blank', 'noopener');
    close();
  }

  /* 鼠标：pointerdown 抢在 blur 之前，避免面板先关掉 */
  list.addEventListener('pointerdown', (event) => {
    const node = event.target.closest('.hit');
    if (!node || !node.dataset.url) return;
    event.preventDefault();
    openHit(Array.from(list.children).indexOf(node));
  });

  list.addEventListener('pointermove', (event) => {
    const node = event.target.closest('.hit');
    if (!node) return;
    const index = Array.from(list.children).indexOf(node);
    if (index >= 0 && index !== active) {
      active = index;
      paint();
    }
  });

  input.addEventListener('blur', () => {
    // 点浮层内部时 pointerdown 已经 preventDefault，不会触发 blur
    setTimeout(() => {
      if (!panel.contains(document.activeElement)) close();
    }, 120);
  });

  applyBtn.addEventListener('click', () => {
    close();
    if (onApply) onApply();
  });

  return { render, close, move, openHit, isOpen, getHits: () => hits };
}
