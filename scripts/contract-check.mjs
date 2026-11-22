/**
 * Contract check: the MCP surface (server/main.mjs) and the page API
 * (server/api.mjs) must expose the same capabilities.
 *
 * Run with `node scripts/contract-check.mjs`. Exits non-zero on drift so CI (or
 * a pre-release check) catches a tool that has no HTTP method and vice versa.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { TOOL_HTTP, httpMethods } from '../server/core/contract.mjs'

const root = path.resolve(import.meta.dirname, '..')
const mainSource = await fs.readFile(path.join(root, 'server/main.mjs'), 'utf8')
const apiSource = await fs.readFile(path.join(root, 'server/api.mjs'), 'utf8')

const tools = new Set([...mainSource.matchAll(/server\.registerTool\('([a-z0-9_]+)'/g)].map(match => match[1]))
const cases = new Set([...apiSource.matchAll(/case '([A-Za-z0-9_]+)':/g)].map(match => match[1]))
const contracted = new Set(Object.keys(TOOL_HTTP))

const problems = []
for (const tool of tools) {
  if (!contracted.has(tool)) problems.push(`tool "${tool}" is missing from TOOL_HTTP`)
}
for (const tool of contracted) {
  if (!tools.has(tool)) problems.push(`TOOL_HTTP lists "${tool}" but main.mjs does not register it`)
}
for (const [tool, method] of Object.entries(TOOL_HTTP)) {
  if (method && !cases.has(method)) problems.push(`tool "${tool}" maps to HTTP "${method}" but api.mjs has no such case`)
}
for (const method of httpMethods()) {
  if (method === 'asset' || method === 'events') continue
  if (!cases.has(method)) problems.push(`HTTP method "${method}" is declared but not dispatched`)
}
for (const method of cases) {
  if (!httpMethods().has(method)) problems.push(`api.mjs dispatches "${method}" without declaring it in contract.mjs`)
}

console.log(`tools: ${tools.size} · http methods: ${httpMethods().size} · dispatched cases: ${cases.size}`)
if (problems.length > 0) {
  console.error('\ncontract drift:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}
console.log('contract ok')
