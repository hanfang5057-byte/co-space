import { createRoot } from 'react-dom/client';
import { CospaceMark, ReviewSendButton, SpaceApp, SpaceReviewSurface, useSpaceReview } from '../../../packages/review-ui/src/SpaceApp.jsx';
import { useCurrentUser } from '../../../packages/review-ui/src/current-user.js';
import { translate, zh, en } from '../../../packages/review-ui/src/locale.js';
import '../../../packages/review-ui/src/space.css';
import './workbuddy.css';

async function api(method, args = {}) {
  const response = await fetch('/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ method, args }),
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw Object.assign(new Error(body.error?.message || 'Request failed'), body.error || { code: 'REQUEST_FAILED' });
  }
  return body.result;
}

const locale = navigator.language?.toLowerCase().startsWith('en') ? en : zh;
const t = (key, vars) => translate(locale, key, vars);

function ReviewPage({ docId }) {
  const review = useSpaceReview(api, docId, null, t, { mode: 'copy' });
  const user = useCurrentUser(api);
  return <div className="space-app space-web-review">
    <header className="space-web-header">
      <a className="space-web-brand" href="/" aria-label={t('home.back')}>
        <CospaceMark className="space-brand-icon"/><span className="space-brand-names"><strong>{t('brand.name')}</strong><small>{t('brand.nameEnglish')}</small></span>
      </a>
      <div className="space-web-title"><span>{t('home.eyebrow')}</span><h1>{review.doc?.title || docId}</h1></div>
      <div className="space-header-counts" role="group" aria-label={t('annotations.title')}>
        <span className="is-suggestion"><i aria-hidden="true"/>{t('annotations.suggestions',{count:review.suggestions.length})}</span>
        <span className="is-comment"><i aria-hidden="true"/>{t('annotations.comments',{count:review.comments.length})}</span>
      </div>
      <button type="button" className="space-refresh" disabled={review.busy} aria-label={t('review.refresh')} title={t('review.refresh')} onClick={()=>review.reload(docId)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 6M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {review.doc && review.comments.length>0 && <ReviewSendButton review={review} sessionId={null} sendTarget={{mode:'copy'}} t={t}/>}
    </header>
    {!review.doc ? <main className="space-preview-loading" aria-live="polite">{review.message || t('empty.loading')}</main> : <main className="space-main"><SpaceReviewSurface review={review} user={user} t={t}/></main>}
    <div className="space-message" role="status" aria-live="polite">{review.message}</div>
  </div>;
}

function App() {
  const prefix = '/document/';
  let docId = null;
  if (location.pathname.startsWith(prefix)) {
    try {
      docId = decodeURIComponent(location.pathname.slice(prefix.length));
      if (!docId || docId.includes('/') || docId.length > 200) docId = null;
    } catch { docId = null; }
  }
  return docId ? <ReviewPage docId={docId}/> : <SpaceApp api={api} t={t}/>;
}

createRoot(document.getElementById('root')).render(<App/>);
