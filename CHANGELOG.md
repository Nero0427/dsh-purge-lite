# Changelog

本项目所有值得记录的变更都写在这里。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 `主版本.次版本.修订号-lite` 的约定，`-lite` 表示精简衍生线。

## [Unreleased]

### Planned

- 补丁表从 84 条裁剪到约 35 条（提示词层 + 审批门 + 沙箱），逐组验证依赖关系。
- `drifted` 补丁的自动 pattern 更新（当前只能等新版本）。

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
