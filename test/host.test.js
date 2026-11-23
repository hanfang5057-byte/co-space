import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {createHostApi} from '../adapters/dsh/server/host.js';
import {createHttpHandler} from '../packages/transport-http/http-handler.js';
import {documentFromMarkdown, SpaceService} from '../packages/review-core/src/space-service.js';

test('host comment bridge requires explicit action and treats unconfirmed receipt as unknown',async()=>{
 const home=mkdtempSync(path.join(tmpdir(),'space-host-'));let sent=[];
 const host=createHostApi({home,prompt:async req=>{sent.push(req);return {accepted:false};}});
 try {
   // Agent creates through its service; this opens the same SQLite file.
   const {SpaceService}=await import('../packages/review-core/src/space-service.js');const service=new SpaceService(home);
   service.createDocument({id:'d',content:documentFromMarkdown('abcd'),operationId:'create'});service.close();
   const note=await host.dispatch('createComment',{docId:'d',quote:'ab',body:'clarify',anchor:{from:0,to:2,version:0}});
   assert.equal(sent.length,0);
   const payload={docId:'d',sessionId:'session-1',commentIds:[note.id],operationId:'send-1'};
   assert.equal((await host.dispatch('sendComments',payload)).status,'unknown');
   assert.equal(sent.length,1);assert.equal(sent[0].sessionId,'session-1');assert.match(sent[0].content[0].text,/^space:d\n/);assert.match(sent[0].content[0].text,/space_document_read/);assert.match(sent[0].content[0].text,/space_comment_complete/);assert.doesNotMatch(sent[0].content[0].text,/clarify/);assert.doesNotMatch(sent[0].content[0].text,new RegExp(note.id));
   assert.equal((await host.dispatch('sendComments',payload)).status,'unknown');assert.equal(sent.length,1);
 } finally {host.close();rmSync(home,{recursive:true,force:true});}
});

test('HTTP route uses actual service and blocks unknown methods',async()=>{
 const home=mkdtempSync(path.join(tmpdir(),'space-http-'));const host=createHostApi({home,prompt:async()=>({accepted:true})});
 try {
   const handler=createHttpHandler(host);
   const invoke=async(method,body)=>{
     let output='',status;
     const req={method,async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body));}};
     const res={writeHead(code){status=code;},end(value){output=value;}};
     await handler(req,res);
     return {status,body:JSON.parse(output)};
   };
   assert.deepEqual((await invoke('POST',{method:'listDocuments'})).body.result,[]);
   const error=await invoke('POST',{method:'writeDocument'});assert.equal(error.status,400);assert.equal(error.body.error.code,'METHOD_NOT_FOUND');
   assert.equal((await invoke('GET',{})).status,405);
 } finally {host.close();rmSync(home,{recursive:true,force:true});}
});

test('UI creates an untitled document with an empty body and replays its operation',async()=>{
 const home=mkdtempSync(path.join(tmpdir(),'space-create-'));
 const host=createHostApi({home,prompt:async()=>({accepted:true})});
 try {
   const first=await host.dispatch('createDocument',{title:'未命名文档',operationId:'ui-create-1'});
   assert.equal(first.id,'doc-ui-create-1');assert.equal(first.title,'未命名文档');
   const list=await host.dispatch('listDocuments');assert.equal(list.length,1);assert.equal(list[0].title,'未命名文档');
   const doc=await host.dispatch('readDocument',{docId:first.id});
   assert.equal(doc.content,'# 未命名文档\n\n');
   const again=await host.dispatch('createDocument',{title:'未命名文档',operationId:'ui-create-1'});
   assert.equal(again.id,first.id);assert.equal((await host.dispatch('listDocuments')).length,1);
   const second=await host.dispatch('createDocument',{title:'未命名文档',operationId:'ui-create-2'});
   assert.notEqual(second.id,first.id);assert.equal((await host.dispatch('listDocuments')).length,2);
   await assert.rejects(host.dispatch('createDocument',{title:'  ',operationId:'ui-create-empty'}),/Title required/);
 } finally {host.close();rmSync(home,{recursive:true,force:true});}
});

test('client bundle registers Space panel, picker action, and reference serialization',async()=>{
 const {readFile}=await import('node:fs/promises');const vm=await import('node:vm');
 const bundle=await readFile(new URL('../adapters/dsh/client.js',import.meta.url),'utf8');let descriptor;
 const context={window:{__ModuleLoader__:{load:value=>{descriptor=value}}},document:{createElement:()=>({}),head:{append:()=>{}}},console};
 vm.runInNewContext(bundle,context);
 const react={createContext(){return {}},forwardRef(fn){return fn},createElement(){},useCallback(){},useEffect(){},useMemo(){},useRef(){},useState(){},useSyncExternalStore(){}};
 const plugin=descriptor.factory(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx(){},jsxs(){}}:{});
 const registrations=[],sources=[],commands=[],rules=[],tabTypes=[],opened=[];
 const ctx={uiSession:{adapter:{current:{}}},sidebarRight:{openResource:address=>{opened.push(address)}},sidebarRightTabs:{register:definition=>{tabTypes.push(definition);return ()=>{}}},uiConversation:{userText:{register:rule=>{rules.push(rule);return ()=>{}}}},slots:{inject:(_name,fn)=>fn(),register:(options,component)=>{registrations.push({options,component});return ()=>{}}},inputTriggers:{registerSource:source=>{sources.push(source);return ()=>{}}},commandUi:{register:command=>{commands.push(command);return ()=>{}}},locale:{bind:()=>key=>key,register:()=>()=>{}},sessions:{},conversation:{},get:()=>undefined,inject:(_deps,fn)=>fn(ctx),effect:fn=>fn()};
 plugin.apply(ctx);
 assert.ok(registrations.some(x=>x.options.name==='main'&&x.options.key==='spaces'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.panellist'&&x.options.id==='spaces'));
 assert.ok(registrations.some(x=>x.options.name==='conversation.user.text.node'&&x.options.key==='space-document'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.right.pane.tab'&&x.options.key==='dsh-plugin-space'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.right.pane.tab.title'&&x.options.key==='dsh-plugin-space'));
 assert.equal(tabTypes[0].kind,'space-document');
 assert.equal(tabTypes[0].patterns[0],'dsh-resource://space/**');
 const card=registrations.find(x=>x.options.name==='conversation.user.text.node'&&x.options.key==='space-document');
 card.options.inject().openDocument('doc-1');
 assert.deepEqual(opened,['dsh-resource://space/doc-1']);
 const rule=rules.find(x=>x.id==='space-document');assert.ok(rule);
 const node=rule.match('space:doc-1 请改写',0);assert.equal(node.id,'space-document');assert.equal(node.start,0);assert.equal(node.end,11);assert.equal(node.data.docId,'doc-1');
 assert.equal(rule.match('前面 space:doc-1。后面',0).data.docId,'doc-1');
 assert.equal(rule.match('xspace:doc-1',0),undefined);
 assert.equal(commands[0].name,'space');assert.equal(typeof commands[0].icon,'function');assert.equal(await sources[0].codec.serialize('space:one%20two'),'space:one%20two');
 assert.equal(sources[0].openReference({}, {ref:'space:doc-2'}), true);assert.equal(opened.at(-1),'dsh-resource://space/doc-2');
});

test('document picker inserts the checked documents into the bound conversation',async()=>{
 const {readFile}=await import('node:fs/promises');const vm=await import('node:vm');
 const bundle=await readFile(new URL('../adapters/dsh/client.js',import.meta.url),'utf8');let descriptor;
 class Element {
   constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.checked=false;this.value='';this.textContent='';}
   append(...children){this.children.push(...children);}
   addEventListener(type,listener){this.listeners[type]=listener;}
   setAttribute(){}
   showModal(){this.open=true;}
   close(){this.open=false;this.closed=true;}
   remove(){this.removed=true;}
   querySelectorAll(){return [];}
 }
 const elements=[];const modalRoot=[];const document={
   createElement(tag){const element=new Element(tag);elements.push(element);return element;},
   createTextNode(text){return {textContent:text};},
   body:{append(element){modalRoot.push(element);}},
   head:{append(){}},
 };
 const context={window:{__ModuleLoader__:{load:value=>{descriptor=value;}}},document,console,
   fetch:async()=>({ok:true,json:async()=>({result:[{id:'doc-1',title:'Selected document'}]})})};
 vm.runInNewContext(bundle,context);
 const react={createContext(){return {}},forwardRef(fn){return fn},createElement(){},useCallback(){},useEffect(){},useMemo(){},useRef(){},useState(){},useSyncExternalStore(){}};
 const client=descriptor.factory(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx(){},jsxs(){}}:{});
 const binding={ctx:{sessionId:'session-1'}};let inserted;let focused=false;
 // DSH's live SessionInput facade inserts a batch through addFiles(references, attachmentIds).
 const input={addFiles:(references,ids)=>{inserted={references,ids};return true;},focus:()=>{focused=true;}};
 const ctx={sessions:{binding:()=>binding},conversation:{input:{for:()=>input}}};
 await client.openSpacePicker(ctx,'session-1',key=>key);
 const checkbox=elements.find(element=>element.tagName==='input');checkbox.checked=true;
 const add=elements.find(element=>element.tagName==='button'&&element.textContent==='picker.add');
 add.listeners.click();
 assert.equal(inserted?.references.length,1);
 assert.equal(inserted?.references[0].ref,'space:doc-1');
 assert.equal(inserted?.ids.length,0);
 assert.equal(focused,true);
 assert.equal(modalRoot[0].closed,true);
});

test('document picker reports a failed insertion instead of throwing',async()=>{
  const {readFile}=await import('node:fs/promises');const vm=await import('node:vm');
  const bundle=await readFile(new URL('../adapters/dsh/client.js',import.meta.url),'utf8');let descriptor;
  class Element {
    constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.checked=false;this.value='';this.textContent='';}
    append(...children){this.children.push(...children);}
    addEventListener(type,listener){this.listeners[type]=listener;}
    setAttribute(){}
    showModal(){this.open=true;}
    close(){this.open=false;this.closed=true;}
    remove(){this.removed=true;}
    querySelectorAll(){return [];}
  }
  const elements=[];const modalRoot=[];const document={
    createElement(tag){const element=new Element(tag);elements.push(element);return element;},
    createTextNode(text){return {textContent:text};},
    body:{append(element){modalRoot.push(element);}},
    head:{append(){}},
  };
  const context={window:{__ModuleLoader__:{load:value=>{descriptor=value;}}},document,console,
    fetch:async()=>({ok:true,json:async()=>({result:[{id:'doc-1',title:'Selected document'}]})})};
  vm.runInNewContext(bundle,context);
  const react={createContext(){return {}},forwardRef(fn){return fn},createElement(){},useCallback(){},useEffect(){},useMemo(){},useRef(){},useState(){},useSyncExternalStore(){}};
  const client=descriptor.factory(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx(){},jsxs(){}}:{});
  const binding={ctx:{sessionId:'session-1'}};
  // A facade without the batch reference method must surface the failure note,
  // not throw out of the DOM click handler and leave the modal looking inert.
  const input={focus(){}};
  const ctx={sessions:{binding:()=>binding},conversation:{input:{for:()=>input}}};
  await client.openSpacePicker(ctx,'session-1',key=>key);
  const checkbox=elements.find(element=>element.tagName==='input');checkbox.checked=true;
  const add=elements.find(element=>element.tagName==='button'&&element.textContent==='picker.add');
  assert.doesNotThrow(()=>add.listeners.click());
  assert.equal(elements.find(element=>element.tagName==='p'&&element.textContent==='picker.failed')?.textContent,'picker.failed');
  assert.notEqual(modalRoot[0].closed,true);
});

test('plugin registers MCP and web route against the same home and disposes them', async () => {
 const {apply}=await import('../adapters/dsh/index.js'); const home=mkdtempSync(path.join(tmpdir(),'space-apply-')); const old=process.env.DSH_SPACE_HOME;process.env.DSH_SPACE_HOME=home;
 const regs=[],disposers=[];const ctx={get:()=>undefined,inject:(_deps,fn)=>fn(ctx),effect:fn=>{disposers.push(fn());},mcpManager:{register:(name,config)=>{regs.push({name,config});return()=>{};}},webServer:{register:route=>{regs.push({route});return()=>{};}}};
 try {apply(ctx);assert.equal(regs[0].name,'space');assert.equal(regs[0].config.env.DSH_SPACE_HOME,home);assert.equal(regs[0].config.toolLoading,'eager');assert.match(regs[0].config.args[0],/server\/mcp-entry\.js$/);assert.equal(regs[1].route.path,'/cospace-api');}
 finally {for(const d of disposers.reverse())d?.(); if(old===undefined)delete process.env.DSH_SPACE_HOME;else process.env.DSH_SPACE_HOME=old;rmSync(home,{recursive:true,force:true});}
});

test('the UI can read the signed-in account without exposing credentials', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-user-'));
  const host = createHostApi({ home, getUser: async () => ({ signedIn: true, name: 'Ada', avatarUrl: 'https://example.com/a.png' }) });
  const failing = createHostApi({ home, getUser: async () => { throw new Error('offline'); } });
  try {
    assert.deepEqual(await host.dispatch('getUser'), { signedIn: true, name: 'Ada', avatarUrl: 'https://example.com/a.png' });
    assert.equal(await failing.dispatch('getUser'), null);
  } finally { host.close(); failing.close(); rmSync(home, { recursive: true, force: true }); }
});

test('sending without a conversation resolves a target once and reuses it on retry', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-target-'));
  const sent = [];
  let resolved = 0;
  const host = createHostApi({
    home,
    prompt: async request => { sent.push(request); return { accepted: true }; },
    resolveTarget: async () => {
      resolved++;
      return { sessionId: 'created-session', created: true, workspace: { workspaceId: 'w1', title: 'Workspace' } };
    },
  });
  try {
    const service = (await import('../packages/review-core/src/space-service.js')).SpaceService;
    const docs = new service(home);
    docs.createDocument({ id: 'd', content: '# D\n\nhello', operationId: 'create' });
    docs.close();
    const note = await host.dispatch('createComment', { docId: 'd', quote: 'hello', body: 'clarify', anchor: { from: 5, to: 10, version: 0 } });
    const payload = { docId: 'd', commentIds: [note.id], operationId: 'send-no-session' };
    const first = await host.dispatch('sendComments', payload);
    assert.equal(first.status, 'sent');
    assert.equal(first.sessionId, 'created-session');
    assert.equal(first.createdSession, true);
    assert.equal(first.workspace.workspaceId, 'w1');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].sessionId, 'created-session');
    assert.match(sent[0].content[0].text,/space_comment_complete/);
    assert.doesNotMatch(sent[0].content[0].text,/clarify/);
    assert.equal(resolved, 1);
    const retry = await host.dispatch('sendComments', payload);
    assert.equal(retry.status, 'sent');
    assert.equal(retry.sessionId, 'created-session');
    assert.equal(sent.length, 1);
    assert.equal(resolved, 1);
  } finally { host.close(); rmSync(home, { recursive: true, force: true }); }
});

test('document deletion removes comments in one transaction and preserves data when sending', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-delete-'));
  const host = createHostApi({ home, prompt: async () => ({ accepted: true }) });
  try {
    const created = await host.dispatch('createDocument', { title: 'Delete me', operationId: 'delete-create' });
    const doc = await host.dispatch('readDocument', { docId: created.id });
    const quote = 'Delete me';
    const note = await host.dispatch('createComment', { docId: created.id, quote, body: 'retain?', anchor: { from: 2, to: 2 + quote.length, version: doc.version } });
    const db = new DatabaseSync(path.join(home, 'review.sqlite'));
    try {
      db.exec("CREATE TRIGGER reject_document_delete BEFORE DELETE ON review_documents BEGIN SELECT RAISE(ABORT, 'injected delete failure'); END;");
      await assert.rejects(host.dispatch('deleteDocument', { docId: created.id }));
      assert.equal(db.prepare('SELECT id FROM review_documents WHERE id=?').get(created.id)?.id, created.id);
      assert.equal(db.prepare('SELECT id FROM space_comments WHERE id=?').get(note.id)?.id, note.id);
      db.exec('DROP TRIGGER reject_document_delete');
      db.prepare("UPDATE space_comments SET status='sending' WHERE id=?").run(note.id);
      await assert.rejects(host.dispatch('deleteDocument', { docId: created.id }), error => error.code === 'COMMENT_BUSY');
      assert.equal(db.prepare('SELECT id FROM review_documents WHERE id=?').get(created.id)?.id, created.id);
      assert.equal(db.prepare('SELECT id FROM space_comments WHERE id=?').get(note.id)?.id, note.id);
      db.prepare("UPDATE space_comments SET status='pending' WHERE id=?").run(note.id);
    } finally { db.close(); }
    assert.deepEqual(await host.dispatch('deleteDocument', { docId: created.id }), { id: created.id, deleted: true });
    const verify = new DatabaseSync(path.join(home, 'review.sqlite'));
    try {
      assert.equal(verify.prepare('SELECT id FROM review_documents WHERE id=?').get(created.id), undefined);
      assert.equal(verify.prepare('SELECT id FROM space_comments WHERE id=?').get(note.id), undefined);
    } finally { verify.close(); }
  } finally { host.close(); rmSync(home, { recursive: true, force: true }); }
});

test('unsupported unmarked databases fail closed without dropping legacy tables', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-schema-'));
  const db = new DatabaseSync(path.join(home, 'review.sqlite'));
  db.exec("CREATE TABLE review_documents(id TEXT PRIMARY KEY, version INTEGER NOT NULL, content TEXT NOT NULL); INSERT INTO review_documents VALUES('legacy',0,'keep me');");
  db.close();
  try {
    assert.throws(() => new SpaceService(home), error => error.code === 'UNSUPPORTED_SCHEMA');
    const verify = new DatabaseSync(path.join(home, 'review.sqlite'));
    try { assert.equal(verify.prepare('SELECT content FROM review_documents WHERE id=?').get('legacy')?.content, 'keep me'); }
    finally { verify.close(); }
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('new conversation choice resolves a different target and preserves it on replay', async () => {
  const home=mkdtempSync(path.join(tmpdir(),'space-new-target-'));const resolved=[],sent=[];
  const host=createHostApi({home,resolveTarget:async request=>{resolved.push(request);return {sessionId:'new',created:true};},prompt:async request=>{sent.push(request);return {accepted:true};}});
  try {
    const service=new SpaceService(home);service.createDocument({id:'d',content:'# D\n\nhello',operationId:'create'});service.close();
    const comment=await host.dispatch('createComment',{docId:'d',quote:'hello',body:'review',anchor:{from:5,to:10,version:0}});
    const payload={docId:'d',commentIds:[comment.id],newSessionFrom:'current',forceNew:true,operationId:'new-send'};
    const result=await host.dispatch('sendComments',payload);
    assert.equal(result.sessionId,'new');assert.equal(sent[0].sessionId,'new');
    assert.deepEqual(resolved,[{operationId:'new-send',forceNew:true,excludeSessionId:'current'}]);
    await host.dispatch('sendComments',payload);assert.equal(resolved.length,1);assert.equal(sent.length,1);
  } finally {host.close();rmSync(home,{recursive:true,force:true});}
});
