# 1.4.1-lite

维护版本：声明宿主支持范围、补充插件市场收录说明、修正设置页描述。**功能与 1.4.0-lite 完全相同，运行时代码逻辑未改。**

## 为什么发这一版

1.4.0-lite 之后往 `main` 推了文档与元数据提交，但没有递增版本号。市场按仓库根 `package.json` 的 `version` 判断是否有新版，版本不变时卡片会一直显示「有新提交（未发版）」。递增版本号让 HEAD 对齐一个正式版本。

## 改了什么

- `package.json` 增加 `engines.dsh: ">=0.2.1-rc.2 <=0.2.1-rc.5"`。插件市场与宿主据此判定兼容性，卡片不再显示「未声明宿主要求」。范围用宿主 semver 实测：rc.2 / rc.3 / rc.4 / rc.5 通过，rc.1、rc.6、`0.2.1` 正式版与 `0.2.2-rc.1` 排除。
- README 安装章节写明宿主支持范围，补充「已加入插件市场」（[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，[PR #12160](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/12160)），以及搜索 `Nero0427/dsh-purge-lite` 在市场一键安装。
- 修正 README 与 `client.js` 文件头里「设置页只读面板」的过期描述：设置页现在可切换注入开关与注入模式，正文本身仍只读。

## 升级

**市场点「更新」只替换插件文件，不会自动重打宿主补丁**：更新后请再跑一次 `node bin/dsh-purge.js --apply --status`，然后重启 DSH。

手动升级按 README 的「升级」章节：先在旧目录执行 `--revert`，下载 `dsh-purge-1.4.1-lite.zip` 解压并整体替换插件目录，再执行 `--apply --status`。`prompt-inject.md` 与配置不受影响。
