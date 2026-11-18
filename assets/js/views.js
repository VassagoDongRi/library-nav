/* ==========================================================================
   views.js — 把「数据」算成「视图」
   --------------------------------------------------------------------------
   纯函数：输入学段列表 + 筛选条件，输出带计数的视图结构，不碰 DOM。
   筛选三件事：学段 → 类型 → 搜索词。顺序固定，便于加新筛选时插队。
   ========================================================================== */

/** 单条是否命中（页面过滤用，比浮层的打分简单：只看是否包含） */
export function matchesQuery(item, group, sub, query) {
  if (!query) return true;
  const haystack = [
    item.title,
    item.desc,
    item.tags.join(' '),
    group.name,
    ...(group.aliases || []),
    sub.name
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(String(query).toLowerCase());
}

/** 排序：置顶 → 日期新的 → 标题 */
export function compareItems(a, b) {
  const pinned = Number(b.pinned) - Number(a.pinned);
  if (pinned !== 0) return pinned;
  const byDate = String(b.updated).localeCompare(String(a.updated));
  if (byDate !== 0) return byDate;
  return String(a.title).localeCompare(String(b.title), 'zh-Hans-CN');
}

/**
 * @param {Array} stages 规整后的学段
 * @param {{stage: string, type: string, query: string}} state
 */
export function buildViews(stages, state) {
  const scope = stages.filter((s) => state.stage === 'all' || s.id === state.stage);

  return scope.map((stage) => {
    if (stage.error) return { ...stage, groups: [], count: 0 };

    const groups = stage.groups
      .map((group) => {
        const subgroups = group.subgroups
          .map((sub) => ({
            ...sub,
            items: sub.items
              .filter((item) => state.type === 'all' || item.type === state.type)
              .filter((item) => matchesQuery(item, group, sub, state.query))
              .sort(compareItems)
          }))
          .filter((sub) => sub.items.length > 0);

        return {
          ...group,
          subgroups,
          count: subgroups.reduce((sum, sub) => sum + sub.items.length, 0)
        };
      })
      .filter((group) => group.count > 0);

    return {
      ...stage,
      groups,
      count: groups.reduce((sum, group) => sum + group.count, 0)
    };
  });
}

/** 摊平成一维（用于统计、最近更新） */
export function flattenViews(views) {
  const out = [];
  views.forEach((stage) => {
    stage.groups.forEach((group) => {
      group.subgroups.forEach((sub) => {
        sub.items.forEach((item) => out.push({ item, stage, group, sub }));
      });
    });
  });
  return out;
}

/** 最近更新：按日期倒序取前 N 条 */
export function recentItems(views, limit = 6) {
  return flattenViews(views)
    .filter((entry) => entry.item.updated)
    .sort((a, b) => String(b.item.updated).localeCompare(String(a.item.updated)))
    .slice(0, limit);
}

/** 整个库最新的日期，用于页脚 */
export function latestUpdate(views) {
  return flattenViews(views).reduce(
    (latest, entry) => (entry.item.updated > latest ? entry.item.updated : latest),
    ''
  );
}
