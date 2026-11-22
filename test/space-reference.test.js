import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  documentIdFromReference,
  documentIdFromResource,
  matchSpaceReference,
  spaceReferenceFor,
  spaceResourceFor,
} from '../client-src/space-reference.js';

test('reference tokens keep the MCP spelling while escaping the document id',()=>{
  assert.equal(spaceReferenceFor('doc-1'),'space:doc-1');
  assert.equal(spaceReferenceFor('one two'),'space:one%20two');
  assert.equal(documentIdFromReference('space:one%20two'),'one two');
  assert.equal(documentIdFromReference('file:///tmp/x'),null);
  assert.equal(documentIdFromReference('space:'),null);
  assert.equal(documentIdFromReference('space:%E4%B8%AD'),'中');
  assert.equal(documentIdFromReference('space:%E4%B8'),'%E4%B8');
});

test('the matcher finds a whole reference and stops at prose punctuation',()=>{
  assert.deepEqual(matchSpaceReference('space:doc-1 请修改',0),{
    id:'space-document',start:0,end:11,data:{docId:'doc-1'},
  });
  const punctuated=matchSpaceReference('请改 space:doc-1。后面保持',0);
  assert.equal(punctuated.data.docId,'doc-1');
  assert.equal(punctuated.start,3);
  assert.equal(punctuated.end,14);
  assert.equal(matchSpaceReference('请改 space:doc-1',3).data.docId,'doc-1');
  assert.equal(matchSpaceReference('前缀xspace:doc-1',0),undefined);
  assert.equal(matchSpaceReference('space: 后文',0),undefined);
  assert.equal(matchSpaceReference('space:%E4%B8%AD。',0).data.docId,'中');
});

test('right-Sidebar resource addresses round-trip the document id',()=>{
  assert.equal(spaceResourceFor('doc-1'),'dsh-resource://space/doc-1');
  assert.equal(spaceResourceFor('one two'),'dsh-resource://space/one%20two');
  assert.equal(documentIdFromResource('dsh-resource://space/one%20two'),'one two');
  assert.equal(documentIdFromResource('dsh-resource://file/session/s1/a.md'),null);
  assert.equal(documentIdFromResource('dsh-resource://space/'),null);
});
