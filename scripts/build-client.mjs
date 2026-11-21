import { build } from 'esbuild'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const out = path.join(root, '.client-build.cjs')
await build({
  entryPoints: [path.join(root, 'client-src/index.jsx')],
  outfile: out,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
})
const code = await fs.readFile(out, 'utf8')
const wrapped = `window.__ModuleLoader__.load({\n  id: '@local/dsh-space',\n  factory(require) {\n    const module = { exports: {} };\n    (function (module, exports, require) {\n${code}\n    })(module, module.exports, require);\n    return module.exports;\n  },\n});\n`
await fs.writeFile(path.join(root, 'client.js'), wrapped)
await fs.rm(out, { force: true })
console.log('client.js', (await fs.stat(path.join(root, 'client.js'))).size, 'bytes')
