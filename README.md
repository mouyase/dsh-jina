# dsh-jina

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件：连接 [Jina AI MCP 服务器](https://mcp.jina.ai/v1)，把它的工具注册为 dsh 原生工具。

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that connects the [Jina AI MCP server](https://mcp.jina.ai/v1) and registers its tools as native dsh tools.

## 特性 / Features

与通用的 `@deepseek-ai/dsh-mcp-client` 桥接不同，本插件：

Unlike the generic `@deepseek-ai/dsh-mcp-client` bridge, this plugin:

- 支持配置 HTTP 代理（`proxyUrl`）——适合 `mcp.jina.ai` 无法直连的网络环境；
- 支持工具白名单（`enabledTools`）——只注册你需要的工具；
- 以稳定的 `jina__<toolName>` 名称注册工具（例如 `jina__read_url`）。

- supports a configurable HTTP proxy (`proxyUrl`) — useful when `mcp.jina.ai` is not directly reachable;
- supports a tool allowlist (`enabledTools`) — register only the tools you want;
- registers tools under stable `jina__<toolName>` names (e.g. `jina__read_url`).

## 安装 / Install

从 GitHub 安装：

From GitHub:

```sh
dsh plugin --profile web add github:mouyase/dsh-jina
```

从本地目录安装：

From a local checkout:

```sh
dsh plugin --profile web add file:./dsh-jina
```

## 配置 / Configure

在 dsh patch 层中添加条目——例如全局 `$DSH_HOME/cordis.patch.yml`（所有 profile 生效），或仅 web profile 的 `$DSH_HOME/profiles/web/cordis.patch.yml`：

Add an entry to a dsh patch layer — for example `$DSH_HOME/cordis.patch.yml` for all profiles, or `$DSH_HOME/profiles/web/cordis.patch.yml` for the web profile only:

```yaml
- insert:
    - id: dsh-jina
      name: 'dsh-jina'
      config:
        proxyUrl: 'http://127.0.0.1:7890'   # 空字符串 = 直连 / empty string = direct connection
        apiKeyEnv: 'JINA_API_KEY'           # 推荐用环境变量提供 key / preferred way to provide the key
        enabledTools: ['read_url', 'parallel_read_url', 'primer']  # 空数组 = 注册全部 / empty array = all tools
```

然后照常启动 dsh：

Then start dsh as usual:

```sh
dsh web --patch dsh.mcp.yml --port 3080
```

## 配置项 / Config

| 配置项 Key | 默认值 Default | 说明 Description |
|---|---|---|
| `url` | `https://mcp.jina.ai/v1` | Jina MCP 端点 / endpoint |
| `apiKey` | `''` | 字面量 Jina API key。推荐优先使用 `apiKeyEnv`。 / Literal Jina API key. Prefer `apiKeyEnv`. |
| `apiKeyEnv` | `JINA_API_KEY` | 用于解析 API key 的环境变量名 / environment variable name used to resolve the API key |
| `proxyUrl` | `http://127.0.0.1:7890` | Jina 请求走 HTTP 代理；空字符串 = 直连 / HTTP proxy for Jina requests. Empty string = direct connection. |
| `enabledTools` | `[]` | 工具白名单（Jina 原始工具名）。空数组 = 注册全部工具。 / Tool allowlist (raw Jina tool names). Empty array = register all tools. |
| `toolCallTimeoutMs` | `60000` | 单次工具调用超时 / per-tool-call timeout |
| `failOnStartupError` | `false` | 初始连接失败时是否拒绝插件激活 / fail plugin activation if the initial connection fails |

## 工具命名 / Tool names

Jina 原始工具名会加上 `jina__` 前缀：

Jina raw tool names are prefixed with `jina__`:

```text
jina__read_url
jina__parallel_read_url
jina__primer
jina__search_web
...
```

完整的 Jina 工具列表见 [Jina MCP 文档](https://mcp.jina.ai/)。

The full list of available Jina tools can be found in the [Jina MCP documentation](https://mcp.jina.ai/).

## 注意事项 / Notes

- `apiKey` 在 dsh settings schema 中标记为 `role('secret')`，不会通过 `settings.describe` 暴露。 / `apiKey` is marked `role('secret')` and is not exposed via `settings.describe`.
- 修改 `enabledTools` / `proxyUrl` / `url` 后需要重启 dsh 实例才生效。 / `enabledTools` / `proxyUrl` / `url` changes take effect after the dsh instance is restarted.
- 本插件注册了 settings namespace（`dsh-jina`），但 dsh Web UI 只渲染 host api-proxy 白名单内的 namespace，外部插件目前不会显示在插件配置页；请通过 patch 文件或 `settings.yaml` 配置。 / The plugin registers a settings namespace (`dsh-jina`), but the dsh Web UI only renders namespaces on the host api-proxy allowlist; external plugins are not shown there yet. Configure via patch files or `settings.yaml` instead.

## 许可 / License

MIT
