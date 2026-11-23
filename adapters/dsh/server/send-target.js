/**
 * Resolve the conversation that receives a comment batch.
 *
 * The UI normally passes the conversation the user is already in. When the
 * Space page is open without a conversation, sending must not silently fail:
 * reuse the most recently active Workspace, create the default Workspace when
 * the installation has none, and create (or reuse) a blank Session there.
 * The returned identity is the exact Session the comments were sent to, so
 * the UI can open it after a successful send.
 */

const TARGET_TIMEOUT_MS = 15_000;

const fail = (code, message, details) => {
  throw Object.assign(new Error(message), { code, details });
};

const workspaceIdOf = workspace => workspace?.workspaceId ?? workspace?.id;

const workspaceScore = (workspace, sessionsById) => {
  const sessionScore = (workspace?.sessionIds ?? []).reduce((latest, id) => {
    const updatedAt = sessionsById.get(id)?.updatedAt;
    return Number.isFinite(updatedAt) ? Math.max(latest, updatedAt) : latest;
  }, 0);
  // Session activity decides the winner; registry timestamps only break ties
  // between Workspaces that have no known session activity.
  if (sessionScore > 0) return sessionScore;
  const workspaceTime = Date.parse(workspace?.updatedAt ?? '');
  return Number.isFinite(workspaceTime) ? workspaceTime : 0;
};

/** Pick the Workspace with the newest session activity, then the newest row. */
export function mostRecentWorkspace(workspaces, sessions) {
  const sessionsById = new Map((sessions ?? []).map(session => [session.sessionId, session]));
  let selected;
  let selectedScore = -Infinity;
  for (const workspace of workspaces ?? []) {
    const score = workspaceScore(workspace, sessionsById);
    if (score > selectedScore) {
      selected = workspace;
      selectedScore = score;
    }
  }
  return selected;
}

/** The most recent session directory, used to register a Workspace when none exists. */
export function mostRecentSessionDirectory(sessions) {
  return [...(sessions ?? [])]
    .filter(session => typeof session?.cwd === 'string' && session.cwd !== '')
    .sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0))[0]?.cwd;
}

async function loadSessions(sessionController, signal) {
  if (typeof sessionController?.list !== 'function') return [];
  const value = await sessionController.list({}, signal);
  return Array.isArray(value?.items) ? value.items : [];
}

async function assertSessionExists(sessionController, sessionId, signal) {
  if (typeof sessionController?.state !== 'function') return;
  try {
    await sessionController.state({ sessionId }, signal);
  } catch (error) {
    fail('SESSION_UNAVAILABLE', '当前对话不可用，请重新打开文档后再发送。', { sessionId, cause: error?.message });
  }
}

/** Create or reuse a blank Session already listed in the selected Workspace. */
async function createSessionInWorkspace(sessionController, workspace, sessions, excludeSessionId, forceNew) {
  const request = { workspaceId: workspaceIdOf(workspace) };
  const blank = !forceNew && (sessions ?? []).find(session =>
    session?.blank === true && session.sessionId !== excludeSessionId
    && session.cwd === workspace.path
    && (workspace.sessionIds ?? []).includes(session.sessionId));
  if (blank) {
    try { return await sessionController.create({ ...request, sessionId: blank.sessionId }); }
    catch { /* A stale blank is not a dead end; create a fresh Session below. */ }
  }
  return sessionController.create(request);
}

/**
 * Resolve one send target.
 * @param {{sessionId?: string}} request - conversation explicitly selected by the caller.
 * @param {object} services - live DSH Host services for sessions and Workspaces.
 * @param {AbortSignal} [signal] - caller lifetime.
 * @returns {Promise<{sessionId: string, created: boolean, workspace?: object}>} target identity.
 */
export async function resolveSendTarget({ sessionId, excludeSessionId, forceNew } = {}, services, signal) {
  const sessionController = services?.sessionController;
  if (!sessionController) fail('SESSION_UNAVAILABLE', '当前对话服务不可用。');

  const lifetime = signal ?? AbortSignal.timeout(TARGET_TIMEOUT_MS);
  if (typeof sessionId === 'string' && sessionId !== '') {
    await assertSessionExists(sessionController, sessionId, lifetime);
    return { sessionId, created: false };
  }

  const sessions = await loadSessions(sessionController, lifetime);
  let workspaces = [];
  try {
    workspaces = services?.workspaceRegistry?.list?.() ?? [];
  } catch {
    workspaces = [];
  }

  let workspace = (excludeSessionId && workspaces.find(item => (item.sessionIds ?? []).includes(excludeSessionId))) || mostRecentWorkspace(workspaces, sessions);
  if (!workspace && typeof services?.workspaceController?.initializeDefault === 'function') {
    try {
      const initialized = await services.workspaceController.initializeDefault(lifetime);
      workspace = initialized?.workspace;
    } catch {
      // A failed first-use lookup falls through to the recent directory.
    }
  }

  if (!workspace) {
    // An installation can have sessions but no registered Workspace. Adopt the
    // directory those sessions already use instead of asking the user to choose.
    const path = mostRecentSessionDirectory(sessions) ?? services?.workingDirectory?.defaultDirectory;
    if (typeof path === 'string' && path !== '' && typeof services?.workspaceController?.create === 'function') {
      try {
        const created = await services.workspaceController.create({ path });
        workspace = created?.workspace;
      } catch {
        // Creating a Workspace is best effort; the Session may still be creatable
        // from the directory below when the Workspace services are unavailable.
      }
    }
  }

  if (workspace) {
    try {
      const created = await createSessionInWorkspace(sessionController, workspace, sessions, excludeSessionId, forceNew);
      if (typeof created?.sessionId !== 'string' || created.sessionId === '') {
        fail('SESSION_UNAVAILABLE', '无法新建对话。');
      }
      if (excludeSessionId && created.sessionId === excludeSessionId) fail('SESSION_UNAVAILABLE', '无法创建不同于当前对话的新对话。');
      return {
        sessionId: created.sessionId,
        created: true,
        workspace: {
          workspaceId: workspaceIdOf(workspace),
          title: workspace.title ?? null,
          path: workspace.path ?? null,
        },
      };
    } catch (error) {
      if (error?.code === 'SESSION_UNAVAILABLE') throw error;
      fail('SESSION_UNAVAILABLE', `无法新建对话：${error?.message || '工作区不可用'}`, { cause: error?.message });
    }
  }

  // Older or minimal hosts may have no Workspace services. A Session still
  // needs one directory; use the deployment default before giving up.
  const cwd = mostRecentSessionDirectory(sessions) ?? services?.workingDirectory?.defaultDirectory;
  if (typeof cwd === 'string' && cwd !== '') {
    try {
      const created = await sessionController.create({ cwd });
      if (typeof created?.sessionId === 'string' && created.sessionId !== '') {
        if (excludeSessionId && created.sessionId === excludeSessionId) fail('SESSION_UNAVAILABLE', '无法创建不同于当前对话的新对话。');
        return { sessionId: created.sessionId, created: true };
      }
    } catch (error) {
      fail('SESSION_UNAVAILABLE', `无法新建对话：${error?.message || '目录不可用'}`, { cause: error?.message });
    }
  }

  fail('SESSION_UNAVAILABLE', '没有可用的工作区，无法新建对话。请先打开或新建一个工作区。');
}

/**
 * Build a lazy resolver for the Host plugin. Services are read at request time
 * so the UI route does not depend on activation order.
 * @param {object} ctx - Host plugin context.
 * @returns {(request?: {sessionId?: string}) => Promise<object>} resolver.
 */
export function createSendTargetResolver(ctx) {
  const get = name => (typeof ctx.get === 'function' ? ctx.get(name) : undefined);
  return request => resolveSendTarget(request, {
    sessionController: get('sessionController'),
    workspaceRegistry: get('workspaceRegistry'),
    workspaceController: get('workspaceController'),
    workingDirectory: get('workingDirectory'),
  });
}
