/* ==========================================================================
   search.js — 轻量检索：分词 → 打分 → 排序
   --------------------------------------------------------------------------
   为什么不用 lunr / MiniSearch：
     这里要搜的只是元信息（标题、描述、标签、学科），最多几百条，
     一次检索 < 5ms，引入 30KB 的索引库不划算。
     什么时候该换成 Pagefind：当你想搜到「正文里的某一句话」而不只是标题。
   中文处理：整段 + 二元组，不依赖词典，召回率够用。
   ========================================================================== */

const FIELD_WEIGHT = { title: 40, tags: 20, group: 10, desc: 6 };

let docs = [];

export function norm(value) {
  return String(value ?? '').toLowerCase().normalize('NFKC');
}

/** 中文按「整段 + 二元组」切，英文按词切，返回去重后的数组 */
export function tokenize(value) {
  const text = norm(value);
  const out = new Set();

  (text.match(/[a-z0-9][a-z0-9+#._-]*/g) || []).forEach((word) => out.add(word));

  (text.match(/[\u4e00-\u9fff]+/g) || []).forEach((run) => {
    out.add(run);
    for (let i = 0; i < run.length - 1; i += 1) out.add(run.slice(i, i + 2));
  });

  return [...out];
}

/**
 * 建立索引，只在启动时调用一次。
 * @returns {number} 文档数
 */
export function buildIndex(stages) {
  docs = [];

  stages.forEach((stage) => {
    if (stage.error) return;
    stage.groups.forEach((group) => {
      group.subgroups.forEach((sub) => {
        sub.items.forEach((item) => {
          const fields = {
            title: norm(item.title),
            tags: norm(item.tags.join(' ')),
            group: norm(
              [stage.name, group.name, sub.name, ...(group.aliases || [])]
                .filter(Boolean)
                .join(' ')
            ),
            desc: norm(item.desc)
          };
          docs.push({
            item,
            stage,
            group,
            sub,
            fields,
            tokens: {
              title: tokenize(fields.title),
              tags: tokenize(fields.tags),
              group: tokenize(fields.group),
              desc: tokenize(fields.desc)
            }
          });
        });
      });
    });
  });

  return docs.length;
}

/** 返回按相关度排序的命中项（最多 limit 条） */
export function searchHits(rawQuery, limit = 40) {
  const query = norm(rawQuery).trim();
  if (!query) return [];

  const terms = tokenize(query);
  const results = [];

  docs.forEach((doc) => {
    const score = scoreDoc(doc, terms, query);
    if (score > 0) results.push({ ...doc, score });
  });

  results.sort(
    (a, b) =>
      b.score - a.score ||
      String(b.item.updated).localeCompare(String(a.item.updated))
  );

  return results.slice(0, limit);
}

function scoreDoc(doc, terms, query) {
  let score = 0;

  if (doc.fields.title.includes(query)) score += 80; // 整串命中标题
  if (doc.fields.title.startsWith(query)) score += 40; // 标题前缀

  terms.forEach((term) => {
    Object.entries(FIELD_WEIGHT).forEach(([field, weight]) => {
      if (doc.tokens[field].includes(term)) score += weight; // 词级命中
      else if (doc.fields[field].includes(term)) score += weight * 0.55; // 分词边界兜底
    });
    if (doc.fields.title.startsWith(term)) score += 12;
  });

  return score;
}
