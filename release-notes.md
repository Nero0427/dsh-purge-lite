# 1.4.0-lite

注入正文支持按模式分段；新增 `ops_bash` 前台超时上限的收紧命令。**默认配置与 1.3.0 完全一致，不选模式就什么都没变。**

## 为什么

两处实测出来的浪费：

1. 注入正文 26 KB 每轮全量重发，其中约 6.8 KB 只有做渗透时才用得上（CTF 两段 + CANNED WORKFLOWS + web-pentest canned slots + WEB PENTEST ROUTING）。
2. `dsh-ops` 把 `ops_bash` 的 `MAX_BASH_TIMEOUT_MS` 设成 `2_147_483_647`（约 24.8 天）。一个会话里 12% 的调用显式传了 `timeoutMs`，几条把单步阻塞拖到 300–480 秒。

## 加了什么

**按模式注入**（`lib/sections.js`）

- `full`（默认）：注入整份 `prompt-inject.md`，行为不变。
- `general`：只注入 `$DSH_HOME/dsh-purge/sections/core.md`，实测 26,275 B → 19,427 B，**省 26%**。
- `pentest`：`core.md` + `sections/pentest.md`，等于全量（渗透模板本来就该在），只是语义明确。
- 设置页状态卡多了模式下拉，CLI 是 `--mode <full|general|pentest>`。切换**下一轮对话生效，不用重启 dsh**。
- 分割文件缺失时自动降级回全量——宁可多注入，不会因为文件没放好就少一块。

**`ops_bash` 超时上限收紧**（`lib/bash-budget.js`）

- `--bash-budget [ms]`：把 `MAX_BASH_TIMEOUT_MS` 收到 180 秒，默认就这么用。
- `--bash-budget-revert`：还原。
- 为什么安全：`dsh-ops` 的前台超时走 `kind: "promoted"`，把还在跑的命令**转成后台 job，不杀进程**，主循环继续，之后用 `job_output` 取结果。所以上限收紧只减少串行等待，不丢工作。
- `dsh-ops` 更新会覆盖这处改动，升级后重跑一次 `--bash-budget` 即可；备份在同目录 `constants.js.dshpurge.bak`。

## 顺手修的两处

- `refreshHungOperator()` 的缓存键加入 `inject-switch.json` 的 mtime。不加的话切模式只会改这个文件，缓存照样命中上一轮的旧正文，表现为「选了没反应」。
- 全量模式改为直读磁盘、不再优先内存里的 `committed`。`committed` 可能是上一次分段模式钉进去的正文，切回 `full` 时若还认它，旧内容会一直被复用。

## 从旧版升级

```bash
node bin/dsh-purge.js --apply
node bin/dsh-purge.js --status
```

本版未改宿主补丁表，`--apply` 幂等。想试分段就 `--mode general`，想恢复 `--mode full`。

## 安装

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add github:Nero0427/dsh-purge-lite
```

或者下载 `dsh-purge-1.4.0-lite.zip`，解压到 `<DSH_HOME>/profiles/desktop/node_modules/dsh-purge`，再跑 `node .../scripts/ensure-profile-bundle.mjs`。

## 完整变更

见 [CHANGELOG.md](CHANGELOG.md)。
