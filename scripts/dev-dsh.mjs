import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const WATCH_PREFIXES = ['packages', 'adapters/dsh', 'assets', 'docs'];
const IGNORED_SEGMENTS = new Set(['node_modules', 'dist', '.git']);
const GENERATED_FILES = new Set(['adapters/dsh/client.js']);
const SOURCE_EXTENSIONS = /\.(?:js|mjs|cjs|jsx|ts|tsx|css|json|yml|yaml|md|svg|png|webp|jpe?g)$/i;
const BUILD_STEPS = ['scripts/build-client.mjs', 'scripts/build-dsh.mjs'];
const BUILD_STAMP = /\d+\.\d+\.\d+\+local\.[0-9A-Z]+/;
const DEBOUNCE_MS = 120;

/**
 * Whether a path relative to the repository root can change the packaged DSH plugin.
 * Generated output stays out so a rebuild never triggers the watcher again.
 */
export function shouldRebuild(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalized === '' || normalized.endsWith('/')) return false;
  if (normalized.split('/').some((segment) => IGNORED_SEGMENTS.has(segment))) return false;
  if (GENERATED_FILES.has(normalized)) return false;
  if (!SOURCE_EXTENSIONS.test(normalized)) return false;
  return WATCH_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

/** Run one build step, rejecting with the step name when it fails. */
function runStep(relativePath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, relativePath)], { cwd: root, stdio: 'inherit' });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`${relativePath} exited with ${code ?? signal}`));
    });
  });
}

/** The `+local` stamp the client bundle carries, or a placeholder when the build predates it. */
async function readBuildStamp() {
  const bundle = await readFile(path.join(root, 'adapters/dsh/client.js'), 'utf8');
  return BUILD_STAMP.exec(bundle)?.[0] ?? 'unversioned';
}

/** Rebuild the client bundle and the installable package once, reporting duration and stamp. */
async function buildOnce(reason) {
  const startedAt = Date.now();
  for (const step of BUILD_STEPS) await runStep(step);
  const duration = Date.now() - startedAt;
  const stamp = await readBuildStamp();
  const time = new Date().toLocaleTimeString();
  console.log(`[dev:dsh] ${time} ${stamp} in ${duration}ms ${reason}`);
}

async function main() {
  console.log(`[dev:dsh] watching ${WATCH_PREFIXES.join(', ')} (Ctrl-C to stop)`);

  let running = false;
  let timer;
  let queuedPath = null;

  async function pump() {
    if (running) return;
    running = true;
    try {
      while (queuedPath !== null) {
        const changed = queuedPath;
        queuedPath = null;
        await buildOnce(`(${changed})`).catch((error) => {
          console.error(`[dev:dsh] build failed, still watching: ${error.message}`);
        });
      }
    } finally {
      running = false;
    }
    if (queuedPath !== null) void pump();
  }

  function request(changedPath) {
    queuedPath = changedPath;
    clearTimeout(timer);
    timer = setTimeout(() => {
      void pump();
    }, DEBOUNCE_MS);
  }

  await buildOnce('(initial build)').catch((error) => {
    console.error(`[dev:dsh] initial build failed: ${error.message}`);
  });

  const watchers = new Map();
  for (const directory of WATCH_PREFIXES) {
    const watcher = watch(path.join(root, directory), { recursive: true }, (_event, filename) => {
      if (filename === null || filename === undefined) return;
      const relativePath = path.join(directory, filename.toString());
      if (shouldRebuild(relativePath)) request(relativePath);
    });
    watcher.on('error', (error) => {
      console.error(`[dev:dsh] watcher error for ${directory}: ${error.message}`);
    });
    watchers.set(directory, watcher);
  }

  const stop = () => {
    for (const watcher of watchers.values()) watcher.close();
    clearTimeout(timer);
    console.log('\n[dev:dsh] stopped');
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  console.log('[dev:dsh] save a source file to rebuild dist/dsh-plugin; DSH hot-reloads the client in about 0.5s');
}

const invokedDirectly = process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(`[dev:dsh] ${error.message}`);
    process.exitCode = 1;
  });
}
