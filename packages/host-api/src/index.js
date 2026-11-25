import { randomUUID } from 'node:crypto';
import { commentProcessingPrompt } from '@cospace/adapter-contract/prompts';
import { SpaceService, documentWithTitle } from '../../review-core/src/space-service.js';
import { CollaborationStore } from '../../review-core/src/collaboration-store.js';

/** Host-facing façade. All mutations share the document store used by MCP. */
export function createHostApi({ home, prompt, getUser, resolveTarget }) {
  const space = new SpaceService(home);
  const collaboration = new CollaborationStore(home);
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
      case 'readCollaboration': return collaboration.readInstructions(args.docId);
      case 'saveInstructions': return collaboration.saveInstructions(args);
      case 'deleteDocument': {
        const result=space.deleteDocument(args.docId);collaboration.deleteDocument(args.docId);return result;
      }
      case 'decide': return space.decide(args);
      case 'updateDocument': return space.updateContent(args);
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
        const requestedSessionId = prior?.sessionId || (typeof args.sessionId === 'string' && args.sessionId !== '' ? args.sessionId : undefined);
        let target;
        if (requestedSessionId) {
          target = { sessionId: requestedSessionId, created: false };
        } else {
          if (typeof resolveTarget !== 'function') throw Object.assign(new Error('当前对话发送能力不可用'), {code:'SESSION_UNAVAILABLE'});
          target = await resolveTarget({ operationId, ...(args.forceNew === true ? { forceNew: true } : {}), ...(args.newSessionFrom ? { excludeSessionId: args.newSessionFrom } : {}) });
          if (!target?.sessionId) throw Object.assign(new Error('无法确定发送对话'), {code:'SESSION_UNAVAILABLE'});
        }
        const prepared = space.prepareSend({ ...args, sessionId: target.sessionId, operationId });
        if (prepared.replay) return {requestId:operationId,status:prepared.status,sessionId:target.sessionId,createdSession:false};
        // Only send the reference and explicit processing instruction. Comment
        // bodies remain in local storage and are read through space_document_read.
        const reference = `space:${encodeURIComponent(args.docId)}`;
        const text = commentProcessingPrompt(reference, prepared.comments.map(comment => comment.id));
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
  return { dispatch, collaboration, close() {collaboration.close();space.close();} };
}
