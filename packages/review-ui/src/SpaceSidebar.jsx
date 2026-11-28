/** Right-Sidebar tab body and chip title for one Space document. */
import { useEffect, useState } from 'react';
import { useCurrentUser } from './current-user.js';
import { rememberDocumentTitle, useDocumentTitle } from './document-titles.js';
import { translate, zh } from './locale.js';
import { documentIdFromResource } from './space-reference.js';
import { SpaceAlertDialog } from './SpaceDialog.jsx';
import { ReviewToolsMenu, SpaceAgentPromptDialog, SpaceDocumentPreferencesDialog, SpaceReviewSurface, SpaceSurfaceHeader, ModeSwitch, useDocumentExport, useDocumentPreferences, useSpaceReview } from './SpaceApp.jsx';
import { themeRootProps } from './theme/index.js';
import { supportsCapability } from '../../adapter-contract/src/index.js';

const fallbackT = (key, vars) => translate(zh, key, vars);

/**
 * Review one Space document inside the right Sidebar.
 *
 * The tab is a resource tab, so its address survives a reload; the document id
 * is read from the tab content address rather than page navigation parameters.
 * The surface is the same review controller and the same header the Space page
 * uses, so the two entry points cannot drift: the Sidebar renders it compact
 * (no brand lockup, which stays page-level; the tab chip carries the title)
 * but shares the tools menu, the review/edit switch, zoom and the one send
 * action. Export, the Agent handoff and the document preferences are document
 * actions, so they are reachable here too, through the same controllers the
 * page uses.
 * @param {object} props - tab information hook, session id, optional creator, and locale seat.
 * @returns {React.ReactElement} the scrollable document review surface.
 */
export function SpaceSidebarDocument({ useTabInfo, adapter, t = fallbackT, theme }) {
  const { tab } = useTabInfo();
  const docId = (adapter.navigation?.parseDocumentLink || documentIdFromResource)(tab.contentId);
  const sessionId=adapter.conversation?.current?.id || null;
  const requestApi=adapter.core.request;
  const user = useCurrentUser(adapter.identity?.getCurrentUser);
  const review = useSpaceReview(requestApi, docId, sessionId, t, adapter);
  const { exporting, exportDocument } = useDocumentExport({ docId, adapter });
  const preferences = useDocumentPreferences({ docId, adapter, t });
  const [promptTask,setPromptTask]=useState(null);
  const [exportError,setExportError]=useState('');
  useEffect(() => {
    if (review.doc?.title) rememberDocumentTitle(docId, review.doc.title, requestApi);
  }, [docId, review.doc?.title, requestApi]);
  const visibleComments = review.comments.filter(comment => !['sent', 'processed'].includes(comment.status));
  // Document-scoped pending count: the tab names one document, so no
  // conversation-to-document mapping is implied.
  const pending = (review.suggestions || []).filter(suggestion => suggestion.status === 'pending' || suggestion.status === 'conflicted').length;
  // Export, the Agent handoff and the document preferences are document actions,
  // so the compact header offers them too. The review/edit switch is
  // document-scoped through the shared controller, so the compact header
  // offers it as well; only the brand/back cluster stays page-level.
  const tools = review.doc ? <ReviewToolsMenu
    exporting={exporting}
    onExport={format=>{void exportDocument(format).then(ok=>{if(!ok)setExportError(t('export.failed'))})}}
    onReview={adapter.prompts?()=>setPromptTask({kind:'review',docId}):null}
    onPreferences={()=>preferences.openPreferences('document')}
    onOpenPage={typeof adapter.navigation?.openDocumentInPage==='function'?()=>adapter.navigation.openDocumentInPage(docId):null}
    canExport={supportsCapability(adapter.capabilities,'files.export.save')}
    t={t}/> : null;
  const viewTools = review.doc ? <ModeSwitch review={review} t={t}/> : null;
  return <div {...themeRootProps('sidebar', { className: 'space-app space-sidebar-app', tokens: (theme ?? adapter?.theme)?.tokens })}>
    <SpaceSurfaceHeader surface="sidebar" pending={pending} tools={tools} viewTools={viewTools} review={review} sessionId={sessionId} adapter={adapter} t={t} showSend={!review.editing&&visibleComments.length>0}/>
    <main className="space-sidebar-main">
      <SpaceReviewSurface review={review} user={user} t={t}/>
    </main>
    <div className="space-message" role="status" aria-live="polite">{review.doc ? review.message : ''}</div>
    <SpaceAlertDialog open={Boolean(exportError||review.error)} title={t('dialog.errorTitle')} description={exportError||review.error} closeLabel={t('dialog.close')} confirmLabel={t('dialog.dismiss')} onClose={()=>{setExportError('');review.dismissError()}}/>
    <SpaceAgentPromptDialog task={promptTask} adapter={adapter} t={t} onClose={()=>setPromptTask(null)}/>
    <SpaceDocumentPreferencesDialog preferences={preferences} t={t}/>
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
