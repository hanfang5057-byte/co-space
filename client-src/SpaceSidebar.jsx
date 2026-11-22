/** Right-Sidebar tab body and chip title for one Space document. */
import { useEffect } from 'react';
import { api } from './api.js';
import { rememberDocumentTitle, useDocumentTitle } from './document-titles.js';
import { translate, zh } from './locale.js';
import { documentIdFromResource } from './space-reference.js';
import { SpaceReviewSurface, useSpaceReview } from './SpaceApp.jsx';

const fallbackT = (key, vars) => translate(zh, key, vars);

/**
 * Review one Space document inside the right Sidebar.
 *
 * The tab is a resource tab, so its address survives a reload; the document id
 * is read from the tab content address rather than page navigation parameters.
 * The surface is the same review controller the Space page uses, with the
 * conversation scope supplying the comment-send target.
 * @param {object} props - tab information hook, session id, and locale seat.
 * @returns {React.ReactElement} the scrollable document review surface.
 */
export function SpaceSidebarDocument({ useTabInfo, sessionId, t = fallbackT }) {
  const { tab } = useTabInfo();
  const docId = documentIdFromResource(tab.contentId);
  const review = useSpaceReview(api, docId, sessionId, t);
  useEffect(() => {
    if (review.doc?.title) rememberDocumentTitle(docId, review.doc.title);
  }, [docId, review.doc?.title]);
  return <div className="space-app space-sidebar-app">
    <main className="space-sidebar-main">
      <SpaceReviewSurface review={review} sessionId={sessionId} t={t}/>
    </main>
    <div className="space-message" role="status" aria-live="polite">{review.doc ? review.message : ''}</div>
  </div>;
}

/**
 * The tab chip title, kept live while the title cache settles.
 * @param {object} props - tab information hook and locale seat.
 * @returns {React.ReactElement} the document title or the generic label.
 */
export function SpaceSidebarTitle({ useTabInfo, t = fallbackT }) {
  const { tab } = useTabInfo();
  const title = useDocumentTitle(documentIdFromResource(tab.contentId));
  return <>{title || t('sidebar.title')}</>;
}
