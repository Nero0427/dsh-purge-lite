# 1.5.4-lite

宿主适配：**0.2.2-rc.5 补丁兼容**。`engines.dsh` 上限本来就是 `<0.2.3-0`，rc.5 能被宿主正常加载，但官方在 rc.1 → rc.5 之间改写了三条补丁绑定的源码字面量，老版本会在状态页把它们标成 `drifted`（静默失效）。本版追加 rc.5 候选 pattern，判定逻辑与注入正文一字未改。

## 版本支持矩阵

| 插件版本 | `engines.dsh` | 0.2.1-rc.2 | 0.2.1-rc.5 | 0.2.2-rc.1 | 0.2.2-rc.5 |
|---|---|---|---|---|---|
| `≤ 1.4.0-lite` | 未声明 | 完整 | 完整 | 未适配 | 未适配 |
| `1.4.1-lite` | `>=0.2.1-rc.2 <=0.2.1-rc.5` | 完整 | 完整 | 拒绝加载 | 拒绝加载 |
| `1.4.2-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 能装，功能残缺（勿用） | 能装，功能残缺（勿用） |
| `1.5.0-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整，但注入总开关关闭不彻底 | 注入总开关不彻底 + 3 条补丁漂移 |
| `1.5.1-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整 | 3 条补丁漂移 |
| `1.5.2-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整 | 3 条补丁漂移 |
| `1.5.3-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整 | 3 条补丁漂移 |
| **`1.5.4-lite`** | `>=0.2.1-rc.2 <0.2.3-0` | **完整** | **完整** | **完整** | **完整** |

四个宿主版本均推荐 `1.5.4-lite`。从 rc.1 升到 rc.5 会还原 `app.asar` 并摊掉全部补丁，必须按 README 重新解包 + `--apply --status` + 重启。

## 症状

从 0.2.2-rc.1 升到 rc.5 后，开着插件却在状态页看到 5 条 `drifted`——宿主文件里既没有插件 marker，原 pattern 也匹配不上。这些补丁（审批门 / 重复提醒 / 回退隐藏）静默失效，功能悄悄退回官方行为。

## 症状

开着分段模式，system prompt 却还是十几 K——那是 1.5.3 修的问题，本版不管。本版只修 rc.5 下的补丁漂移。

## 改了什么

`lib/core.js` 追加 `HOST_VARIANTS_022RC5` 适配层（挂在 `HOST_VARIANTS_022RC1` 之后），rc.1 及更早宿主完全不受影响——追加的候选 pattern 在老宿主上匹配不上，原有 pattern 照常命中。

| 补丁 | rc.5 官方改写 | 适配方式 |
|---|---|---|
| `#13 ESCALATION_WIDENING_EXEMPT` | 三道 `throw new Error` 改成 `throw new SandboxEscalationError(..., "CODE")` | 追加 rc.5 版 pattern，`replace` 沿用原值 |
| `#35 ESCALATION_NEVER_REJECT` | `switch(outcome)` 的三路 throw 带错误码，`cancelled` 拆成三行 | 追加 rc.5 版 pattern，`replace` 沿用原值 |
| `#18 REPEAT_TOOL_REMINDER_DISABLED` | 删掉 `downstream.kind === "block"` 整段分支 | 追加 rc.5 版 pattern，`replace` 沿用原值 |
| `#56 REWIND_HIDE_CUT_ONLY` | 前端隐藏机制整体重写为 `surfaceOp` / `replacements` | `softSettle`，官方新机制已原生覆盖 |
| `#77 REWIND_DROP_SENT_ON_APPEND` | 同上，`hidden.add(event.seq)` / `sourceEventSeqs` 文案已不存在 | `softSettle`，同上 |

## 验证

- 从 rc.5 官方 `app.asar` 导出干净树（20,056 文件），用本版在隔离 `DSH_HOME` 下跑 `--apply`：状态从 **66 applied / 5 drifted** 收敛到 **71 applied / 0 drifted / 0 pending**。
- `#88` 在干净树上曾报 drifted，是 `#87` 级联的假象，`--apply` 后自动命中，无需单独适配。
- 判定逻辑、`prompt-inject.md` / `sections/core.md` 注入正文、84 条补丁表条数均未改动。

## 怎么开

改 `$DSH_HOME/dsh-purge/inject-switch.json`：

```json
{ "promptInject": true, "mode": "general" }
```

或用 CLI：`dsh-purge --mode general`。**下一轮组装即生效，不用重启**。

- 日常写代码 / 查文件 / 跑脚本：`general`。
- 渗透、CTF、逆向这类需要任务分类和产出模板的：`pentest`（等价原来的全量）。
- 想完全回到旧行为：`full`，且删掉 `sections/` 目录即可。

## 已知边界

- 场景段是裸文本、追加在 ChatML 信封之后。宿主拿到的是整串字符串，不影响解析，但它不在 `<project_instructions>` 信封内——这是原有机制，本版没改。
- 通用段不含 `Scoped Rules`，意味着 `general` 模式下没有「哪个词归哪类任务」的映射。遇到需要该映射的任务，切 `pentest`。
- 拆不出来的正文（结构被大改）一律回退全量，不会报错也不会静默变空。
