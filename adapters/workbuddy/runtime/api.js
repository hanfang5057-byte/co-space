import { randomUUID } from 'node:crypto';
import { documentWithTitle } from '../../../packages/review-core/src/space-service.js';

const METHODS = new Set([
  'listDocuments', 'createDocument', 'readDocument', 'deleteDocument', 'decide',
  'listComments', 'createComment', 'deleteComment', 'getUser', 'serviceStatus',
]);

export function createWorkBuddyApi(service) {
  return {
    async dispatch(method, args = {}) {
      if (!METHODS.has(method)) throw Object.assign(new Error('Unsupported method'), { code: 'METHOD_NOT_FOUND' });
      switch (method) {
        case 'listDocuments': return service.listDocuments();
        case 'createDocument': {
          const operationId = typeof args.operationId === 'string' && args.operationId ? args.operationId : randomUUID();
          const title = typeof args.title === 'string' ? args.title.trim() : '';
          if (!title) throw Object.assign(new Error('Title required'), { code: 'INVALID_INPUT' });
          return service.createDocument({ id: `doc-${operationId}`.slice(0, 200), content: documentWithTitle(title), operationId });
        }
        case 'readDocument': return service.readDocument(args.docId);
        case 'deleteDocument': return service.deleteDocument(args.docId);
        case 'decide': return service.decide(args);
        case 'listComments': return service.listComments(args.docId);
        case 'createComment': return service.createComment(args);
        case 'deleteComment': return service.deleteComment(args);
        case 'getUser': return null;
        case 'serviceStatus': return { name: 'Space', storage: 'local-only', available: true };
        default: throw Object.assign(new Error('Unsupported method'), { code: 'METHOD_NOT_FOUND' });
      }
    },
  };
}
