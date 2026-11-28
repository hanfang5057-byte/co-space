import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {ReviewStore} from '../packages/review-core/src/review-core.js';
import {SpaceService,documentFromMarkdown} from '../packages/review-core/src/space-service.js';
import {CommentStore} from '../packages/review-core/src/comments.js';
import {renderMarkdown} from '../packages/review-ui/src/markdown.js';
const err=code=>e=>e.code===code;

test('Markdown source is persisted; independent suggestions map and apply in any order',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'md-core-'));let store;
 try {store=new ReviewStore(path.join(dir,'review.sqlite'));const md='# Title\n\n- apple\n- pear\n';store.createDocument({id:'d',content:md,operationId:'create'});
 const a=md.indexOf('apple'),p=md.indexOf('pear');
 const s1=store.propose({docId:'d',baseVersion:0,from:a,to:a+5,expected:'apple',replacement:'plum',author:'Claude',explanation:'用更贴切的词语替换。',operationId:'s1'});
 const metadata=store.readDocument('d').suggestions[0];assert.equal(metadata.author,'claude');assert.equal(metadata.explanation,'用更贴切的词语替换。');assert.ok(Number.isFinite(Date.parse(metadata.createdAt)));
 const s2=store.propose({docId:'d',baseVersion:0,from:p,to:p+4,expected:'pear',replacement:'fig',operationId:'s2'});
 assert.equal(store.readDocument('d').content,md);
 store.decide({docId:'d',suggestionId:s2.id,decision:'accept',operationId:'accept2'});
 let d=store.readDocument('d');assert.equal(d.suggestions[0].from,a);assert.equal(d.suggestions[0].expected,'apple');
 store.decide({docId:'d',suggestionId:s1.id,decision:'accept',operationId:'accept1'});
 assert.equal(store.readDocument('d').content,'# Title\n\n- plum\n- fig\n');
 } finally {store?.close();rmSync(dir,{recursive:true,force:true})}
});

test('suggestion metadata normalizes unknown Agents and validates concise explanations',()=>{
 const store=new ReviewStore(':memory:');
 try{store.createDocument({id:'d',content:'abc',operationId:'meta-create'});
  assert.throws(()=>store.propose({docId:'d',baseVersion:0,from:0,to:1,expected:'a',replacement:'A',author:'codex',explanation:'x'.repeat(201),operationId:'too-long'}),err('INVALID_INPUT'));
  const proposal=store.propose({docId:'d',baseVersion:0,from:0,to:1,expected:'a',replacement:'A',author:'unknown-agent',operationId:'legacy-agent'});
  assert.equal(proposal.suggestion.author,'agent');
  assert.equal(proposal.suggestion.explanation,'');
 }finally{store.close()}
});

test('same-point insertions keep creation order regardless of decision order',()=>{
 for(const decisions of [['second','first'],['first','second']]){
  const s=new ReviewStore(':memory:');try{s.createDocument({id:'d',content:'ab',operationId:'c'});
  const first=s.propose({docId:'d',baseVersion:0,from:1,to:1,expected:'',replacement:'B',operationId:'first'});
  const second=s.propose({docId:'d',baseVersion:0,from:1,to:1,expected:'',replacement:'C',operationId:'second'});
  const byName={first,second};
  decisions.forEach((name,index)=>s.decide({docId:'d',suggestionId:byName[name].id,decision:'accept',operationId:`decision-${index}`}));
  assert.equal(s.readDocument('d').content,'aBCb',`decision order ${decisions.join(' then ')}`);
  }finally{s.close()}
 }
});

test('overlap, stale content, surrogate split, idempotency and restart are guarded',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'md-guard-'));let s;
 try{s=new ReviewStore(path.join(dir,'db'));s.createDocument({id:'d',content:'A😀 B',operationId:'c'});
 const p=s.propose({docId:'d',baseVersion:0,from:4,to:5,expected:'B',replacement:'C',operationId:'p'});
 assert.throws(()=>s.propose({docId:'d',baseVersion:0,from:1,to:2,expected:'\ud83d',replacement:'x',operationId:'bad'}),err('INVALID_RANGE'));
 assert.throws(()=>s.propose({docId:'d',baseVersion:0,from:4,to:5,expected:'B',replacement:'x',operationId:'overlap'}),err('OVERLAPPING_SUGGESTION'));
 s.close();s=new ReviewStore(path.join(dir,'db'));assert.equal(s.readDocument('d').suggestions[0].id,p.id);
 const result=s.decide({docId:'d',suggestionId:p.id,decision:'accept',operationId:'yes'});assert.deepEqual(s.decide({docId:'d',suggestionId:p.id,decision:'accept',operationId:'yes'}),result);assert.equal(s.readDocument('d').content,'A😀 C');
 }finally{s?.close();rmSync(dir,{recursive:true,force:true})}
});

test('accepted Markdown replacement renders the same inline style as its pending preview',()=>{
 const store=new ReviewStore(':memory:');
 try {
  const content='# 行内样式\n\n普通、**粗体**、删除线。';
  store.createDocument({id:'d',content,operationId:'create-style'});
  const expected='**粗体**',from=content.indexOf(expected);
  const suggestion=store.propose({docId:'d',baseVersion:0,from,to:from+expected.length,expected,replacement:'**加粗文本**',operationId:'replace-style'});
  const before=store.readDocument('d');
  const preview=renderMarkdown(before.content,before.suggestions);
  assert.match(preview,/<strong><del[^>]*><strong>粗体<\/strong><\/del><ins[^>]*>加粗文本<\/ins><\/strong>/);
  assert.ok(preview.indexOf('加粗文本')<preview.indexOf('、删除线。'));

  const accepted=store.decide({docId:'d',suggestionId:suggestion.id,decision:'accept',operationId:'accept-style'});
  assert.equal(accepted.content,'# 行内样式\n\n普通、**加粗文本**、删除线。');
  const finalHtml=renderMarkdown(accepted.content);
  assert.match(finalHtml,/<strong><span[^>]*>加粗文本<\/span><\/strong>/);
  assert.doesNotMatch(finalHtml,/<(?:del|ins)\b/);
 } finally {store.close()}
});

test('Markdown comments use source offsets and rebase after accepted replacements',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'md-comment-'));let service,comments;
 try{service=new SpaceService(dir);comments=new CommentStore(path.join(dir,'review.sqlite'));const md=documentFromMarkdown('# X\n\n- alpha\n- beta\n');service.createDocument({id:'d',content:md,operationId:'c'});
 const at=md.indexOf('beta');const note=comments.create({docId:'d',quote:'beta',body:'note',anchor:{from:at,to:at+4,version:0}});
 const p=service.propose({docId:'d',baseVersion:0,from:md.indexOf('alpha'),to:md.indexOf('alpha')+5,expected:'alpha',replacement:'gamma',operationId:'p'});
 service.decide({docId:'d',suggestionId:p.id,decision:'accept',operationId:'a'});const after=comments.list('d').find(x=>x.id===note.id);assert.equal(after.stale,false);assert.equal(after.resolved.from,md.indexOf('beta'));
 }finally{comments?.close();service?.close();rmSync(dir,{recursive:true,force:true})}
});

test('comment completion links suggestions and replays idempotently',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'md-comment-complete-'));const service=new SpaceService(dir);
 try {
  service.createDocument({id:'d',content:'alpha beta',operationId:'create-comments'});
  const first=service.createComment({docId:'d',quote:'alpha',body:'Improve this',anchor:{from:0,to:5,version:0}});
  const second=service.createComment({docId:'d',quote:'beta',body:'Clarify this',anchor:{from:6,to:10,version:0}});
  const proposal=service.propose({docId:'d',baseVersion:0,from:0,to:5,expected:'alpha',replacement:'Alpha',operationId:'comment-proposal'});
  const otherProposal=service.propose({docId:'d',baseVersion:0,from:6,to:10,expected:'beta',replacement:'Beta',operationId:'comment-proposal-2'});
  const input={docId:'d',operationId:'complete-comments',results:[
   {commentId:first.id,suggestionIds:[proposal.suggestion.id]},
  ]};
  const result=service.completeCommentProcessing(input);
  assert.equal(result.replay,false);
  const doc=service.readDocument('d');
  assert.equal(doc.comments.find(comment=>comment.id===first.id).status,'processed');
  assert.deepEqual(doc.comments.find(comment=>comment.id===first.id).processing.suggestionIds,[proposal.suggestion.id]);
  assert.equal(doc.comments.find(comment=>comment.id===second.id).status,'pending');
  assert.deepEqual(service.completeCommentProcessing(input),{...result,replay:true});
  assert.throws(()=>service.completeCommentProcessing({...input,results:[{commentId:first.id,suggestionIds:[otherProposal.suggestion.id]}]}),err('OPERATION_ID_CONFLICT'));
  assert.throws(()=>service.completeCommentProcessing({docId:'d',operationId:'complete-again',results:[{commentId:first.id,suggestionIds:[proposal.suggestion.id]}]}),err('COMMENT_ALREADY_PROCESSED'));
 } finally {service.close();rmSync(dir,{recursive:true,force:true})}
});

test('unmarked review databases are rejected without deleting user data',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'md-unsupported-'));let s;
 try{
  s=new ReviewStore(path.join(dir,'db'));
  s.createDocument({id:'keep',content:'# Preserve me',operationId:'create-keep'});
  s.close();s=null;
  const {DatabaseSync}=await import('node:sqlite');
  const db=new DatabaseSync(path.join(dir,'db'));
  db.exec('DROP TABLE space_meta;');db.close();
  assert.throws(()=>new ReviewStore(path.join(dir,'db')),error=>error.code==='UNSUPPORTED_SCHEMA');
  const verify=new DatabaseSync(path.join(dir,'db'));
  try{assert.equal(verify.prepare('SELECT content FROM review_documents WHERE id=?').get('keep')?.content,'# Preserve me');}
  finally{verify.close();}
 }finally{s?.close();rmSync(dir,{recursive:true,force:true})}
});

test('version one databases migrate transactionally to version three',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'md-v1-migration-'));let store;
 try{
  const file=path.join(dir,'db');
  const legacy=new DatabaseSync(file);
  legacy.exec(`CREATE TABLE space_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    INSERT INTO space_meta VALUES('schema','markdown-text-v1');
    CREATE TABLE review_documents(id TEXT PRIMARY KEY,version INTEGER NOT NULL,content TEXT NOT NULL);
    INSERT INTO review_documents VALUES('kept',0,'# Kept');
    CREATE TABLE review_suggestions(id INTEGER PRIMARY KEY AUTOINCREMENT,doc_id TEXT NOT NULL,status TEXT NOT NULL,base_version INTEGER NOT NULL,from_pos INTEGER NOT NULL,to_pos INTEGER NOT NULL,expected TEXT NOT NULL,replacement TEXT NOT NULL,before_context TEXT NOT NULL,after_context TEXT NOT NULL,created_order INTEGER NOT NULL);
    INSERT INTO review_suggestions VALUES(7,'kept','pending',0,2,6,'Kept','Safe','##','',1);
    CREATE TABLE review_operations(id TEXT PRIMARY KEY,fingerprint TEXT NOT NULL,result TEXT NOT NULL);
    CREATE TABLE review_changes(doc_id TEXT NOT NULL,version INTEGER NOT NULL,from_pos INTEGER NOT NULL,to_pos INTEGER NOT NULL,inserted_length INTEGER NOT NULL,PRIMARY KEY(doc_id,version));`);
  legacy.close();
  store=new ReviewStore(path.join(dir,'db'));
  assert.equal(store.db.prepare("SELECT value FROM space_meta WHERE key='schema'").get().value,'markdown-text-v3');
  assert.equal(store.readDocument('kept').content,'# Kept');
  assert.deepEqual(store.readDocument('kept').suggestions.map(({id,author,createdAt,explanation})=>({id,author,createdAt,explanation})),[{id:7,author:'agent',createdAt:null,explanation:''}]);
  const backup=new DatabaseSync(path.join(dir,'db.pre-v3.bak'),{readOnly:true});
  try { assert.equal(backup.prepare('SELECT content FROM review_documents WHERE id=?').get('kept').content,'# Kept'); }
  finally { backup.close(); }
 }finally{store?.close();rmSync(dir,{recursive:true,force:true})}
});
