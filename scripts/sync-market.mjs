import { access, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import brand from '../packages/brand/metadata.json' with { type: 'json' };

const root = path.resolve(import.meta.dirname, '..');
const indexPath = path.join(root, 'market/index.json');
const manifest = JSON.parse(await readFile(path.join(root, 'adapters/dsh/package.json'), 'utf8'));
const release = JSON.parse(await readFile(path.join(root, 'release/npm-version.json'), 'utf8'));
const indexUrl = process.env.SPACE_MARKET_INDEX_URL ?? 'https://raw.githubusercontent.com/hanfang5057-byte/co-space/main/market/index.json';
const registry = (process.env.SPACE_NPM_REGISTRY ?? 'https://registry.npmjs.org').replace(/\/+$/, '');
const repositoryUrl = manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const githubRepo = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(repositoryUrl);

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const offline = args.has('--offline') || checkOnly;
const requireCurrent = args.has('--require-current');

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const existing = JSON.parse(await readFile(indexPath, 'utf8'));
const previous = existing.plugins?.find(plugin => plugin.name === manifest.name) ?? {};

function fail(message) {
  console.error(`sync-market: ${message}`);
  process.exitCode = 1;
}

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json', 'user-agent': 'cospace-market-sync' },
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOptional(url) {
  try {
    return await fetchJson(url);
  } catch (error) {
    console.warn(`sync-market: skipped ${url}: ${error.message}`);
    return null;
  }
}

function sortVersionEntries(left, right) {
  if (left.publishTimestamp !== right.publishTimestamp) return left.publishTimestamp - right.publishTimestamp;
  return left.version.localeCompare(right.version, 'en', { numeric: true });
}

async function collectPublishedVersions() {
  const metadata = await fetchJson(`${registry}/${encodeURIComponent(manifest.name)}`);
  const versions = [];
  for (const [version, manifestVersion] of Object.entries(metadata.versions ?? {})) {
    if (!semverPattern.test(version)) continue;
    if (manifestVersion.deprecated) continue;
    if (!manifestVersion.dsh?.bundle?.patch) continue;
    const publishedAt = Date.parse(metadata.time?.[version] ?? '');
    if (!Number.isFinite(publishedAt)) continue;
    versions.push({
      version,
      publishTimestamp: Math.floor(publishedAt / 1000),
      source: { type: 'npm' },
      ...(manifestVersion.engines?.dsh ? { engines: { dsh: manifestVersion.engines.dsh } } : {}),
    });
  }
  versions.sort(sortVersionEntries);
  if (versions.length === 0) throw new Error('npm returned no installable versions');
  return { versions, metadata };
}

async function collectMetrics() {
  const metrics = {};
  const downloads = await fetchOptional(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(manifest.name)}`);
  if (Number.isFinite(downloads?.downloads)) metrics.npm_weekly_downloads = downloads.downloads;
  if (githubRepo) {
    const stars = await fetchOptional(`https://api.github.com/repos/${githubRepo[1]}/${githubRepo[2]}`);
    if (Number.isFinite(stars?.stargazers_count)) metrics.github_stars = stars.stargazers_count;
  }
  if (!Number.isFinite(metrics.github_stars)) metrics.github_stars = 0;
  return metrics;
}

const sortKeyDeclarations = {
  npm_weekly_downloads: {
    title: { en: 'Weekly downloads', zh: '周下载量' },
    order: 'desc',
  },
  github_stars: {
    title: { en: 'GitHub stars', zh: 'GitHub 星标' },
    order: 'desc',
  },
};

async function buildIndex() {
  let versions;
  let metrics;
  if (offline) {
    versions = previous.versions ?? [];
    metrics = {
      ...(Number.isFinite(previous.metadata?.sortKeys?.npm_weekly_downloads)
        ? { npm_weekly_downloads: previous.metadata.sortKeys.npm_weekly_downloads }
        : {}),
      ...(Number.isFinite(previous.metadata?.sortKeys?.github_stars)
        ? { github_stars: previous.metadata.sortKeys.github_stars }
        : {}),
    };
    if (versions.length === 0) throw new Error('no versions in the existing index; run without --offline');
  } else {
    const published = await collectPublishedVersions();
    versions = published.versions;
    metrics = await collectMetrics();
  }

  const pluginMetadata = {
    ...(previous.metadata ?? {}),
    category: previous.metadata?.category ?? 'documents',
    labels: previous.metadata?.labels ?? ['review', 'comments'],
    keywords: previous.metadata?.keywords ?? ['documents', 'review', 'suggestions', 'comments', 'markdown'],
  };
  if (Object.keys(metrics).length > 0) {
    pluginMetadata.sortKeys = { ...(previous.metadata?.sortKeys ?? {}), ...metrics };
  }

  return {
    format: 1,
    title: existing.title ?? brand.name,
    description: existing.description ?? brand.description,
    metadata: {
      ...(existing.metadata ?? {}),
      sortKeys: { ...(existing.metadata?.sortKeys ?? {}), ...sortKeyDeclarations },
    },
    plugins: [
      {
        name: manifest.name,
        title: brand.name,
        description: brand.description,
        icon: 'icons/cospace.svg',
        author: manifest.author,
        homepage: manifest.homepage,
        repository: { url: repositoryUrl },
        metadata: pluginMetadata,
        versions,
      },
      ...(existing.plugins ?? []).filter(plugin => plugin.name !== manifest.name),
    ],
  };
}

function validateIndex(index) {
  const problems = [];
  const check = (condition, message) => { if (!condition) problems.push(message); };
  check(index.format === 1, 'format must be 1');
  check(typeof index.title?.en === 'string' && index.title.en.length > 0, 'title.en is required');
  check(Array.isArray(index.plugins) && index.plugins.length > 0, 'plugins must not be empty');
  const names = new Set();
  for (const plugin of index.plugins ?? []) {
    check(typeof plugin.name === 'string' && plugin.name.length > 0, 'plugin name is required');
    check(!names.has(plugin.name), `duplicate plugin ${plugin.name}`);
    names.add(plugin.name);
    check(typeof plugin.icon === 'string', `${plugin.name}: icon is required`);
    const declared = new Set(Object.keys(index.metadata?.sortKeys ?? {}));
    for (const key of Object.keys(plugin.metadata?.sortKeys ?? {})) {
      check(declared.has(key), `${plugin.name}: sort key ${key} is not declared`);
      check(Number.isFinite(plugin.metadata.sortKeys[key]), `${plugin.name}: sort key ${key} must be a finite number`);
    }
    check(Array.isArray(plugin.versions) && plugin.versions.length > 0, `${plugin.name}: versions must not be empty`);
    const seen = new Set();
    for (const version of plugin.versions ?? []) {
      check(semverPattern.test(version.version), `${plugin.name}: invalid version ${version.version}`);
      check(!seen.has(version.version), `${plugin.name}: duplicate version ${version.version}`);
      seen.add(version.version);
      check(Number.isInteger(version.publishTimestamp) && version.publishTimestamp > 0, `${plugin.name}@${version.version}: invalid publishTimestamp`);
      check(version.source?.type === 'npm' || version.source?.type === 'git', `${plugin.name}@${version.version}: invalid source`);
      if (version.source?.type === 'npm' && version.source.registry !== undefined) {
        check(/^https?:\/\//.test(version.source.registry), `${plugin.name}@${version.version}: registry must be an http(s) URL`);
      }
      if (version.engines !== undefined) check(typeof version.engines?.dsh === 'string', `${plugin.name}@${version.version}: engines.dsh must be a string`);
    }
  }
  return problems;
}

async function officialProblems(index) {
  const installDir = process.env.DSH_INSTALL_DIR;
  if (!installDir) return [];
  try {
    const require = createRequire(path.join(installDir, 'package.json'));
    const entry = require.resolve('@deepseek-ai/dsh-plugin-market-index');
    const { parseMarketIndex } = await import(pathToFileURL(entry).href);
    parseMarketIndex(index, indexUrl);
    return [];
  } catch (error) {
    if (error?.code === 'MODULE_NOT_FOUND') return [];
    return [`official validator: ${error.path ?? ''} ${error.reason ?? error.message}`.trim()];
  }
}

try {
  const index = await buildIndex();
  const problems = validateIndex(index);
  problems.push(...await officialProblems(index));

  if (index.plugins?.find(plugin => plugin.name === manifest.name)?.icon) {
    const iconPath = path.join(root, 'market', index.plugins.find(plugin => plugin.name === manifest.name).icon);
    await access(iconPath).catch(() => problems.push(`missing icon file ${path.relative(root, iconPath)}`));
  }

  if (requireCurrent) {
    const listed = index.plugins?.find(plugin => plugin.name === manifest.name)?.versions ?? [];
    if (!listed.some(version => version.version === release.version)) {
      problems.push(`market index does not list the current release ${release.version}`);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) fail(problem);
  } else if (checkOnly) {
    const versions = index.plugins.find(plugin => plugin.name === manifest.name)?.versions?.length ?? 0;
    console.log(`Market index is valid: ${manifest.name}, ${versions} versions, index ${indexUrl}`);
  } else {
    await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`);
    await copyFile(path.join(root, brand.icon), path.join(root, 'market/icons/cospace.svg'));
    const versions = index.plugins.find(plugin => plugin.name === manifest.name)?.versions?.length ?? 0;
    console.log(`Market index synced: ${manifest.name}, ${versions} versions, ${offline ? 'offline' : 'npm registry'}`);
  }
} catch (error) {
  fail(error.message);
}
