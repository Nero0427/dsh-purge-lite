# 1.3.0-lite

设置页新增注入总开关；修掉「自己往正文里加几句，下一轮被插件自动改回去」的判定错误。宿主补丁表未动。

## 问题

此前判定「这份正文是不是插件出厂默认」只看三个字符串：`<|im_start|>system:`、`<project_instructions>`、`Little Code Sauce`。三者齐全就算默认——于是**任何基于默认原文的增补都会被判成默认**：下一轮 `syncPromptInjectOnDiskSync()` 跑起来，直接拿加密槽把文件覆盖回去。手改的正文根本留不住，且因为该判断排在 `customized` 检查之前，在设置框里点过保存也救不回来。

## 修了什么

- 覆盖判定改看 hash 与 `override-state.json`：正文与当前加密槽、上次 seed、上次插件写入三者都不等，就认定为用户自己的稿，永久保留；`customized === true` 直接保留。`looksLikePluginDefault()` 降级为展示用途，不再决定要不要覆盖。
- `ensureOverrideFile()` 同步去掉这条误判，`--apply` 不会再把用户增补的正文刷回默认。

## 加了什么

- 设置页状态卡多一个「关闭注入 / 开启注入」按钮，状态来自 `$DSH_HOME/dsh-purge/inject-switch.json`（字段 `promptInject`）。
- 关闭后宿主不再往 system prompt 前面挂注入正文，dsh 回到原生提示词。**切换下一轮对话生效，不需要重启 dsh**——注入正文本来就是每步重新拼的。
- 新路由：`GET /dsh-purge/inject` 读状态，`POST /dsh-purge/inject` 写状态。`/dsh-purge/status` 增加 `prompt_inject` 字段。
- 缺文件、JSON 坏、字段类型不对，一律按「开」处理：插件装歪了不该顺带把注入也关掉。

## 从旧版升级

市场点「更新」只替换 `node_modules` 里的插件文件，宿主里已打的补丁不会自动重打：

```bash
node bin/dsh-purge.js --apply
node bin/dsh-purge.js --status
```

本版未改补丁表，`--apply` 是幂等的，直接跑即可，不必先 `--revert`。

升级前手改过 `prompt-inject.md` 的，这次不会再被覆盖；如果之前为了躲覆盖删过 `<|im_start|>system:` 头，可以加回去，现在的判定不看这个标记。

## 安装

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-purge-lite
```

或者下载本页的 `dsh-purge-1.3.0-lite.zip`，解压到 `<DSH_HOME>/profiles/desktop/node_modules/dsh-purge`，然后运行 `node .../scripts/ensure-profile-bundle.mjs`。

## 完整变更

见 [CHANGELOG.md](CHANGELOG.md)。
