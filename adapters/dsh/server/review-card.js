import { RULES } from '../../../packages/agent-contract/src/index.js';

/**
 * Review decision card: the Agent offers one card after finishing a review pass
 * so the user can accept the submitted suggestions without leaving the chat.
 *
 * The card is model-authored (`action-card` fence); this module registers the
 * host kind that validates and executes it, plus the skill that teaches the
 * model the exact fence. Only user actions accept suggestions.
 */
/** Kind id shared with the client body registration. */
export const REVIEW_CARD_ACTION = 'cospace-review';

/** Skill that documents the fence; model-invocable, not a user command. */
export const REVIEW_CARD_SKILL = 'cospace-review-card';

/** The fields a card may carry; extra fields are rejected rather than ignored. */
const CARD_FIELDS = new Set(['docId', 'suggestionIds', 'summary']);
const MAX_ID = 200;
const MAX_SUGGESTIONS = 50;

/** Minimal `safeParse` contract the card service calls; no runtime schema library here. */
const detailsSchema = {
  safeParse(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { success: false };
    if (Object.keys(value).some(key => !CARD_FIELDS.has(key))) return { success: false };
    const { docId, suggestionIds, summary } = value;
    if (typeof docId !== 'string' || docId === '' || docId.length > MAX_ID) return { success: false };
    if (!Array.isArray(suggestionIds) || suggestionIds.length < 1 || suggestionIds.length > MAX_SUGGESTIONS) return { success: false };
    if (!suggestionIds.every(id => typeof id === 'string' && id !== '' && id.length <= MAX_ID)) return { success: false };
    if (summary !== undefined && (typeof summary !== 'string' || summary.length > 500)) return { success: false };
    return { success: true, data: { docId, suggestionIds, summary } };
  },
};

const SKILL_BODY = `# CoSpace review decision card

Use this skill only after \`space_suggest\` or \`space_suggest_batch\` submitted suggestions for a document in this turn. Do not offer a card for ordinary reads, for suggestions from an earlier turn you did not just submit, or when the user declined a card.

Offer exactly one card by ending the answer with a fenced block:

\`\`\`action-card
{"action":"cospace-review","title":"审阅完成：<document title>","brief":"<one sentence: how many suggestions you submitted>","details":{"docId":"<document id>","suggestionIds":["<suggestion id>", "..."],"summary":"<optional short summary of the changes>"}}
\`\`\`

Rules:
- ${RULES.decisions}
- \`action\` is always \`cospace-review\`.
- \`docId\` and every \`suggestionIds\` entry come from this turn's tool results; never invent them. Convert numeric suggestion IDs to decimal strings for the card.
- List at most 50 suggestion ids and only successfully submitted suggestions whose current status is pending or conflicted. Omit failed batch items.
- The card's accept action is a user decision: never claim suggestions were accepted until a later tool result reports it.
- Keep the title and brief in the user's language. Do not repeat the card anywhere else in the answer.`;

/** Whether the tool result reports a submitted suggestion that is still open. */
function openSuggestionIds(payload) {
  const list = Array.isArray(payload?.suggestions) ? payload.suggestions : null;
  if (list === null) return [];
  return list.filter(item => item && (item.status === 'pending' || item.status === 'conflicted') && typeof item.id === 'string').map(item => item.id);
}

/**
 * Build the kind; exported separately so its decision loop is unit-testable.
 * @param {object} options - document service and the decision recorder.
 * @param {{decide: Function}} options.space - review service.
 * @param {(agent: object, decision: object) => void} options.record - records the card result.
 * @returns {object} ActionCardKind.
 */
export function createReviewCardKind({ space, record }) {
  return {
    action: REVIEW_CARD_ACTION,
    details: detailsSchema,
    verbs: { 'accept-all': { writes: true } },
    openPhases: [],
    statusGuidance: 'A CoSpace review card was decided. "accepted" means the listed suggestions are now applied to the accepted document; read the document again before quoting its content.',
    statusFields: ['docId', 'accepted', 'failed'],
    async act(agent, proposal) {
      const { docId, suggestionIds } = proposal.details;
      const accepted = [];
      const failed = [];
      for (const suggestionId of suggestionIds) {
        try {
          await space.decide({
            docId,
            // Card JSON carries ids as strings; the store keys them as integers.
            suggestionId: /^\d+$/.test(suggestionId) ? Number(suggestionId) : suggestionId,
            decision: 'accept',
            // Deterministic per card and suggestion, so a retried action replays
            // instead of deciding twice.
            operationId: `cospace-review:${proposal.cardId}:${suggestionId}`.slice(0, 200),
          });
          accepted.push(suggestionId);
        } catch (error) {
          failed.push({ suggestionId, code: error?.code || 'FAILED' });
        }
      }
      const phase = failed.length === 0 ? 'accepted' : accepted.length === 0 ? 'failed' : 'partial';
      const decision = {
        cardId: proposal.cardId,
        action: REVIEW_CARD_ACTION,
        phase,
        data: { docId, accepted: accepted.length, failed: failed.length },
      };
      record(agent, decision);
      return { status: 'settled', decision };
    },
    dismissal(proposal) {
      return { docId: proposal.details.docId };
    },
  };
}

/**
 * Register the kind and the skill that teaches the fence.
 * @param {object} ctx - DSH host plugin context.
 * @param {{space: object}} options - review service shared with the UI API.
 */
export function registerReviewCard(ctx, { space }) {
  ctx.inject(['actionCards'], scope => {
    const cards = scope.actionCards;
    // A host without the card service keeps today's behaviour; the tool flow
    // never depends on the card.
    if (!cards || typeof cards.register !== 'function') return;
    scope.effect(() => cards.register(createReviewCardKind({
      space,
      record: (agent, decision) => cards.record(agent, decision),
    })), 'dsh-space: review card kind');
    scope.inject(['skills'], skillScope => {
      if (!skillScope.skills || typeof skillScope.skills.registerProvider !== 'function') return;
      const candidate = {
        name: REVIEW_CARD_SKILL,
        description: 'Offer the CoSpace review decision card right after space_suggest submitted suggestions for a document the user asked to review or revise: it lets the user accept them in the conversation. Not for reads, for comments alone, or when no suggestion was submitted in this turn.',
        invocation: { modelInvocable: true, userInvocable: false },
        provider: 'dsh-plugin-space',
        source: 'bundled',
        rank: 600,
        locator: null,
      };
      skillScope.effect(() => skillScope.skills.registerProvider(cards.skillProvider(candidate, async () => {
        const { rank: _rank, locator: _locator, ...summary } = candidate;
        return { ...summary, content: SKILL_BODY };
      })), 'dsh-space: review card skill');
    });
  });
}

/** Suggest only the suggestions a fresh read still reports as open. */
export { openSuggestionIds };
