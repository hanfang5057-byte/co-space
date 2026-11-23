/** Right-Sidebar tab body and chip title for one Space document. */
import { useEffect } from 'react';
import { api } from './api.js';
import { useCurrentUser } from './current-user.js';
import { rememberDocumentTitle, useDocumentTitle } from './document-titles.js';
import { errorText, translate, zh } from './locale.js';
import { documentIdFromResource } from './space-reference.js';
import { RefreshIcon, ReviewSendButton, SpaceReviewSurface, useSpaceReview } from './SpaceApp.jsx';

const fallbackT = (key, vars) => translate(zh, key, vars);

/**
 * Review one Space document inside the right Sidebar.
 *
 * The tab is a resource tab, so its address survives a reload; the document id
 * is read from the tab content address rather than page navigation parameters.
 * The surface is the same review controller the Space page uses, with the
 * conversation scope supplying the comment-send target. The compact toolbar
 * keeps counts and the explicit send action reachable without the Space page.
 * @param {object} props - tab information hook, session id, optional creator, and locale seat.
 * @returns {React.ReactElement} the scrollable document review surface.
 */
export function SpaceSidebarDocument({ useTabInfo, sessionId, sendTarget = null, t = fallbackT, api: requestApi = api, getDocumentIdFromResource = documentIdFromResource }) {
  const { tab } = useTabInfo();
  const docId = getDocumentIdFromResource(tab.contentId);
  const user = useCurrentUser(requestApi);
  const review = useSpaceReview(requestApi, docId, sessionId, t, sendTarget);
  useEffect(() => {
    if (review.doc?.title) rememberDocumentTitle(docId, review.doc.title);
  }, [docId, review.doc?.title]);
  const visibleComments = review.comments.filter(comment => comment.status !== 'sent');
  const refresh = () => { review.setMessage(''); review.reload(docId).catch(error => review.setMessage(errorText(error, t))); };
  return <div className="space-app space-sidebar-app">
    <main className="space-sidebar-main">
      <div className="space-sidebar-toolbar">
        <div className="space-header-counts" role="group" aria-label={t('annotations.title')}>
          <span className="is-suggestion"><i aria-hidden="true"/>{t('annotations.suggestions',{count:review.suggestions.length})}</span>
          <span className="is-comment"><i aria-hidden="true"/>{t('annotations.comments',{count:visibleComments.length})}</span>
        </div>
        <button type="button" className="space-refresh" disabled={!docId || review.busy} aria-label={t('review.refresh')} title={t('review.refresh')} onClick={refresh}><RefreshIcon/></button>
        {visibleComments.length > 0 && <ReviewSendButton review={review} sessionId={sessionId} sendTarget={sendTarget} t={t} compact/>}
      </div>
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
export function SpaceSidebarTitle({ useTabInfo, t = fallbackT, getDocumentIdFromResource = documentIdFromResource }) {
  const { tab } = useTabInfo();
  const title = useDocumentTitle(getDocumentIdFromResource(tab.contentId));
  return <>{title || t('sidebar.title')}</>;
}
