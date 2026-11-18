# 部署与域名

默认走 **Deploy from a branch**，和主站 `nav.dongri.work` 一致。
Actions 那套保留在文末，作为需要「部署前自动校验」时的备选。

## 0. 上传前确认

- [ ] `data/college.json` 里的 `_demo` 改成了 `false`（或删掉这行）
- [ ] `node tools/check-data.mjs` 本地跑一遍能通过——分支部署没有 CI 兜底，这一步别省
- [ ] `data/index.json` 的 `site.repo`、`site.home` 指向真实地址
- [ ] `resource/` 下的文件都已提交
- [ ] 仓库根目录有 `.nojekyll`（跳过 Jekyll 用，删了会出问题）

---

## 1. 建仓库并上传

网页上传：新建仓库 → **Add file → Upload files** → 把 `library/` 里的内容拖进去
（注意是**文件夹里的内容**，不要把 `library` 这一层套进仓库）→ Commit。

命令行：

```bash
cd library
git init
git add .
git commit -m "init: 书架"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
```

仓库名建议 `library` 或 `library-nav`。站点所有路径都是相对路径，**仓库名不影响代码**。

> 网页上传会静默跳过以 `.` 开头的文件和文件夹（`.nojekyll`、`.github`、`.gitkeep` 都是）。
> 传完检查一下根目录有没有 `.nojekyll`，没有就手动新建一个。

---

## 2. 开启 Pages（Deploy from a branch）

1. 仓库 **Settings → Pages**
2. **Build and deployment → Source** 选 **Deploy from a branch**
3. Branch 选 `main`、目录选 `/ (root)`，点 **Save**
4. 等 1～2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`

之后每次 `push` 到 `main`，Pages 都会自动重新发布，不需要点任何按钮。

**三个要点**：

- 根目录的 `.nojekyll` 会让 Pages **跳过 Jekyll、原样发布**。别删它：以后接 Pagefind 生成的 `_pagefind/`、`_headers`、`.well-known/` 都靠它才不会被静默忽略。
- 分支部署**没有自动校验**。JSON 写错、路径大小写不对，页面会直接缺内容，所以推送前跑一下：

  ```bash
  node tools/check-data.mjs
  ```

- **不要同时保留 Actions 部署工作流**。两套并存时每次推送会构建、部署两遍，既慢又容易看花眼（主站 NavHub 目前就是这种状态）。

---

## 3. 自定义域名（可选）

例如想把站点放在 `lib.dongri.work`：

1. 仓库根目录新建文件 `CNAME`，内容只有一行（**不要带 `https://`、不要带斜杠**）：

   ```text
   lib.dongri.work
   ```

2. 在域名服务商（Cloudflare）加一条 DNS 记录：

   | 类型 | 名称 | 内容 | 代理状态 |
   | --- | --- | --- | --- |
   | CNAME | `lib` | `<用户名>.github.io` | **仅 DNS（灰云）** |

   如果 `lib` 已经有一条 A 记录，先删掉，CNAME 和 A 不能共存。

3. 回到 **Settings → Pages**，等证书签发完，勾上 **Enforce HTTPS**。

4. 验证：

   ```bash
   nslookup lib.dongri.work
   curl -I https://lib.dongri.work
   ```

**为什么必须灰云**：Cloudflare 橙云会代理并改写响应，GitHub 的证书校验过不去，
容易出现 526 / 重定向循环。要 CDN 就自己配规则，别让橙云默认接管。

**换域名后**：`data/index.json` 里的 `site.home` 不用改（那是导航站地址），
但导航站那边指向书架的卡片要手动更新。

---

## 4. 容量与限制

| 项 | 限制 | 说明 |
| --- | --- | --- |
| 单个文件 | 100 MB | 超过会被 push 拒绝 |
| 仓库体积 | 建议 < 1 GB | 大了 clone 和发布都慢 |
| Pages 站点 | 1 GB | 发布产物不能超过 |
| Pages 带宽 | ~100 GB/月 | 校园规模完全够 |
| 发布耗时 | 通常 1 分钟内 | 本站不编译，`.nojekyll` 让 Pages 原样发布 |

**不要用 Git LFS**：GitHub Pages 不会解析 LFS 指针，浏览器下载到的是一个 130 字节的文本文件，
不是 PDF。

大文件正确做法：

1. 上传到 GitHub **Releases**（单文件上限 2 GB）或网盘；
2. 在 JSON 里直接把 `url` 写成外链：

   ```json
   { "title": "高等数学（上册）", "url": "https://github.com/<用户名>/<仓库>/releases/download/v1/calc.pdf" }
   ```

   校验脚本会自动跳过 `http(s)://` 开头的 `url`，不会报「文件不存在」。

---

## 5. 缓存

GitHub Pages 对 HTML / JSON 设的缓存大约 10 分钟。刚推上去看不到变化是正常的：

- 强制刷新：`Ctrl + F5`（Mac：`Cmd + Shift + R`）
- 或开无痕窗口
- 文件本身（PDF/HTML）通常即时生效

---

## 6. 常见问题

| 现象 | 排查 |
| --- | --- |
| Pages 404 | 仓库名带大写、或 `index.html` 不在根目录 |
| 页面能开但没内容 | 看控制台：`data/index.json` 的路径对不对、JSON 能不能解析 |
| 推完一直不更新 | Settings → Pages 顶部有没有报错；最近一次 `pages build and deployment` 是否成功；`.nojekyll` 是否在根目录 |
| 页面缺某几条资料 | 本地跑 `node tools/check-data.mjs`，看哪条 `url` 的路径或大小写不对 |
| 每次推送跑两遍 | 仓库里还留着 Actions 部署工作流，和分支部署冲突，删掉 `.github/workflows/deploy.yml` |
| 中文文件名 404 | 检查是否被编码成了 `%E9%AB%98` 这类形式但仓库里是别的字符；也可能是大小写 |
| 自定义域名一直 302 | DNS 还是橙云，改成灰云 |
| 手机打开样式错乱 | 大概率是缓存了旧 CSS，强刷 |

---

## 7. 和导航站互链

建议在 `nav.dongri.work` 的「资源」分类里加一张卡片：

- 标题：书架 · 课程资料
- 网址：`https://lib.dongri.work/`（或你的实际地址）
- 描述：教材 / 习题 / 笔记 / 试卷，按学科归档

书架这边页脚的「回到导航站」已经指回 `https://nav.dongri.work/`，
两边形成闭环，用户不会走丢。

---

## 8. 备选：GitHub Actions（要自动校验时）

只有当你希望「JSON 写错就不发布」时再用这套。切换步骤：

1. 先加回工作流文件 `.github/workflows/deploy.yml`（内容见下）
2. **Settings → Pages → Source** 改成 **GitHub Actions**
3. 推送一次，或在 **Actions → Deploy 书架 → Run workflow** 手动触发

```yaml
name: Deploy 书架

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: 校验数据与文件路径
        run: node tools/check-data.mjs
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

两者的取舍：

| | Deploy from a branch | GitHub Actions |
| --- | --- | --- |
| 数据校验 | 无，靠本地手动跑 | 每次推送自动跑，失败不发布 |
| 发布范围 | 整个仓库（`docs/`、`tools/` 也公开） | 由 `path` 决定，可排除 |
| 依赖文件 | `.nojekyll` | 工作流文件 |
| 速度 | 1 分钟内 | 约 30 秒～1 分钟 |
