/**
 * The CoSpace host theme contract: one namespaced set of CSS custom properties
 * that a host sets on `.cospace-theme` to restyle every review surface.
 *
 * The contract is CSS-first. A host that can ship a stylesheet needs only the
 * names in `tokens.json`; a host that cannot (a WebView without a stylesheet
 * hook, for example) passes a `theme` object to a root component and this
 * module turns it into inline custom properties, which win over any stylesheet.
 *
 * Only public tokens are writable. `--space-*`-style internal variables no
 * longer exist: components read `--cospace-*` directly, so there is exactly one
 * namespace to document, check, and override.
 */
import tokens from './tokens.json' with { type: 'json' };

/** Version of the published token contract. Additive changes keep it; renames bump it. */
export const THEME_CONTRACT_VERSION = tokens.version;

/** Marker class every themed root must carry. */
export const ROOT_CLASS = tokens.rootClass;

/** Attribute naming the surface variant a root renders. */
export const SURFACE_ATTRIBUTE = tokens.surfaceAttribute;

/** Surface variants a root may declare. */
export const SURFACES = Object.freeze([...tokens.surfaces]);

/** Every public token, with its `--cospace-` prefix, in manifest order. */
export const PUBLIC_TOKENS = Object.freeze(
  Object.keys(tokens.tokens).map(name => `${tokens.prefix}${name}`),
);

/** Tokens a host must be able to set for a usable palette. */
export const REQUIRED_TOKENS = Object.freeze(
  Object.entries(tokens.tokens)
    .filter(([, definition]) => definition.required)
    .map(([name]) => `${tokens.prefix}${name}`),
);

/** Fixed agent identity artwork colors; not part of the theme contract. */
export const ARTWORK_COLORS = Object.freeze([...tokens.artwork.colors]);

/** Variable namespaces owned by third-party components CoSpace writes into. */
export const THIRD_PARTY_VARS = Object.freeze([...tokens.thirdPartyVars]);

const known = new Set(PUBLIC_TOKENS);

/** Whether `name` is a public token in the current contract. */
export function isPublicToken(name) {
  return known.has(name);
}

/**
 * Accept either the short manifest name (`accent`) or the full custom property
 * (`--cospace-accent`) and return the full property name.
 * @param {string} name - token name.
 * @returns {string} the custom property name.
 * @throws {TypeError} when the token is not part of the contract.
 */
export function tokenProperty(name) {
  const property = typeof name === 'string' && name.startsWith(tokens.prefix)
    ? name
    : `${tokens.prefix}${String(name)}`;
  if (!known.has(property)) throw new TypeError(`Unknown CoSpace theme token: ${String(name)}`);
  return property;
}

/**
 * Turn a token map into an inline style object for a themed root.
 * @param {Record<string, string>} [properties] - short or full token names to values.
 * @returns {Record<string, string>} custom properties safe to spread into `style`.
 * @throws {TypeError} on an unknown token or a value that could escape the declaration.
 */
export function themeStyle(properties = {}) {
  const style = {};
  for (const [name, value] of Object.entries(properties)) {
    const property = tokenProperty(name);
    if (typeof value !== 'string' || value === '' || /[;{}]/.test(value)) {
      throw new TypeError(`Invalid value for ${property}`);
    }
    style[property] = value;
  }
  return style;
}

/**
 * Validate a host's `theme` prop into the three fields a root applies.
 * @param {{tokens?: Record<string, string>, surface?: string, className?: string}} [theme] - host theme.
 * @returns {{style: Record<string, string>, surface: string|undefined, className: string}}
 */
export function normalizeTheme(theme = {}) {
  const surface = theme.surface ?? undefined;
  if (surface !== undefined && !SURFACES.includes(surface)) {
    throw new TypeError(`Unknown CoSpace surface: ${String(surface)}`);
  }
  return {
    style: themeStyle(theme.tokens ?? {}),
    surface,
    className: typeof theme.className === 'string' ? theme.className.trim() : '',
  };
}

/**
 * Root attributes for one themed surface: the marker class, the surface
 * variant, and the host class and inline tokens when supplied.
 * @param {string} surface - one of {@link SURFACES}.
 * @param {{className?: string, tokens?: Record<string, string>}} [options] - host overrides.
 * @returns {{className: string, [SURFACE_ATTRIBUTE]: string, style?: Record<string, string>}}
 */
export function themeRootProps(surface, options = {}) {
  if (!SURFACES.includes(surface)) throw new TypeError(`Unknown CoSpace surface: ${String(surface)}`);
  const className = [ROOT_CLASS, options.className].filter(Boolean).join(' ');
  const style = options.tokens === undefined ? undefined : themeStyle(options.tokens);
  return {
    className,
    [SURFACE_ATTRIBUTE]: surface,
    ...(style === undefined ? {} : { style }),
  };
}
