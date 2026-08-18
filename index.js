// dsh-jina: Jina MCP native plugin with proxy + tool allowlist support.
import z from '@deepseek-ai/schemastery'
import { z as zRaw } from 'zod'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { ListToolsResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { ProxyAgent, fetch as undiciFetch } from 'undici'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'

const name = 'dsh-jina'
const inject = ['tools']
const JINA_SETTINGS_NAMESPACE = settingsNamespace('dsh-jina')

const Config = z.object({
  url: z.string().default('https://mcp.jina.ai/v1'),
  apiKey: z.string().role('secret').default(''),
  apiKeyEnv: z.string().default('JINA_API_KEY'),
  proxyUrl: z.string().default('http://127.0.0.1:7890'),
  enabledTools: z.array(z.string()).default([]),
  toolCallTimeoutMs: z.number().default(60000),
  failOnStartupError: z.boolean().default(false),
})

const RawCallToolResultSchema = zRaw.record(zRaw.string(), zRaw.unknown())

function resolveApiKey(config) {
  if (config.apiKey) return config.apiKey
  if (config.apiKeyEnv && process.env[config.apiKeyEnv]) return process.env[config.apiKeyEnv]
  return ''
}

function publicToolName(rawName) {
  const joined = `jina__${rawName}`
  const normalized = joined.replace(/[^A-Za-z0-9_-]/g, '_')
  return normalized.length <= 64 ? normalized : normalized.slice(0, 64)
}

function createProxiedFetch(proxyUrl) {
  if (!proxyUrl) return undefined
  const agent = new ProxyAgent({ uri: proxyUrl })
  return (url, init) => undiciFetch(url, { ...init, dispatcher: agent })
}

function extractText(mcpContent, toolName) {
  if (!Array.isArray(mcpContent)) return JSON.stringify(mcpContent)
  const parts = []
  for (const value of mcpContent) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      parts.push('[unsupported content type: unknown]')
      continue
    }
    switch (value.type) {
      case 'text':
        if (value.text !== undefined) parts.push(value.text)
        break
      case 'image':
        parts.push(`[image: ${value.mimeType ?? 'unknown'}, content discarded]`)
        break
      case 'audio':
        parts.push(`[audio: ${value.mimeType ?? 'unknown'}, content discarded]`)
        break
      case 'resource':
        parts.push('[resource content discarded]')
        break
      default:
        parts.push(`[unsupported content type: ${value.type ?? 'unknown'}]`)
    }
  }
  if (parts.length === 0) return `[${toolName}: no text output]`
  return parts.join('\n')
}

function createOutput(rawName) {
  return {
    schema: {
      type: 'object',
      properties: { content: { type: 'array', items: {} } },
      required: ['content'],
      additionalProperties: false,
    },
    render(_args, value) {
      return [{ type: 'text', text: extractText(value.content, rawName) }]
    },
  }
}

function createExecutor(client, rawName, disposedRef, timeoutMs) {
  return async (args, exec) => {
    if (disposedRef.disposed) throw new Error(`dsh-jina: tool ${rawName} is no longer available`)
    const result = await client.request(
      { method: 'tools/call', params: { name: rawName, arguments: typeof args === 'object' && args !== null ? args : {} } },
      RawCallToolResultSchema,
      { signal: exec.signal, timeout: timeoutMs },
    )
    const content = Array.isArray(result.content) ? result.content : []
    const text = extractText(content, rawName)
    if (result.isError === true) throw new Error(text)
    return { content }
  }
}

async function apply(ctx, config) {
  process.stderr.write('[dsh-jina] apply start\n')
  let current = () => config
  let settingsReady = false
  installSettingsSection(ctx, JINA_SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => { current = source },
    onChange: () => {
      if (!settingsReady) { settingsReady = true; return }
      process.stderr.write('[dsh-jina] settings changed (restart needed for url/proxyUrl/apiKey/enabledTools changes)\n')
    },
  })
  const resolved = current()
  const apiKey = resolveApiKey(resolved)
  if (!apiKey) ctx.logger?.warn('dsh-jina: no API key resolved (set config.apiKey, config.apiKeyEnv, or JINA_API_KEY)')

  const headers = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const client = new Client({ name: 'dsh-jina', version: '0.1.0' })
  const transport = new StreamableHTTPClientTransport(new URL(resolved.url), {
    requestInit: { headers },
    fetch: createProxiedFetch(resolved.proxyUrl),
  })

  const disposedRef = { disposed: false }
  const disposers = new Map()

  ctx.effect(() => () => {
    disposedRef.disposed = true
    for (const dispose of disposers.values()) { try { dispose() } catch {} }
    disposers.clear()
    void client.close().catch(() => {})
  })

  try {
    await client.connect(transport)
    const list = await client.request({ method: 'tools/list' }, ListToolsResultSchema)
    const tools = (list?.tools ?? []).filter((tool) => {
      if (!resolved.enabledTools || resolved.enabledTools.length === 0) return true
      return resolved.enabledTools.includes(tool.name)
    })
    for (const tool of tools) {
      const toolName = publicToolName(tool.name)
      if (disposers.has(toolName)) continue
      const definition = {
        name: toolName,
        description: tool.description ?? '',
        parameters: tool.inputSchema ?? { type: 'object', properties: {} },
        output: createOutput(tool.name),
        timeoutMs: resolved.toolCallTimeoutMs,
        execute: createExecutor(client, tool.name, disposedRef, resolved.toolCallTimeoutMs),
      }
      disposers.set(toolName, ctx.tools.register(definition))
    }
    const msg = `dsh-jina: registered ${disposers.size} tool(s) from ${resolved.url}` + (resolved.proxyUrl ? ` via proxy ${resolved.proxyUrl}` : ' (direct)')
    process.stderr.write(`[${msg}]\n`)
    ctx.logger?.info(msg)
  } catch (error) {
    process.stderr.write(`[dsh-jina] connect or tool sync failed: ${String(error)}\n`)
    ctx.logger?.error(`dsh-jina: connect or tool sync failed: ${String(error)}`)
    if (resolved.failOnStartupError) throw error
  }
}

export { Config, apply, inject, name }
