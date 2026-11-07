# 1.5.1-lite

修复**注入总开关**：打开 = 全部注入，关闭 = 原生 system prompt、不残留任何注入段。功能与 84 条补丁表相对 `1.5.0-lite` 没有变化，这是纯开关语义修复。

## 版本支持矩阵

| 插件版本 | `engines.dsh` | 0.2.1-rc.2 | 0.2.1-rc.5 | 0.2.2-rc.1 |
|---|---|---|---|---|
| `≤ 1.4.0-lite` | 未声明 | 完整 | 完整 | 未适配 |
| `1.4.1-lite` | `>=0.2.1-rc.2 <=0.2.1-rc.5` | 完整 | 完整 | 拒绝加载 |
| `1.4.2-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 能装，功能残缺（勿用） |
| `1.5.0-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整，但注入总开关关闭不彻底 |
| **`1.5.1-lite`** | `>=0.2.1-rc.2 <0.2.3-0` | **完整** | **完整** | **完整** |

三个宿主版本均推荐 `1.5.1-lite`。`1.5.0-lite` 的补丁功能完整，只是关闭开关后仍有残留，需要这个行为的请升到本版。

## 症状

关掉设置页的注入开关后，model 的 system prompt 里仍能看到注入规则。原因是共有四层注入源，而 `inject-switch.json` 此前只管第一层：

| 层 | 内容 | 1.5.0 是否受开关控制 |
|---|---|---|
| ① `dsh-purge` 正文 | `prompt-inject.md` / `core.md` | 是 |
| ② 尾部锚点 `dsh-purge:anchor` | `[OPERATOR ANCHOR — ACTIVE]` 的 9 条格式规则 | **否** |
| ③ `dsh-wb-memory` 记忆段 | SOUL / USER / MEMORY / topics | 否（独立插件） |
| ④ 宿主静态补丁 | 清宿主身份段、审批放行、assemble 重排 | 否（改的是宿主文件） |

所以"未开启注入"那份思考里没有 Scoped Rules / Little Code Sauce（① 确实关了），却仍在讨论 OPERATOR ANCHOR（②）和 SOUL / USER / 全局记忆（③）——看起来就像开关没生效。

② 是明确的代码漏判：`rewriteLiveAssembly` 里写了 `anchorText: enabled ? anchorTextFor(config) : ""`，但插件加载时 `registerAnchor()` 把 `dsh-purge:anchor` 注册成了**独立 section**，它的 `anchorOn(config)` 只看 `config.enabled` / `config.anchorMode`，从不读运行时开关。`inject-switch.js` 的注释却承诺「关闭后…回到原生 system prompt」，实现与注释不符。

## 修了什么

- `lib/anchor.js`：`registerAnchor(ctx, config, allow = null)` 增加回调与 `permitted()`，主锚点 `text` 和子锚点 `text` 每轮判 `permitted()`。保持该文件「不 import 仓库内任何模块」的约定。
- `lib/index.js`：新增导出 `isInjectedName()`（识别 `dsh-purge*` / `dshpg-capabilities` / `dsh-wb-memory`）与 `nativeAssembly()`（按名剔除注入侧 sections + contexts）；`rewriteLiveAssembly()` 在 `!switchEnabled` 时**直接返回原生装配**，跳过 `rewritePromptAssembly`（它还会 `dropMnemon` 清宿主身份、补 capability 段）；两处 `registerAnchor` 调用（主 ctx 与隔离层）传入 `() => injectAllowedNow(config)`。
- `CAPABILITY_SECTION` 的实际名字是 `dshpg-capabilities`，不带 `dsh-purge` 前缀，过滤名单单独列出。
- 文档：README 矩阵、版本表、CHANGELOG 与本文件同步写明哪个插件版本支持哪个宿主版本。

**开启态行为完全不变**：正文 + 锚点 + capability + 记忆段照常注入。

## 验证

用新宿主真实的 cordis 4.1.0 与已打补丁的 `dsh-system-prompt` 构造装配，跑开关两态对照，**21/21 断言通过**：

- 开启：6 个注入段全部存在，`[OPERATOR ANCHOR]` 正文非空，最终 prompt 1,523 B，含全部注入正文。
- 关闭：锚点 `text` 直接为 **0 字节**；`dsh-purge*` / `dshpg-capabilities` / `dsh-wb-memory` 全部剔除；`harness:identity` 等宿主段名保留；最终 prompt **归零**，不含任何注入正文。
- `isInjectedName` 10 个边界用例全对；`lib/index.js` / `lib/anchor.js` `node --check` 通过；84 条补丁状态与上一版一致（`76 applied`，差异 0）。

## 升级

`github:` / 插件市场安装：点「更新」即可，只替换插件文件。仓库根 `package.json` 版本已递增，市场据此提示新版。

Release 解压安装：下载 `dsh-purge-1.5.1-lite.zip`，整体替换 `<DSH_HOME>/profiles/desktop/node_modules/dsh-purge`，重启 DSH。

从 `1.4.x` 升级仍需走「升级」章节的 `--revert` → 替换 → `--apply --status`。本次改动不涉及宿主补丁，已打过补丁的宿主**不需要重打**。

## 开关怎么用

开关文件：`<DSH_HOME>/dsh-purge/inject-switch.json`

```json
{ "promptInject": true, "mode": "full" }
```

- `promptInject: true` = 注入，`false` = 不注入。设置页开关与 `POST /dsh-purge/inject` 写的是同一个文件，**每轮组装都读，切换后不重启也生效**（重启更干净）。
- `mode: "general"` 是**精简分段模式**（用 `sections/core.md` 约 19 KB 代替整份 `prompt-inject.md` 约 26 KB），不是「关」。要整份正文设 `mode: "full"`。
- 关闭态下 `dsh-wb-memory` 的 HTTP 路由与 `/memory` 命令仍在，只是不再进 system prompt。

## 已知边界

宿主静态补丁（84 条，第 ④ 层）不随运行时开关变化，其中有一条把 `harness:identity` 的正文清空。因此关闭后 system prompt 既无注入、也无宿主身份正文——「不注入」是彻底的，但不是「官方原生」。要连这个一起恢复，需执行 `node bin/dsh-purge.js --revert` 并重启，那会摊掉破甲功能。

离线装配验证只证明 section 组装正确，**不等于运行时模型行为已验证**。升级后建议分别开、关一次，各发一条消息看实际表现。
