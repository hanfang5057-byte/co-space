import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHostApi } from '../../packages/host-api/src/index.js';
import { SpaceService } from '../../packages/review-core/src/space-service.js';
import { createHttpHandler, COSPACE_API_PATH } from '../../packages/transport-http/http-handler.js';
import { createSendTargetResolver } from './server/send-target.js';
import { createUserResolver } from './server/user.js';
import { registerReviewCard } from './server/review-card.js';

export const name = 'dsh-space';
/**
 * Whether the MCP tools this plugin registers are live.
 * @param {object} ctx - host plugin context.
 * @returns {boolean} true when the tool registry already exposes the read tool.
 */
export function mcpReady(ctx) {
  try {
    const tools=ctx.get?.('tools');
    if (!tools || typeof tools.get!=='function') return true;
    return tools.get('mcp__space__space_document_read')!==undefined;
  } catch { return true; }
}

export function resolveHome(ctx) {
  return path.resolve(process.env.DSH_SPACE_HOME || ctx.get('dshHomePath')?.('space') || path.join(process.env.DSH_HOME || path.join(homedir(),'.dsh'),'space'));
}
export function apply(ctx) {
  const home=resolveHome(ctx);
  // One document service backs both the UI API and the review card so a user
  // decision and an Agent read cannot disagree.
  const space=new SpaceService(home);
  ctx.effect(()=>()=>{try{space.close()}catch{}},'dsh-space: document service');
  const env={DSH_SPACE_HOME:home};
  if(process.versions.electron) env.ELECTRON_RUN_AS_NODE='1';
  ctx.inject(['mcpManager'],scope=>{
    scope.effect(()=>scope.mcpManager.register('space',{
      transport:'stdio',command:process.execPath,args:[fileURLToPath(new URL('./server/mcp-entry.js',import.meta.url))],env,toolLoading:'eager',failOnStartupError:false,
    }),'dsh-space: MCP tools');
  });
  ctx.inject(['webServer'],scope=>{
    const api=createHostApi({
      home,
      space,
      status:()=>({mcpReady:mcpReady(ctx)}),
      prompt: async request=>{
        const controller=scope.get('sessionController');
        if(!controller) throw new Error('Session controller unavailable');
        return controller.prompt(request,AbortSignal.timeout(30000));
      },
      getUser:createUserResolver(ctx),
      resolveTarget:createSendTargetResolver(ctx),
    });
    // The host owns admission. A `required` route (the default) applies the
    // Host/Origin source check and the browser credential before this handler
    // runs, passes the admitted Peer as the trailing argument, and fails closed
    // with 503 when no authentication provider can decide. DSH 0.2.2-rc.2
    // removed `connection.requestRejection`, so calling it here threw and every
    // authenticated request answered 503 "无法校验请求来源".
    // `sameOriginGuard:false` keeps admission one-sided: the handler must never
    // re-decide what the host already admitted, so an https or proxied DSH
    // deployment cannot be 403-ed by a same-origin comparison in the handler.
    const dispatch=createHttpHandler(api,{sameOriginGuard:false});
    const handler=(req,res)=>dispatch(req,res);
    // The handler answers exactly this path; an exact route leaves every other
    // path to the host instead of claiming the whole `/cospace-api/*` prefix.
    scope.effect(()=>{const dispose=scope.webServer.register({kind:'exact',path:COSPACE_API_PATH,auth:'required',handler});return ()=>{dispose();api.close();}},'dsh-space: UI API');
  });
  registerReviewCard(ctx,{space});
}
