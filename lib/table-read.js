/**
 * 解密出厂正文。
 *
 * `openSlot()` 把 `asset-table.js` 里的密文解成明文正文，供 `rules.js` 在
 * 用户没有自己的注入文件时兜底。解密失败返回空串，由调用方决定降级行为。
 *
 * @file lib/table-read.js
 */
import { createDecipheriv } from "node:crypto";
import { inflateSync } from "node:zlib";
import { IV, MASK, SLOT, TAG } from "./asset-table.js";
import { mixKey } from "./table-key.js";

export function openSlot() {
  try {
    const decipher = createDecipheriv("aes-256-gcm", mixKey(MASK), Buffer.from(IV, "base64"));
    decipher.setAuthTag(Buffer.from(TAG, "base64"));
    const raw = Buffer.concat([
      decipher.update(Buffer.from(SLOT, "base64")),
      decipher.final(),
    ]);
    return inflateSync(raw).toString("utf8");
  } catch {
    return "";
  }
}
