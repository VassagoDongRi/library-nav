/* ==========================================================================
   serve.mjs — 零依赖本地静态服务器
   --------------------------------------------------------------------------
   用途：本地预览。因为浏览器禁止 file:// 页面 fetch JSON / 加载 ES Module，
   双击 index.html 一定是空白，必须通过 http:// 访问。

   用法：
     node tools/serve.mjs
     node tools/serve.mjs 3000
     PORT=3000 node tools/serve.mjs
   ========================================================================== */

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] && /^\d+$/.test(process.argv[2]) ? '.' : process.argv[2] || '.');
const portArgument = process.argv[2] && /^\d+$/.test(process.argv[2]) ? process.argv[2] : null;
const port = Number(portArgument || process.env.PORT || 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.woff2': 'font/woff2',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.zip': 'application/zip'
};

const rootPrefix = root.endsWith(sep) ? root : root + sep;

createServer((req, res) => {
  let pathname = '/';
  try {
    pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400).end('Bad Request');
    return;
  }

  let filePath = resolve(join(root, normalize(pathname)));

  // 防目录穿越
  if (filePath !== root && !filePath.startsWith(rootPrefix)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const noStore = ['.html', '.css', '.js', '.mjs', '.json'].includes(ext);

  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': noStore ? 'no-store' : 'public, max-age=3600'
  });
  createReadStream(filePath).pipe(res);
}).listen(port, () => {
  console.log(`\n  书架 · 本地预览  →  http://localhost:${port}/\n`);
  console.log(`  根目录：${root}`);
  console.log('  退出：Ctrl + C\n');
});
