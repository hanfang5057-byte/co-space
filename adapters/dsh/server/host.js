import { randomUUID } from 'node:crypto';
import { SpaceService, documentWithTitle } from '../../../packages/review-core/src/space-service.js';

/** Host-facing façade. All mutations share the document store used by MCP. */
export function createHostApi({ home, prompt, getUser, resolveTarget }) {
  const space = new SpaceService(home);
  space.markInterruptedUnknown();
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
        return space.deleteDocument(args.docId);
      }
      case 'decide': return space.decide(args);
      case 'listComments': return space.listComments(args.docId);
      case 'createComment': return space.createComment(args);
      case 'deleteComment': return space.deleteComment(args);
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
        const prior = space.findSend(operationId);
        const requestedSessionId = typeof args.sessionId === 'string' && args.sessionId !== '' ? args.sessionId : prior?.sessionId;
        let target;
        if (requestedSessionId) {
          target = { sessionId: requestedSessionId, created: false };
        } else {
          if (typeof resolveTarget !== 'function') throw Object.assign(new Error('当前对话发送能力不可用'), {code:'SESSION_UNAVAILABLE'});
          target = await resolveTarget({ operationId });
          if (!target?.sessionId) throw Object.assign(new Error('无法确定发送对话'), {code:'SESSION_UNAVAILABLE'});
        }
        const prepared = space.prepareSend({ ...args, sessionId: target.sessionId, operationId });
        if (prepared.replay) return {requestId:operationId,status:prepared.status,sessionId:target.sessionId,createdSession:false};
        // Only send the reference and explicit processing instruction. Comment
        // bodies remain in local storage and are read through space_document_read.
        const reference = `space:${encodeURIComponent(args.docId)}`;
        const instruction = '请处理此文档中尚未处理的评论：先调用 space_document_read 读取最新正文、版本和评论，对每条可执行评论逐条提交具体修订建议；完成后调用 space_comment_complete 记录评论与建议 ID 的关联。若评论意图不清，在当前对话中询问用户并暂不标记完成。不要直接修改已有正文，也不要接受或拒绝建议。';
        const text = `${reference}\n${instruction}`;
        try {
          const receipt = await prompt({ requestId: operationId, sessionId: target.sessionId, mode:'queue', content:[{type:'text',text}] });
          if (receipt?.accepted !== true) throw new Error('宿主未确认接收');
          return {
            ...space.finishSend({operationId,status:'sent'}),
            sessionId:target.sessionId,
            createdSession:target.created === true,
            ...(target.workspace ? {workspace:target.workspace} : {}),
          };
        } catch (error) {
          return {
            ...space.finishSend({operationId,status:'unknown',error:error?.message || '发送结果未知'}),
            sessionId:target.sessionId,
            createdSession:target.created === true,
            ...(target.workspace ? {workspace:target.workspace} : {}),
          };
        }
      }
      default: throw Object.assign(new Error('未知操作'),{code:'METHOD_NOT_FOUND'});
    }
  };
  return { dispatch, close() {space.close();} };
}
