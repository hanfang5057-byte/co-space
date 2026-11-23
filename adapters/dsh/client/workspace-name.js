/** Return the workspace explicitly containing a session, if the host lists one. */
export function workspaceNameForSession(workspaces, sessionId) {
  if (!sessionId || !Array.isArray(workspaces)) return null;
  const workspace=workspaces.find(item=>Array.isArray(item?.sessionIds) && item.sessionIds.includes(sessionId));
  return typeof workspace?.title==='string' && workspace.title.trim() ? workspace.title.trim() : null;
}
