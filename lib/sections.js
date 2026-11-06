/**
 * 按模式组合注入正文。
 *
 * 约定：
 * - `mode === "full"`（默认）：注入整份 `prompt-inject.md`，与 1.3.0 之前完全一致。
 * - 其它模式：注入 `$DSH_HOME/dsh-purge/sections/core.md` +
 *   `$DSH_HOME/dsh-purge/sections/<mode>.md`。
 *
 * core.md 自带完整 ChatML 信封；场景段是裸文本，追加在信封之后。
 * 任一文件缺失都降级回全量——宁可多注入，也不能因为分段文件没放好就少一块。
 *
 * @file lib/sections.js
 */
import fs from "node:fs";
import path from "node:path";

const SECTION_DIR = "sections";
const MODE_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function sectionsDir(dshHome) {
  return path.join(String(dshHome || ""), "dsh-purge", SECTION_DIR);
}

function readSectionFile(dshHome, name) {
  if (!MODE_RE.test(name)) return "";
  try {
    const fp = path.join(sectionsDir(dshHome), `${name}.md`);
    return fs.readFileSync(fp, "utf8").replace(/\r\n/g, "\n").trim();
  } catch {
    return "";
  }
}

/** 目录里有哪些可用模式（core 不算模式）。 */
export function listModes(dshHome) {
  const dir = sectionsDir(dshHome);
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.slice(0, -3));
  } catch {
    return [];
  }
  return names.filter((n) => n !== "core" && MODE_RE.test(n)).sort();
}

/**
 * 返回 `{ text, source }`；`text` 为 null 时调用方应回退到全量注入。
 * `source` 只用于日志与状态展示。
 */
export function composeInjection(dshHome, mode) {
  const m = String(mode || "full").trim();
  if (!m || m === "full") return { text: null, source: "full" };
  const core = readSectionFile(dshHome, "core");
  if (!core) return { text: null, source: "full" };
  // general = 只要地基那一份（不含任何场景模板），这是唯一真正省体积的模式。
  if (m === "general") return { text: core, source: "general" };
  const extra = readSectionFile(dshHome, m);
  if (!extra) return { text: core, source: `core（${m} 段缺失）` };
  return { text: `${core}\n\n${extra}`, source: m };
}
