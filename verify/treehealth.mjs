/**
 * 静态一致性检查：patch 里出现的每个 name 能否被 profile 解析到。
 *
 * 用法：
 *   node verify/treehealth.mjs <profile 目录> [<@deepseek-ai 目录>]
 *
 * 不加载宿主、不发请求，只用 Node 的模块解析规则判断「这条依赖装没装」。
 * 换宿主安装位置后先跑这个，比启动后看报错快。
 *
 * @file verify/treehealth.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// 用 Node 原生解析器判断 patch 里每个 name 能否被 profile 解析到。
const profileDir = process.argv[2];
const hostModules = process.argv[3];

const reqProfile = createRequire(path.join(profileDir, "package.json"));
// 宿主包（@deepseek-ai/*）在安装目录，另建一个解析上下文
const reqHost = hostModules
  ? createRequire(path.join(hostModules, "..", "..", "package.json"))
  : null;

const pkg = JSON.parse(fs.readFileSync(path.join(profileDir, "package.json"), "utf8"));
const bundles = pkg.dsh?.profile?.bundles || [];

function tryResolve(name) {
  for (const req of [reqProfile, reqHost].filter(Boolean)) {
    try {
      req.resolve(name);
      return "ok";
    } catch (e) {
      // ERR_PACKAGE_PATH_NOT_EXPORTED 说明包在但子路径没导出；MODULE_NOT_FOUND 是彻底没找到
      if (e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED") return "not-exported";
    }
  }
  return "unresolved";
}

const problems = [];
let checked = 0;

for (const bundle of bundles) {
  const bdir = path.join(profileDir, "node_modules", bundle);
  const bpid = path.join(bdir, "package.json");
  if (!fs.existsSync(bpid)) continue;
  let bj;
  try { bj = JSON.parse(fs.readFileSync(bpid, "utf8")); } catch { continue; }
  const patchRel = bj.dsh?.bundle?.patch;
  if (!patchRel) continue;
  const patchPath = path.join(bdir, patchRel);
  if (!fs.existsSync(patchPath)) {
    problems.push(`${bundle}: patch 文件不存在 ${patchRel}`);
    continue;
  }
  const text = fs.readFileSync(patchPath, "utf8");
  const names = [...text.matchAll(/^\s*-?\s*name:\s*['"]?([^'"\n]+?)['"]?\s*$/gm)].map((m) => m[1].trim());
  for (const n of names) {
    if (!n || n.startsWith("./") || n.startsWith("../") || n.startsWith("cordis:") || n.includes("${") || n.includes("!!js")) continue;
    checked += 1;
    const r = tryResolve(n);
    if (r !== "ok") problems.push(`${bundle} → ${n}  [${r}]`);
  }
}

console.log(`bundle ${bundles.length} 个，可解析的 name 条目 ${checked} 条`);
if (!problems.length) console.log("全部可解析，插件树健康");
else {
  console.log("问题项:");
  for (const p of problems) console.log("  " + p);
}
