/**
 * Read the signed-in DeepSeek account for comment attribution.
 *
 * Only fields the Platform already exposes to the account UI are returned:
 * display name, avatar URL, and whether a grant is stored. Tokens, contact
 * details, and device identifiers stay on the Host. Failures degrade to
 * `null`; comment cards then use their localized fallback author.
 */

import manifest from '../package.json' with { type: 'json' };

const CACHE_MS = 60_000;
// The account call is made by this plugin's own client surface, so its package
// version identifies the caller instead of a stale frozen constant.
const CLIENT_VERSION = manifest.version;
// Only reached when a direct caller supplies no language; the shipped client
// always sends the active UI locale.
const DEFAULT_LOCALE = 'zh';

const safeAvatarUrl = value =>
  typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;

// Only the primary subtag reaches the Platform (`zh-CN` and `zh_CN` are the
// same language), so normalizing here also keeps the cache key honest.
const normalizeLocale = value => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? DEFAULT_LOCALE : text.split(/[-_]/)[0].toLowerCase();
};

/**
 * Build a cached account reader.
 * @param {object} ctx - Host plugin context.
 * @param {object} [options] - Overrides for tests and unusual host builds.
 * @param {string} [options.version] - Account client version sent to the Platform.
 * @param {string} [options.locale] - Language used when a caller supplies none.
 * @returns {(locale?: string) => Promise<{signedIn: boolean, name: string|null, avatarUrl: string|null}|null>} reader.
 */
export function createUserResolver(ctx, options = {}) {
  const version = options.version ?? CLIENT_VERSION;
  const fallbackLocale = options.locale ?? DEFAULT_LOCALE;
  // The Platform localizes its profile payload per language, so a cached value
  // is only reusable for the language it was read with.
  let cached = null;

  return async function currentUser(locale) {
    const language = normalizeLocale(locale ?? fallbackLocale);
    if (cached && cached.language === language && Date.now() - cached.at < CACHE_MS) {
      return cached.value;
    }

    const account = typeof ctx.get === 'function' ? ctx.get('deepseekAccount') : undefined;
    if (!account || typeof account.getState !== 'function' || typeof account.getProfile !== 'function') {
      return null;
    }

    let state;
    try {
      state = await account.getState();
    } catch {
      return null;
    }
    if (state?.status !== 'credential-stored') {
      cached = { at: Date.now(), language, value: null };
      return null;
    }

    let profile = null;
    try {
      profile = await account.getProfile({
        version,
        locale: language,
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      });
    } catch {
      // A stored grant still means the user is signed in even when the profile
      // request is offline. The card can show the generic DeepSeek label.
    }

    const value = {
      signedIn: true,
      name: profile?.status === 'ready' && typeof profile.value?.name === 'string' && profile.value.name.trim()
        ? profile.value.name.trim()
        : null,
      avatarUrl: profile?.status === 'ready' ? safeAvatarUrl(profile.value?.avatarUrl) : null,
    };
    cached = { at: Date.now(), language, value };
    return value;
  };
}
