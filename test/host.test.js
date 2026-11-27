import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {createHostApi} from '../packages/host-api/src/index.js';
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
   assert.equal(sent.length,1);assert.equal(sent[0].sessionId,'session-1');assert.match(sent[0].content[0].text,/^space:d\n/);assert.match(sent[0].content[0].text,/space_document_read/);assert.match(sent[0].content[0].text,/space_comment_complete/);assert.doesNotMatch(sent[0].content[0].text,/clarify/);assert.match(sent[0].content[0].text,new RegExp(note.id));
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
   assert.equal(doc.content,'# 未命名文档\n\n\n');
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
 const context={window:{__ModuleLoader__:{load:value=>{descriptor=value}}},document:{createElement:()=>({}),documentElement:{style:{}},body:{style:{}},head:{append:()=>{}}},console};
 vm.runInNewContext(bundle,context);
 const react={createContext(){return {}},forwardRef(fn){return fn},createElement(){},useCallback(){},useEffect(){},useMemo(){},useRef(){},useState(){},useSyncExternalStore(){}};
 const plugin=descriptor.factory(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx(){},jsxs(){}}:{});
 const registrations=[],sources=[],commands=[],rules=[],tabTypes=[],opened=[],cardBodies=[];
 const ctx={uiSession:{adapter:{current:{}}},actionCards:{register:descriptor=>{cardBodies.push(descriptor);return ()=>{}}},sidebarRight:{openResource:address=>{opened.push(address)}},sidebarRightTabs:{register:definition=>{tabTypes.push(definition);return ()=>{}}},uiConversation:{userText:{register:rule=>{rules.push(rule);return ()=>{}}}},slots:{inject:(_name,fn)=>fn(),register:(options,component)=>{registrations.push({options,component});return ()=>{}}},inputTriggers:{registerSource:source=>{sources.push(source);return ()=>{}}},commandUi:{register:command=>{commands.push(command);return ()=>{}}},locale:{bind:()=>key=>key,register:()=>()=>{}},sessions:{},conversation:{},get:()=>undefined,inject:(_deps,fn)=>fn(ctx),effect:fn=>fn()};
 plugin.apply(ctx);
 assert.ok(registrations.some(x=>x.options.name==='main'&&x.options.key==='spaces'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.panellist'&&x.options.id==='spaces'));
 assert.ok(registrations.some(x=>x.options.name==='conversation.user.text.node'&&x.options.key==='space-document'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.right.pane.tab'&&x.options.key==='dsh-plugin-space'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.right.pane.tab.title'&&x.options.key==='dsh-plugin-space'));
 assert.equal(tabTypes[0].kind,'space-document');
 assert.equal(tabTypes[0].patterns[0],'dsh-resource://space/**');
 const card=registrations.find(x=>x.options.name==='conversation.user.text.node'&&x.options.key==='space-document');
 card.options.inject().adapter.navigation.openDocument('doc-1');
 assert.deepEqual(opened,['dsh-resource://space/doc-1']);
 const rule=rules.find(x=>x.id==='space-document');assert.ok(rule);
 const node=rule.match('space:doc-1 请改写',0);assert.equal(node.id,'space-document');assert.equal(node.start,0);assert.equal(node.end,11);assert.equal(node.data.docId,'doc-1');
 assert.equal(rule.match('前面 space:doc-1。后面',0).data.docId,'doc-1');
 assert.equal(rule.match('xspace:doc-1',0),undefined);
 assert.equal(commands[0].name,'space');assert.equal(typeof commands[0].icon,'function');assert.equal(await sources[0].codec.serialize('space:one%20two'),'space:one%20two');
 assert.equal(sources[0].openReference({}, {ref:'space:doc-2'}), true);assert.equal(opened.at(-1),'dsh-resource://space/doc-2');
 // The @ menu inserts through the shared reference payload.
 assert.equal(typeof sources[0].candidates,'function');
 const picked=sources[0].onPick({candidate:{name:'doc-9',label:'文档九',value:'doc-9'}});
 // A chip routes to its source by name, so the payload must carry that exact name.
 assert.equal(picked.insert.source,sources[0].name);assert.equal(picked.insert.ref,'space:doc-9');assert.equal(picked.insert.label,'文档九');assert.equal(picked.insert.appearance,'file');
 // One right-sidebar tab per document, retained across tab switches.
 assert.equal(tabTypes[0].multiple,true);
 assert.equal(tabTypes[0].keepMounted,true);
 // /space opens the themed picker for the captured Session; the overlay owns the dialog.
 const overlay=registrations.find(x=>x.options.name==='shell.overlay');
 assert.ok(overlay);assert.equal(overlay.options.id,'dsh-plugin-space');
 const injected=overlay.options.inject();
 const closed=injected.picker.getSnapshot();assert.equal(closed.open,false);assert.equal(closed.sessionId,null);
 commands[0].ui.run({sessionId:'session-1'});
 const openedPicker=injected.picker.getSnapshot();assert.equal(openedPicker.open,true);assert.equal(openedPicker.sessionId,'session-1');
 // P2: the review page's prompts entry, the per-tool cards and the tab menu.
 const adapter=card.options.inject().adapter;
 assert.equal(adapter.prompts.mcpReady,true);
 assert.equal(adapter.navigation.getDocumentId(),null);
 adapter.navigation.setDocumentId('doc-3');
 assert.equal(adapter.navigation.getDocumentId(),'doc-3');
 let followed=null;const unsubscribe=adapter.navigation.subscribeDocumentId(next=>{followed=next});
 adapter.navigation.openDocumentInPage('doc-4');
 assert.equal(followed,'doc-4');unsubscribe();
 assert.deepEqual(registrations.filter(x=>x.options.name==='tool.call.toolview').map(x=>x.options.key),
   ['mcp__space__space_document_read','mcp__space__space_suggest','mcp__space__space_suggestion_list']);
 assert.deepEqual(registrations.filter(x=>x.options.name==='sidebar.right.tab.menu.item').map(x=>x.options.id),
   ['space-copy-reference','space-copy-link','space-open-in-page','space-export-markdown','space-export-docx']);
 assert.equal(cardBodies.length,1);assert.equal(cardBodies[0].action,'cospace-review');assert.equal(typeof cardBodies[0].Body,'function');
});

test('plugin registers MCP and web route against the same home and disposes them', async () => {
  const { apply, mcpReady } = await import('../adapters/dsh/index.js');
  const home = mkdtempSync(path.join(tmpdir(), 'space-apply-'));
  const old = process.env.DSH_SPACE_HOME;
  process.env.DSH_SPACE_HOME = home;
  const regs = [];
  const disposers = [];
  const kinds = [];
  const providers = [];
  const tools = { get: name => (name === 'mcp__space__space_document_read' ? {} : undefined) };
  const ctx = {
    get: name => (name === 'tools' ? tools : undefined),
    inject: (_deps, fn) => fn(ctx),
    effect: fn => { disposers.push(fn()); },
    mcpManager: { register: (name, config) => { regs.push({ name, config }); return () => {}; } },
    webServer: { register: route => { regs.push({ route }); return () => {}; } },
    actionCards: {
      register: kind => { kinds.push(kind); return () => {}; },
      record: () => {},
      skillProvider: (candidate, get) => () => ({ name: candidate.provider, list: async () => [candidate], get }),
    },
    skills: { registerProvider: create => { providers.push(create({ signal: new AbortController().signal })); return () => {}; } },
  };

  try {
    apply(ctx);
    assert.equal(regs[0].name, 'space');
    assert.equal(regs[0].config.env.DSH_SPACE_HOME, home);
    assert.equal(regs[0].config.toolLoading, 'eager');
    const mcpEntry = regs[0].config.args[0];
    assert.equal(path.basename(path.dirname(mcpEntry)), 'server');
    assert.equal(path.basename(mcpEntry), 'mcp-entry.js');
    assert.equal(regs[1].route.path, '/cospace-api');
    // Readiness follows the tool registry, so the review page hides its prompt
    // entry exactly when the MCP tools are missing.
    assert.equal(mcpReady(ctx), true);
    assert.equal(mcpReady({ get: () => ({ get: () => undefined }) }), false);
    assert.equal(mcpReady({ get: () => undefined }), true);
    // The review card kind and its model-only skill are registered on the same
    // document service as the UI API.
    assert.equal(kinds.length, 1);
    assert.equal(kinds[0].action, 'cospace-review');
    assert.deepEqual(Object.keys(kinds[0].verbs), ['accept-all']);
    assert.equal(providers.length, 1);
    const [skill] = await providers[0].list();
    assert.equal(skill.invocation.userInvocable, false);
    const definition = await providers[0].get(skill);
    assert.match(definition.content, /"action":"cospace-review"/);
  } finally {
    for (const dispose of disposers.reverse()) dispose?.();
    if (old === undefined) delete process.env.DSH_SPACE_HOME;
    else process.env.DSH_SPACE_HOME = old;
    rmSync(home, { recursive: true, force: true });
  }
});

test('the UI can read the signed-in account without exposing credentials', async () => {
  const home = mkdtempSync(path.join(tmpdir(), 'space-user-'));
  const host = createHostApi({ home, getUser: async () => ({ signedIn: true, name: 'Ada', avatarUrl: 'https://example.com/a.png' }) });
  const failing = createHostApi({ home, getUser: async () => { throw new Error('offline'); } });
  const localized = createHostApi({ home, getUser: async locale => ({ signedIn: true, locale }) });
  try {
    assert.deepEqual(await host.dispatch('getUser'), { signedIn: true, name: 'Ada', avatarUrl: 'https://example.com/a.png' });
    assert.equal(await failing.dispatch('getUser'), null);
    // The caller's UI language reaches the account reader unchanged.
    assert.deepEqual(await localized.dispatch('getUser', { locale: 'en' }), { signedIn: true, locale: 'en' });
  } finally { host.close(); failing.close(); localized.close(); rmSync(home, { recursive: true, force: true }); }
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

test('the UI can ask the host whether its MCP tools are ready', async () => {
  const home=mkdtempSync(path.join(tmpdir(),'space-status-'));
  const ready=createHostApi({home,status:async()=>({mcpReady:true})});
  const cold=createHostApi({home,status:async()=>({mcpReady:false})});
  const plain=createHostApi({home});
  try {
    assert.deepEqual(await ready.dispatch('status'),{mcpReady:true});
    assert.deepEqual(await cold.dispatch('status'),{mcpReady:false});
    assert.deepEqual(await plain.dispatch('status'),{});
  } finally {ready.close();cold.close();plain.close();rmSync(home,{recursive:true,force:true});}
});
