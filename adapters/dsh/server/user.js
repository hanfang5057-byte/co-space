/**
 * Read the signed-in DeepSeek account for comment attribution.
 *
 * Only fields the Platform already exposes to the account UI are returned:
 * display name, avatar URL, and whether a grant is stored. Tokens, contact
 * details, and device identifiers stay on the Host. Failures degrade to
 * `null`; comment cards then use their localized fallback author.
 */

const CACHE_MS = 60_000;
const CLIENT_VERSION = '0.1.0';

const safeAvatarUrl = value =>
  typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;

/**
 * Build a cached account reader.
 * @param {object} ctx - Host plugin context.
 * @returns {() => Promise<{signedIn: boolean, name: string|null, avatarUrl: string|null}|null>} reader.
 */
export function createUserResolver(ctx) {
  let cachedAt = 0;
  let cachedValue = null;

  return async function currentUser() {
    if (Date.now() - cachedAt < CACHE_MS) return cachedValue;

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
      cachedAt = Date.now();
      cachedValue = null;
      return null;
    }

    let profile = null;
    try {
      profile = await account.getProfile({
        version: CLIENT_VERSION,
        locale: 'zh_CN',
        timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
      });
    } catch {
      // A stored grant still means the user is signed in even when the profile
      // request is offline. The card can show the generic DeepSeek label.
    }

    cachedAt = Date.now();
    cachedValue = {
      signedIn: true,
      name: profile?.status === 'ready' && typeof profile.value?.name === 'string' && profile.value.name.trim()
        ? profile.value.name.trim()
        : null,
      avatarUrl: profile?.status === 'ready' ? safeAvatarUrl(profile.value?.avatarUrl) : null,
    };
    return cachedValue;
  };
}
