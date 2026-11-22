/** Browser transport to the plugin's Host HTTP route; every surface shares it. */
export async function api(method, args = {}) {
  const response = await fetch('/dsh-space-api', {
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
