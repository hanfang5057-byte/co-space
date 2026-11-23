import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const release = JSON.parse(await readFile(path.join(root, 'release/npm-version.json'), 'utf8'));
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export const localBuildVersion = `${release.version}+local.${stamp}`;
