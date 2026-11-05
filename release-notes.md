# 1.2.2-lite

修复从 GitHub 仓库（`github:`）安装后，插件市场「点击更新」会被构建授权反复拦住的问题。补丁表与运行时逻辑未改。

## 问题

pnpm 11 默认拦依赖的构建脚本。对 git 源，它只认 `name@git+https://github.com/owner/repo.git` 这类稳定授权键；插件的 postinstall 在重写 `pnpm-workspace.yaml` 的 `allowBuilds` 时，会把市场 `approve-builds` 写好的这些键一律当作历史垃圾删掉，并把 pnpm 的待决占位行 `set this to true or false` 原样留下。结果每次更新都回到 `ERR_PNPM_IGNORED_BUILDS`，而且因为 pnpm 检查的是整个 profile，**装在这个 profile 里的其它插件也一起更新不了**。

## 修了什么

- `purgePnpmBuildSpecs()` 现在读取 profile 的 `package.json`：依赖写成 `github:owner/repo` 时，除裸包名外额外生成稳定 git 授权键。全新安装不必再手工点「放行构建脚本」。
- `rewritePnpmAllowBuilds()` 保留 pnpm / 市场写出的两类合法 git 键（稳定 git 键与 commit 固定的 codeload 键），并把待决占位行直接确认为 `true`；`dsh-purge@https` 这类畸形历史键仍按原有自愈逻辑丢弃，避免 `ERR_PNPM_INVALID_VERSION_UNION`。
- 用构造样本验证过：占位行变 `true`、稳定键保留、畸形键清除、`validateAllowBuildRewrite` 通过。

## 从旧版升级

已经卡在这个问题的 profile，先在插件市场点一次「放行构建脚本并重试」（或执行 `pnpm approve-builds`），再点更新到本版本。本版本装上之后，后续更新不再需要这一步。

市场点「更新」只替换 `node_modules` 里的插件文件，**宿主里已打的补丁不会自动重打**：

```bash
node bin/dsh-purge.js --apply
node bin/dsh-purge.js --status
```

若新版调整了补丁表，先 `--revert` 再 `--apply`。

## 安装

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-purge-lite
```

或者下载本页的 `dsh-purge-1.2.2-lite.zip`，解压到 `<DSH_HOME>/profiles/desktop/node_modules/dsh-purge`，然后运行 `node .../scripts/ensure-profile-bundle.mjs`。

## 完整变更

见 [CHANGELOG.md](CHANGELOG.md)。
