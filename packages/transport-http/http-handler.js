/** Host-neutral JSON HTTP transport for the review UI. */
export const COSPACE_API_PATH = '/cospace-api';

export function createHttpHandler(api) {
  return async (req,res) => {
    if (req.method !== 'POST') { res.writeHead(405,{'content-type':'application/json'});res.end(JSON.stringify({error:{code:'METHOD_NOT_ALLOWED',message:'仅支持 POST'}}));return; }
    try {
      let size=0;const chunks=[];
      for await (const chunk of req) { size+=chunk.length;if(size>1024*1024) throw Object.assign(new Error('请求过大'),{code:'LIMIT_EXCEEDED'}); chunks.push(chunk); }
      const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result=await api.dispatch(input.method,input.args);
      res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify({result}));
    } catch(error) {
      res.writeHead(400,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
      res.end(JSON.stringify({error:{code:error.code || 'INVALID_INPUT',message:error.message || '请求失败',details:error.details}}));
    }
  };
}
