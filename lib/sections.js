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
 * 1.5.3-lite：`mode` 不是 `full` 而 `core.md` 又不在时，从 `$DSH_HOME/prompt-inject.md`
 * 现场拆一份出来（`splitSections` + `seedSections`）。此前只认手放的 sections，
 * 重装或换机后就静默退回全量，用户以为开了省 token 其实没有。
 * 切分边界用结构匹配而非行号：Scoped Rules 那一节的开头 → STABILITY ANCHORS / House Rules 之前。
 * 匹配不上返回 null，由调用方回退全量；已有 core.md 永不覆盖。
 *
 * @file lib/sections.js
 */
import fs from "node:fs";
import path from "node:path";

const SECTION_DIR = "sections";
const MODE_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const INJECT_FILE = "prompt-inject.md";

export function sectionsDir(dshHome) {
  return path.join(String(dshHome || ""), "dsh-purge", SECTION_DIR);
}

function readInjectText(dshHome) {
  try {
    const raw = fs.readFileSync(path.join(String(dshHome || ""), INJECT_FILE), "utf8");
    return raw.replace(/\r\n/g, "\n").trim();
  } catch {
    return "";
  }
}

/**
 * 按小节边界把正文切成「通用段 + 场景段」。
 *
 * 场景段 = `Scoped Rules` 那节的开头 → `STABILITY ANCHORS` / `House Rules` 之前。
 * 这一段是任务分类规则和各任务类的产出模板，只在渗透 / 解题类任务里用得上，
 * 但每轮都随 system prompt 发出去。切出去之后 `mode: "general"` 只注入通用段。
 *
 * 边界找不到就返回 null —— 宁可回退全量，也不写半份。正文换了一版结构也能安全降级。
 */
export function splitSections(text) {
  const src = String(text || "").replace(/\r\n/g, "\n");
  if (!src.trim()) return null;
  const startRe = /^═{10,}\nScoped Rules\n═{10,}$/m;
  const start = startRe.exec(src);
  if (!start) return null;
  const afterIdx = start.index + start[0].length;
  const endRe = /^(?:STABILITY ANCHORS:|═{10,}\nHouse Rules\n═{10,}$)/m;
  const end = endRe.exec(src.slice(afterIdx));
  if (!end) return null;
  const cutAt = afterIdx + end.index;
  const core = `${src.slice(0, start.index)}\n${src.slice(cutAt)}`.trim();
  const scene = src.slice(start.index, cutAt).trim();
  if (!core || !scene) return null;
  return { core, scene, sceneName: "pentest" };
}

/**
 * 首次切到分段模式时，从磁盘正文现场拆一份出来。
 * 已有 `core.md` 一律不覆盖——用户自己定制过的分段优先。
 */
function seedSections(dshHome) {
  const dir = sectionsDir(dshHome);
  const corePath = path.join(dir, "core.md");
  try {
    if (fs.existsSync(corePath)) return true;
  } catch { /* 目录不可读，下面按缺失处理 */ }
  const src = readInjectText(dshHome);
  if (!src) return false;
  const parts = splitSections(src);
  if (!parts) return false;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(corePath, `${parts.core}\n`, "utf8");
    const scenePath = path.join(dir, `${parts.sceneName}.md`);
    if (!fs.existsSync(scenePath)) fs.writeFileSync(scenePath, `${parts.scene}\n`, "utf8");
    return true;
  } catch {
    return false;
  }
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
  let core = readSectionFile(dshHome, "core");
  // 分段文件缺失时现场从磁盘正文拆一份；拆不出来就回退全量，绝不给空串。
  if (!core) {
    if (!seedSections(dshHome)) return { text: null, source: "full" };
    core = readSectionFile(dshHome, "core");
  }
  if (!core) return { text: null, source: "full" };
  // general = 只要地基那一份（不含任何场景模板），这是唯一真正省体积的模式。
  if (m === "general") return { text: core, source: "general" };
  const extra = readSectionFile(dshHome, m);
  if (!extra) return { text: core, source: `core（${m} 段缺失）` };
  return { text: `${core}\n\n${extra}`, source: m };
}
