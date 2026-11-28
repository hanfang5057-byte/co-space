import { readFile, writeFile } from 'node:fs/promises';
import { desktopSkill } from '../packages/agent-contract/src/index.js';

const file = new URL('../apps/desktop/src/agent/skill/SKILL.md', import.meta.url);
const content = desktopSkill();
if (process.argv.includes('--check')) {
  const actual = await readFile(file, 'utf8');
  if (actual !== content) throw new Error('Generated Desktop Agent Skill is stale; run node scripts/build-agent-skill.mjs');
} else {
  await writeFile(file, content);
}
