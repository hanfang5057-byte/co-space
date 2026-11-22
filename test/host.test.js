import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHostApi,createHttpHandler} from '../server/host.js';
import {documentFromMarkdown} from '../src/space-service.js';

test('host comment bridge requires explicit action and treats unconfirmed receipt as unknown',async()=>{
 const home=mkdtempSync(path.join(tmpdir(),'space-host-'));let sent=[];
 const host=createHostApi({home,prompt:async req=>{sent.push(req);return {accepted:false};}});
 try {
   // Agent creates through its service; this opens the same SQLite file.
   const {SpaceService}=await import('../src/space-service.js');const service=new SpaceService(home);
   service.createDocument({id:'d',content:documentFromMarkdown('abcd'),operationId:'create'});service.close();
   const note=await host.dispatch('createComment',{docId:'d',quote:'ab',body:'clarify',anchor:{from:0,to:2,version:0}});
   assert.equal(sent.length,0);
   const payload={docId:'d',sessionId:'session-1',commentIds:[note.id],operationId:'send-1'};
   assert.equal((await host.dispatch('sendComments',payload)).status,'unknown');
   assert.equal(sent.length,1);assert.equal(sent[0].sessionId,'session-1');assert.match(sent[0].content[0].text,/clarify/);assert.match(sent[0].content[0].text,/^space:d\n/);assert.match(sent[0].content[0].text,/space_document_read/);assert.doesNotMatch(sent[0].content[0].text,/文档 ID|评论 ID/);assert.doesNotMatch(sent[0].content[0].text,new RegExp(note.id));
   assert.equal((await host.dispatch('sendComments',payload)).status,'unknown');assert.equal(sent.length,1);
 } finally {host.close();rmSync(home,{recursive:true,force:true});}
});

test('HTTP route uses actual service and blocks unknown methods',async()=>{
 const home=mkdtempSync(path.join(tmpdir(),'space-http-'));const host=createHostApi({home,prompt:async()=>({accepted:true})});
 const server=createServer(createHttpHandler(host));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
   const endpoint=`http://127.0.0.1:${server.address().port}/dsh-space-api`;
   const call=async method=>fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({method})});
   assert.deepEqual((await (await call('listDocuments')).json()).result,[]);
   const error=await call('writeDocument');assert.equal(error.status,400);assert.equal((await error.json()).error.code,'METHOD_NOT_FOUND');
 } finally {await new Promise(resolve=>server.close(resolve));host.close();rmSync(home,{recursive:true,force:true});}
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
 const bundle=await readFile(new URL('../client.js',import.meta.url),'utf8');let descriptor;
 const context={window:{__ModuleLoader__:{load:value=>{descriptor=value}}},document:{createElement:()=>({}),head:{append:()=>{}}},console};
 vm.runInNewContext(bundle,context);
 const react={createElement(){},useCallback(){},useEffect(){},useMemo(){},useRef(){},useState(){},useSyncExternalStore(){}};
 const plugin=descriptor.factory(name=>name==='react'?react:name==='react/jsx-runtime'?{jsx(){},jsxs(){}}:{});
 const registrations=[],sources=[],commands=[],rules=[],tabTypes=[],opened=[];
 const ctx={uiSession:{adapter:{current:{}}},sidebarRight:{openResource:address=>{opened.push(address)}},sidebarRightTabs:{register:definition=>{tabTypes.push(definition);return ()=>{}}},uiConversation:{userText:{register:rule=>{rules.push(rule);return ()=>{}}}},slots:{inject:(_name,fn)=>fn(),register:(options,component)=>{registrations.push({options,component});return ()=>{}}},inputTriggers:{registerSource:source=>{sources.push(source);return ()=>{}}},commandUi:{register:command=>{commands.push(command);return ()=>{}}},locale:{bind:()=>key=>key,register:()=>()=>{}},sessions:{},conversation:{},get:()=>undefined,inject:(_deps,fn)=>fn(ctx),effect:fn=>fn()};
 plugin.apply(ctx);
 assert.ok(registrations.some(x=>x.options.name==='main'&&x.options.key==='spaces'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.panellist'&&x.options.id==='spaces'));
 assert.ok(registrations.some(x=>x.options.name==='conversation.user.text.node'&&x.options.key==='space-document'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.right.pane.tab'&&x.options.key==='@local/dsh-space'));
 assert.ok(registrations.some(x=>x.options.name==='sidebar.right.pane.tab.title'&&x.options.key==='@local/dsh-space'));
 assert.equal(tabTypes[0].kind,'space-document');
 assert.equal(tabTypes[0].patterns[0],'dsh-resource://space/**');
 const card=registrations.find(x=>x.options.name==='conversation.user.text.node'&&x.options.key==='space-document');
 card.options.inject().openDocument('doc-1');
 assert.deepEqual(opened,['dsh-resource://space/doc-1']);
 const rule=rules.find(x=>x.id==='space-document');assert.ok(rule);
 const node=rule.match('space:doc-1 请改写',0);assert.equal(node.id,'space-document');assert.equal(node.start,0);assert.equal(node.end,11);assert.equal(node.data.docId,'doc-1');
 assert.equal(rule.match('前面 space:doc-1。后面',0).data.docId,'doc-1');
 assert.equal(rule.match('xspace:doc-1',0),undefined);
 assert.equal(commands[0].name,'space');assert.equal(await sources[0].codec.serialize('space:one%20two'),'space:one%20two');
 assert.equal(sources[0].openReference({}, {ref:'space:doc-2'}), true);assert.equal(opened.at(-1),'dsh-resource://space/doc-2');
});

test('plugin registers MCP and web route against the same home and disposes them', async () => {
 const {apply}=await import('../index.js'); const home=mkdtempSync(path.join(tmpdir(),'space-apply-')); const old=process.env.DSH_SPACE_HOME;process.env.DSH_SPACE_HOME=home;
 const regs=[],disposers=[];const ctx={get:()=>undefined,inject:(_deps,fn)=>fn(ctx),effect:fn=>{disposers.push(fn());},mcpManager:{register:(name,config)=>{regs.push({name,config});return()=>{};}},webServer:{register:route=>{regs.push({route});return()=>{};}}};
 try {apply(ctx);assert.equal(regs[0].name,'space');assert.equal(regs[0].config.env.DSH_SPACE_HOME,home);assert.equal(regs[0].config.toolLoading,'eager');assert.match(regs[0].config.args[0],/server\/mcp\.js$/);assert.equal(regs[1].route.path,'/dsh-space-api');}
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
    const service = (await import('../src/space-service.js')).SpaceService;
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
    assert.equal(resolved, 1);
    const retry = await host.dispatch('sendComments', payload);
    assert.equal(retry.status, 'sent');
    assert.equal(retry.sessionId, 'created-session');
    assert.equal(sent.length, 1);
    assert.equal(resolved, 1);
  } finally { host.close(); rmSync(home, { recursive: true, force: true }); }
});
