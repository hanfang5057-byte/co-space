#!/usr/bin/env node
/**
 * Enforce the CoSpace theme contract.
 *
 * The contract has three layers and each one has a rule this check can decide
 * mechanically:
 *
 * - `theme/tokens.json` is the only name list. `theme/base.css` may declare
 *   exactly those names, once, with the manifest default.
 * - Component CSS may use literals only for the allowlisted artwork colors and
 *   may read only public tokens (plus third-party variables CoSpace writes).
 * - A host theme file may contain token declarations only, on selectors scoped
 *   to `.cospace-theme`, so a host can restyle but cannot restyle anything that
 *   is not CoSpace.
 *
 * Run with `node scripts/check-theme.mjs`; the test suite calls the exported
 * function so a violation fails `npm run check` as well.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEME_DIR = path.join(ROOT, 'packages/review-ui/src/theme');
/** Component stylesheets that read the contract: shared review UI plus the DSH client's own cards. */
const COMPONENT_CSS = [
  'packages/review-ui/src/space.css',
  'adapters/dsh/client/tool-views.css',
];
const ROOT_COMPONENTS = [
  path.join(ROOT, 'packages/review-ui/src/SpaceApp.jsx'),
  path.join(ROOT, 'packages/review-ui/src/SpaceSidebar.jsx'),
  path.join(ROOT, 'packages/review-ui/src/SpaceReference.jsx'),
  path.join(ROOT, 'adapters/dsh/client/document-picker.jsx'),
  path.join(ROOT, 'adapters/dsh/client/tool-views.jsx'),
];
/** Files that a host owns and that must stay tokens-only. */
const HOST_PACK_CANDIDATES = [
  path.join(ROOT, 'adapters/dsh/client/theme.css'),
];

const NAMED_COLORS = /\b(?:white|black|red|blue|green|gray|grey|orange|purple|yellow|pink|brown|silver|maroon|navy|teal|olive|lime|aqua|fuchsia)\b/;
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\(/;

/** Split declarations while ignoring separators inside parentheses. */
function splitDeclarations(body) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const character of body) {
    if (character === '(') depth += 1;
    if (character === ')') depth = Math.max(0, depth - 1);
    if (character === ';' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += character;
  }
  if (current.trim() !== '') parts.push(current);
  return parts
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const split = part.indexOf(':');
      if (split < 0) return null;
      return { property: part.slice(0, split).trim(), value: part.slice(split + 1).trim() };
    })
    .filter(Boolean);
}

/**
 * Flatten CSS into style rules, tracking at-rule context.
 * @param {string} css - stylesheet text.
 * @returns {Array<{selector: string, context: string[], declarations: Array<{property: string, value: string}>}>}
 */
function parseRules(css) {
  // `@import` carries no declarations; dropping it keeps a leading rule from
  // being absorbed into the import statement's prelude.
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@(?:import|charset)[^;]*;/g, '');
  const rules = [];
  const read = (text, context) => {
    let index = 0;
    while (index < text.length) {
      const open = text.indexOf('{', index);
      if (open < 0) return;
      const prelude = text.slice(index, open).trim();
      // Find the matching close brace for this block.
      let depth = 1;
      let cursor = open + 1;
      while (cursor < text.length && depth > 0) {
        if (text[cursor] === '{') depth += 1;
        if (text[cursor] === '}') depth -= 1;
        cursor += 1;
      }
      const body = text.slice(open + 1, cursor - 1);
      const keyword = prelude.split(/[\s(]/)[0];
      if (keyword.startsWith('@')) {
        if (keyword === '@keyframes' || keyword === '@font-face') {
          // Step selectors and font descriptors are not component selectors.
        } else {
          read(body, [...context, prelude]);
        }
      } else {
        rules.push({ selector: prelude, context, declarations: splitDeclarations(body) });
      }
      index = cursor;
    }
  };
  read(source, []);
  return rules;
}

const normalize = value => value.replace(/\s+/g, ' ').trim();

function tokenName(property, prefix) {
  return property.startsWith(prefix) ? property.slice(prefix.length) : null;
}

/**
 * Check one stylesheet for literal colors the manifest does not allow.
 * @returns {string[]} problems.
 */
function checkLiterals(file, rules, { artwork, allow }) {
  const problems = [];
  for (const rule of rules) {
    for (const { property, value } of rule.declarations) {
      if (!LITERAL_COLOR.test(value) && !NAMED_COLORS.test(value)) continue;
      let remainder = value;
      for (const color of artwork) remainder = remainder.replaceAll(color, '');
      remainder = remainder.replaceAll('transparent', '').replaceAll('currentColor', '').replaceAll('inherit', '');
      if (!LITERAL_COLOR.test(remainder) && !NAMED_COLORS.test(remainder)) continue;
      if (allow?.({ rule, property, value })) continue;
      problems.push(`${file}: ${rule.selector} { ${property}: ${value} } uses a literal color; read a --cospace-* token instead`);
    }
  }
  return problems;
}

function checkVarReads(file, rules, { tokens, thirdParty }) {
  const problems = [];
  for (const rule of rules) {
    for (const { property, value } of rule.declarations) {
      for (const match of value.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
        const name = match[1];
        // Runtime-set custom properties (tooltip coordinates, third-party editor
        // variables) are not theme inputs; only the CoSpace namespace is checked.
        if (!name.startsWith('--cospace-')) continue;
        if (!tokens.has(name)) problems.push(`${file}: ${rule.selector} reads ${name}, which is not a public theme token`);
      }
      if (property.startsWith('--space-')) {
        problems.push(`${file}: ${rule.selector} declares ${property}; the internal --space-* namespace is retired`);
      }
    }
  }
  return problems;
}

function checkSelectors(file, rules) {
  const problems = [];
  for (const rule of rules) {
    if (rule.context.length > 0) continue;
    for (const selector of rule.selector.split(',')) {
      const trimmed = selector.trim();
      if (trimmed === '') continue;
      const first = trimmed.split(/\s+/)[0];
      if (/^(?::root|html|body|\*)$/.test(first) || (!first.startsWith('.') && !first.startsWith('[') && !first.includes('.'))) {
        problems.push(`${file}: selector "${trimmed}" is not scoped to a CoSpace class`);
      }
    }
  }
  return problems;
}

async function readIfPresent(file) {
  try {
    return await readFile(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Run every contract check.
 * @param {{root?: string}} [options] - repository root override for tests.
 * @returns {Promise<{problems: string[], manifest: object}>} problems and the manifest used.
 */
export async function checkTheme({ root = ROOT } = {}) {
  const manifestPath = path.join(root, 'packages/review-ui/src/theme/tokens.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const prefix = manifest.prefix;
  const publicTokens = new Set(Object.keys(manifest.tokens).map(name => `${prefix}${name}`));
  const thirdParty = manifest.thirdPartyVars ?? [];
  const artwork = manifest.artwork?.colors ?? [];
  const problems = [];

  const basePath = path.join(root, 'packages/review-ui/src/theme/base.css');
  const baseCss = await readFile(basePath, 'utf8');
  const baseRules = parseRules(baseCss);

  for (const rule of baseRules) {
    if (rule.context.length > 0) continue;
    if (rule.selector.trim() !== `:where(.${manifest.rootClass})`) {
      problems.push(`theme/base.css: default block must be ":where(.${manifest.rootClass})", found "${rule.selector.trim()}"`);
    }
  }

  const declared = new Map();
  for (const rule of baseRules) {
    for (const { property, value } of rule.declarations) {
      if (!property.startsWith(prefix)) {
        problems.push(`theme/base.css: ${property} is outside the ${prefix} namespace`);
        continue;
      }
      if (declared.has(property)) problems.push(`theme/base.css: ${property} is declared more than once`);
      declared.set(property, normalize(value));
    }
  }
  for (const [name, definition] of Object.entries(manifest.tokens)) {
    const property = `${prefix}${name}`;
    if (!declared.has(property)) {
      problems.push(`theme/base.css: missing default for ${property}`);
      continue;
    }
    if (declared.get(property) !== normalize(definition.default)) {
      problems.push(`theme/base.css: ${property} default "${declared.get(property)}" does not match tokens.json "${normalize(definition.default)}"`);
    }
  }
  for (const property of declared.keys()) {
    if (!publicTokens.has(property)) problems.push(`theme/base.css: ${property} is not listed in tokens.json`);
  }

  const sharedCss = 'packages/review-ui/src/space.css';
  // `!important` is known debt: it only survives where CoSpace must override
  // host or embedded-editor markup. The allowlist may shrink, never grow.
  const importantAllow = /(?:milkdown|suggestion-balloon|annotation-balloon|dialog-close|dialog-content|home-card-open|is-hover-preview|space-app \*|reduced-motion)/;
  for (const relative of COMPONENT_CSS) {
    const css = await readIfPresent(path.join(root, relative));
    if (css === null) {
      problems.push(`${relative}: missing component stylesheet`);
      continue;
    }
    const rules = parseRules(css);
    problems.push(...checkLiterals(relative, rules, { artwork }));
    problems.push(...checkVarReads(relative, rules, { tokens: publicTokens, thirdParty }));
    problems.push(...checkSelectors(relative, rules));
    if (relative !== sharedCss) continue;
    for (const rule of rules) {
      for (const { property, value } of rule.declarations) {
        if (!value.includes('!important')) continue;
        if (importantAllow.test(rule.selector) || rule.context.some(context => importantAllow.test(context))) continue;
        problems.push(`${relative}: ${rule.selector} uses !important outside the documented allowlist`);
      }
    }
  }

  for (const file of HOST_PACK_CANDIDATES.map(candidate => path.relative(root, candidate))) {
    const absolute = path.join(root, file);
    const css = await readIfPresent(absolute);
    if (css === null) continue;
    const rules = parseRules(css);
    for (const rule of rules) {
      for (const selector of rule.selector.split(',')) {
        const trimmed = selector.trim();
        if (!trimmed.includes(`.${manifest.rootClass}`)) {
          problems.push(`${file}: selector "${trimmed}" must be scoped to .${manifest.rootClass}`);
        }
        if (/^(?::root|html|body)(?!.*\.)/.test(trimmed)) {
          problems.push(`${file}: selector "${trimmed}" must target .${manifest.rootClass}, not the document root`);
        }
      }
      for (const { property, value } of rule.declarations) {
        if (!property.startsWith(prefix)) {
          problems.push(`${file}: ${rule.selector} sets ${property}; host packs may set ${prefix}* tokens only`);
        } else if (!publicTokens.has(property)) {
          problems.push(`${file}: ${rule.selector} sets ${property}, which is not a public theme token`);
        }
        if (value.includes('!important')) problems.push(`${file}: ${property} uses !important`);
        if (LITERAL_COLOR.test(value) && !property.startsWith(prefix)) {
          problems.push(`${file}: ${property} uses a literal color`);
        }
      }
    }
  }

  for (const component of ROOT_COMPONENTS) {
    const relative = path.relative(root, component);
    const source = await readIfPresent(component);
    if (source === null) {
      problems.push(`${relative}: missing root component`);
      continue;
    }
    if (!source.includes('themeRootProps(')) {
      problems.push(`${relative}: themed roots must call themeRootProps() so the marker and surface attribute stay in one place`);
    }
  }

  return { problems, manifest };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const { problems, manifest } = await checkTheme();
  if (problems.length > 0) {
    console.error(`CoSpace theme contract v${manifest.version}: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
  } else {
    console.log(`CoSpace theme contract v${manifest.version}: ok (${Object.keys(manifest.tokens).length} tokens)`);
  }
}
