# 1.2.0-lite

第二轮精简。删掉的模块不是停用，而是从代码树里彻底消失。

## 重点

- **补丁表 86 → 84**：移除 `#45` / `#46`（桌面更新接管）。
- **模块 38 → 27**：在线更新、技能库、消息回退、自动续跑、演练台、红队角色稿全部删除，约 170 KB。
- **命令只剩 `/purge`**：`/rules`、`/skills`、`/rewind` 注销。
- **面板只剩只读状态页**：正文大小、行数、修改时间、来源路径、正文。

## 升级注意

从 `1.1.90-lite` 上来必须先还原再应用，否则旧补丁 #45/#46 会留在 `main.js` 里：

```bash
node bin/dsh-purge.js --revert
node bin/dsh-purge.js --apply
```

## 安装

下载本页下方的 `dsh-purge-1.2.0-lite.zip`，解压到：

```
<DSH_HOME>/profiles/desktop/node_modules/dsh-purge
```

然后：

```bash
node "<DSH_HOME>/profiles/desktop/node_modules/dsh-purge/scripts/ensure-profile-bundle.mjs"
```

## 完整变更

见 [CHANGELOG.md](CHANGELOG.md)。

---

**Verification**：文件 54 → 40，体积 1.2 MB → 913 KB，tgz 242 KB，`node --check` 全通过，`import('dsh-purge')` 正常导出 7 个符号。
