import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCommentRange,quoteOccurrenceRange,quoteOffsets} from '../packages/review-ui/src/comment-range.js';

test('normalizeCommentRange trims whitespace around an interior anchor',()=>{
 const content='  hello world  ';
 assert.deepEqual(normalizeCommentRange(content,0,content.length),{from:2,to:13});
 assert.equal(content.slice(2,13),'hello world');
});

test('normalizeCommentRange trims a multiline selection down to its text',()=>{
 const content='# Title\n\n  hello world  \n\nend';
 const from=content.indexOf('  hello');
 const to=content.indexOf('end');
 assert.deepEqual(normalizeCommentRange(content,from,to),{from:from+2,to:to-4});
 assert.equal(content.slice(from+2,to-4),'hello world');
});

test('normalizeCommentRange rejects whitespace-only and empty ranges',()=>{
 assert.equal(normalizeCommentRange('  \n\t  ',0,6),null);
 assert.equal(normalizeCommentRange('a b',1,2),null);
 assert.equal(normalizeCommentRange('abc',1,1),null);
});

test('normalizeCommentRange swaps reversed boundaries',()=>{
 const content='hello world';
 assert.deepEqual(normalizeCommentRange(content,8,1),{from:1,to:8});
 assert.equal(content.slice(1,8),'ello wo');
});

test('normalizeCommentRange rejects ranges that split a surrogate pair',()=>{
 const content='A\uD83D\uDE00 B';
 assert.equal(content.length,5);
 assert.equal(normalizeCommentRange(content,2,5),null);
 assert.equal(normalizeCommentRange(content,0,2),null);
});

test('normalizeCommentRange accepts boundaries on either side of a surrogate pair',()=>{
 const content='A\uD83D\uDE00 B';
 assert.deepEqual(normalizeCommentRange(content,1,3),{from:1,to:3});
 assert.equal(content.slice(1,3),'\uD83D\uDE00');
 assert.deepEqual(normalizeCommentRange(content,3,5),{from:4,to:5});
 assert.equal(content.slice(4,5),'B');
});

test('normalizeCommentRange rejects non-integer boundaries and empty content',()=>{
 assert.equal(normalizeCommentRange('abc',0.5,2),null);
 assert.equal(normalizeCommentRange('abc','0',2),null);
 assert.equal(normalizeCommentRange('abc',0,NaN),null);
 assert.equal(normalizeCommentRange('',0,0),null);
 assert.equal(normalizeCommentRange(null,0,1),null);
});

test('quoteOffsets finds non-overlapping occurrences and rejects invalid input',()=>{
 assert.deepEqual(quoteOffsets('aaaa','aa'),[0,2]);
 assert.deepEqual(quoteOffsets('abababa','aba'),[0,4]);
 assert.deepEqual(quoteOffsets('abc','zz'),[]);
 assert.deepEqual(quoteOffsets('abc',''),[]);
 assert.deepEqual(quoteOffsets(null,'a'),[]);
 assert.deepEqual(quoteOffsets('abc',null),[]);
});

test('quoteOccurrenceRange resolves first and nth occurrences, rejects bad indexes',()=>{
 const text='ab ab ab';
 assert.deepEqual(quoteOccurrenceRange(text,'ab'),{from:0,to:2});
 assert.deepEqual(quoteOccurrenceRange(text,'ab',null),{from:0,to:2});
 assert.deepEqual(quoteOccurrenceRange(text,'ab',1),{from:3,to:5});
 assert.deepEqual(quoteOccurrenceRange(text,'ab',2),{from:6,to:8});
 assert.equal(quoteOccurrenceRange(text,'ab',3),null);
 assert.equal(quoteOccurrenceRange(text,'ab',-1),null);
 assert.equal(quoteOccurrenceRange(text,'ab',1.5),null);
 assert.equal(quoteOccurrenceRange(text,'ab','1'),null);
});

test('quoteOccurrenceRange returns null when the quote is missing or empty',()=>{
 assert.equal(quoteOccurrenceRange('abc','zz'),null);
 assert.equal(quoteOccurrenceRange('abc','zz',0),null);
 assert.equal(quoteOccurrenceRange('abc',''),null);
});

test('second repeated phrase in multiline Markdown is located and trimmed',()=>{
 const content='# Heading\n\nFirst alpha here.\n\nSecond alpha there.\n';
 const second=quoteOccurrenceRange(content,'alpha',1);
 assert.ok(second);
 assert.equal(second.from,content.lastIndexOf('alpha'));
 const normalized=normalizeCommentRange(content,second.from-1,second.to+1);
 assert.ok(normalized);
 assert.equal(content.slice(normalized.from,normalized.to),'alpha');
});
