import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHostApi } from '../../packages/host-api/src/index.js';
import { createHttpHandler, COSPACE_API_PATH } from '../../packages/transport-http/http-handler.js';
import { createSendTargetResolver } from './server/send-target.js';
import { createUserResolver } from './server/user.js';

export const name = 'dsh-space';
export function resolveHome(ctx) {
  return path.resolve(process.env.DSH_SPACE_HOME || ctx.get('dshHomePath')?.('space') || path.join(process.env.DSH_HOME || path.join(homedir(),'.dsh'),'space'));
}
export function apply(ctx) {
  const home=resolveHome(ctx);
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
      prompt: async request=>{
        const controller=scope.get('sessionController');
        if(!controller) throw new Error('Session controller unavailable');
        return controller.prompt(request,AbortSignal.timeout(30000));
      },
      getUser:createUserResolver(ctx),
      resolveTarget:createSendTargetResolver(ctx),
    });
    const dispatch=createHttpHandler(api);
    const respond=(res,status,code,message)=>{
      res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
      res.end(JSON.stringify({error:{code,message}}));
    };
    const handler=(req,res)=>{
      const connection=scope.get('connection');
      if(!connection){respond(res,503,'UNAVAILABLE','宿主连接服务不可用');return;}
      let rejection;
      try{rejection=connection.requestRejection({headers:req.headers});}
      catch{respond(res,503,'UNAVAILABLE','无法校验请求来源');return;}
      if(rejection){respond(res,rejection,rejection===401?'UNAUTHORIZED':'FORBIDDEN','请求未通过宿主访问检查');return;}
      return dispatch(req,res);
    };
    scope.effect(()=>{const dispose=scope.webServer.register({kind:'prefix',path:COSPACE_API_PATH,handler});return ()=>{dispose();api.close();}},'dsh-space: UI API');
  });
}
