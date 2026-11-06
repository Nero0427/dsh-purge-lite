/**
 * ops_bash 前台超时上限的手工收紧。
 *
 * 背景：`dsh-ops` 把 `MAX_BASH_TIMEOUT_MS` 设成 `2_147_483_647`（约 24.8 天），
 * 模型只要显式传一个 `timeoutMs`，前台就真等到那个数。实测一个会话里 12% 的
 * `ops_bash` 传了 `timeoutMs`，其中几条把单步阻塞拖到 300–480 秒。
 *
 * 收到 180 秒不会丢工作：`dsh-ops` 的前台超时会走 `kind: "promoted"`，
 * 把还在跑的命令转成后台 job 并返回 jobId，进程不杀。主循环继续，
 * 模型再用 `job_output` 取结果。
 *
 * dsh-ops 更新会覆盖这处改动，所以提供 apply / status / revert 三个动作，
 * 升级后重跑一次即可。备份写在同目录的 `constants.js.dshpurge.bak`。
 *
 * @file lib/bash-budget.js
 */
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_BASH_BUDGET_MS = 180_000;
const BAK_SUFFIX = ".dshpurge.bak";
const MAX_RE = /export const MAX_BASH_TIMEOUT_MS = ([\d_]+);/;
const MAX_LINE_RE = /export const MAX_BASH_TIMEOUT_MS = [\d_]+;/;

/** 扫描 profiles 下每个 profile 的 node_modules/dsh-ops 常量文件。 */
export function listBashBudgetTargets(dshHome) {
  const root = path.join(String(dshHome || ""), "profiles");
  const out = [];
  let profiles = [];
  try { profiles = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { return out; }
  for (const p of profiles) {
    const fp = path.join(root, p.name, "node_modules", "dsh-ops", "lib", "shells", "constants.js");
    if (fs.existsSync(fp)) out.push(fp);
  }
  return out;
}

export function readBashBudget(fp) {
  try {
    const m = MAX_RE.exec(fs.readFileSync(fp, "utf8"));
    if (!m) return null;
    return Number(m[1].replace(/_/g, ""));
  } catch {
    return null;
  }
}

function atomicWrite(fp, text) {
  const tmp = `${fp}.${process.pid}.${Date.now()}.tmp`;
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeFileSync(fd, text, "utf8");
    try { fs.fsyncSync(fd); } catch { /* 文件系统不支持 */ }
  } finally {
    fs.closeSync(fd);
  }
  try { fs.renameSync(tmp, fp); } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

/** 幂等：已经是目标值就跳过，不重复写。 */
export function applyBashBudget(fp, ms = DEFAULT_BASH_BUDGET_MS) {
  const current = readBashBudget(fp);
  if (current === null) return { ok: false, path: fp, action: "skip", reason: "pattern_not_found" };
  if (current === ms) return { ok: true, path: fp, action: "current", from: current, to: ms };
  const text = fs.readFileSync(fp, "utf8");
  const bak = fp + BAK_SUFFIX;
  if (!fs.existsSync(bak)) {
    try { fs.copyFileSync(fp, bak); } catch { /* 备份失败仍继续，revert 会因此不可用 */ }
  }
  const next = text.replace(
    MAX_LINE_RE,
    `export const MAX_BASH_TIMEOUT_MS = ${String(ms).replace(/(\d)(?=(\d{3})+$)/g, "$1_")}; // [dsh-purge] capped from 2^31-1; timeout promotes to a background job`,
  );
  if (next === text) return { ok: false, path: fp, action: "skip", reason: "replace_failed" };
  atomicWrite(fp, next);
  return { ok: true, path: fp, action: "applied", from: current, to: ms };
}

export function revertBashBudget(fp) {
  const bak = fp + BAK_SUFFIX;
  if (!fs.existsSync(bak)) return { ok: false, path: fp, action: "skip", reason: "no_backup" };
  const original = fs.readFileSync(bak, "utf8");
  atomicWrite(fp, original);
  try { fs.unlinkSync(bak); } catch { /* ignore */ }
  return { ok: true, path: fp, action: "reverted" };
}

/** 一次跑完所有 profile：返回每个目标的结果。 */
export function applyAll(dshHome, ms) {
  return listBashBudgetTargets(dshHome).map((fp) => applyBashBudget(fp, ms));
}

export function statusAll(dshHome) {
  return listBashBudgetTargets(dshHome).map((fp) => ({
    path: fp,
    maxTimeoutMs: readBashBudget(fp),
    hasBackup: fs.existsSync(fp + BAK_SUFFIX),
  }));
}
