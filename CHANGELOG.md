# Changelog

本项目所有值得记录的变更都写在这里。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 `主版本.次版本.修订号-lite` 的约定，`-lite` 表示精简衍生线。

## [Unreleased]

### Planned

- 补丁表从 84 条裁剪到约 35 条（提示词层 + 审批门 + 沙箱），逐组验证依赖关系。
- `drifted` 补丁的自动 pattern 更新（当前只能等新版本）。

## [1.4.2-lite] - 2026-11-07

兼容版本，运行时代码与补丁表未改。

### Changed

- `engines.dsh` 从 `>=0.2.1-rc.2 <=0.2.1-rc.5` 放宽为 `>=0.2.1-rc.2 <0.2.3-0`，覆盖官方 0.2.2-rc.1 宿主；`dshTargets` 增加 `0.2.2-rc.1`，让 `--status` 不再提示「未适配」。
- README 安装章节与版本表同步宿主支持范围。

### Known Issues

- 0.2.2-rc.1 上离线核查：84 条补丁中 11 条 `drifted`（8 条官方包原文改写、3 条桌面壳 `lib/main.js` 重写），需逐条对齐后才能全部生效。详见 `release-notes.md`。
- 第三方 `dsh-ops 0.4.4` 在 0.2.2-rc.1 上不兼容，升级宿主前需先升到 0.5.0。

## [1.4.1-lite] - 2026-11-07

维护版本，运行时代码逻辑未改。

### Added

- `package.json` 声明 `engines.dsh: ">=0.2.1-rc.2 <=0.2.1-rc.5"`；插件市场与宿主据此判定宿主兼容性，卡片不再显示「未声明宿主要求」。
- README 安装章节写明宿主支持范围，补充插件市场收录说明（awesome-dsh-plugin PR #12160）与一键安装方式。

### Fixed

- README 与 `client.js` 文件头里「设置页只读面板」的过期描述：设置页现可切换注入开关与注入模式，正文本身仍只读。

## [1.4.0-lite] - 2026-11-07

注入正文支持按模式分段；新增 `ops_bash` 前台超时上限的手工收紧命令。默认配置与 1.3.0 完全一致。

### Added

- `lib/sections.js`：按模式组合注入正文。`full`（默认）注入整份 `prompt-inject.md`；`general` 只注入 `$DSH_HOME/dsh-purge/sections/core.md`；其它模式注入 `core.md` + `<mode>.md`。任一文件缺失都降级回全量，不会因为分段文件没放好而少注入。
- `inject-switch.json` 增加 `mode` 字段，默认 `full`；`GET/POST /dsh-purge/inject` 与 `/dsh-purge/status` 同步支持，设置页状态卡增加模式下拉，CLI 增加 `--mode <full|general|pentest>`。
- `lib/bash-budget.js` + `--bash-budget [ms]` / `--bash-budget-revert`：把 `dsh-ops` 的 `MAX_BASH_TIMEOUT_MS` 从 `2_147_483_647` 收到 180 秒。超时后 `ops_bash` 会走 `kind: "promoted"` 把命令转成后台 job（不杀进程），主循环继续，之后用 `job_output` 取结果。幂等、带备份、可还原。

### Changed

- `refreshHungOperator()` 的缓存键加入 `inject-switch.json` 的 mtime：切模式只改这个文件，不加的话会命中上一轮的旧正文。
- 全量模式改为直读磁盘、不再优先 `committed`：`committed` 可能是上一次分段模式钉进去的正文，切回 `full` 时若还认它，用户会看到旧内容一直被复用。

### Notes

- `general` 模式的收益是实测的：`prompt-inject.md` 26,275 B → `core.md` 19,427 B，省 26%，代价是不再注入 CTF 两段与渗透模板（CANNED WORKFLOWS / web-pentest canned slots / WEB PENTEST ROUTING）。
- `pentest` 模式等于全量（core + 渗透模板 = 原文），只是语义明确，不省体积。

### Test

- `full` 下 `composeInjection()` 返回 `null`，走原有 `resolveInjectText` 路径，行为与 1.3.0 一致。
- `pentest` 组合 21,494 字符，含 EXECUTION ECONOMY / CTF Contract / ffuf 模板 / House Rules，ChatML 信封 1 开 1 闭。
- 模式写入 → 读取 → 还原，全程不重启进程。
- `--bash-budget`：幂等（`current 180000 -> 180000`）、`--bash-budget-revert` 还原、再 apply（`2147483647 -> 180000`）三步走通。

## [1.3.0-lite] - 2026-11-07

设置页新增注入总开关；修复「基于默认正文增补的内容会被当成插件默认并覆盖」的判定错误。补丁表未改。

### Added

- `lib/inject-switch.js`：注入开关，落盘在 `$DSH_HOME/dsh-purge/inject-switch.json`，字段 `promptInject`，缺文件或坏 JSON 一律按「开」处理。
- 路由 `GET /dsh-purge/inject`（读状态）与 `POST /dsh-purge/inject`（写状态，body `{"promptInject": boolean}`）。
- 设置页状态卡增加「开启注入 / 关闭注入」按钮，并标明切换后**下一轮对话生效、无需重启 dsh**。
- `/dsh-purge/status` 增加 `prompt_inject` 字段。

### Fixed

- `isKeepableUserOverride()` 与 `ensureOverrideFile()` 不再用 `looksLikePluginDefault()` 决定是否覆盖。原先「文本含三个默认标记即算插件默认」的判据，会把用户基于默认原文增补的正文判成默认，下一轮 `syncPromptInjectOnDiskSync()` 直接拿加密槽盖掉，手改内容留存不下来。现在只看 hash 与 `override-state.json`：与当前槽、上次 seed、上次插件写入三者都不等，即视为用户正文并永久保留；`customized === true` 直接保留。
- `looksLikePluginDefault()` 保留，但降级为展示/诊断用途，不再参与覆盖判定。

### Changed

- `rewriteLiveAssembly()` 的缓存签名改用 `injectAllowedNow()` 的统一结果，切换开关后不会命中上一轮的改写缓存。

### Test

- 纯默认正文 → `isKeepableUserOverride` = false，可被新版本刷新。
- 默认 + 两行 → true，`syncPromptInjectOnDiskSync()` 返回 `{action:"keep",reason:"user_custom"}`，内容不变。
- 带 ChatML 头 + 增补正文 → true，真实文件同步后字节数与内容均未变。
- 开关：默认 true → 写入 false → 读到 false → 写回 true，全程无需重启进程。

## [1.2.2-lite] - 2026-11-05

修复从 GitHub 仓库安装后，市场「点击更新」被构建授权反复拦住的问题。补丁表与运行时逻辑未改。

### Fixed

- `lib/profile-insert.js`：`purgePnpmBuildSpecs()` 读取 profile 的 `package.json`，在依赖为 `github:owner/repo` 时额外生成稳定 git 授权键 `dsh-purge@git+https://github.com/owner/repo.git`，新装不必手工放行构建脚本。
- `rewritePnpmAllowBuilds()` 保留 pnpm / 市场写出的合法 git 键，并把待决占位行 `set this to true or false` 确认为 `true`；畸形历史键仍按 #185 清除。此前每跑一次 postinstall 就把授权删光，导致 `ERR_PNPM_IGNORED_BUILDS` 反复出现，且因 pnpm 按整个 profile 检查，会连带阻塞同一 profile 里其它插件的更新。

### Test

- 构造含占位行、稳定 git 键与畸形键的 YAML 样本，验证重写结果：占位行变 `true`、稳定键保留、畸形键清除、`validateAllowBuildRewrite` 通过。

## [1.2.1-lite] - 2026-11-05

维护版本，代码与补丁表未改。

### Added

- README 增加「从 GitHub 仓库安装」方式：`pnpm add github:Nero0427/dsh-purge-lite`，说明市场按仓库根 `package.json` 的 `version` 判断新版。
- README 升级章节说明：`link:` 是本地开发副本、不在市场更新通道；从仓库安装后点更新只替换插件文件，宿主补丁仍需 `--apply`（必要时先 `--revert`）。

### Notes

- 插件自身不含在线更新器，更新由 DSH 插件市场执行；本版本递增版本号供更新链路检测。

## [1.2.0-lite] - 2026-11-04

以「只做注入与补丁」为原则做的第二轮删减。与 1.1.90-lite 相比，删掉的模块不是停用，而是从代码树里彻底消失。

### Removed

| 模块 | 体积 | 原功能 |
|---|---|---|
| `lib/update.js` | 39 KB | 在线更新（拉 GitHub tar 包、换版本、重启） |
| `lib/official-update.js` + `.wscript` | 2 KB | 接管官方桌面升级、替换安装器 |
| `lib/skills.js` | 28 KB | `/skills` 技能库（导入、创建、删除、打包） |
| `lib/rewind.js` | 20 KB | 消息回退（`/rewind once\|round`） |
| `lib/continue-retry.js` | 11 KB | 超时/截断后自动补「继续」 |
| `lib/asset-table.js` 等 3 个 | 18 KB | 演练台资产表 |
| `lib/drill-grant.js` | 2 KB | 演练授权（靶标范围承诺） |
| `lib/redteam/role-section.js` | 6 KB | 红队子智能体角色稿 |
| `lib/reapply-cli.js` 等 6 个 | 32 KB | 入口不可达的死代码 |
| `lib/zip-extract.js` | 6 KB | 只被 `update.js` 使用 |

同时移除：

- 宿主补丁 `#45` / `#46`（`OFFICIAL_DESKTOP_UPDATE_HANDOFF` / `_ASCII`），补丁表 86 → **84**。
- 5 条 `dsh-redteam-*` 禁用行、`dsh.install` 在线安装源、三个红队关键词。
- 功能路由只保留 `/prompt-text`、`/apply`、`/revert`、`/override`、`/uninstall`、`/restart`、`/hooks-deny`、`/status`。
- 命令只保留 `/purge`（`/rules`、`/skills`、`/rewind` 注销）。
- 配置键 `autoUpdateOnStart`、`autoContinue`、`continueMax`、`continueText`、`autoRetry`、`retryMax` 从 `DEFAULTS` 与 `BOOLEAN_CONFIG_KEYS` 移除。
- 红队预设目录 `~/.dsh/.agent-presets/redteam/`（28 KB 人设 + anchor-gate）。

### Changed

- `lib/wsh.js` 新增：从 `official-update.js` 抽出的路径与 WSH 字面量工具，供补丁表复用。
- `client.js` 收敛为只读面板：状态、正文大小/行数/修改时间、来源路径、正文。
- README 重写，补齐安装、配置、接口、FAQ 与已知限制。

### Fixed

- CLI `--apply` 现在会写入应用戳，避免下次启动时 `settle` 误判未对齐而重复打补丁。
- `asset-table.js` 在文档与注释中明确标注为「加密出厂正文的解密槽」——它名字像资产库，但删掉注入正文就没了。

### Verification

```
文件数        54 → 40（lib 模块 38 → 27）
体积          1.2 MB → 913 KB
tgz           289 KB → 242 KB（37 个文件）
补丁          86 → 84
index.js      2914 行 → 2223 行
语法          node --check 全部通过
加载          import('dsh-purge') 通过，导出 7 个符号
前端接口      client.js 只读 /dsh-purge/prompt-text
```

### Migration

从 `1.1.90-lite` 升级必须：

```bash
node bin/dsh-purge.js --revert   # 清掉旧补丁 #45/#46
node bin/dsh-purge.js --apply
```

## [1.1.90-lite] - 2026-11-03

首个精简版基线。从上游 `dsh-purge` v1.1.90 裁出第一版可运行的精简形态：保留注入与补丁主链，砍掉外围面板。

[Unreleased]: https://github.com/Nero0427/dsh-purge-lite/compare/v1.2.2-lite...HEAD
[1.2.2-lite]: https://github.com/Nero0427/dsh-purge-lite/releases/tag/v1.2.2-lite
[1.2.1-lite]: https://github.com/Nero0427/dsh-purge-lite/releases/tag/v1.2.1-lite
[1.2.0-lite]: https://github.com/Nero0427/dsh-purge-lite/releases/tag/v1.2.0-lite
[1.1.90-lite]: https://github.com/Nero0427/dsh-purge-lite/releases/tag/v1.1.90-lite
