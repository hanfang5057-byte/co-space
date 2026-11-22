import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.join(os.tmpdir(), `dsh-space-smoke-${process.pid}`)

const repo = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'server/core')
const live = await import(`${repo}/live.mjs`)
const docs = await import(`${repo}/docs.mjs`)

await fs.rm(ROOT, { recursive: true, force: true })
await fs.mkdir(`${ROOT}/space/pages`, { recursive: true })
await fs.mkdir(`${ROOT}/spaces`, { recursive: true })
const spaceRoot = `${ROOT}/space`
await fs.writeFile(`${spaceRoot}/pages/a.md`, '# 标题\n\n第一段。\n\n## 背景\n\n背景。\n\n## 方案\n\n方案。\n')

const client = {
  configFolders: async () => [{ id: 'sp', label: 'SP', path: spaceRoot }],
  status: async () => ({ myID: 'AAAAAAA' }),
  scan: async () => {},
}
const config = { spacesRoot: `${ROOT}/spaces`, limits: {} }

let ok = 0, fail = 0
const check = (name, cond, extra = '') => { if (cond) { ok++; console.log('  ok ', name) } else { fail++; console.log('  FAIL', name, extra) } }

// 1. lease contention
const a = await live.acquireLease(client, config, { space: 'sp', path: 'pages/a.md', holder: 'A', label: 'Alice', settleMs: 0 })
const b = await live.acquireLease(client, config, { space: 'sp', path: 'pages/a.md', holder: 'B', label: 'Bob', settleMs: 25 })
check('A gets lease', a.granted === true)
check('B denied', b.granted === false && b.holder === 'Alice', JSON.stringify(b))
await live.releaseLease(client, config, { space: 'sp', path: 'pages/a.md', leaseId: a.lease.leaseId })
const b2 = await live.acquireLease(client, config, { space: 'sp', path: 'pages/a.md', holder: 'B', label: 'Bob', settleMs: 0 })
check('B gets lease after release', b2.granted === true)
await live.releaseLease(client, config, { space: 'sp', path: 'pages/a.md', leaseId: b2.lease.leaseId })

// 2. presence
await live.writePresence(client, config, { space: 'sp', device: 'AAAAAAA', doc: 'pages/a.md', mode: 'editing' })
const presence = await live.readPresence(client, config, { space: 'sp' })
check('presence visible', presence.length === 1 && presence[0].device === 'AAAAAAA')

// 3. blocks + patch
const before = await docs.docBlocks(client, config, { space: 'sp', path: 'pages/a.md' })
check('blocks count', before.blocks.length === 6, String(before.blocks.length))
const target = before.blocks.find(block => block.heading === '方案' && block.kind === 'paragraph')
const patched = await docs.docPatch(client, config, { space: 'sp', path: 'pages/a.md', expectedSha256: before.sha256, ops: [{ op: 'replace_block', blockId: target.blockId, markdown: '新的方案。' }] })
const afterText = await fs.readFile(`${spaceRoot}/pages/a.md`, 'utf8')
check('patch applied', afterText.includes('新的方案。') && !afterText.includes('\n方案。\n'), JSON.stringify(afterText.slice(-24)))
check('sha changed', patched.sha256 !== before.sha256)

// 4. stale patch rejected
let stale = null
try { await docs.docPatch(client, config, { space: 'sp', path: 'pages/a.md', expectedSha256: before.sha256, ops: [{ op: 'append_section', markdown: 'x' }] }) } catch (error) { stale = error }
check('stale write conflicts', stale?.code === 'VERSION_CONFLICT')

// 5. propose + accept
const latest = await docs.docBlocks(client, config, { space: 'sp', path: 'pages/a.md' })
const proposal = await docs.docPropose(client, config, { space: 'sp', path: 'pages/a.md', expectedSha256: latest.sha256, ops: [{ op: 'append_section', markdown: '## 附录\n\n补充。' }], rationale: '补一段' })
check('proposal created', proposal.status === 'pending')
const pending = await docs.docProposals(client, config, { space: 'sp', path: 'pages/a.md' })
check('proposal listed', pending.proposals.length === 1)
const accepted = await docs.docResolveProposal(client, config, { space: 'sp', path: 'pages/a.md', id: proposal.id, accept: true })
const afterAccept = await fs.readFile(`${spaceRoot}/pages/a.md`, 'utf8')
check('proposal accepted writes', accepted.status === 'accepted' && afterAccept.includes('## 附录'))

// 6. versions + restore
const versions = await docs.docVersions(client, config, { space: 'sp', path: 'pages/a.md' })
check('versions recorded', versions.versions.length >= 2, String(versions.versions.length))
const previous = versions.versions.find(row => !row.current)
const restored = await docs.docRestore(client, config, { space: 'sp', path: 'pages/a.md', sha: previous.sha })
const afterRestore = await fs.readFile(`${spaceRoot}/pages/a.md`, 'utf8')
check('restore works', restored.restored === previous.sha && afterRestore === (await fs.readFile(`${spaceRoot}/.live/versions/${live.docId('pages/a.md')}/${previous.sha}.md`, 'utf8')))

// 7. LOCKED path
const c = await live.acquireLease(client, config, { space: 'sp', path: 'pages/a.md', holder: 'C', label: 'Carol', settleMs: 0 })
let locked = null
try { await docs.docPatch(client, config, { space: 'sp', path: 'pages/a.md', ops: [{ op: 'append_section', markdown: 'y' }] }) } catch (error) { locked = error }
check('patch blocked by lease', locked?.code === 'LOCKED' && locked.details?.holder === 'C', JSON.stringify(locked?.details))
await live.releaseLease(client, config, { space: 'sp', path: 'pages/a.md', leaseId: c.lease.leaseId })

await fs.rm(ROOT, { recursive: true, force: true })
console.log(`\n${ok} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
