/* ==========================================================================
   app.js — 启动、状态、事件绑定
   --------------------------------------------------------------------------
   数据流：
     data/index.json ─┐
     data/types.json ─┼─→ data.js（规整）─→ views.js（筛选）─→ render.js（HTML）
     data/*.json     ─┘                     └─→ search.js（索引）─→ palette.js
   ========================================================================== */

import {
  $,
  applyTheme,
  debounce,
  effectiveTheme,
  initTheme,
  toggleTheme,
  watchSystemTheme
} from './ui.js';
import { icon } from './icons.js';
import { loadLibrary } from './data.js';
import { buildIndex } from './search.js';
import { buildViews, flattenViews, latestUpdate, recentItems } from './views.js';
import { createPalette } from './palette.js';
import {
  fatalHTML,
  noticeHTML,
  recentRowHTML,
  renderBody,
  renderChips,
  renderStages
} from './render.js';

/* ── DOM 引用 ───────────────────────────────────────────────── */
const el = {
  brandName: $('#brandName'),
  brandKicker: $('#brandKicker'),
  stages: $('#stages'),
  themeBtn: $('#themeBtn'),
  themeIcon: $('#themeIcon'),
  eyebrow: $('#eyebrow'),
  search: $('#search'),
  searchIco: $('#searchIco'),
  input: $('#q'),
  palette: $('#palette'),
  hits: $('#hits'),
  foot: $('#paletteFoot'),
  hitCount: $('#hitCount'),
  applyAll: $('#applyAll'),
  chips: $('#chips'),
  stat: $('#stat'),
  notice: $('#notice'),
  recentSec: $('#recentSec'),
  recentRow: $('#recentRow'),
  groups: $('#groups'),
  footStat: $('#footStat'),
  homeLink: $('#homeLink'),
  repoLink: $('#repoLink'),
  copyright: $('#copyright'),
  authorBox: $('#authorBox'),
  authorLink: $('#authorLink'),
  authorMail: $('#authorMail')
};

/* ── 运行时状态 ─────────────────────────────────────────────── */
const state = { stage: 'all', type: 'all', query: '' };
let LIB = null;
let palette = null;
let noticeDismissed = false;

/* ── 启动 ───────────────────────────────────────────────────── */
async function boot() {
  initTheme();
  applyThemeFromQuery();
  syncThemeIcon();
  watchSystemTheme(syncThemeIcon);
  el.searchIco.innerHTML = icon('search');

  try {
    LIB = await loadLibrary();
  } catch (error) {
    console.error('[library] 启动失败：', error);
    el.groups.innerHTML = fatalHTML(error.message);
    el.stat.textContent = '数据读取失败';
    return;
  }

  applySiteMeta();

  const docCount = buildIndex(LIB.stages);
  console.info(`[library] 已索引 ${docCount} 份资料`);

  state.stage = readStageFromHash();

  el.stages.innerHTML = renderStages(LIB.stages, state.stage);
  el.chips.innerHTML = renderChips(LIB.types, state.type);

  if (LIB.demo) {
    el.notice.innerHTML = noticeHTML();
  }

  palette = createPalette({
    input: el.input,
    panel: el.palette,
    list: el.hits,
    foot: el.foot,
    countEl: el.hitCount,
    applyBtn: el.applyAll,
    typeLabel: typeLabelOf,
    onApply: render
  });

  bindEvents();
  render();
}

/* 允许 ?theme=dark / ?theme=light 强制预览：截图、演示时省得点按钮 */
function applyThemeFromQuery() {
  const forced = new URLSearchParams(location.search).get('theme');
  if (forced === 'dark' || forced === 'light') applyTheme(forced);
}

/* ── 站点信息：全部来自 data/index.json，不写死在 HTML 里 ───── */
function applySiteMeta() {
  const site = LIB.site || {};

  if (site.title) {
    el.brandName.textContent = site.title;
    document.title = `${site.title} · 教材与笔记`;
  }
  if (site.kicker) el.brandKicker.textContent = site.kicker;
  if (site.home) {
    el.homeLink.href = site.home;
    el.homeLink.textContent = `← ${site.homeLabel || '回到导航站'}`;
  }
  if (site.repo) el.repoLink.href = site.repo;
  if (site.copyright) el.copyright.textContent = site.copyright;

  /* 作者信息：缺字段就优雅降级，不会留下空链接 */
  const author = site.author || {};
  if (author.name) {
    el.authorBox.hidden = false;
    el.authorLink.textContent = author.name;
    if (author.github) el.authorLink.href = author.github;
    else if (author.url) el.authorLink.href = author.url;
    else el.authorLink.removeAttribute('href');

    if (author.email) {
      el.authorMail.textContent = author.email;
      el.authorMail.href = `mailto:${author.email}`;
    } else {
      el.authorMail.hidden = true;
    }
  } else {
    el.authorBox.hidden = true;
  }
}

function typeLabelOf(item) {
  const type = LIB.types.find((t) => t.id === item.type);
  return type ? type.name : item.type || '资料';
}

/* ── 渲染 ───────────────────────────────────────────────────── */
function render() {
  const views = buildViews(LIB.stages, state);
  const entries = flattenViews(views);
  const total = views.reduce((sum, view) => sum + view.count, 0);

  el.groups.innerHTML = renderBody(views, state);
  el.eyebrow.textContent = state.query ? 'Search Results' : 'Textbooks & Notes';

  /* 最近更新：搜索时让位给结果，筛选后仍然保留 */
  const recent = state.query ? [] : recentItems(views, 6);
  if (recent.length >= 2) {
    el.recentRow.innerHTML = recentRowHTML(recent);
    el.recentSec.hidden = false;
    /* 放得下就完整显示，放不下才加右边缘淡出 */
    requestAnimationFrame(() => {
      el.recentSec.classList.toggle(
        'is-scrollable',
        el.recentRow.scrollWidth > el.recentRow.clientWidth + 4
      );
    });
  } else {
    el.recentSec.hidden = true;
    el.recentSec.classList.remove('is-scrollable');
  }

  /* 统计文字 */
  const stageName =
    state.stage === 'all'
      ? '全部学段'
      : (LIB.stages.find((s) => s.id === state.stage) || {}).name || '';

  if (state.query) {
    el.stat.textContent = `${stageName} · 命中 ${total} 条`;
  } else {
    const subjects = new Set(entries.map((entry) => entry.group.id));
    el.stat.textContent = `${stageName} · ${subjects.size} 个学科 · ${total} 份资料`;
  }

  const latest = latestUpdate(views);
  el.footStat.textContent = latest ? `共 ${total} 份 · 最后更新 ${latest}` : `共 ${total} 份`;

  updateNotice();
}

/* 示例提示只在与当前学段相关时出现：切到「高中」不该看到「大学」的提示 */
function updateNotice() {
  const stageHasDemo = LIB.stages.some(
    (stage) => stage.demo && (state.stage === 'all' || stage.id === state.stage)
  );
  el.notice.hidden = noticeDismissed || !stageHasDemo;
}

/* ── 学段切换 ───────────────────────────────────────────────── */
function readStageFromHash() {
  const id = location.hash.replace(/^#\/?/, '').trim();
  return LIB.stages.some((stage) => stage.id === id) ? id : 'all';
}

function selectStage(id) {
  state.stage = id;
  const hash = id === 'all' ? '' : `#${id}`;
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
  } catch {
    /* file:// 下可能被拒绝，忽略即可 */
  }
  el.stages.innerHTML = renderStages(LIB.stages, state.stage);
  render();
}

/* ── 筛选与搜索 ─────────────────────────────────────────────── */
function clearFilters() {
  state.query = '';
  state.type = 'all';
  el.input.value = '';
  el.chips.innerHTML = renderChips(LIB.types, state.type);
  if (palette) palette.close();
  render();
}

const onInput = debounce(() => {
  const value = el.input.value.trim();
  state.query = value;
  if (value) palette.render(value);
  else {
    palette.close();
    render();
  }
}, 90);

function onInputKeydown(event) {
  if (!palette || !palette.isOpen()) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    palette.move(1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    palette.move(-1);
  } else if (event.key === 'Tab') {
    event.preventDefault();
    palette.move(event.shiftKey ? -1 : 1);
  } else if (event.key === 'Enter') {
    event.preventDefault();
    palette.openHit();
  }
}

function onGlobalKeydown(event) {
  const tag = document.activeElement ? document.activeElement.tagName : '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';

  if ((event.key === '/' && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault();
    el.input.focus();
    el.input.select();
    if (state.query) palette.render(state.query);
    return;
  }

  if (event.key === 'Escape') {
    if (palette && palette.isOpen()) {
      palette.close();
      render();
      return;
    }
    if (document.activeElement === el.input) {
      el.input.value = '';
      state.query = '';
      render();
      el.input.blur();
    }
  }
}

/* ── 主题 ───────────────────────────────────────────────────── */
function syncThemeIcon() {
  const dark = effectiveTheme() === 'dark';
  el.themeIcon.innerHTML = icon(dark ? 'sun' : 'moon');
  el.themeBtn.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
}

/* ── 事件绑定 ───────────────────────────────────────────────── */
function bindEvents() {
  el.stages.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-stage]');
    if (button) selectStage(button.dataset.stage);
  });

  el.chips.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-type]');
    if (!button) return;
    state.type = button.dataset.type;
    el.chips.innerHTML = renderChips(LIB.types, state.type);
    render();
  });

  el.themeBtn.addEventListener('click', () => {
    toggleTheme();
    syncThemeIcon();
  });

  el.input.addEventListener('input', onInput);
  el.input.addEventListener('keydown', onInputKeydown);
  document.addEventListener('keydown', onGlobalKeydown);

  /* 点搜索框以外的地方收起浮层，但保留过滤结果 */
  document.addEventListener('pointerdown', (event) => {
    if (!palette || !palette.isOpen()) return;
    if (el.search.contains(event.target)) return;
    palette.close();
    if (state.query) render();
  });

  /* 空状态里的「清空搜索」、提示条关闭 */
  el.groups.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="clear"]')) clearFilters();
  });

  el.notice.addEventListener('click', (event) => {
    if (event.target.closest('[data-action="dismiss-notice"]')) {
      noticeDismissed = true;
      updateNotice();
    }
  });

  window.addEventListener('hashchange', () => {
    const id = readStageFromHash();
    if (id !== state.stage) {
      state.stage = id;
      el.stages.innerHTML = renderStages(LIB.stages, state.stage);
      render();
    }
  });
}

boot();
