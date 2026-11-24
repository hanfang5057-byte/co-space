import { useEffect, useRef } from 'react';
import { CrepeBuilder } from '@milkdown/crepe/builder';
import { blockEdit } from '@milkdown/crepe/feature/block-edit';
import { cursor } from '@milkdown/crepe/feature/cursor';
import { linkTooltip } from '@milkdown/crepe/feature/link-tooltip';
import { listItem } from '@milkdown/crepe/feature/list-item';
import { placeholder } from '@milkdown/crepe/feature/placeholder';
import { table } from '@milkdown/crepe/feature/table';
import { toolbar } from '@milkdown/crepe/feature/toolbar';
import '@milkdown/crepe/theme/common/prosemirror.css';
import '@milkdown/crepe/theme/common/reset.css';
import '@milkdown/crepe/theme/common/block-edit.css';
import '@milkdown/crepe/theme/common/cursor.css';
import '@milkdown/crepe/theme/common/link-tooltip.css';
import '@milkdown/crepe/theme/common/list-item.css';
import '@milkdown/crepe/theme/common/placeholder.css';
import '@milkdown/crepe/theme/common/toolbar.css';
import '@milkdown/crepe/theme/common/table.css';
import '@milkdown/crepe/theme/classic.css';

export function MarkdownEditor({ markdown, editorRef, onChange, t, readOnly = false }) {
  const rootRef = useRef(null);
  const callbacksRef = useRef({ onChange, t });
  callbacksRef.current = { onChange, t };

  useEffect(() => {
    let cancelled = false;
    let ready = false;
    let created = false;
    let builder;

    const initialize = async () => {
      builder = new CrepeBuilder({ root: rootRef.current, defaultValue: markdown });
      builder.setReadonly(readOnly);
      builder
        .addFeature(cursor)
        .addFeature(listItem)
        .addFeature(linkTooltip)
        .addFeature(blockEdit)
        .addFeature(toolbar, {
          boldLabel: callbacksRef.current.t('edit.bold'),
          italicLabel: callbacksRef.current.t('edit.italic'),
          strikethroughLabel: callbacksRef.current.t('edit.strike'),
          linkLabel: callbacksRef.current.t('edit.link'),
          codeLabel: callbacksRef.current.t('edit.code'),
        })
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
      ready = true;
      editorRef.current = builder;
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
  }, [readOnly]);

  return <div ref={rootRef} className={`space-milkdown-root${readOnly ? ' is-readonly' : ''}`} aria-label={t('edit.contentLabel')} />;
}
