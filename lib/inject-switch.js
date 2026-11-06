/**
 * 提示词注入总开关。
 *
 * 关闭后，宿主补丁与 cordis prompt section 都不再往 system prompt 前面挂注入正文，
 * dsh 回到原生 system prompt。
 *
 * 开关在每次组装 system prompt 时都会被读，所以带 mtime 缓存：文件没变就不重复解析。
 * 切换后从下一轮组装开始生效，不需要重启 dsh——注入正文本来就是每步重新拼的。
 *
 * 本模块不 import core.js（core.js 是巨型模块，反向依赖会成环）。
 *
 * @file lib/inject-switch.js
 */
import fs from "node:fs";
import path from "node:path";

const SETTINGS_FILE = "inject-switch.json";
const DEFAULT_ENABLED = true;
/** 默认走全量：与 1.3.0 之前的行为完全一致，不选模式就等于什么都没变。 */
const DEFAULT_MODE = "full";

let cache = { home: "", mtime: -1, enabled: DEFAULT_ENABLED, mode: DEFAULT_MODE };

export function injectSwitchPath(dshHome) {
  return path.join(String(dshHome || ""), "dsh-purge", SETTINGS_FILE);
}

function statMtime(fp) {
  try { return fs.statSync(fp).mtimeMs; } catch { return 0; }
}

function readSettings(dshHome) {
  const home = String(dshHome || "");
  if (!home) return { enabled: DEFAULT_ENABLED, mode: DEFAULT_MODE };
  const fp = injectSwitchPath(home);
  const mtime = statMtime(fp);
  if (cache.home === home && cache.mtime === mtime) return { enabled: cache.enabled, mode: cache.mode };
  let enabled = DEFAULT_ENABLED;
  let mode = DEFAULT_MODE;
  try {
    if (mtime) {
      const parsed = JSON.parse(fs.readFileSync(fp, "utf8"));
      if (parsed && typeof parsed.promptInject === "boolean") enabled = parsed.promptInject;
      if (parsed && typeof parsed.mode === "string" && parsed.mode.trim()) mode = parsed.mode.trim();
    }
  } catch {
    enabled = DEFAULT_ENABLED;
    mode = DEFAULT_MODE;
  }
  cache = { home, mtime, enabled, mode };
  return { enabled, mode };
}

/**
 * 读开关。缺文件、坏 JSON、字段类型不对，一律按「开 + 全量」处理——
 * 插件装歪了不该顺带把注入关掉或裁掉。
 */
export function isInjectEnabled(dshHome) {
  return readSettings(dshHome).enabled;
}

/** 当前注入模式；`full` 表示注入整份 prompt-inject.md（默认）。 */
export function injectMode(dshHome) {
  return readSettings(dshHome).mode;
}

function atomicWriteFileSync(fp, content, encoding = "utf8") {
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  const tmp = `${fp}.${process.pid}.${Date.now()}.tmp`;
  const fd = fs.openSync(tmp, "w");
  try {
    fs.writeFileSync(fd, content, encoding);
    try { fs.fsyncSync(fd); } catch { /* 部分文件系统不支持 */ }
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmp, fp);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
    throw e;
  }
}

export function setInjectEnabled(dshHome, enabled) {
  return setInjectSwitch(dshHome, { promptInject: enabled });
}

/** 部分更新：只传要改的字段，没传的保持原值。 */
export function setInjectSwitch(dshHome, patch = {}) {
  const home = String(dshHome || "");
  if (!home) throw new Error("dshHome required");
  const current = readSettings(home);
  const next = {
    promptInject: typeof patch.promptInject === "boolean" ? patch.promptInject : current.enabled,
    mode: typeof patch.mode === "string" && patch.mode.trim() ? patch.mode.trim() : current.mode,
  };
  const fp = injectSwitchPath(home);
  atomicWriteFileSync(fp, `${JSON.stringify(next, null, 2)}\n`);
  cache = { home, mtime: statMtime(fp), enabled: next.promptInject, mode: next.mode };
  return { ok: true, promptInject: next.promptInject, mode: next.mode, path: fp };
}
