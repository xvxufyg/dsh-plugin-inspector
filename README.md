# DSH 插件查看器（@local/dsh-plugin-inspector）

[![Release](https://img.shields.io/github/v/release/xvxufyg/dsh-plugin-inspector?label=version)](https://github.com/xvxufyg/dsh-plugin-inspector/releases) [![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE) [![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-orange)](https://github.com/deepseek-ai/deepseek-harness) [![DSH 兼容](https://img.shields.io/badge/DSH-%3E%3D0.2.1--rc.5%20%3C1.0.0-blue)](https://github.com/deepseek-ai/deepseek-harness) [![Auto Translation](https://img.shields.io/badge/translation-auto%20CN-blueviolet)](#功能)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Cordis 插件。在 Web 界面侧边栏底部停靠一个入口，点开即可浏览当前配置里所有已安装的插件与插件包；英文条目悬停可自动翻译成中文，并给出「怎么用」的大白话教程。

## 功能

- **插件 / 插件包列表**：直接读取 `pluginManager.listPlugins()` / `listBundles()`，每次打开面板自动重扫，新装插件立刻出现。显示启用状态、补丁 ID、版本、描述、来源等。
- **悬停自动翻译**：鼠标停在英文条目上，先「翻译中…」再弹中文名 + 中文说明 + 💡 用法。翻译调用本机已配置的大模型，结果缓存到 `~/.dsh/inspector-plugin-translations.json`，第二次秒出。
- **怎么用栏目**：常见插件预置中文教程 + 步骤 + 可复制话术；新装插件靠自动翻译也能生成用法说明。
- **复制原始配置**：每条可复制完整 JSON，方便排错。
- **中 / EN 切换**：默认中文，可一键切英文。

## 兼容性

| 插件版本 | DeepSeek Harness | 核心包 | 状态 |
|---|---|---|---|
| v1.1.0 | `>=0.2.1-rc.5 <1.0.0` | `@deepseek-ai/dsh-agent-preset` `0.2.1-rc.5+` | ✅ 当前推荐 |
| v1.0.1 | `>=0.2.1-rc.5 <1.0.0` | 同上 | 可用 |
| v1.0.0 | `>=0.2.1-rc.5 <1.0.0` | 同上 | 可用 |

- 已在 Harness **0.2.2-rc.1**（核心 0.2.1-rc.5）实测通过。
- 依赖的宿主服务：`webServer`、`pluginManager`、`llm`、`agentDefaultModel`。若某服务未挂载，对应功能会优雅降级，不会导致插件崩溃。

## 安装

在本机 Harness 里让 AI 执行（或用插件设置界面安装）：

```
plugin_manager install_bundle <本仓库目录的绝对路径>
```

装完后**重启一次 Harness**（Host 半新增了 `llm`、`agentDefaultModel` 注入和 `/translate` 路由，需要重新加载模块），再刷新 Web 页面。侧边栏底部出现「● DSH 插件」即成功。

> 说明：这是 profile 级插件。包里的 `@local/xxx` 是本地包名，安装时会链接到你的工作目录；别人 clone 后需改 `package.json` 里的 `name` 为自己的命名空间（例如 `@yourname/dsh-plugin-inspector`），并同步改 `cordis.patch.yml`、`client.js` 里的插件 id。

## 目录结构

```
index.js            Host 半：读取插件管理器、自动翻译 HTTP 路由
client.js           Client 半：侧边栏入口 + 浮层面板 + 悬停翻译 + 怎么用
cordis.patch.yml    Loader 插入行
package.json        插件清单与 dsh.client 声明
locale/             中英插件标题与描述
icon.svg            插件图标
```

## 自动翻译说明

翻译走 Harness 自身配置的默认模型（`agentDefaultModel.currentSelection()` + `ctx.llm.stream()`），不需要额外的 API Key。首次打开面板会批量翻译当前插件清单（分批，每批 25 个），稍等几秒；结果缓存到磁盘，之后不再重复请求。系统内置自动运行的插件，用法会标注「内置自动运行，一般无需手动操作」。若某条没翻出来，点面板里的 ↻ 重试。

## License

MIT（可在仓库里补一个 LICENSE 文件）。
