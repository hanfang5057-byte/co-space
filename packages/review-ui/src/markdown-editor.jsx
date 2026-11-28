import { useEffect, useRef } from 'react';
import { CrepeBuilder } from '@milkdown/crepe/builder';
import { Plugin, Selection } from '@milkdown/kit/prose/state';
import { editorViewCtx } from '@milkdown/kit/core';
import { Decoration, DecorationSet } from '@milkdown/kit/prose/view';
import { $prose } from '@milkdown/kit/utils';
import { blockEdit } from '@milkdown/crepe/feature/block-edit';
import { cursor } from '@milkdown/crepe/feature/cursor';
import { linkTooltip } from '@milkdown/crepe/feature/link-tooltip';
import { listItem } from '@milkdown/crepe/feature/list-item';
import { placeholder } from '@milkdown/crepe/feature/placeholder';
import { table } from '@milkdown/crepe/feature/table';
import { topBar } from '@milkdown/crepe/feature/top-bar';
import '@milkdown/crepe/theme/common/prosemirror.css';
import '@milkdown/crepe/theme/common/reset.css';
import '@milkdown/crepe/theme/common/block-edit.css';
import '@milkdown/crepe/theme/common/cursor.css';
import '@milkdown/crepe/theme/common/link-tooltip.css';
import '@milkdown/crepe/theme/common/list-item.css';
import '@milkdown/crepe/theme/common/placeholder.css';
import '@milkdown/crepe/theme/common/top-bar.css';
import '@milkdown/crepe/theme/common/table.css';
import '@milkdown/crepe/theme/classic.css';
import { readSourceSpans, sourceRangeToDom } from './markdown-dom.js';

const NO_SUGGESTIONS = [];

function suggestionPlugin(surface, markdown, suggestions, onReady) {
  let decorations = DecorationSet.empty;
  let destroyed = false;
  const refresh = view => {
    const spans = readSourceSpans(surface, markdown);
    const next = [];
    for (const item of suggestions) {
      if (!['pending', 'conflicted'].includes(item.status)) continue;
      const mapped = sourceRangeToDom(spans, item.from, item.to);
      if (!mapped) continue;
      let from, to;
      try {
        from = view.posAtDOM(mapped.range.startContainer, mapped.range.startOffset);
        to = view.posAtDOM(mapped.range.endContainer, mapped.range.endOffset);
      } catch { continue; }
      if (item.expected && to > from) {
        next.push(Decoration.inline(from, to, {
          class: `space-suggestion-delete${item.status === 'conflicted' ? ' is-conflicted' : ''}`,
          'data-suggestion-id': String(item.id),
        }, { inclusiveStart: false, inclusiveEnd: false }));
      }
      if (item.replacement) {
        const insertion = document.createElement('span');
        insertion.className = `space-suggestion-insert${item.status === 'conflicted' ? ' is-conflicted' : ''}`;
        insertion.dataset.suggestionId = String(item.id);
        insertion.textContent = item.replacement;
        insertion.setAttribute('aria-label', `建议新增：${item.replacement}`);
        next.push(Decoration.widget(to, insertion, { key: `cospace-suggestion-${item.id}`, side: 1 }));
      }
    }
    decorations = DecorationSet.create(view.state.doc, next);
    view.dispatch(view.state.tr.setMeta('cospace-suggestion-decorations', true));
    delete surface.__spaceSourceSpans;
    readSourceSpans(surface, markdown);
    onReady?.();
  };
  return new Plugin({
    props: { decorations: () => decorations },
    view(view) {
      queueMicrotask(() => { if (!destroyed) refresh(view); });
      return { destroy() { destroyed = true; } };
    },
  });
}

export function MarkdownEditor({ markdown, editorRef, onChange, onDecorationsReady, t, readOnly = false, suggestions = [], autoFocus = false }) {
  const rootRef = useRef(null);
  const callbacksRef = useRef({ onChange, onDecorationsReady, t });
  callbacksRef.current = { onChange, onDecorationsReady, t };
  const activeSuggestions = readOnly ? suggestions : NO_SUGGESTIONS;

  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let created = false;
    let builder;

    const initialize = async () => {
      builder = new CrepeBuilder({ root: rootRef.current, defaultValue: markdown });
      builder.setReadonly(readOnly);
      if (activeSuggestions.length) builder.editor.use($prose(() => suggestionPlugin(rootRef.current, markdown, activeSuggestions, () => callbacksRef.current.onDecorationsReady?.())));
      builder
        .addFeature(cursor)
        .addFeature(listItem)
        .addFeature(linkTooltip)
        .addFeature(blockEdit)
        .addFeature(topBar)
        .addFeature(table)
        .addFeature(placeholder, { text: callbacksRef.current.t('edit.placeholder'), mode: 'block' });
      builder.on(listener => listener.markdownUpdated((_ctx, next, previous) => {
        if (ready && next !== previous) callbacksRef.current.onChange();
      }));
      await builder.create();
      created = true;
      if (cancelled) {
        await builder.destroy();
        created = false;
        return;
      }
      if (autoFocus && !readOnly) builder.editor.action(ctx => {
        const view = ctx.get(editorViewCtx);
        const { doc, schema } = view.state;
        if (doc.lastChild?.type !== schema.nodes.paragraph || doc.lastChild.content.size > 0) {
          view.dispatch(view.state.tr.insert(doc.content.size, schema.nodes.paragraph.create()));
        }
      });
      ready = true;
      editorRef.current = builder;
      if (autoFocus && !readOnly) builder.editor.action(ctx => {
        const view = ctx.get(editorViewCtx);
        const end = view.state.doc.content.size - 1;
        view.dispatch(view.state.tr.setSelection(Selection.near(view.state.doc.resolve(end), 1)));
        view.focus();
      });
    };

    initialize().catch(error => {
      if (!cancelled) {
        console.error('Milkdown editor initialization failed', error);
      }
    });

    return () => {
      cancelled = true;
      ready = false;
      if (editorRef.current === builder) editorRef.current = null;
      if (builder && created) void builder.destroy();
    };
  }, [readOnly, markdown, activeSuggestions, autoFocus]);

  return <div ref={rootRef} className={`space-milkdown-root${readOnly ? ' is-readonly' : ''}`} aria-label={t('edit.contentLabel')} />;
}
