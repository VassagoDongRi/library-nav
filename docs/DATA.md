# 数据字段说明

所有内容都在 `data/` 下的四个文件里，改完推送即可，不需要构建。

| 文件 | 作用 | 什么时候改 |
| --- | --- | --- |
| `data/index.json` | 站点信息 + 学段清单 | 加学段、改站名、改导航链接 |
| `data/types.json` | 类型注册表 | 加「课件」「真题」这类新类型 |
| `data/college.json` | 大学的学科与条目 | 加课、加资料 |
| `data/senior.json` | 高中骨架 | 高中开始整理时 |

> 字段里的 `_comment`、`_demo` 这类下划线开头的键是给人看的，程序会忽略。

---

## data/index.json

```json
{
  "site": {
    "title": "书架",
    "kicker": "LIBRARY",
    "home": "https://nav.dongri.work/",
    "homeLabel": "回到导航站",
    "repo": "https://github.com/VassagoDongRi/library"
  },
  "types": "data/types.json",
  "stages": [
    { "id": "college", "name": "大学", "hint": "公共课 · 专业基础", "file": "data/college.json" },
    { "id": "senior",  "name": "高中", "hint": "整理中",           "file": "data/senior.json" }
  ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `site.title` | 是 | 顶栏站名，同时进 `<title>` |
| `site.kicker` | 否 | 站名后面的小字，默认 `LIBRARY` |
| `site.home` | 否 | 页脚「回到导航站」的链接 |
| `site.repo` | 否 | 页脚 GitHub 链接 |
| `site.copyright` | 否 | 页脚版权行，例如 `© 2026 DongRi` |
| `site.author` | 否 | 页脚作者块，缺省则整块隐藏 |
| `site.author.name` | 否 | 作者名，同时作为链接文字 |
| `site.author.email` | 否 | 邮箱，渲染成 `mailto:` |
| `site.author.github` | 否 | 作者主页链接（也可用 `site.author.url`） |
| `types` | 否 | 类型表路径，默认 `data/types.json` |
| `stages[].id` | 是 | 学段标识，同时用于 `#college` 这样的地址 |
| `stages[].name` | 是 | 顶栏显示的名字 |
| `stages[].hint` | 否 | 该学段没内容时显示的提示 |
| `stages[].file` | 是 | 学段数据文件路径 |
| `stages[].hidden` | 否 | `true` 时整段不出现（文件保留） |

---

## data/types.json

```json
{
  "types": [
    { "id": "books",    "name": "教材",      "icon": "book",   "desc": "课本 · 参考书" },
    { "id": "exercise", "name": "习题",      "icon": "pencil", "desc": "课后题 · 题解" },
    { "id": "notes",    "name": "笔记",      "icon": "note",   "desc": "课堂笔记 · 速查" },
    { "id": "paper",    "name": "论文/试卷", "icon": "paper",  "desc": "真题 · 模拟 · 报告" }
  ]
}
```

- `id` 要和 `resource/` 下的目录名一致，也要和条目里的 `type` 一致。
- `icon` 可选值见 `assets/js/icons.js`：`book` / `pencil` / `note` / `paper`。
- 加类型后，Hero 的筛选按钮和分组图标会自动出现，前端不用改。

---

## 学段文件（college.json / senior.json）

```json
{
  "_demo": true,
  "stage": "college",
  "name": "大学",
  "hint": "这个学段没内容时显示的提示",
  "groups": [
    {
      "id": "higher-mathematics",
      "name": "高等数学",
      "abbr": "高",
      "color": "#6b5b95",
      "desc": "同济版 · 上下册 · 大一上",
      "aliases": ["高数", "微积分"],
      "subgroups": [
        {
          "id": "books",
          "type": "books",
          "name": "教材",
          "items": [
            {
              "title": "高等数学（上册）",
              "url": "./resource/college/books/higher-mathematics/高等数学（上册）.pdf",
              "type": "books",
              "desc": "极限、导数、积分与级数，含例题详解。",
              "pages": "412 页",
              "updated": "2026-09-12",
              "tags": ["同济第七版", "大一上"],
              "pinned": true
            }
          ]
        }
      ]
    }
  ]
}
```

### 学段字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `_demo` | 否 | `true` 时页面顶部显示「示例数据」提示，且校验脚本跳过缺失文件 |
| `stage` | 否 | 学段标识（与 index.json 一致即可） |
| `name` | 否 | 学段名 |
| `hint` | 否 | 空状态提示语 |
| `groups` | 是 | 学科数组 |

### 学科（group）字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 是 | 唯一标识，用作锚点 `#g-<id>` |
| `name` | 是 | 学科名 |
| `abbr` | 否 | 卡片左上角的一字缩写，默认取 `name` 首字 |
| `color` | 否 | 学科色（`#rrggbb`），卡片左侧色条 + 缩写底色；默认墨绿 |
| `desc` | 否 | 分组标题右侧的说明 |
| `aliases` | 否 | 搜索别名，如「高数」「线代」，只影响搜索不影响展示 |
| `subgroups` | 是\* | 类型/年级子分组 |
| `items` | 是\* | 平铺写法：不想分子组时直接放条目 |

\* `subgroups` 和 `items` 二选一。用 `subgroups` 时每个子分组会有一个小标题；
用 `items` 时整组卡片平铺。

### 子分组（subgroup）字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 否 | 子分组标识 |
| `type` | 否 | 类型 id，用于筛选和图标；学期/年级分组可以不填 |
| `name` | 否 | 小标题，默认取类型名 |
| `items` | 是 | 条目数组 |

### 条目（item）字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 卡片标题 |
| `url` | 是 | 相对路径（`./resource/...`）或外链（`https://...`） |
| `type` | 否 | 类型 id，用于筛选；继承子分组的 `type` |
| `format` | 否 | 徽章文字，不填则从扩展名推断（PDF/HTML/DOCX…） |
| `desc` | 否 | 一句话描述，两行截断 |
| `pages` | 否 | 体量，自由文本：「412 页」「13 节」「42 题」 |
| `updated` | 否 | 日期 `YYYY-MM-DD`，用于排序和「最近更新」 |
| `tags` | 否 | 字符串数组，参与搜索（不显示在卡片上） |
| `pinned` | 否 | `true` 时置顶并显示琥珀色「置顶」徽章 |
| `draft` | 否 | `true` 时完全不渲染、不索引、不计入统计 |

---

## 校验规则

`node tools/check-data.mjs`（CI 自动执行）会检查：

- 所有 JSON 能解析
- `title` / `url` 非空
- 相对路径指向的文件真实存在（**区分大小写**）
- `url` 不逃出仓库目录
- 重复 `url` 给出警告
- `type` 未在 `types.json` 注册时给警告
- `_demo: true` 的学段，缺文件只警告不报错

## 常见写错的地方

| 现象 | 原因 |
| --- | --- |
| 整页空白、控制台 CORS 报错 | 双击了 index.html，用 `node tools/serve.mjs` |
| 某个学段显示「数据读取失败」 | 该 JSON 少逗号 / 多逗号 / 中文引号 |
| 卡片点开 404 | `url` 大小写或路径层级不对（`books` 不是 `book`） |
| 筛选后一条都不显示 | 条目的 `type` 与 `types.json` 的 `id` 对不上 |
| 最近更新里没有新加的 | 忘了填 `updated` |
| 页面还是旧的 | Pages 缓存约 10 分钟，强刷或等一会儿 |
