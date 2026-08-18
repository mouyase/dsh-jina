# dsh-jina

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）插件：连接 [Jina AI MCP 服务器](https://mcp.jina.ai/v1)，把它的工具注册为 dsh 原生工具。

> English documentation: [docs/README.EN.md](docs/README.EN.md)

## 特性

与通用的 `@deepseek-ai/dsh-mcp-client` 桥接不同，本插件：

- 支持配置 HTTP 代理（`proxyUrl`）——适合 `mcp.jina.ai` 无法直连的网络环境；
- 支持工具白名单（`enabledTools`）——只注册你需要的工具；
- 以稳定的 `jina__<toolName>` 名称注册工具（例如 `jina__read_url`）。

## 安装

从 GitHub 安装：

```sh
dsh plugin --profile web add github:mouyase/dsh-jina
```

从 npm 安装：

```sh
dsh plugin --profile web add dsh-jina
```

从本地目录安装：

```sh
dsh plugin --profile web add file:./dsh-jina
```

## 配置

在 dsh patch 层中添加条目——例如全局 `$DSH_HOME/cordis.patch.yml`（所有 profile 生效），或仅 web profile 的 `$DSH_HOME/profiles/web/cordis.patch.yml`：

```yaml
- insert:
    - id: dsh-jina
      name: 'dsh-jina'
      config:
        proxyUrl: 'http://127.0.0.1:7890'   # 空字符串 = 直连
        apiKeyEnv: 'JINA_API_KEY'           # 推荐用环境变量提供 key
        enabledTools: ['read_url', 'parallel_read_url', 'primer']  # 空数组 = 注册全部
```

然后照常启动 dsh：

```sh
dsh web --patch dsh.mcp.yml --port 3080
```

## 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `url` | `https://mcp.jina.ai/v1` | Jina MCP 端点 |
| `apiKey` | `''` | 字面量 Jina API key。推荐优先使用 `apiKeyEnv`。 |
| `apiKeyEnv` | `JINA_API_KEY` | 用于解析 API key 的环境变量名 |
| `proxyUrl` | `http://127.0.0.1:7890` | Jina 请求走 HTTP 代理；空字符串 = 直连 |
| `enabledTools` | `[]` | 工具白名单（Jina 原始工具名）。空数组 = 注册全部工具。 |
| `toolCallTimeoutMs` | `60000` | 单次工具调用超时 |
| `failOnStartupError` | `false` | 初始连接失败时是否拒绝插件激活 |

## 工具命名

Jina 原始工具名会加上 `jina__` 前缀：

```text
jina__read_url
jina__parallel_read_url
jina__primer
jina__search_web
...
```

完整的 Jina 工具列表见 [Jina MCP 文档](https://mcp.jina.ai/)。

## 注意事项

- `apiKey` 在 dsh settings schema 中标记为 `role('secret')`，不会通过 `settings.describe` 暴露。
- 修改 `enabledTools` / `proxyUrl` / `url` 后需要重启 dsh 实例才生效。
- 本插件注册了 settings namespace（`dsh-jina`），但 dsh Web UI 只渲染 host api-proxy 白名单内的 namespace，外部插件目前不会显示在插件配置页；请通过 patch 文件或 `settings.yaml` 配置。

## 许可

MIT
