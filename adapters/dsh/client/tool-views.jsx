/** Conversation cards for CoSpace MCP tool calls, keyed by model-facing tool name. */
import { themeRootProps } from '../../../packages/review-ui/src/theme/index.js';
import { NS } from '../../../packages/review-ui/src/locale.js';
import { cardMeta, toolCardModel } from './tool-view-model.js';
import './tool-views.css';

/** The native CoSpace tool names the host tool registry exposes to the model. */
export const SPACE_TOOL_NAMES = Object.freeze([
  'space_document_read',
  'space_suggest',
  'space_suggestion_list',
]);

const cardProps = () => themeRootProps('inline', { className: 'space-tool-card' });

/** Phase data differs: a started call carries args, a result its original call. */
function modelOf(toolName, phase, block) {
  if (!block) return null;
  if (phase === 'result') {
    return toolCardModel(toolName, { argsRaw: block.call?.argsRaw, content: block.content, isError: block.isError });
  }
  return toolCardModel(toolName, { argsRaw: block.argsRaw });
}

/**
 * One compact tool-call card; unreadable payloads keep a plain row so the
 * conversation never loses the call.
 * @param {object} props - slot owner props, call data and the bound translator.
 * @returns {React.ReactElement} the card.
 */
export function SpaceToolCard({ toolName, phase, block, t }) {
  const model = modelOf(toolName, phase, block);
  if (!model) {
    return <div {...cardProps()}><span className="space-tool-title">{toolName}</span></div>;
  }
  const className = `space-tool-card${model.failed ? ' is-failed' : ''}`;
  const meta = cardMeta(model);
  return <div {...themeRootProps('inline', { className })}>
    <div className="space-tool-head">
      <span className="space-tool-title">{t(model.titleKey)}</span>
      {model.title && <span className="space-tool-target" title={model.title}>{model.title}</span>}
      {model.docId && !model.title && <span className="space-tool-target" title={model.docId}>{model.docId}</span>}
    </div>
    {meta.length > 0 && <div className="space-tool-meta">
      {meta.map(({ key, vars }) => <span key={key}>{t(key, vars)}</span>)}
    </div>}
    {model.kind === 'suggestion' && (model.expected !== null || model.replacement !== null) && <div className="space-tool-diff">
      <span className="space-tool-expected">{model.expected === null ? t('tool.insert') : model.expected}</span>
      <span className="space-tool-replacement">{model.replacement ?? ''}</span>
    </div>}
  </div>;
}

/**
 * Replace the generic row for each CoSpace tool with its card.
 * @param {object} ctx - client plugin context with slots.
 */
export function registerSpaceToolViews(ctx) {
  for (const key of SPACE_TOOL_NAMES) {
    ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
      name: 'tool.call.toolview', key, locale: NS,
    }, SpaceToolCard));
  }
}
