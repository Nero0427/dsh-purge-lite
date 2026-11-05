// 插件自身路径 + Windows Script Host 脚本字面量工具。
// 原来这两个函数寄生在 official-update.js 里；在线更新整条链路拆掉后独立出来。
import path from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

/** 插件安装根目录（<...>/node_modules/dsh-purge）。 */
export function pluginRoot() {
  return PLUGIN_ROOT;
}

/** Windows Script Host 无 BOM 时按系统 ANSI 读文件。中文路径写成 \uXXXX，整份脚本保持 ASCII。 */
export function wshLiteral(value) {
  return JSON.stringify(String(value ?? "")).replace(/[\u007f-\uffff]/g, (ch) => {
    return "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0");
  });
}

export function isWshAscii(source) {
  const text = String(source || "");
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 0x7f) return false;
  }
  return true;
}
