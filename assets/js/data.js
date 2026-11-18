/* ==========================================================================
   data.js — 读取清单与学段数据，并把它们规整成统一结构
   --------------------------------------------------------------------------
   设计要点：
     1. 只认 data/index.json 里的 stages 数组，不认识「大学」「高中」这类名字
        → 新增学段＝新增一个 JSON 文件 + 清单里加一行，前端零改动。
     2. 某个学段 JSON 写坏时，只有那一个学段报错，其余照常渲染。
     3. 未知字段一律忽略，方便先加数据、后加展示。
   ========================================================================== */

import { dateText, extOf } from './ui.js';

const MANIFEST_URL = 'data/index.json';
const DEFAULT_TYPES_URL = 'data/types.json';

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

/**
 * 载入整个资料库。
 * @returns {Promise<{site: object, types: Array, stages: Array, demo: boolean}>}
 */
export async function loadLibrary() {
  const manifest = await getJSON(MANIFEST_URL);

  const typesUrl = manifest.types || DEFAULT_TYPES_URL;
  const stageMetaList = (manifest.stages || []).filter((s) => s && !s.hidden);

  const [typesDoc, ...stageDocs] = await Promise.all([
    getJSON(typesUrl).catch((err) => {
      console.warn('[library] 类型表读取失败，使用空表：', err.message);
      return { types: [] };
    }),
    ...stageMetaList.map((meta) =>
      getJSON(meta.file)
        .then((doc) => ({ meta, doc, error: null }))
        .catch((err) => ({ meta, doc: null, error: err.message }))
    )
  ]);

  const types = (typesDoc.types || [])
    .filter((t) => t && t.id)
    .map((t) => ({
      id: t.id,
      name: t.name || t.id,
      icon: t.icon || 'paper',
      desc: t.desc || ''
    }));

  const stages = stageDocs.map(({ meta, doc, error }) =>
    normalizeStage(meta, doc || {}, error, types)
  );

  return {
    site: manifest.site || {},
    types,
    stages,
    demo: stages.some((s) => s.demo)
  };
}

/* ── 规整：学段 ─────────────────────────────────────────────── */
function normalizeStage(meta, doc, error, types) {
  const stage = {
    id: meta.id || doc.stage || 'stage',
    name: meta.name || doc.name || meta.id || '未命名',
    hint: meta.hint || doc.hint || '',
    file: meta.file,
    demo: doc._demo === true,
    error: error || null,
    groups: []
  };

  if (error) return stage;

  stage.groups = (doc.groups || [])
    .filter((g) => g && (g.id || g.name))
    .map((group) => normalizeGroup(group, types));

  return stage;
}

/* ── 规整：学科（一组） ─────────────────────────────────────── */
function normalizeGroup(group, types) {
  const name = group.name || group.id || '未命名';
  const normalized = {
    id: group.id || slug(name),
    name,
    abbr: String(group.abbr || name.trim().slice(0, 1) || '·'),
    color: group.color || '#1f6f5c',
    desc: group.desc || '',
    aliases: Array.isArray(group.aliases) ? group.aliases.map(String) : [],
    subgroups: []
  };

  // 两种写法都支持：带 subgroups 的（教材/习题/笔记…），或直接平铺 items 的
  const rawSubgroups =
    Array.isArray(group.subgroups) && group.subgroups.length
      ? group.subgroups
      : [{ id: group.id, name: '', type: '', items: group.items || [] }];

  normalized.subgroups = rawSubgroups.map((sub) => {
    const typeMeta = types.find((t) => t.id === (sub.type || sub.id));
    return {
      id: sub.id || sub.type || 'items',
      name: sub.name || (typeMeta ? typeMeta.name : '') || '资料',
      type: sub.type || (typeMeta ? typeMeta.id : ''),
      icon: typeMeta ? typeMeta.icon : '',
      items: (sub.items || [])
        .map((item) => normalizeItem(item, sub, normalized, types))
        .filter(Boolean)
    };
  });

  return normalized;
}

/* ── 规整：条目 ─────────────────────────────────────────────── */
function normalizeItem(raw, sub, group, types) {
  if (!raw || raw.draft === true) return null;

  const title = String(raw.title || '').trim();
  const url = String(raw.url || '').trim();
  if (!title || !url) return null;

  const subType = types.some((t) => t.id === sub.type) ? sub.type : '';
  const type = raw.type || subType || '';

  return {
    title,
    url,
    type,
    format: String(raw.format || extOf(url)).toUpperCase(),
    desc: raw.desc ? String(raw.desc) : '',
    pages: raw.pages ? String(raw.pages) : '',
    updated: dateText(raw.updated || raw.date || ''),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    pinned: raw.pinned === true,
    groupId: group.id
  };
}

function slug(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff-]+/g, '-');
}
