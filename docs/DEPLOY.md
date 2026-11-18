# 部署与域名

## 0. 上传前确认

- [ ] `data/college.json` 里的 `_demo` 改成了 `false`（或删掉这行）
- [ ] `node tools/check-data.mjs` 本地跑一遍能通过（没装 Node 就等 CI 报错）
- [ ] `data/index.json` 的 `site.repo`、`site.home` 指向真实地址
- [ ] `resource/` 下的文件都已提交

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

---

## 2. 开启 Pages

### 方式 A：GitHub Actions（推荐，带数据校验）

1. 仓库 **Settings → Pages**
2. **Build and deployment → Source** 选 **GitHub Actions**
3. 推一次代码，或在 **Actions → Deploy 书架 → Run workflow** 手动触发
4. 跑完后 Sites 里能看到地址：`https://<用户名>.github.io/<仓库名>/`

工作流会先 `node tools/check-data.mjs`：JSON 写错或文件路径对不上，部署直接失败，
不会把一个坏站点发上去。失败时点开红叉那个 job，日志里会写清「哪个学段、哪一条、哪个文件」。

### 方式 B：从分支部署（不用 Actions）

1. **Settings → Pages → Source** 选 **Deploy from a branch**
2. Branch 选 `main`，目录选 `/ (root)`
3. 删除 `.github/workflows/deploy.yml`，否则 Actions 会因 Pages 来源不匹配而报错

好处是零配置，代价是没有路径校验——大小写错了只能自己发现。

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
| 仓库体积 | 建议 < 1 GB | 大了 clone/CI 都慢 |
| Pages 站点 | 1 GB | 发布产物不能超过 |
| Pages 带宽 | ~100 GB/月 | 校园规模完全够 |
| 构建时间 | 10 分钟 | 本站不构建，只做 rsync |

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
| 部署红叉：`Get Pages site failed` | Settings → Pages 的 Source 没选 GitHub Actions |
| 部署红叉：文件不存在 | 日志里那条「文件不存在 → …」，按路径补文件或改 `url` |
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
