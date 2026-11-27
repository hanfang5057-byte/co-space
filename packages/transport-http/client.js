/** Browser transport to the CoSpace Host HTTP route; every surface shares it. */
import { COSPACE_API_PATH } from './http-handler.js';

/** Map a non-JSON Host rejection to the code the UI localizes. */
function rejectionCode(status) {
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 503) return 'UNAVAILABLE';
  return 'REQUEST_FAILED';
}

export async function api(method, args = {}, options = {}) {
  const token = window.__COSPACE_LOCAL_TOKEN__;
  const response = await fetch(COSPACE_API_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-cospace-token': token } : {}) },
    body: JSON.stringify({ method, args }),
    ...(options.signal ? { signal: options.signal } : {}),
  });
  // Host admission answers a rejected request with plain text, not the API's
  // JSON envelope; parse once so the caller still receives an explicit code.
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!response.ok || body?.error) {
    const error = body?.error ?? { code: rejectionCode(response.status), message: text || `HTTP ${response.status}` };
    throw Object.assign(new Error(error.message || 'Request failed'), error);
  }
  if (body === null) {
    throw Object.assign(new Error('Request failed'), { code: 'REQUEST_FAILED' });
  }
  return body.result;
}
