/** Browser transport to the CoSpace Host HTTP route; every surface shares it. */
import { COSPACE_API_PATH } from '../../transport-http/http-handler.js';

export async function api(method, args = {}) {
  const response = await fetch(COSPACE_API_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw Object.assign(new Error(body.error?.message || 'Request failed'), body.error || { code: 'REQUEST_FAILED' });
  }
  return body.result;
}
