/* ==========================================================================
   check-data.mjs — 数据与文件路径校验
   --------------------------------------------------------------------------
   在 GitHub Actions 里跑一次，把「JSON 写错」和「文件名对不上」两类问题
   挡在部署之前。Windows 不区分大小写、Pages 区分，这个脚本能提前发现。

   用法：
     node tools/check-data.mjs
   输出：
     ✅ 每个学段通过 / ⚠️ 警告 / ❌ 错误，最后以退出码说明结果
   ========================================================================== */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const root = resolve('.');
const problems = { error: [], warn: [] };

const fail = (message) => problems.error.push(message);
const warn = (message) => problems.warn.push(message);

function readJSON(file) {
  const full = resolve(root, file);
  if (!existsSync(full)) {
    fail(`缺少文件：${file}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(full, 'utf8'));
  } catch (error) {
    fail(`${file} 不是合法 JSON：${error.message}`);
    return null;
  }
}

const manifest = readJSON('data/index.json');
if (!manifest) {
  report();
  process.exit(1);
}

const typesDoc = manifest.types ? readJSON(manifest.types) : null;
const types = new Set((typesDoc?.types || []).map((t) => t.id));

const stages = (manifest.stages || []).filter((stage) => stage && !stage.hidden);
if (!stages.length) warn('data/index.json 里没有任何学段');

const seenUrls = new Map();
let totalItems = 0;

for (const stageMeta of stages) {
  if (!stageMeta.id) fail(`学段缺少 id：${JSON.stringify(stageMeta)}`);
  if (!stageMeta.file) {
    fail(`学段「${stageMeta.name || stageMeta.id}」缺少 file`);
    continue;
  }

  const doc = readJSON(stageMeta.file);
  if (!doc) continue;

  const isDemo = doc._demo === true;
  const prefix = `[${stageMeta.name || stageMeta.id}]`;
  let count = 0;

  (doc.groups || []).forEach((group) => {
    const groupName = group.name || group.id || '(未命名学科)';
    if (!group.id) warn(`${prefix} 学科「${groupName}」没有 id`);

    const subgroups = Array.isArray(group.subgroups) && group.subgroups.length
      ? group.subgroups
      : [{ name: '默认', type: '', items: group.items || [] }];

    subgroups.forEach((sub) => {
      (sub.items || []).forEach((item, index) => {
        count += 1;
        const label = `${prefix} ${groupName} / ${sub.name || '默认'} #${index + 1}`;

        if (item.draft === true) return;

        if (!item.title) fail(`${label}：缺少 title`);
        if (!item.url) {
          fail(`${label}：缺少 url`);
          return;
        }

        if (item.type && types.size && !types.has(item.type)) {
          warn(`${label}：type「${item.type}」未在 data/types.json 注册`);
        }

        const isExternal = /^https?:\/\//i.test(item.url);
        if (isExternal) return;

        const key = item.url.replace(/^\.\//, '');
        if (seenUrls.has(key)) {
          warn(`${label}：url 与「${seenUrls.get(key)}」重复`);
        } else {
          seenUrls.set(key, item.title);
        }

        const clean = key.split('#')[0].split('?')[0];
        let decoded = clean;
        try {
          decoded = decodeURIComponent(clean);
        } catch {
          /* 保留原样 */
        }
        const full = resolve(root, decoded);

        if (!full.startsWith(root + sep)) {
          fail(`${label}：url 指向仓库外部（${item.url}）`);
          return;
        }

        if (!existsSync(full) || !statSync(full).isFile()) {
          const message = `${label}：文件不存在 → ${decoded}`;
          if (isDemo) warn(`${message}（示例数据，可忽略）`);
          else fail(message);
        }
      });
    });
  });

  totalItems += count;
  const state = isDemo ? '示例数据' : '正式数据';
  console.log(`✅ ${prefix} 读取成功，${count} 条（${state}）`);
}

report();

function report() {
  if (problems.warn.length) {
    console.log(`\n⚠️  ${problems.warn.length} 条警告`);
    problems.warn.forEach((message) => console.log(`   · ${message}`));
  }

  if (problems.error.length) {
    console.log(`\n❌ ${problems.error.length} 个错误，部署已中止`);
    problems.error.forEach((message) => console.log(`   · ${message}`));
    process.exitCode = 1;
    return;
  }

  console.log(`\n✨ 校验通过，共 ${totalItems} 条资料。`);
}
