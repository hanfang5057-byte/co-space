import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'node_modules/react-data-grid/lib/styles.css')
const css = readFileSync(source, 'utf8')
const outDir = path.join(root, 'client-src/editors')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'rdgStyles.js'), `// Generated from react-data-grid/lib/styles.css. Run npm run build:client.\nexport const RDG_STYLES = ${JSON.stringify(css)}\n`)
console.log('generated client-src/editors/rdgStyles.js')
