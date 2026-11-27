/** Right-Sidebar tab menu entries for one CoSpace document. */
import { useState } from 'react';
import { NS } from '../../../packages/review-ui/src/locale.js';
import { exportSpaceDocument } from './exports.js';
import { documentIdFromDshResource } from './resource-reference.js';

/** The document a tab shows, or null for any other tab. */
export const spaceTabDocumentId = tab => documentIdFromDshResource(tab?.contentId);

const docOf = spaceTabDocumentId;

const copyToClipboard = async text => {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('Clipboard unavailable');
};

/**
 * @param {{tab: object, dismiss: () => void, adapter: object, t: Function}} props - menu owner props.
 * @returns {React.ReactElement|null} the item.
 */
function CopyReferenceItem({ tab, dismiss, adapter, t }) {
  const docId = docOf(tab);
  if (!docId) return null;
  const run = () => {
    const reference = `space:${encodeURIComponent(docId)}`;
    void copyToClipboard(reference).catch(() => undefined).finally(dismiss);
  };
  return <button type="button" role="menuitem" className="space-tab-menu-item" onClick={run}>{t('menu.copyReference')}</button>;
}

/**
 * @param {{tab: object, dismiss: () => void, adapter: object, t: Function}} props - menu owner props.
 * @returns {React.ReactElement|null} the item.
 */
function CopyLinkItem({ tab, dismiss, adapter, t }) {
  const docId = docOf(tab);
  if (!docId) return null;
  const run = () => {
    const link = adapter.navigation?.createDocumentLink?.(docId);
    void copyToClipboard(String(link ?? '')).catch(() => undefined).finally(dismiss);
  };
  return <button type="button" role="menuitem" className="space-tab-menu-item" onClick={run}>{t('menu.copyLink')}</button>;
}

/**
 * @param {{tab: object, dismiss: () => void, adapter: object, t: Function}} props - menu owner props.
 * @returns {React.ReactElement|null} the item.
 */
function OpenInPageItem({ tab, dismiss, adapter, t }) {
  const docId = docOf(tab);
  if (!docId) return null;
  const run = () => {
    adapter.navigation?.openDocumentInPage?.(docId);
    dismiss();
  };
  return <button type="button" role="menuitem" className="space-tab-menu-item" onClick={run}>{t('menu.openInPage')}</button>;
}

/** One export entry; a failure keeps the menu open with its reason. */
function createExportItem(format, labelKey) {
  return function ExportItem({ tab, dismiss, adapter, t }) {
    const docId = docOf(tab);
    const [state, setState] = useState({ busy: false, error: '' });
    if (!docId) return null;
    const run = async () => {
      setState({ busy: true, error: '' });
      try {
        await exportSpaceDocument(adapter, docId, format);
        dismiss();
      } catch {
        setState({ busy: false, error: t('export.failed') });
      }
    };
    return <button type="button" role="menuitem" className="space-tab-menu-item" disabled={state.busy} onClick={() => { void run(); }}>
      {state.busy ? t('menu.exporting') : t(labelKey)}
      {state.error !== '' && <span className="space-tab-menu-error" role="alert">{state.error}</span>}
    </button>;
  };
}

/**
 * Register the menu entries on every CoSpace tab; other tabs ignore them.
 * @param {object} ctx - client plugin context with slots.
 * @param {object} adapter - host adapter shared with the document views.
 */
export function registerSpaceTabMenu(ctx, adapter) {
  const entries = [
    ['space-copy-reference', 100, CopyReferenceItem],
    ['space-copy-link', 101, CopyLinkItem],
    ['space-open-in-page', 102, OpenInPageItem],
    ['space-export-markdown', 103, createExportItem('md', 'menu.exportMarkdown')],
    ['space-export-docx', 104, createExportItem('docx', 'menu.exportWord')],
  ];
  for (const [id, order, Component] of entries) {
    ctx.slots.inject('sidebar.right.tab.menu.item', () => ctx.slots.register({
      name: 'sidebar.right.tab.menu.item', id, order, locale: NS,
      inject: () => ({ adapter }),
    }, Component));
  }
}
