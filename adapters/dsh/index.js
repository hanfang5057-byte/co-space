import path from 'node:path';
import { fileURLToPath } from 'node:url';
import z from '@deepseek-ai/schemastery';
import { createHostApi } from '../../packages/host-api/src/index.js';
import { SpaceService } from '../../packages/review-core/src/space-service.js';
import { CollaborationStore } from '../../packages/review-core/src/collaboration-store.js';
import { createHttpHandler, COSPACE_API_PATH } from '../../packages/transport-http/http-handler.js';
import { createToolSpecs, TOOL_GUIDANCE } from '../../packages/transport-mcp/handlers.js';
import { createSendTargetResolver } from './server/send-target.js';
import { createUserResolver } from './server/user.js';
import { registerReviewCard } from './server/review-card.js';
import { toToolDefinition } from './server/native-tools.js';
import { adoptLegacyHome, resolveSpaceHome } from './server/migration.js';
import { dshSpaceResourceFor } from './client/resource-reference.js';

export const name = 'dsh-space';
/** Agent tools live on the host tool registry; the plugin is meaningless without it. */
export const inject = ['tools'];

/**
 * Data directory for CoSpace documents. `home` chooses the directory holding
 * review.sqlite; when unset the DSH data home (`$DSH_HOME/space`) is used.
 */
export const Config = z.object({
  home: z.string(),
});

export function apply(ctx, config) {
  const home = resolveSpaceHome(config);
  // One document service backs the UI API, the review card, and the agent
  // tools, so a user decision and an Agent read cannot disagree.
  const space = new SpaceService(home);
  const collaboration = new CollaborationStore(home);
  ctx.effect(() => () => {
    try { collaboration.close(); } catch { /* draining best effort */ }
    try { space.close(); } catch { /* draining best effort */ }
  }, 'dsh-space: document service');
  void adoptLegacyHome(ctx, config);
  // Agent tools register synchronously at activation: the review page can rely
  // on their availability without a readiness probe.
  ctx.effect(() => {
    const disposers = [];
    for (const [toolName, spec] of createToolSpecs(space, collaboration, { documentLinkFor: dshSpaceResourceFor })) {
      disposers.push(ctx.tools.register(toToolDefinition(toolName, spec)));
    }
    return () => { for (const dispose of disposers.reverse()) dispose?.(); };
  }, 'dsh-space: agent tools');
  ctx.inject(['systemPrompt'], scope => {
    scope.effect(() => scope.systemPrompt.section({
      name: 'cospace',
      order: scope.systemPrompt.getSectionOrder('MCP_SERVERS'),
      text: TOOL_GUIDANCE,
    }), 'dsh-space: tool guidance');
  });
  ctx.inject(['webServer'], scope => {
    const api = createHostApi({
      home,
      space,
      collaboration,
      prompt: async request => {
        const controller = scope.get('sessionController');
        if (!controller) throw new Error('Session controller unavailable');
        return controller.prompt(request, AbortSignal.timeout(30000));
      },
      getUser: createUserResolver(ctx),
      resolveTarget: createSendTargetResolver(ctx),
    });
    // The host owns admission. A `required` route (the default) applies the
    // Host/Origin source check and the browser credential before this handler
    // runs, passes the admitted Peer as the trailing argument, and fails closed
    // with 503 when no authentication provider can decide.
    // `sameOriginGuard:false` keeps admission one-sided: the handler must never
    // re-decide what the host already admitted, so an https or proxied DSH
    // deployment cannot be 403-ed by a same-origin comparison in the handler.
    const dispatch = createHttpHandler(api, { sameOriginGuard: false });
    const handler = (req, res) => dispatch(req, res);
    // The handler answers exactly this path; an exact route leaves every other
    // path to the host instead of claiming the whole `/cospace-api/*` prefix.
    scope.effect(() => {
      const dispose = scope.webServer.register({ kind: 'exact', path: COSPACE_API_PATH, auth: 'required', handler });
      return () => { dispose(); api.close(); };
    }, 'dsh-space: UI API');
  });
  registerReviewCard(ctx, { space });
}
