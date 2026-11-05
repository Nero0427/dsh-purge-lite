# 贡献指南

先读 [README](README.md) 的「设计取舍」一节。这个项目的取舍很硬：**只做注入与补丁**。想加一个功能模块，先想清楚它是否属于这两件事之一。

## 开发环境

```bash
git clone https://github.com/Nero0427/dsh-purge-lite.git
cd dsh-purge-lite
node -v          # 需要 >= 18
```

插件以 `link:` 方式挂进 profile，改源码后重启 DSH 即生效：

```bash
cd <DSH_HOME>/profiles/desktop
pnpm add link:/path/to/dsh-purge-lite
```

## 提交前自检

```bash
# 语法
node --check lib/index.js
node --check lib/core.js
node --check bin/dsh-purge.js

# 模块能被加载
node --input-type=module -e "import('./lib/index.js')"

# 补丁表与 profile 的静态一致性（需要传 profile 路径）
node verify/treehealth.mjs <DSH_HOME>/profiles/desktop [<@deepseek-ai 目录>]
```

四条都过再发 PR。

## 改补丁表的规则

补丁是这个仓库最容易出事的地方，改之前确认三件事：

1. **pattern 要绑定官方原文**。宿主一升级原文就变，补丁会变 `drifted` —— 这是预期行为，不是 bug。别写成模糊匹配，`identity.js` 里那条注释解释了为什么：正则源码过长会直接 `Invalid regular expression`。
2. **必须可逆**。每条补丁在写入前备份目标文件原文，`revert` 要能逐条还原。
3. **新增补丁要编号**。用当前最大 id + 1，不要复用被删掉的编号（`#45`/`#46` 已废弃，不要再启用）。

## 代码风格

- ESM，`node:` 前缀导入内置模块。
- 不引入运行时依赖。这个插件要在用户机器上直接跑，多一个依赖就多一次安装失败的可能。
- 注释写**为什么**，不写**是什么**。仓库里已有的注释是按这条写的，保持一致。
- 中英混排：标识符、路径、命令保持原文，说明用中文。

## 提交信息

```
<范围>: <做了什么>

<为什么这么做，而不是怎么做>
```

范围示例：`core`、`identity`、`client`、`cli`、`docs`、`release`。

## 发版

1. 改 `package.json` 的 `version`。
2. 在 `CHANGELOG.md` 顶部加一节，带日期。
3. `release-notes.md` 第一行必须是 `# <version>`，`release.yml` 会校验，不匹配就中止。
4. push 到 `master` 后 Actions 自动打 tag、建 Release、附 `dsh-purge-<version>.zip`。

## 许可证

提交即表示同意以 [Apache-2.0](LICENSE) 分发，并保留 [NOTICE](NOTICE) 中的上游归属。
