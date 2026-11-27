import {useSyncExternalStore} from 'react';
import { SpaceApp } from '../../../packages/review-ui/src/SpaceApp.jsx';
import './theme.css';
import { SpaceDocumentReference } from '../../../packages/review-ui/src/SpaceReference.jsx';
import { SpaceSidebarDocument, SpaceSidebarTitle } from '../../../packages/review-ui/src/SpaceSidebar.jsx';
import { api as request } from '../../../packages/transport-http/client.js';
import { NS, en, zh } from '../../../packages/review-ui/src/locale.js';
import { documentIdFromReference, matchSpaceReference } from '../../../packages/review-ui/src/space-reference.js';
import { documentTitle } from '../../../packages/review-ui/src/document-titles.js';
import { documentIdFromDshResource, dshSpaceResourceFor } from './resource-reference.js';
import { workspaceNameForSession } from './workspace-name.js';
import { ADAPTER_CONTRACT_VERSION, resolveAdapterCapabilities } from '../../../packages/adapter-contract/src/index.js';
import adapterDeclaration from '../adapter.json' with { type: 'json' };
import { REFERENCE_SOURCE, createDocumentCache, documentCandidate, filterDocuments, referenceInsertFor } from './documents.js';
import { createDocumentPicker } from './picker-store.js';
import { createDocumentInserter } from './insert-documents.js';
import { SpaceDocumentPicker } from './document-picker.jsx';
import { SpaceIcon } from './brand-icon.jsx';
import { createMainDocumentStore } from './main-document.js';
import { registerSpaceTabMenu } from './tab-actions.jsx';
import { registerSpaceToolViews } from './tool-views.jsx';
import { REVIEW_CARD_ACTION, createReviewCardBody } from './review-card.jsx';

export const name = 'dsh-space-client';
/** Client services: slots, the current Session, copy, conversation text, and the right Sidebar. */
export const inject = ['slots','uiSession','locale','uiConversation','sidebarRight','sidebarRightTabs'];
export const api = request;

/** The right-Sidebar tab type this plugin owns; the id keys its body and title seats. */
const SIDEBAR_ID = 'dsh-plugin-space';
const SIDEBAR_KIND = 'space-document';
const SIDEBAR_PATTERN = 'dsh-resource://space/**';

function DshSpaceSidebarTitle(props) {
  return <SpaceSidebarTitle {...props}/>;
}

/**
 * Send navigation: the Host resolves or creates the conversation; the client
 * only opens the exact Session the Host reports. Keeping creation on the Host
 * means a retry and a first send cannot disagree about the target.
 * @param {object} ctx - client plugin context.
 * @returns {{canCreate: boolean, openSession: (id: string) => void}} send bridge.
 */
function createSendBridge(ctx) {
  const service = name => (typeof ctx.get === 'function' ? ctx.get(name) : undefined) ?? ctx[name];
  return {
    canCreate: typeof service('sessions')?.binding === 'function' && typeof service('uiWorkspace')?.openSession === 'function',
    getConversationLabel(sessionId) {
      const row=service('sessions')?.list?.getSnapshot?.()?.byId?.[sessionId];
      return row?.title || row?.displayTitle || null;
    },
    getWorkspaceLabel(sessionId) {
      const items=service('workspaces')?.list?.getSnapshot?.()?.items;
      return workspaceNameForSession(items,sessionId);
    },
    open(sessionId) {
      try { service('uiWorkspace')?.openSession(sessionId); } catch { /* navigation is best effort */ }
    },
    send: request => api('sendComments', {
      docId:request.documentId,
      commentIds:request.commentIds,
      ...(request.conversationId?{sessionId:request.conversationId}:{}),
      ...(request.createConversation?{forceNew:true}:{}),
      ...(request.excludeConversationId?{newSessionFrom:request.excludeConversationId}:{}),
      operationId:request.requestId,
    }).then(result=>({
      requestId:result.requestId,
      status:result.status,
      ...(result.sessionId?{conversationId:result.sessionId}:{}),
      ...(result.createdSession?{createdConversation:true}:{}),
    })),
  };
}

function saveExport({name,type,bytes}) {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
  const blob=new Blob([bytes],{type});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return true;
}

function resolveDshCapabilities(ctx, conversation) {
  const services = name => (typeof ctx.get === 'function' ? ctx.get(name) : undefined) ?? ctx[name];
  const available = [];
  if (services('uiSession')?.adapter?.current) available.push('conversation.current.read');
  // DSH registers the prompt endpoint in the server adapter. Availability can
  // still change per request, so send failures remain explicit at the API edge.
  available.push('conversation.send');
  if (conversation?.canCreate) available.push('conversation.create');
  if (typeof services('uiWorkspace')?.openSession === 'function') available.push('conversation.open');
  if (typeof services('sessions')?.binding === 'function') available.push('conversation.references.insert');
  if (typeof services('workspaces')?.list?.getSnapshot === 'function') available.push('workspace.list');
  if (typeof services('uiConversation')?.userText?.register === 'function') available.push('conversation.references.render');
  if (typeof services('sidebarRight')?.openResource === 'function') available.push('navigation.document.open');
  if (typeof services('sidebarRightTabs')?.register === 'function') available.push('navigation.deepLink.register');
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' && typeof document !== 'undefined') available.push('files.export.save');
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') available.push('clipboard.write');
  // DSH server registers this endpoint; the account plugin may still be absent,
  // in which case the API safely resolves to an anonymous user.
  available.push('identity.current.read');
  return resolveAdapterCapabilities({
    ...adapterDeclaration,
    contractVersion: ADAPTER_CONTRACT_VERSION,
  }, available);
}

/**
 * Open one document in the right Sidebar, with the Space panel as a fallback
 * when the conversation is not on screen and the Sidebar cannot navigate.
 * @param {object} ctx - client root context.
 * @param {string} docId - document to open.
 * @returns {boolean} whether a navigation was started.
 */
/** Reveal the CoSpace page in the main panel; the page follows the shared store. */
function selectSpacesPanel(ctx) {
  try {
    const layout=ctx.get?.('layout');
    layout?.selectPanel?.('spaces');
  } catch { /* Navigation is best effort. */ }
}

function openSpaceDocument(ctx, docId) {
  if (typeof docId !== 'string' || docId === '') return false;
  try {
    ctx.sidebarRight.openResource(dshSpaceResourceFor(docId));
    return true;
  } catch {
    const layout=ctx.get?.('layout');
    if(!layout?.selectPanel) return false;
    try { layout.selectPanel('spaces'); return true; } catch { return false; }
  }
}

export function apply(ctx) {
  const t=ctx.locale.bind(NS);
  const sendBridge=createSendBridge(ctx);
  const capabilities=resolveDshCapabilities(ctx,sendBridge);
  const service = name => (typeof ctx.get === 'function' ? ctx.get(name) : undefined);
  const documents = createDocumentCache(() => request('listDocuments'));
  const picker = createDocumentPicker();
  const insertDocuments = createDocumentInserter({
    service,
    invalidate: () => documents.invalidate(),
  });
  const mainDocument=createMainDocumentStore();
  const adapter={
    core:{request:api},
    capabilities,
    conversation:sendBridge,
    // The review page gates its "let the Agent draft/review" actions on this
    // object; `mcpReady` follows the Host's tool registration probe.
    prompts:{mcpReady:true},
    identity:{getCurrentUser:()=>api('getUser',{locale:ctx.locale.getSnapshot().active})},
    files:{saveExport},
    clipboard:{writeText:text=>navigator.clipboard.writeText(text)},
    navigation:{
      openDocument:docId=>openSpaceDocument(ctx,docId),
      createDocumentLink:dshSpaceResourceFor,
      parseDocumentLink:documentIdFromDshResource,
      getDocumentId:()=>mainDocument.get(),
      setDocumentId:docId=>{mainDocument.set(docId);selectSpacesPanel(ctx);},
      subscribeDocumentId:listener=>mainDocument.subscribe(listener),
      openDocumentInPage:docId=>{mainDocument.set(docId);selectSpacesPanel(ctx);},
    },
  };
  void api('status').then(status=>{adapter.prompts.mcpReady=status?.mcpReady!==false;}).catch(()=>{});
  registerSpaceToolViews(ctx);
  registerSpaceTabMenu(ctx,adapter);
  ctx.inject(['actionCards'],scope=>{
    const cards=scope.actionCards;
    // Without the card UI the kind stays host-only and cards fall back to their
    // dismiss-only frame.
    if(!cards||typeof cards.register!=='function') return;
    scope.effect(()=>cards.register({
      action:REVIEW_CARD_ACTION,locale:NS,Body:createReviewCardBody({adapter,t}),
    }),'dsh-space: review card body');
  });
  ctx.effect(()=>ctx.locale.register(NS,{zh,en}),'dsh-space: dictionaries');
  ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'spaces',locale:NS},function SpaceMain({t:translate}){
    const current=ctx.uiSession?.adapter?.current;
    const state=useSyncExternalStore(current?.subscribe || (()=>()=>{}),current?.getSnapshot || (()=>null),()=>null);
    return <SpaceApp t={translate} adapter={{...adapter,conversation:{...sendBridge,current:state?.key?{id:state.key}:null,canCreate:sendBridge.canCreate&&capabilities.available.includes('conversation.create')}}}/>;
  }));
  ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'spaces',order:20,label:()=> t('panel.label')},SpaceIcon));

  // Sent references stay protocol text; this rule turns each complete token into
  // one document card instead of leaving `space:<docId>` in the bubble.
  ctx.effect(()=>ctx.uiConversation.userText.register({
    id:'space-document', order:40,
    match:(text,from)=>matchSpaceReference(text,from),
  }),'dsh-space: reference text rule');
  ctx.slots.inject('conversation.user.text.node',()=>ctx.slots.register({
    name:'conversation.user.text.node', key:'space-document', priority:100, locale:NS,
    inject:()=>({adapter}),
  },SpaceDocumentReference));

  // One resource tab type per document; the persisted address is the document
  // identity, so a reload restores the same document rather than a blank page.
  ctx.effect(()=>ctx.sidebarRightTabs.register({
    id:SIDEBAR_ID, kind:SIDEBAR_KIND, patterns:[SIDEBAR_PATTERN], priority:'extension', multiple:true, keepMounted:true,
    canOpen:address=>adapter.navigation.parseDocumentLink(address)!==null,
    title:address=>documentTitle(adapter.navigation.parseDocumentLink(address),api) || t('sidebar.title'),
  }),'dsh-space: sidebar document type');
  ctx.slots.inject('sidebar.right.pane.tab',()=>ctx.slots.register({
    name:'sidebar.right.pane.tab', key:SIDEBAR_ID, locale:NS,
    inject:()=>({adapter}),
  },function DshSpaceSidebarDocument(props){
    const current=ctx.uiSession?.adapter?.current;
    const state=useSyncExternalStore(current?.subscribe || (()=>()=>{}),current?.getSnapshot || (()=>null),()=>null);
    const bridge={...adapter,conversation:{...sendBridge,current:state?.key?{id:state.key}:null}};
    return <SpaceSidebarDocument {...props} adapter={bridge}/>;
  }));
  ctx.slots.inject('sidebar.right.pane.tab.title',()=>ctx.slots.register({
    name:'sidebar.right.pane.tab.title', key:SIDEBAR_ID, locale:NS,
    inject:()=>({adapter}),
  },DshSpaceSidebarTitle));

  // One overlay owns the picker; the /space command only opens it for a Session.
  ctx.slots.inject('shell.overlay',()=>ctx.slots.register({
    name:'shell.overlay', id:SIDEBAR_ID, order:60, locale:NS,
    inject:()=>({picker, documents, insertDocuments}),
  },SpaceDocumentPicker));

  ctx.inject(['inputTriggers'],scope=>{
    scope.effect(()=>scope.inputTriggers.registerSource({
      trigger:'@',name:REFERENCE_SOURCE,order:10,
      warm:()=>{ void documents.load().catch(()=>{}); },
      candidates:async(_session,req)=>{
        let list;
        try { list=await documents.load(); } catch { return []; }
        return filterDocuments(list,req.query).map(documentCandidate);
      },
      onPick:pick=>{
        const id=pick.candidate.value ?? pick.candidate.name;
        if(typeof id!=='string'||id==='') return undefined;
        return {insert:referenceInsertFor({id,title:pick.candidate.label})};
      },
      // A click on the draft chip opens the same document view before sending.
      openReference:(_session,reference)=>{
        const docId=documentIdFromReference(reference?.ref);
        return docId===null ? false : openSpaceDocument(scope,docId);
      },
      codec:{clipboardText:ref=>ref,serialize:async ref=>ref},
    }),'dsh-space: reference source');
  });
  ctx.inject(['commandUi','sessions'],scope=>{
    scope.effect(()=>scope.commandUi.register({name:'space',label:()=>t('command.label'),description:()=>t('command.description'),icon:SpaceIcon,available:session=>!!scope.sessions.binding(session.sessionId),ui:{kind:'action',run:session=>{picker.open(session.sessionId);}}}),'dsh-space: composer action');
  });
}
