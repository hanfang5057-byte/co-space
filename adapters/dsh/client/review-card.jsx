/** Body of the CoSpace review decision card rendered under an answer. */
import { useEffect, useState } from 'react';
import { brandIcon } from '../../../packages/brand/brand.js';
import { themeRootProps } from '../../../packages/review-ui/src/theme/index.js';

/** Kind id shared with the host registration. */
export const REVIEW_CARD_ACTION = 'cospace-review';

const MAX_CHANGES = 3;
const MAX_LINE = 90;

const clip = value => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > MAX_LINE ? `${text.slice(0, MAX_LINE)}…` : text;
};

/**
 * Build the body component so it closes over the host adapter and translator.
 * @param {{adapter: object, t: Function}} options - host adapter and reviewer copy.
 * @returns {React.ComponentType<object>} the card body.
 */
export function createReviewCardBody({ adapter, t }) {
  return function SpaceReviewCard({ proposal, decision, act }) {
    const details = proposal?.details ?? {};
    const suggestionIds = Array.isArray(details.suggestionIds) ? details.suggestionIds.map(String) : [];
    const [docState, setDocState] = useState({ status: 'loading', doc: null });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const phase = decision?.phase;

    useEffect(() => {
      let live = true;
      setDocState({ status: 'loading', doc: null });
      adapter.core.request('readDocument', { docId: details.docId })
        .then(doc => { if (live) setDocState({ status: 'ready', doc }); })
        .catch(() => { if (live) setDocState({ status: 'unavailable', doc: null }); });
      return () => { live = false; };
    }, [adapter, details.docId]);

    const doc = docState.doc;
    const title = doc?.title || details.docId;
    const matched = (doc?.suggestions || []).filter(suggestion => suggestionIds.includes(String(suggestion.id)));
    const changes = matched.slice(0, MAX_CHANGES);
    const count = matched.length;

    const acceptAll = async () => {
      setBusy(true);
      setError('');
      try {
        const result = await act('accept-all');
        if (result === undefined) setError(t('card.failed'));
      } catch {
        setError(t('card.failed'));
      } finally {
        setBusy(false);
      }
    };

    return <div {...themeRootProps('inline', { className: 'space-review-card' })}>
      <header className="space-review-card-head">
        <img className="space-review-card-logo" src={brandIcon} alt="" aria-hidden="true"/>
        <div className="space-review-card-heading">
          <strong className="space-review-card-title" title={title}>{title}</strong>
          <span className="space-review-card-subtitle">
            {docState.status === 'loading' ? t('card.loading') : count > 0 ? t('card.count', { count }) : t('card.none')}
          </span>
        </div>
      </header>

      {docState.status === 'loading' && <p className="space-review-card-note">{t('card.loading')}</p>}
      {docState.status === 'unavailable' && <p className="space-review-card-note">{t('card.docHint', { count: suggestionIds.length })}</p>}
      {changes.length > 0 && <ul className="space-review-card-changes">
        {changes.map(change => <li key={change.id} className="space-review-card-change">
          {change.explanation && <p className="space-review-card-why">{clip(change.explanation)}</p>}
          <div className="space-review-card-diff">
            <span className="is-removed">{clip(change.expected) || t('card.insert')}</span>
            <span className="is-added">{clip(change.replacement)}</span>
          </div>
        </li>)}
        {count > changes.length && <li className="space-review-card-more">
          {t('card.more', { count: count - changes.length })}
        </li>}
      </ul>}

      <footer className="space-review-card-foot">
        <button type="button" className="space-review-card-primary" disabled={busy || phase !== undefined} onClick={() => { void acceptAll(); }}>
          {busy ? t('card.accepting') : t('card.acceptCount', { count: suggestionIds.length })}
        </button>
        <button type="button" className="space-review-card-secondary" onClick={() => { adapter.navigation?.openDocument?.(details.docId); }}>
          {t('card.view')}
        </button>
        {error !== '' && <span className="space-review-card-error" role="alert">{error}</span>}
      </footer>
    </div>;
  };
}
