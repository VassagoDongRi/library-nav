# 书架 · 课程资料库

东师信科一站式导航（[nav.dongri.work](https://nav.dongri.work)）的配套资料站：
教材、习题、笔记、试卷，按「学段 → 学科 → 类型」归档。

纯静态、零构建：数据在 `data/*.json`，文件在 `resource/`，改完推上去就是最新。

---

## 目录结构

```text
library/
├─ index.html                 # 唯一页面：读 JSON 渲染
├─ data/
│  ├─ index.json              # 总清单：站点信息 + 学段列表（加学段只改这里）
│  ├─ types.json              # 类型注册表：教材/习题/笔记/论文试卷
│  ├─ college.json            # 大学的内容（示例数据，替换成你的）
│  └─ senior.json             # 高中骨架，填了就会自动出现
├─ resource/                  # 真实文件，路径与 JSON 里的 url 对应
│  └─ college/
│     ├─ books/higher-mathematics/…
│     ├─ exercise/…
│     ├─ notes/…
│     └─ paper/…
├─ assets/
│  ├─ css/tokens.css          # 设计令牌（换色改这里）
│  ├─ css/base.css            # 版式骨架
│  ├─ css/components.css      # 卡片、搜索浮层
│  ├─ js/app.js               # 启动与事件
│  ├─ js/data.js              # 读取与规整
│  ├─ js/views.js             # 筛选与排序
│  ├─ js/render.js            # 模板
│  ├─ js/search.js            # 分词打分检索
│  ├─ js/palette.js           # 搜索浮层
│  ├─ js/icons.js             # 内联 SVG
│  ├─ js/ui.js                # 工具函数
│  └─ img/favicon.svg
├─ tools/
│  ├─ serve.mjs               # 本地预览服务器（零依赖）
│  └─ check-data.mjs          # 校验 JSON 与文件路径（本地手动跑）
└─ docs/                      # 规划、字段说明、部署说明
```

**路径约定**：`resource/<学段>/<类型>/<学科>/<文件>`
JSON 里的 `url` 一律写成相对路径：`./resource/college/books/higher-mathematics/高等数学（上册）.pdf`

---

## 加一份资料（3 步）

1. 把文件放进对应目录，例如
   `resource/college/notes/higher-mathematics/高数公式速查表.html`

2. 打开 `data/college.json`，找到「高等数学」→ `subgroups` 里 `id: "notes"` 那一组，
   在 `items` 末尾加一条：

```json
{
  "title": "高数公式速查表",
  "type": "notes",
  "url": "./resource/college/notes/higher-mathematics/高数公式速查表.html",
  "desc": "极限、导数、积分公式一页纸。",
  "pages": "6 节",
  "updated": "2026-11-18",
  "tags": ["速查", "考前"]
}
```

3. 推上去，等 1 分钟左右 Pages 自动发布。

提交前想先自查，可以本地跑一次：

```bash
node tools/check-data.mjs
```

只想先藏起来：条目里加 `"draft": true`。

---

## 发布

和主站一致：用 **Deploy from a branch**，不需要 Actions。

1. 推代码到 `main`
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **Deploy from a branch**
3. Branch 选 `main`、目录选 `/ (root)`，点 Save
4. 等 1～2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`

几点说明：

- 仓库根目录的 `.nojekyll` 会让 Pages **跳过 Jekyll、原样发布**。别删它：以后接 Pagefind 生成的 `_pagefind/`、`_headers`、`.well-known/` 都靠它才不会被静默忽略。
- 分支部署**没有自动校验**。JSON 写错或路径大小写不对，页面会直接缺内容——所以提交前跑一下 `node tools/check-data.mjs` 比较稳。
- 不要把 Actions 部署工作流加回来。之前那版 `.github/workflows/deploy.yml` 已经删除；它和分支部署同时存在时，每次推送会构建、部署两遍，既慢又容易看花眼。

自定义域名、容量限制、常见问题见 [docs/DEPLOY.md](docs/DEPLOY.md)。

---

## 扩展点

| 我想… | 改哪里 | 前端要不要动 |
| --- | --- | --- |
| 加一份资料 | 对应学段 JSON 的 `items` 加一项 | 不用 |
| 加一门课 | 学段 JSON 的 `groups` 加一组（`color` 决定色条） | 不用 |
| 加一种类型（如「课件」） | `data/types.json` 加一项 + 建 `resource/.../slide/` 目录 | 不用 |
| 新增学段（研究生 / 竞赛） | 新建 `data/xxx.json` + `data/index.json` 的 `stages` 加一行 | 不用 |
| 整段下线 | `data/index.json` 里给该学段加 `"hidden": true` | 不用 |
| 单条暂不公开 | 条目加 `"draft": true` | 不用 |
| 卡片多显示一个字段 | JSON 加字段 + `render.js` 的 `cardHTML` 加一行 | 要（1 行） |
| 换主色 / 换纸色 | `assets/css/tokens.css` 的 `--accent` / `--bg` | 不用 |
| 接全文搜索 | 笔记换成 HTML 后接 Pagefind，替换 `state.query` 的过滤实现 | 要（局部） |

字段清单见 [docs/DATA.md](docs/DATA.md)，设计取舍见 [docs/PLAN.md](docs/PLAN.md)。

---

## 命名约定

- 学段目录用 **`college`**
- 学科目录用 kebab-case：`higher-mathematics`、`linear-algebra`、`program-design`
- 类型目录与 `data/types.json` 的 `id` 完全一致：`books` / `exercise` / `notes` / `paper`
- 文件名 = 卡片标题，中文没问题，GitHub Pages 支持 UTF-8 路径
- **大小写要一致**：Windows 不区分、Pages 区分，`C-Wiki.html` 和 `c-wiki.html` 是两个文件

---

## 版权

本站只负责索引，内容版权归原作者/出版社所有。教材扫描件请自行确认使用范围，
公开仓库建议只收录可分享的笔记、讲义、自己整理的题解，或把大文件放到网盘 /
GitHub Releases 后用外链指向（`url` 直接写 `https://…` 即可，校验脚本会跳过）。

---

## 许可

代码部分 [MIT](LICENSE)；资料内容版权归各自作者。
