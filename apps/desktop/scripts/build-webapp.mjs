import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localBuildVersion } from '../../../scripts/local-build-version.mjs';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(appDir, 'build/webapp');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const indexSource = path.join(appDir, 'src/client/index.html');
const indexOutput = path.join(out, 'index.html');
await cp(indexSource, indexOutput);
const options = { entryPoints: [path.join(appDir, 'src/client/main.jsx')], outfile: path.join(out, 'app.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2020', jsx: 'automatic', minify: true, loader: { '.css': 'css', '.svg': 'dataurl' }, external: ['node:*'], define: { __COSPACE_BUILD_VERSION__: JSON.stringify(localBuildVersion) } };

if (process.argv.includes('--watch')) {
  const watcher = await context(options);
  await watcher.rebuild();
  await watcher.watch();
  const indexWatcher = (await import('node:fs')).watch(indexSource, async () => {
    try { await cp(indexSource, indexOutput); } catch (error) { console.error(`Could not refresh desktop HTML: ${error.message}`); }
  });
  console.log('Watching desktop UI for changes…');
  const stop = async () => { indexWatcher.close(); await watcher.dispose(); process.exit(0); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} else {
  await build(options);
}
