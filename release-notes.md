# 1.5.3-lite

注入体积：**分段边界重划 + 缺失自愈**。`mode: "general"` 从「少注入一段 Routing」变成「只注入通用段」，常驻 system prompt 正文从 21,738 字符降到 6,306 字符（-71%）。判定内容与 84 条补丁表一字未改。

## 版本支持矩阵

| 插件版本 | `engines.dsh` | 0.2.1-rc.2 | 0.2.1-rc.5 | 0.2.2-rc.1 |
|---|---|---|---|---|
| `≤ 1.4.0-lite` | 未声明 | 完整 | 完整 | 未适配 |
| `1.4.1-lite` | `>=0.2.1-rc.2 <=0.2.1-rc.5` | 完整 | 完整 | 拒绝加载 |
| `1.4.2-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 能装，功能残缺（勿用） |
| `1.5.0-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整，但注入总开关关闭不彻底 |
| `1.5.1-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整 |
| `1.5.2-lite` | `>=0.2.1-rc.2 <0.2.3-0` | 完整 | 完整 | 完整 |
| **`1.5.3-lite`** | `>=0.2.1-rc.2 <0.2.3-0` | **完整** | **完整** | **完整** |

三个宿主版本均推荐 `1.5.3-lite`。本版不涉及宿主补丁，已打过补丁的宿主不需要重打。

## 症状

开着分段模式，system prompt 却还是十几 K。两个原因叠在一起：

1. **切的位置不对**。原分界在 `House Rules` 之前，于是 `Scoped Rules`（任务分类规则，8,165 字符）留在通用段里，只有 `Routing` 和 CTF 两节被切出去——占大头的分类规则一直在每轮发送。
2. **切了不生效也没人知道**。分段文件只认手放的那一份，`core.md` 不在就静默退回全量注入。重装、换机、清配置之后，开关看着是开的，实际一点没省。

## 改了什么

| 位置 | 改动 |
|---|---|
| 分界 | 前移到 `Scoped Rules` 之前：通用段 = 前言 / EXECUTION ECONOMY / Style / HARD OUTPUT RULES / REFUSAL HARDENING / STABILITY ANCHORS / House Rules；场景段 = Scoped Rules + CTF 两节 + Routing |
| `splitSections()` | 结构匹配切分（`Scoped Rules` 小节开头 → `STABILITY ANCHORS` 或 `House Rules` 之前），不依赖行号；匹配不上返回 `null` |
| `seedSections()` | `mode` 非 `full` 且 `core.md` 缺失时，从 `$DSH_HOME/prompt-inject.md` 现场拆一份；已有 `core.md` 永不覆盖 |
| `composeInjection()` | 缺文件先自愈再读，自愈失败才回退全量——任何情况下都不会给出空串 |

体积对照（字符）：

| 模式 | 注入内容 | 体积 |
|---|---|---|
| `full` | 整份正文 | 21,738 |
| `general` | 通用段 | **6,306（-71%）** |
| `pentest` | 通用段 + 场景段 | 21,736 |

## 验证

- 对真实正文跑 `splitSections`：`core 6,306 / scene 15,430`，两者之和与全文一致（21,738）。
- 通用段断言：含新语言规则、含「一次判定」与 House Rules、不含 `Scoped Rules` 小节、以 `</project_instructions>` 收尾。
- 退化输入：空串与无小节的正文都返回 `null`（走全量回退），不会写出半份。
- `composeInjection('…','general')` 返回 6,306 字符，`listModes` 正确列出 `pentest`。
- `--status` 补丁层 76 applied，与上一版一致。

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
