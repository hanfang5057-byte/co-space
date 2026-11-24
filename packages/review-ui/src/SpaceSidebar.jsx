/** Right-Sidebar tab body and chip title for one Space document. */
import { useEffect } from 'react';
import { useCurrentUser } from './current-user.js';
import { rememberDocumentTitle, useDocumentTitle } from './document-titles.js';
import { translate, zh } from './locale.js';
import { documentIdFromResource } from './space-reference.js';
import { ReviewSendButton, ReviewZoomControls, SpaceReviewSurface, useSpaceReview } from './SpaceApp.jsx';

const fallbackT = (key, vars) => translate(zh, key, vars);

/**
 * Review one Space document inside the right Sidebar.
 *
 * The tab is a resource tab, so its address survives a reload; the document id
 * is read from the tab content address rather than page navigation parameters.
 * The surface is the same review controller the Space page uses, with the
 * conversation scope supplying the comment-send target. The compact toolbar
 * keeps zoom and the explicit send action reachable without the Space page.
 * @param {object} props - tab information hook, session id, optional creator, and locale seat.
 * @returns {React.ReactElement} the scrollable document review surface.
 */
export function SpaceSidebarDocument({ useTabInfo, adapter, t = fallbackT }) {
  const { tab } = useTabInfo();
  const docId = (adapter.navigation?.parseDocumentLink || documentIdFromResource)(tab.contentId);
  const sessionId=adapter.conversation?.current?.id || null;
  const requestApi=adapter.core.request;
  const user = useCurrentUser(adapter.identity?.getCurrentUser);
  const review = useSpaceReview(requestApi, docId, sessionId, t, adapter);
  useEffect(() => {
    if (review.doc?.title) rememberDocumentTitle(docId, review.doc.title, requestApi);
  }, [docId, review.doc?.title, requestApi]);
  const visibleComments = review.comments.filter(comment => !['sent', 'processed'].includes(comment.status));
  return <div className="space-app space-sidebar-app">
      <header className="space-sidebar-toolbar">
        {review.doc && <ReviewZoomControls review={review} t={t}/>}
        {visibleComments.length > 0 && <ReviewSendButton review={review} sessionId={sessionId} adapter={adapter} t={t} compact/>}
      </header>
    <main className="space-sidebar-main">
      <SpaceReviewSurface review={review} user={user} t={t}/>
    </main>
    <div className="space-message" role="status" aria-live="polite">{review.doc ? review.message : ''}</div>
  </div>;
}

/**
 * The tab chip title, kept live while the title cache settles.
 * @param {object} props - tab information hook and locale seat.
 * @returns {React.ReactElement} the document title or the generic label.
 */
export function SpaceSidebarTitle({ useTabInfo, adapter, t = fallbackT }) {
  const { tab } = useTabInfo();
  const docId=(adapter.navigation?.parseDocumentLink || documentIdFromResource)(tab.contentId);
  const title = useDocumentTitle(docId, adapter?.core?.request);
  return <>{title || t('sidebar.title')}</>;
}
