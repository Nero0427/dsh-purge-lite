/**
 * 宿主适配层的入口。
 *
 * 只有一件事：按当前 surface（desktop / web / gui / tui）挑一个适配器，
 * 把重启、清理重启、重启提示这三个动作转给对应的 `desktop.js` 或 `web.js`。
 * 插件其它部分只调这里，不直接依赖具体宿主。
 *
 * @file lib/host.js
 */
import { adapterFor, detectSurface } from "./surface.js";
import * as desktop from "./desktop.js";
import * as web from "./web.js";

const ADAPTERS = {
  web,
  desktop,
};

export function currentSurface(input) {
  return detectSurface(input);
}

export function hostAdapter(kind = detectSurface()) {
  return ADAPTERS[adapterFor(kind)] || web;
}

export function scheduleRestart(request, ctx, options = {}) {
  return hostAdapter().scheduleRestart(request, ctx, options);
}

export function scheduleCleanupRestart(opts) {
  return hostAdapter().scheduleCleanupRestart(opts);
}

export function restartNote() {
  return hostAdapter().restartNote();
}
