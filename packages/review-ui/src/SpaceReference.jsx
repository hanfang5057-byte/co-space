/** One sent Space document reference, rendered as a document card. */
import { useDocumentTitle } from './document-titles.js';
import { translate, zh } from './locale.js';
import { themeRootProps } from './theme/index.js';

const fallbackT = (key, vars) => translate(zh, key, vars);

function DocumentGlyph() {
  return <svg className="space-ref-card-glyph" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4M9 12h6M9 16h6" />
  </svg>;
}

/**
 * Render a Space reference as a card.
 *
 * The card remains readable when the surrounding surface is display-only
 * (queue previews, local echoes), and becomes a button only when that surface
 * allows interaction. Interaction is a navigation gesture, never an edit.
 * @param {object} props - UserText node, raw token, interaction policy, locale seat, and navigation face.
 * @returns {React.ReactElement} an inline card.
 */
export function SpaceDocumentReference({ node, raw, interactive = false, t = fallbackT, adapter, theme }) {
  const title = useDocumentTitle(node.data.docId, adapter?.core?.request);
  const label = title || node.data.docId;
  const contents = <>
    <DocumentGlyph />
    <span className="space-ref-card-copy">
      <span className="space-ref-card-title">{label}</span>
      <span className="space-ref-card-meta">{t('reference.card')}</span>
    </span>
  </>;
  const openDocument=adapter?.navigation?.openDocument;
  const rootProps=themeRootProps('inline', { className: 'space-ref-card', tokens: (theme ?? adapter?.theme)?.tokens });
  if (!interactive || typeof openDocument !== 'function') {
    return <span {...rootProps} data-space-reference={node.data.docId} title={raw}>{contents}</span>;
  }
  return <button
    type="button"
    {...rootProps}
    data-space-reference={node.data.docId}
    title={raw}
    onClick={event => {
      // A click that ends a text selection is not a navigation gesture.
      if (event.detail > 1) return;
      if (event.detail !== 0 && event.currentTarget.ownerDocument.getSelection()?.isCollapsed === false) return;
      openDocument(node.data.docId);
    }}
  >{contents}</button>;
}
