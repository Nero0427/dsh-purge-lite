# 1.2.1-lite

维护版本：补齐从 GitHub 仓库安装与插件市场更新的说明。功能与补丁表与 `1.2.0-lite` 完全相同，代码未改。

## 为什么发这一版

`1.2.0-lite` 的文档只写了「下载 zip 解压」，而插件市场判断新版依据的是仓库根 `package.json` 的 `version`。用 `link:` 挂本地副本时市场把插件当成开发副本，不会提示更新。这一版把 `pnpm add github:Nero0427/dsh-purge-lite` 写进安装方式，并说明从仓库安装后「点击更新」的边界。

递增版本号本身也是一次真实更新：已用 `github:` 安装的 profile 会检测到 `1.2.1-lite` 并可以点击升级。

## 更新后的必要动作

市场点「更新」只替换 `node_modules` 里的插件文件，**宿主里已打的补丁不会自动重打**：

```bash
node bin/dsh-purge.js --apply
node bin/dsh-purge.js --status
```

若新版调整了补丁表，先 `--revert` 再 `--apply`。补丁备份在 `<DSH_HOME>/dsh-purge/host-backups/`，不在插件目录里，替换插件后照样能还原。

## 安装

推荐从仓库安装（可被市场管理、可点更新）：

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-purge-lite
```

或者下载本页的 `dsh-purge-1.2.1-lite.zip`，解压到 `<DSH_HOME>/profiles/desktop/node_modules/dsh-purge`，然后：

```bash
node "<DSH_HOME>/profiles/desktop/node_modules/dsh-purge/scripts/ensure-profile-bundle.mjs"
```

## 完整变更

见 [CHANGELOG.md](CHANGELOG.md)。
