import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApi } from './server/api.mjs'

export const name = 'dsh-space'

function resolveHome(ctx) {
  if (process.env.DSH_SPACE_HOME) return path.resolve(process.env.DSH_SPACE_HOME)
  const fromCtx = ctx.get('dshHomePath')?.('space')
  if (fromCtx) return fromCtx
  return path.join(process.env.DSH_HOME || path.join(homedir(), '.dsh'), 'space')
}

export function apply(ctx) {
  const home = resolveHome(ctx)
  const server = fileURLToPath(new URL('./server/main.mjs', import.meta.url))
  const env = { DSH_SPACE_HOME: home }
  if (process.env.DSH_SPACE_SYNCTHING_BIN) env.DSH_SPACE_SYNCTHING_BIN = process.env.DSH_SPACE_SYNCTHING_BIN
  if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'

  ctx.inject(['mcpManager'], (scope) => {
    scope.mcpManager.register('space', {
      transport: 'stdio',
      command: process.execPath,
      args: [server],
      env,
      toolLoading: 'on-demand',
      failOnStartupError: false,
    })
  })

  ctx.inject(['webServer'], (scope) => {
    scope.effect(() => scope.webServer.register({
      kind: 'prefix',
      path: '/dsh-space-api',
      handler: (req, res) => handleApi(req, res, { home }),
    }), 'dsh-space: UI API route')
  })
}
