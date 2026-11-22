const content = '# Review sample\n\nThe quick brown fox jumps over the lazy dog.';
const proposal = (id, from, to, expected, replacement) => ({
  id,
  status: 'pending',
  from,
  to,
  expected,
  replacement,
  author: 'Agent',
  createdAt: '2026-11-22T08:30:00.000Z',
});

module.exports = {
  content,
  suggestions: [
    proposal(1, content.indexOf('quick '), content.indexOf('quick ') + 6, 'quick ', ''),
    proposal(2, content.indexOf('brown'), content.indexOf('brown') + 5, 'brown', 'sleepy'),
    proposal(3, content.indexOf('dog.') + 4, content.indexOf('dog.') + 4, '', ' And stays curious.'),
  ],
};
