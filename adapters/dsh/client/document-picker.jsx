/**
 * Document picker rendered into DSH's `shell.overlay` slot.
 *
 * The picker is a real React surface inside the shared dialog shell, so it uses
 * the same tokens, focus trap, and Escape handling as every other CoSpace
 * modal. The command only opens it; the overlay owns loading, searching,
 * selection, and insertion.
 */
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Search } from 'lucide-react';
import { SpaceDialog } from '../../../packages/review-ui/src/SpaceDialog.jsx';
import { themeRootProps } from '../../../packages/review-ui/src/theme/index.js';
import { errorText } from '../../../packages/review-ui/src/locale.js';
import { filterDocuments } from './documents.js';

const fallbackT = key => key;

/**
 * @param {object} props - injected picker state and operations.
 * @param {object} props.picker - observable opened by the `/space` command.
 * @param {object} props.documents - shared `listDocuments` cache.
 * @param {(sessionId: string, documents: Array<object>) => {ok: boolean, reason?: string}} props.insertDocuments - inserts references into the captured Session.
 * @param {Function} [props.t] - locale seat.
 * @returns {React.ReactElement} the overlay root.
 */
export function SpaceDocumentPicker({ picker, documents, insertDocuments, t = fallbackT }) {
  const state = useSyncExternalStore(picker.subscribe, picker.getSnapshot, picker.getSnapshot);
  const titleId = useId();
  const inputRef = useRef(null);
  const open = state.open && typeof state.sessionId === 'string';
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('idle');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState('');
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setRows([]); setStatus('loading'); setQuery(''); setSelected(new Set()); setError(''); setFailure(null); setBusy(false);
    documents.load()
      .then(list => { if (!cancelled) { setRows(list); setStatus('ready'); } })
      .catch(failed => { if (!cancelled) { setStatus('error'); setFailure(failed); } });
    return () => { cancelled = true; };
  }, [open, state.sessionId, documents]);

  // The dialog focuses its close button before children effects settle; move
  // the caret into the search field once the shell has taken focus.
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  const shown = filterDocuments(rows, query);
  const toggle = id => setSelected(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const close = () => { setError(''); picker.close(); };
  const confirm = () => {
    if (selected.size === 0) { setError(t('picker.choose')); return; }
    const chosen = rows.filter(doc => selected.has(doc.id));
    setBusy(true);
    const result = insertDocuments(state.sessionId, chosen);
    setBusy(false);
    if (!result?.ok) {
      setError(result?.reason === 'closed' ? t('picker.closed') : t('picker.failed'));
      return;
    }
    picker.close();
  };

  return <div {...themeRootProps('overlay', { className: 'space-overlay-root' })}>
    <SpaceDialog
      open={open}
      onClose={close}
      labelledBy={titleId}
      title={t('picker.title')}
      closeLabel={t('dialog.close')}
      className="space-picker-dialog"
      actions={<>
        {selected.size > 0 && <span className="space-picker-count">{t('picker.selected', { count: selected.size })}</span>}
        <button type="button" onClick={close}>{t('picker.cancel')}</button>
        <button type="button" className="is-primary" disabled={busy || selected.size === 0} onClick={confirm}>{t('picker.insert')}</button>
      </>}
    >
      <p className="space-picker-intro">{t('picker.description')}</p>
      <label className="space-picker-search">
        <Search size={15} aria-hidden="true"/>
        <span className="space-visually-hidden">{t('picker.search')}</span>
        <input ref={inputRef} type="search" value={query} placeholder={t('picker.search')} onChange={event => { setQuery(event.target.value); setError(''); }}/>
      </label>
      {status === 'loading' && <p className="space-picker-status" role="status">{t('picker.loading')}</p>}
      {status === 'ready' && rows.length === 0 && <p className="space-picker-status">{t('picker.empty')}</p>}
      {status === 'ready' && rows.length > 0 && shown.length === 0 && <p className="space-picker-status">{t('picker.noResults')}</p>}
      {shown.length > 0 && <ul className="space-picker-list" aria-label={t('picker.documents')}>
        {shown.map(doc => {
          const checked = selected.has(doc.id);
          return <li key={doc.id}>
            <label className={`space-picker-row${checked ? ' is-checked' : ''}`}>
              <input type="checkbox" checked={checked} onChange={() => { toggle(doc.id); setError(''); }}/>
              <span className="space-picker-copy">
                <strong>{doc.title || doc.id}</strong>
                <span className={Number(doc.pending) > 0 ? 'space-picker-pending' : 'space-picker-meta'}>
                  {Number(doc.pending) > 0 ? t('picker.pending', { count: doc.pending }) : t('picker.clear')}
                </span>
              </span>
            </label>
          </li>;
        })}
      </ul>}
      {(error || failure) && <p className="space-picker-error" role="alert">{error || errorText(failure, t)}</p>}
    </SpaceDialog>
  </div>;
}
