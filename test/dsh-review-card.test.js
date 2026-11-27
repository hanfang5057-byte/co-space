import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REVIEW_CARD_ACTION, createReviewCardKind, registerReviewCard } from '../adapters/dsh/server/review-card.js';

const proposal = ids => ({ cardId: 'card-1', action: REVIEW_CARD_ACTION, turn: 1, title: '审阅完成', brief: '2 条建议', details: { docId: 'doc-1', suggestionIds: ids, summary: '2 处修改' } });

test('accepting a card decides every listed suggestion with a replayable id', async () => {
  const calls = [];
  const recorded = [];
  const kind = createReviewCardKind({
    space: { decide: async args => { calls.push(args); return {}; } },
    record: (agent, decision) => recorded.push(decision),
  });

  const result = await kind.act({}, proposal(['s1', 's2']), 'accept-all');

  assert.equal(result.status, 'settled');
  assert.equal(result.decision.phase, 'accepted');
  assert.deepEqual(result.decision.data, { docId: 'doc-1', accepted: 2, failed: 0 });
  assert.deepEqual(calls.map(call => call.operationId), ['cospace-review:card-1:s1', 'cospace-review:card-1:s2']);
  // A retried action replays the same operation; it never decides twice.
  await kind.act({}, proposal(['s1']), 'accept-all');
  assert.equal(calls[2].operationId, 'cospace-review:card-1:s1');
  assert.equal(recorded.length, 2);
});

test('a partly refused card reports what failed instead of claiming success', async () => {
  const recorded = [];
  const kind = createReviewCardKind({
    space: {
      decide: async ({ suggestionId }) => {
        if (suggestionId === 'conflicted') throw Object.assign(new Error('conflict'), { code: 'OVERLAPPING_SUGGESTION' });
        return {};
      },
    },
    record: (agent, decision) => recorded.push(decision),
  });

  const result = await kind.act({}, proposal(['ok', 'conflicted']), 'accept-all');

  assert.equal(result.decision.phase, 'partial');
  assert.deepEqual(result.decision.data, { docId: 'doc-1', accepted: 1, failed: 1 });
  assert.equal(recorded.length, 1);
});

test('details reject cards without suggestions and extra fields', () => {
  const kind = createReviewCardKind({ space: { decide: async () => ({}) }, record: () => {} });
  assert.equal(kind.details.safeParse({ docId: 'doc-1', suggestionIds: [] }).success, false);
  assert.equal(kind.details.safeParse({ docId: 'doc-1', suggestionIds: ['s'], extra: true }).success, false);
  assert.equal(kind.details.safeParse({ docId: 'doc-1', suggestionIds: ['s'] }).success, true);
  assert.deepEqual(kind.dismissal(proposal(['s1'])), { docId: 'doc-1' });
});

test('registration wires the kind and a model-only skill that states the fence', async () => {
  const registered = [];
  const providers = [];
  const cards = {
    register: kind => { registered.push(kind); return () => {}; },
    record: () => {},
    skillProvider: (candidate, get) => () => ({ name: candidate.provider, list: async () => [candidate], get }),
  };
  const skills = { registerProvider: create => { providers.push(create({ signal: new AbortController().signal })); return () => {}; } };
  const scope = {
    actionCards: cards, skills,
    effect: fn => { fn(); return () => {}; },
    inject: (names, cb) => { if (names.includes('skills')) cb(scope); return () => {}; },
  };
  const ctx = { inject: (names, cb) => { if (names.includes('actionCards')) cb(scope); return () => {}; } };

  registerReviewCard(ctx, { space: { decide: async () => ({}) } });

  assert.equal(registered[0].action, REVIEW_CARD_ACTION);
  assert.equal(providers.length, 1);
  const [candidate] = await providers[0].list();
  assert.equal(candidate.invocation.modelInvocable, true);
  assert.equal(candidate.invocation.userInvocable, false);
  const definition = await providers[0].get(candidate);
  assert.match(definition.content, /```action-card/);
  assert.match(definition.content, /cospace-review/);
});
