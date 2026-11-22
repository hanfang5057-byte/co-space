import { randomUUID } from 'node:crypto';
import { CommentStore } from '../src/comments.js';
import { SpaceService, documentWithTitle } from '../src/space-service.js';
import path from 'node:path';

/** Host-facing façade. All mutations share the document store used by MCP. */
export function createHostApi({ home, prompt, getUser, resolveTarget }) {
  const space = new SpaceService(home);
  const comments = new CommentStore(path.join(home, 'review.sqlite'));
  comments.markInterruptedUnknown();
  const dispatch = async (method, args = {}) => {
    switch (method) {
      case 'listSpaces': return space.listSpaces();
      case 'listDocuments': return space.listDocuments();
      case 'createDocument': {
        // The caller's operation id also names the document, so a retried
        // creation replays its stored result instead of adding another file.
        const operationId = typeof args.operationId === 'string' && args.operationId ? args.operationId : randomUUID();
        const title = typeof args.title === 'string' ? args.title.trim() : '';
        if (!title) throw Object.assign(new Error('Title required'), { code: 'INVALID_INPUT' });
        return space.createDocument({ id: `doc-${operationId}`.slice(0, 200), content: documentWithTitle(title), operationId });
      }
      case 'readDocument': return space.readDocument(args.docId);
      case 'deleteDocument': {
        space.readDocument(args.docId);
        comments.deleteDocument(args.docId);
        return space.deleteDocument(args.docId);
      }
      case 'decide': return space.decide(args);
      case 'listComments': return comments.list(args.docId);
      case 'createComment': return comments.create(args);
      case 'deleteComment': return comments.delete(args);
      case 'getUser': {
        // Account reads are optional: an installation without the account
        // plugin simply has no signed-in identity to show on comment cards.
        if (typeof getUser !== 'function') return null;
        try { return await getUser(); } catch { return null; }
      }
      case 'sendComments': {
        // Only an explicit UI action enters this method. Request IDs survive retries;
        // an uncertain outcome is never silently resent.
        if (typeof prompt !== 'function') throw Object.assign(new Error('当前对话发送能力不可用'), {code:'SESSION_UNAVAILABLE'});
        const operationId = args.operationId || randomUUID();
        // A retry of the same operation must reuse the conversation recorded by
        // the first attempt, not resolve a different recent conversation.
        const prior = comments.findSend(operationId);
        const requestedSessionId = typeof args.sessionId === 'string' && args.sessionId !== '' ? args.sessionId : prior?.sessionId;
        let target;
        if (requestedSessionId) {
          target = { sessionId: requestedSessionId, created: false };
        } else {
          if (typeof resolveTarget !== 'function') throw Object.assign(new Error('当前对话发送能力不可用'), {code:'SESSION_UNAVAILABLE'});
          target = await resolveTarget({ operationId });
          if (!target?.sessionId) throw Object.assign(new Error('无法确定发送对话'), {code:'SESSION_UNAVAILABLE'});
        }
        const prepared = comments.prepareSend({ ...args, sessionId: target.sessionId, operationId });
        if (prepared.replay) return {requestId:operationId,status:prepared.status,sessionId:target.sessionId,createdSession:false};
        // Lead with the protocol reference so the conversation renders the
        // document card and the Agent can resolve the same id. The document id
        // appears once, in that reference; comment ids stay internal because no
        // Agent tool consumes them.
        const reference = `space:${encodeURIComponent(args.docId)}`;
        const instruction = '请先使用 space_document_read 读取该文档的最新正文和版本，再针对以下评论逐条提出具体修订建议；每条评论形成一个独立建议，不要直接修改已有正文。';
        const commentLines = prepared.comments.map((c, i) => `\n评论 ${i + 1}\n引用${c.stale ? '（位置已失效，请按最新正文重新定位）' : ''}：${c.quote}\n意见：${c.body}`).join('\n');
        const text = `${reference}\n${instruction}\n${commentLines}`;
        try {
          const receipt = await prompt({ requestId: operationId, sessionId: target.sessionId, mode:'queue', content:[{type:'text',text}] });
          if (receipt?.accepted !== true) throw new Error('宿主未确认接收');
          return {
            ...comments.finishSend({operationId,status:'sent'}),
            sessionId:target.sessionId,
            createdSession:target.created === true,
            ...(target.workspace ? {workspace:target.workspace} : {}),
          };
        } catch (error) {
          return {
            ...comments.finishSend({operationId,status:'unknown',error:error?.message || '发送结果未知'}),
            sessionId:target.sessionId,
            createdSession:target.created === true,
            ...(target.workspace ? {workspace:target.workspace} : {}),
          };
        }
      }
      default: throw Object.assign(new Error('未知操作'),{code:'METHOD_NOT_FOUND'});
    }
  };
  return { dispatch, close() {comments.close();space.close();} };
}

/** HTTP transport for the browser UI. */
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
