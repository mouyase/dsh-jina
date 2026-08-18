# dsh-jina

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that connects the [Jina AI MCP server](https://mcp.jina.ai/v1) and registers its tools as native dsh tools.

Unlike the generic `@deepseek-ai/dsh-mcp-client` bridge, this plugin:

- supports a configurable HTTP proxy (`proxyUrl`) — useful when `mcp.jina.ai` is not directly reachable;
- supports a tool allowlist (`enabledTools`) — register only the tools you want;
- registers tools under stable `jina__<toolName>` names (e.g. `jina__read_url`).

## Install

From GitHub (once published):

```sh
dsh plugin --profile web add github:<user>/<repo>
```

From a local checkout:

```sh
dsh plugin --profile web add file:./dsh-jina
```

## Configure

Add an entry to a dsh patch layer — for example `$DSH_HOME/cordis.patch.yml` for all profiles, or `$DSH_HOME/profiles/web/cordis.patch.yml` for the web profile only:

```yaml
- insert:
    - id: dsh-jina
      name: 'dsh-jina'
      config:
        proxyUrl: 'http://127.0.0.1:7890'   # empty string = direct connection
        apiKeyEnv: 'JINA_API_KEY'           # preferred way to provide the key
        enabledTools: ['read_url', 'parallel_read_url', 'primer']  # empty array = all tools
```

Then start dsh as usual:

```sh
dsh web --patch dsh.mcp.yml --port 3080
```

## Config

| Key | Default | Description |
|---|---|---|
| `url` | `https://mcp.jina.ai/v1` | Jina MCP endpoint |
| `apiKey` | `''` | Literal Jina API key. Prefer `apiKeyEnv`. |
| `apiKeyEnv` | `JINA_API_KEY` | Environment variable name used to resolve the API key |
| `proxyUrl` | `http://127.0.0.1:7890` | HTTP proxy for Jina requests. Empty string = direct connection. |
| `enabledTools` | `[]` | Tool allowlist (raw Jina tool names). Empty array = register all tools. |
| `toolCallTimeoutMs` | `60000` | Per-tool-call timeout |
| `failOnStartupError` | `false` | Fail plugin activation if the initial connection fails |

## Tool names

Jina raw tool names are prefixed with `jina__`:

```text
jina__read_url
jina__parallel_read_url
jina__primer
jina__search_web
...
```

The full list of available Jina tools can be found in the [Jina MCP documentation](https://mcp.jina.ai/).

## Notes

- `apiKey` is marked `role('secret')` in the dsh settings schema and is not exposed via `settings.describe`.
- `enabledTools` / `proxyUrl` / `url` changes take effect after the dsh instance is restarted.
- The plugin registers a settings namespace (`dsh-jina`), but the dsh Web UI only renders namespaces on the host api-proxy allowlist; external plugins are not shown there yet. Configure via patch files or `settings.yaml` instead.

## License

MIT
