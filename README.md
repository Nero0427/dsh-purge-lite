<div align="center">

# dsh-purge · lite

**给 DeepSeek Harness 换上你自己的 system prompt。**

一个只做两件事的插件：把注入正文塞进 `system prompt`，再给宿主打上让它生效的补丁。除此之外的模块全部不存在。

[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![version](https://img.shields.io/badge/version-1.4.0--lite-success.svg)](CHANGELOG.md)
[![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![patches](https://img.shields.io/badge/host%20patches-84-informational.svg)](#工作原理)
[![platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#兼容性)

</div>

---

## 目录

- [这是什么](#这是什么)
- [设计取舍](#设计取舍)
- [安装](#安装)
- [升级](#升级)
- [快速开始](#快速开始)
- [配置](#配置)
- [命令](#命令)
- [HTTP 接口](#http-接口)
- [工作原理](#工作原理)
- [目录结构](#目录结构)
- [兼容性](#兼容性)
- [常见问题](#常见问题)
- [已知限制](#已知限制)
- [版本](#版本)
- [上游与许可](#上游与许可)

---

## 这是什么

DeepSeek Harness（下称 DSH）在每次请求前会装配 `system prompt`：宿主身份段 + 插件段 + 工具说明。这个插件把这段装配结果按你的意愿重写——用你写的正文替换掉宿主正文，并在尾部挂一个锚点，保证多轮之后注入仍然生效。

它不是"提示词管理器"。没有演练台、没有资产库、没有技能库、没有规则面板、没有在线更新。**设置页只有一个只读状态面板。**

| 做 | 不做 |
|---|---|
| 把 `prompt-inject.md` 的正文挂到 system prompt 最前 | 管理多个提示词模板 |
| 改写 `system-prompt/assemble`，清空宿主身份段 | 提供联网检索、向量库、记忆抽取 |
| 给宿主打 84 条补丁，让审批门与沙箱按配置走 | 绕过服务端的模型侧策略 |
| 提供 `/purge` 命令、CLI 与 HTTP 接口做状态查询与开关 | 在线自动更新（升级 = 重新下载） |

## 设计取舍

这类插件常见的写法是"什么都塞进来"，结果是 1.2 MB 源码里有 300 KB 是死代码，升级一次就崩一次。本仓库反过来：

- **只保留两件事**。任何与"注入 + 补丁"无关的模块都不进代码树。1.2.0 相对 1.1.90 删掉了 13 个模块、约 170 KB，补丁表从 86 条降到 84 条。
- **不落第二份数据**。正文只认 `$DSH_HOME/prompt-inject.md` 这一个文件，不写数据库、不做同步副本。
- **补丁可逆**。所有宿主改动先备份原文，`--revert` 逐条还原；还原失败会中止卸载而不是留半截。
- **失败要吵**。补丁漂移（宿主升级后原文变了、pattern 匹配不上）会明确标记为 `drifted`，而不是静默跳过。

## 安装

> 需要 Node.js ≥ 18。下文 `<DSH_HOME>` 默认是 `~/.dsh`（Windows 为 `%USERPROFILE%\.dsh`）。

### 方式一：Release 解压（推荐）

1. 到 [Releases](https://github.com/Nero0427/dsh-purge-lite/releases) 下载最新 `dsh-purge-<version>.zip`。
2. 解压后把 `dsh-purge/` 整个目录放到：

```
<DSH_HOME>/profiles/desktop/node_modules/dsh-purge
```

3. 注册到 profile bundle：

```bash
node "<DSH_HOME>/profiles/desktop/node_modules/dsh-purge/scripts/ensure-profile-bundle.mjs"
```

### 方式二：本地打包 tgz（开发用）

Release 只提供源码 zip，不发 tgz。需要 tgz 时先在插件目录执行 `pnpm pack` 自行生成：

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add file:/path/to/dsh-purge-<version>.tgz
```

### 方式三：从 GitHub 仓库安装（推荐，可点更新）

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-purge-lite
```

插件市场会比较仓库根 `package.json` 的 `version` 与已装版本，发现新版后出现更新入口，点击即重装到新版。**发新版必须递增版本号**，否则市场不会提示更新。

### 方式四：克隆后 `link:`（开发用）

```bash
git clone https://github.com/Nero0427/dsh-purge-lite.git
cd <DSH_HOME>/profiles/desktop
pnpm add link:/path/to/dsh-purge-lite
```

`link:` 方式改完源码不用重装，重启 DSH 即生效。但它是本地开发副本，**不在插件市场的更新通道内**，不会收到更新提示。

### 验证安装

```bash
cd <DSH_HOME>/profiles/desktop/node_modules/dsh-purge
node bin/dsh-purge.js --status
```

能看到 84 条补丁的状态表就是接上了。

## 升级

精简版不含在线更新器，升级就是换一份新文件。**顺序很重要**——旧版写进宿主的代码必须先还原，否则会残留：

1. 打开 [Releases](https://github.com/Nero0427/dsh-purge-lite/releases)，先看 release notes 与 [CHANGELOG.md](CHANGELOG.md) 的迁移提示（例如 1.1.90 → 1.2.0 的强制 revert）。
2. 在**旧目录**里还原补丁：

   ```bash
   node bin/dsh-purge.js --revert
   ```

3. 下载 `dsh-purge-<version>.zip`，解压，整体替换 `<DSH_HOME>/profiles/desktop/node_modules/dsh-purge`。
4. 重新应用并确认状态：

   ```bash
   node bin/dsh-purge.js --apply
   node bin/dsh-purge.js --status
   ```

5. 重启 DSH。

版本号在根 `package.json`，与 Release tag `v<version>` 一致。用 `link:` 装的开发副本直接 `git pull` 即可，但仍需走一遍第 2、4 步。

**从 `github:` 安装的**：市场点「更新」只替换 `node_modules` 里的插件文件，宿主里已打的补丁不会自动重打。更新完仍需执行第 4 步的 `--apply --status`；若新版调整了补丁表，先 `--revert` 再 `--apply`。补丁备份在 `<DSH_HOME>/dsh-purge/host-backups/`，不在插件目录里，替换插件后照样能还原。

## 快速开始

```bash
# 1. 定位宿主包根（必须指向含 dsh-agent-instructions/lib 的 @deepseek-ai 目录）
#    Windows PowerShell
$env:DSH_BASE = "<DeepSeek 安装目录>/resources/app/dsh/node_modules/@deepseek-ai"
#    bash
export DSH_BASE="<DeepSeek 安装目录>/resources/app/dsh/node_modules/@deepseek-ai"

# 2. 首次写一份默认注入文件（会打开编辑器）
node bin/dsh-purge.js --edit

# 3. 应用
node bin/dsh-purge.js --apply

# 4. 重启 DSH
```

`--apply` 做四件事：清洗 84 条宿主补丁、注入 shim、落下 `prompt-inject.md`、写应用戳（避免下次启动重复打补丁）。

回滚：

```bash
node bin/dsh-purge.js --revert
```

> **升级提示**：从 1.1.90 升级到 1.2.0 必须 `--revert` 再 `--apply`。旧版往 `main.js` 写过补丁 #45/#46（桌面更新接管），新版补丁表里已移除，只有先还原才能把那段代码清干净。

## 配置

配置写在 profile 的 `cordis.patch.yml`：

```yaml
- id: dsh-purge
  name: dsh-purge
  inject: [systemPrompt, tools]
  config:
    enabled: true
    autoApplyOnStart: false
    autoRevertOnMissing: false
    injectOnce: false
    stripMnemon: true
    verbose: false
    capabilityProtocol: true
    hooksDenyBypass: true
    anchorMode: auto
    subagentControl: true
```

| 键 | 默认 | 作用 |
|---|---|---|
| `enabled` | `true` | 总开关。关掉后不再改写装配 |
| `autoApplyOnStart` | `false` | 启动时自动打补丁，不必手动 `--apply` |
| `autoRevertOnMissing` | `false` | 宿主文件找不到时自动回滚，避免半打状态 |
| `injectOnce` | `false` | 只在首轮注入，后续轮次不重复挂 |
| `stripMnemon` | `true` | 清掉宿主自带的身份/记忆段 |
| `verbose` | `false` | 控制台输出补丁过程 |
| `capabilityProtocol` | `true` | 追加一段"如何主动发现 skill / MCP"的说明 |
| `hooksDenyBypass` | `true` | 审批门按本插件配置放行，不再每条都问 |

**注入模式**（同一份 `inject-switch.json` 的 `mode` 字段）：

| 模式 | 注入内容 | 体积 |
|---|---|---|
| `full`（默认） | 整份 `prompt-inject.md` | 26,275 B |
| `general` | 只注入 `$DSH_HOME/dsh-purge/sections/core.md` | 19,427 B（省 26%） |
| `pentest` | `core.md` + `sections/pentest.md` | 26,270 B（等于全量） |

分段文件放在 `$DSH_HOME/dsh-purge/sections/`，缺任一文件都自动降级回全量注入。`full` 下完全不读这些文件，行为与 1.3.0 一致。

另有一个**运行时开关**，不属于上面的 cordis 配置：设置页状态卡上的「关闭注入 / 开启注入」，状态落在 `$DSH_HOME/dsh-purge/inject-switch.json`（字段 `promptInject`，默认 `true`）。关掉后宿主不再往 system prompt 挂注入正文；切换**下一轮对话生效，不用重启 dsh**。它与配置里的 `enabled` 是「与」关系，任一为假即不注入。
| `anchorMode` | `auto` | `auto` 挂尾部锚点，`off` 立即关闭 |
| `subagentControl` | `true` | 子代理的审批由本插件接管 |

> YAML 里写成字符串的布尔（`"false"`）会被 JS 当**真值**。插件内部统一做了一次收敛：`false/0/no/off` 视为关，其余视为开。

## 命令

会话内 `/purge`：

```
/purge status      状态（补丁进度、shim、override 文件）
/purge apply       应用全部清洗
/purge revert      还原
/purge uninstall   卸载插件
/purge edit        编辑注入文件
/purge help        帮助
```

同时注册三个模型可调用的工具：`purge_status`、`purge_apply`、`purge_revert`。

CLI：

```bash
dsh-purge --status      # 状态表
dsh-purge --apply       # 应用
dsh-purge --revert      # 回滚
dsh-purge --uninstall   # 卸载（已应用则先还原）
dsh-purge --edit        # 编辑 prompt-inject.md
dsh-purge --mode <full|general|pentest>   # 切换注入模式（下一轮对话生效）
dsh-purge --bash-budget [ms]              # 收紧 ops_bash 前台超时上限（默认 180000）
dsh-purge --bash-budget-revert            # 还原 ops_bash 超时上限
dsh-purge --help        # 帮助
```

## HTTP 接口

桌面端由插件起一个同源服务，前缀 `/dsh-purge`：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/dsh-purge/status` | 状态汇总 |
| GET | `/dsh-purge/prompt-text` | 当前注入正文（面板用，只读） |
| POST | `/dsh-purge/apply` | 应用补丁 |
| POST | `/dsh-purge/revert` | 还原 |
| POST | `/dsh-purge/uninstall` | 卸载 |
| POST | `/dsh-purge/override` | 写入注入文件 |
| POST | `/dsh-purge/restart` | 重启宿主 |
| POST | `/dsh-purge/hooks-deny` | 开关审批门绕过 |
| GET | `/dsh-purge/inject` | 读注入开关与模式，附可用模式列表 |
| POST | `/dsh-purge/inject` | 写开关或模式（body `{"promptInject": boolean}` 和/或 `{"mode": "general"}`），下一轮对话生效 |

前端 `client.js` 调用 `prompt-text`、`status` 与 `inject`，其余给设置页的按钮用。面板挂在「设置 → Purge」。

## 工作原理

```
请求进入
   │
   ├─ system-prompt/assemble  (waterfall)
   │      │
   │      ├─ 清空宿主身份段（includeHarnessIdentity / personaPrefix / personaSuffix）
   │      ├─ 读 $DSH_HOME/prompt-inject.md          ┐ 三级取文：
   │      │   ↑ 空则读设置框里提交的正文             │ 提示词框 > 文件 > 加密默认
   │      │   ↑ 再空则解密内置默认（AES-GCM+inflate）┘
   │      ├─ 挂到 system prompt 最前
   │      └─ 追加尾部锚点（anchor）
   │
   └─ 工具调用前
          └─ 审批门 / 沙箱按配置放行（hooks-deny、subagent-control）
```

宿主补丁分成四层，共 84 条：

| 层 | 数量 | 内容 |
|---|---|---|
| `PATCHES` | 主体 | 提示词层与工具描述改写 |
| `CODE_PATCHES` | 若干 | 代码默认值（审批、沙箱） |
| `ENGINE_PATCHES` | 若干 | 引擎级行为 |
| `NEW_TOOL_PATCHES` | 若干 | 新增工具接口 |

每条补丁在应用前先备份目标文件原文。宿主升级导致原文变化时，补丁状态标记为 `drifted`，提示更新 pattern，而不是硬写进去。

## 目录结构

```
.
├── bin/
│   └── dsh-purge.js            CLI 入口（--status/--apply/--revert/--mode/--bash-budget/...）
├── lib/
│   ├── index.js                插件入口：命令、路由、工具、配置装配
│   ├── core.js                 84 条补丁表、asar 解包、加密默认正文
│   ├── identity.js             注入文本解析与 assemble 改写
│   ├── rules.js                三级取文策略
│   ├── desktop.js              桌面宿主补丁写入与还原
│   ├── reapply.js              宿主自愈重打
│   ├── profile-insert.js       profile bundle 自愈
│   ├── extract-asar.js         asar 解包 / 回写
│   ├── hooks-deny.js           审批门绕过
│   ├── inject-switch.js        注入总开关与模式（运行时，下一轮生效）
│   ├── sections.js             按模式组合注入正文（core + 场景段）
│   ├── bash-budget.js          ops_bash 前台超时上限的收紧 / 还原
│   ├── anchor.js               尾部锚点
│   ├── capability-protocol.js  能力发现协议段
│   ├── subagent-control.js     子代理审批接管
│   ├── asset-table.js          加密正文解密槽（不是资产库）
│   ├── uninstall.js            卸载
│   └── ...                     其余为补丁工具与策略模块
├── client.js                   设置页状态面板（浏览器半区）：开关与模式选择
├── cordis.patch.yml            bundle patch
├── scripts/
│   └── ensure-profile-bundle.mjs   postinstall 注册
└── verify/
    └── treehealth.mjs          补丁表与 profile 的静态一致性检查
```

## 兼容性

| 项 | 范围 |
|---|---|
| Node.js | ≥ 18 |
| 宿主 | DSH `0.2.1-rc.2` / `0.2.1-rc.5`（见 `package.json` 的 `dshTargets`） |
| 系统 | Windows（桌面端）、macOS、Linux（web 端） |
| Cordis | `^4.0.1` (peer) |

宿主小版本升级后，先跑 `--status` 看有没有 `drifted` 补丁，再决定是否 `--apply`。

## 常见问题

**报「插件根未定位 / plugin root not found」**
`DSH_BASE` 没指对。它必须指向**包含** `dsh-agent-instructions/lib` 的那一层 `@deepseek-ai` 目录，不是 `node_modules`，也不是 `resources/app`。

**`--apply` 说成功，但重启后没生效**
桌面端要确认 `DSH_SURFACE=desktop`；web 端确认 profile 里 `dsh-purge` 已进 `bundles`。再跑 `--status`，看补丁是否真的 `applied` 而不是 `pending`。

**补丁状态 `drifted` 是什么意思**
宿主文件被官方更新了，补丁要匹配的那段原文找不到了。此时不要强行应用。等插件更新 pattern，或临时 `--revert`。

**注入正文被改了怎么办**
改 `$DSH_HOME/prompt-inject.md`，重启即生效。设置页看到的是同一份文件。`--revert` 不会删它（属于用户文件）。

**能同时挂多个注入段吗**
可以。`dsh-purge` 把 `dsh-purge*` 段强制排在最前，其它插件（例如 [`dsh-wb-memory`](https://github.com/Nero0427/dsh-wb-memory)）追加的段自然落在它后面。

**卸载干净吗**
`--uninstall` 会先还原补丁、移除 profile 引用、删插件目录。命令行卸载直接删；界面卸载交给独立助手等端口释放后再删（Windows 上文件被占用时删不掉）。

## 已知限制

- **提示词注入的端到端验证需要人工确认**。静态检查只能证明"补丁打上了"，不能证明"装配结果里真有你那段"。发一条消息看模型是否按你的身份回答才算验证完。
- **84 条补丁是全量应用**。裁到"提示词 + 审批门/沙箱"约 35 条是后续计划；补丁之间有依赖，裁错宿主起不来。
- **多工作区按 `last-cwd` 选注入文件**。这是功能不是残留，但换工作区时行为会变。
- **桌面端 HTTP 服务是随机端口**。前端用同源相对路径通信，不能跨端口调用。

## 版本

完整变更见 [CHANGELOG.md](CHANGELOG.md)。

| 版本 | 要点 |
|---|---|
| `1.4.0-lite` | 注入模式分段（full/general/pentest）+ ops_bash 超时上限收紧 |
| `1.3.0-lite` | 设置页新增注入总开关；修复手改正文被误判成插件默认并覆盖 |
| `1.2.2-lite` | 修复 git 源安装后构建授权被反复清除，市场点更新不再被拦 |
| `1.2.1-lite` | 补 GitHub 仓库安装与更新说明，代码未改 |
| `1.2.0-lite` | 删除 13 个模块（在线更新、技能库、回退、续跑、演练台），补丁 86 → 84 |
| `1.1.90-lite` | 首个精简版基线 |

## 上游与许可

本仓库是 `dsh-purge` 的**精简衍生版**，上游项目与版权声明见 [NOTICE](NOTICE)。按 Apache License 2.0 分发；衍生作品需保留 NOTICE 与归属。

```
Copyright 2026 YuJunZhiXue
Modifications Copyright 2026 Nero0427
```

使用本插件意味着你自行承担宿主被修改的风险。插件所做的是修改**你本机安装的客户端程序**，请确保你有权这样做，并注意保留 `--revert` 的能力。
