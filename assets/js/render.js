/* ==========================================================================
   render.js — 模板层：数据 → HTML 字符串
   --------------------------------------------------------------------------
   只负责拼字符串，不做筛选、不发请求。所有用户数据都经过 esc()。
   想给卡片加字段（作者、版本、封面…）：改 cardHTML 一处即可。
   ========================================================================== */

import { icon } from './icons.js';
import { esc, formatOf, hexToRgba, safeColor } from './ui.js';

/* ── 单张卡片 ───────────────────────────────────────────────── */
export function cardHTML(item, group, index = 0) {
  const color = safeColor(group.color);
  const style = `--c:${color};--c-soft:${hexToRgba(color, 0.13)};--i:${index}`;

  return `<article class="card" style="${style}">
  <div class="card-top">
    <span class="mono" aria-hidden="true">${esc(group.abbr)}</span>
    <span class="badge">${esc(formatOf(item))}</span>
    ${item.pinned ? '<span class="badge badge-pin">置顶</span>' : ''}
  </div>
  <h3 class="card-title"><a href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.title)}</a></h3>
  <p class="card-desc">${esc(item.desc)}</p>
  <div class="card-meta">
    <span>${esc(item.pages)}</span>
    <span class="r">${esc(item.updated)}</span>
  </div>
</article>`;
}

/* ── 一个学科分组 ───────────────────────────────────────────── */
function subgroupBlock(sub) {
  const cards = sub.items.map((item, i) => cardHTML(item, sub._group, i)).join('');
  return `<div class="subgroup">
  <div class="subgroup-head">
    ${sub.icon ? `<span class="subgroup-ico">${icon(sub.icon)}</span>` : ''}
    <h3>${esc(sub.name)}</h3>
    <span class="count">${sub.items.length}</span>
    <span class="subgroup-rule" aria-hidden="true"></span>
  </div>
  <div class="grid">${cards}</div>
</div>`;
}

export function groupSection(group) {
  const color = safeColor(group.color);
  const style = `--c:${color};--c-soft:${hexToRgba(color, 0.13)}`;

  return `<section class="group" id="g-${esc(group.id)}" style="${style}">
  <div class="section-head">
    <h2><span class="dot"></span>${esc(group.name)}<span class="count">${group.count}</span></h2>
    <p class="desc">${esc(group.desc)}</p>
  </div>
  ${group.subgroups
    .map((sub) => subgroupBlock({ ...sub, _group: group }))
    .join('')}
</section>`;
}

/* ── 整页主体 ───────────────────────────────────────────────── */
export function renderBody(views, state) {
  const blocks = [];
  let total = 0;

  views.forEach((view) => {
    total += view.count;
    if (view.error) {
      blocks.push(stageErrorHTML(view));
      return;
    }
    if (!view.count) {
      if (state.stage === view.id) blocks.push(stageEmptyHTML(view));
      return;
    }
    view.groups.forEach((group) => blocks.push(groupSection(group)));
  });

  if (!blocks.length) return emptyHTML(state);
  return blocks.join('');
}

function stageErrorHTML(view) {
  return `<div class="fatal">
  <h2>「${esc(view.name)}」的数据读取失败</h2>
  <p>检查 <code>${esc(view.file)}</code> 是否存在、JSON 是否有语法错误（少逗号、多逗号最常见）。其他学段不受影响。</p>
</div>`;
}

function stageEmptyHTML(view) {
  return `<div class="empty">
  <strong>${esc(view.name)}还在整理中</strong>
  <p>${esc(view.hint || '把文件放进资源目录、在 JSON 里加一条，就会出现在这里。')}</p>
</div>`;
}

function emptyHTML(state) {
  if (state.query) {
    return `<div class="empty">
  <strong>没有匹配「${esc(state.query)}」的资料</strong>
  <p>换个关键词，或者清空筛选看看全部。</p>
  <button class="btn-clear" type="button" data-action="clear">清空搜索</button>
</div>`;
  }

  return `<div class="empty">
  <strong>这里还没有内容</strong>
  <p>把文件放进 <code>resource/&lt;学段&gt;/&lt;类型&gt;/&lt;学科&gt;/</code>，再在对应 JSON 里加一条即可。</p>
</div>`;
}

/* ── 顶栏与筛选 ─────────────────────────────────────────────── */
export function renderStages(stages, activeId) {
  const items = [{ id: 'all', name: '全部' }, ...stages];
  return items
    .map(
      (stage) =>
        `<button type="button" data-stage="${esc(stage.id)}" aria-current="${
          stage.id === activeId
        }">${esc(stage.name)}</button>`
    )
    .join('');
}

export function renderChips(types, activeId) {
  const items = [{ id: 'all', name: '全部' }, ...types];
  return items
    .map(
      (type) =>
        `<button class="chip" type="button" data-type="${esc(type.id)}" aria-pressed="${
          type.id === activeId
        }">${esc(type.name)}</button>`
    )
    .join('');
}

/* ── 最近更新 ───────────────────────────────────────────────── */
export function recentRowHTML(entries) {
  return entries
    .map((entry, i) => cardHTML(entry.item, entry.group, i))
    .join('');
}

/* ── 示例数据提示条 ─────────────────────────────────────────── */
export function noticeHTML() {
  return `<span>当前显示的是<strong>示例数据</strong>，用来预览版式。把自己的文件放进 <code>resource/</code>、替换 <code>data/*.json</code> 里的条目，再把 <code>"_demo": true</code> 改成 <code>false</code>，这条提示就会消失。</span>
<button class="notice-close" type="button" data-action="dismiss-notice" aria-label="关闭提示">${icon('x')}</button>`;
}

/* ── 启动失败（连清单都读不到） ─────────────────────────────── */
export function fatalHTML(message) {
  return `<div class="fatal">
  <h2>资料库没能启动</h2>
  <p>${esc(message)}</p>
  <ul>
    <li>如果你是<strong>双击 index.html</strong> 打开的：浏览器禁止 <code>file://</code> 页面读取 JSON，请用 <code>node tools/serve.mjs</code> 或直接看线上。</li>
    <li>如果已经部署：确认 <code>data/index.json</code> 在仓库根目录下，并且 JSON 没有语法错误。</li>
  </ul>
</div>`;
}
