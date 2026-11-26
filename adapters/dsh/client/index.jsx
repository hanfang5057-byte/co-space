import {useSyncExternalStore} from 'react';
import { SpaceApp } from '../../../packages/review-ui/src/SpaceApp.jsx';
import './theme.css';
import { SpaceDocumentReference } from '../../../packages/review-ui/src/SpaceReference.jsx';
import { SpaceSidebarDocument, SpaceSidebarTitle } from '../../../packages/review-ui/src/SpaceSidebar.jsx';
import { api as request } from '../../../packages/transport-http/client.js';
import { NS, en, errorText, zh } from '../../../packages/review-ui/src/locale.js';
import { documentIdFromReference, matchSpaceReference, spaceReferenceFor } from '../../../packages/review-ui/src/space-reference.js';
import { documentTitle } from '../../../packages/review-ui/src/document-titles.js';
import { documentIdFromDshResource, dshSpaceResourceFor } from './resource-reference.js';
import { workspaceNameForSession } from './workspace-name.js';
import { BRAND } from '../../../packages/brand/brand.js';
import { ADAPTER_CONTRACT_VERSION, resolveAdapterCapabilities } from '../../../packages/adapter-contract/src/index.js';
import adapterDeclaration from '../adapter.json' with { type: 'json' };

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

function SpaceIcon({size=16}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M9 9v11"/></svg>; }

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

/**
 * Append structured document references to the bound composer.
 * DSH's Session input facade exposes batch reference insertion as
 * `addFiles(references, attachmentIds)`; keep the older `addReferences`
 * spelling as a fallback for builds that still provide it. Both append after
 * the live editor selection and return false when the input is not editable.
 * @param {object} input - Session input facade for the bound Session.
 * @param {Array<object>} references - ReferenceInsert values in pick order.
 * @returns {boolean} whether the editor accepted the whole batch.
 */
function insertReferences(input, references) {
  try {
    if (typeof input?.addFiles === 'function') return input.addFiles(references, []) === true;
    if (typeof input?.addReferences === 'function') return input.addReferences(references) === true;
  } catch {
    return false;
  }
  return false;
}

/** The native modal owns focus and dismissal. References enter the captured session only. */
export async function openSpacePicker(ctx, sessionId, t) {
  const binding=ctx.sessions.binding(sessionId);
  if(!binding) return;
  const documents=await api('listDocuments');
  if(ctx.sessions.binding(sessionId)!==binding) return;
  const modal=document.createElement('dialog'); modal.className='space-picker-dialog'; modal.setAttribute('aria-labelledby','space-picker-title');
  const title=document.createElement('h2');title.id='space-picker-title';title.textContent=t('picker.title');modal.append(title);
  const description=document.createElement('p');description.textContent=t('picker.description');modal.append(description);
  const list=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=t('picker.documents');list.append(legend);
  const checkboxes=[];
  for(const doc of documents) {const label=document.createElement('label');label.className='space-picker-option';const check=document.createElement('input');check.type='checkbox';check.value=doc.id;checkboxes.push(check);label.append(check,document.createTextNode(doc.title));list.append(label);}
  if(!documents.length){const empty=document.createElement('p');empty.className='space-picker-empty';empty.textContent=t('picker.empty');list.append(empty);}
  modal.append(list);
  const note=document.createElement('p');note.setAttribute('role','status');modal.append(note);
  const add=document.createElement('button');add.type='button';add.className='is-primary';add.textContent=t('picker.add');add.disabled=!documents.length;
  const cancel=document.createElement('button');cancel.type='button';cancel.className='is-secondary';cancel.textContent=t('picker.cancel');cancel.addEventListener('click',()=>modal.close());
  add.addEventListener('click',()=>{
    try {
      const chosen=checkboxes.filter(checkbox=>checkbox.checked);if(!chosen.length){note.textContent=t('picker.choose');return;}
      if(ctx.sessions.binding(sessionId)!==binding){note.textContent=t('picker.closed');return;}
      const input=ctx.conversation.input.for(binding.ctx);
      const references=chosen.map(checkbox=>{const doc=documents.find(item=>item.id===checkbox.value);const ref=spaceReferenceFor(doc.id);return {source:'space',ref,label:doc.title,appearance:'file',clipboardText:ref};});
      if(!insertReferences(input,references)){note.textContent=t('picker.failed');return;}
      modal.close();input.focus();
    } catch {
      note.textContent=t('picker.failed');
    }
  });
  const actions=document.createElement('div');actions.className='space-picker-actions';actions.append(cancel,add);modal.append(actions);modal.addEventListener('close',()=>modal.remove(),{once:true});document.body.append(modal);modal.showModal();
}

export function apply(ctx) {
  const t=ctx.locale.bind(NS);
  const sendBridge=createSendBridge(ctx);
  const capabilities=resolveDshCapabilities(ctx,sendBridge);
  const adapter={
    core:{request:api},
    capabilities,
    conversation:sendBridge,
    identity:{getCurrentUser:()=>api('getUser')},
    files:{saveExport},
    clipboard:{writeText:text=>navigator.clipboard.writeText(text)},
    navigation:{
      openDocument:docId=>openSpaceDocument(ctx,docId),
      createDocumentLink:dshSpaceResourceFor,
      parseDocumentLink:documentIdFromDshResource,
    },
  };
  ctx.effect(()=>ctx.locale.register(NS,{zh,en}),'dsh-space: dictionaries');
  ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'spaces',locale:NS},function SpaceMain({t:translate}){
    const current=ctx.uiSession?.adapter?.current;
    const state=useSyncExternalStore(current?.subscribe || (()=>()=>{}),current?.getSnapshot || (()=>null),()=>null);
    return <SpaceApp t={translate} adapter={{...adapter,conversation:{...sendBridge,current:state?.key?{id:state.key}:null,canCreate:sendBridge.canCreate&&capabilities.available.includes('conversation.create')}}}/>;
  }));
  ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'spaces',order:20,label:()=> BRAND.name.en},SpaceIcon));

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
    id:SIDEBAR_ID, kind:SIDEBAR_KIND, patterns:[SIDEBAR_PATTERN], priority:'extension',
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

  ctx.inject(['inputTriggers'],scope=>{
    scope.effect(()=>scope.inputTriggers.registerSource({
      trigger:'@',name:'space',candidates:async()=>[],onPick:()=>undefined,
      // A click on the draft chip opens the same document view before sending.
      openReference:(_session,reference)=>{
        const docId=documentIdFromReference(reference?.ref);
        return docId===null ? false : openSpaceDocument(scope,docId);
      },
      codec:{clipboardText:ref=>ref,serialize:async ref=>ref},
    }),'dsh-space: reference codec');
  });
  ctx.inject(['commandUi','sessions','conversation','inputTriggers'],scope=>{
    scope.effect(()=>scope.commandUi.register({name:'space',label:()=>t('command.label'),description:()=>t('command.description'),icon:SpaceIcon,available:session=>!!scope.sessions.binding(session.sessionId),ui:{kind:'action',run:session=>{openSpacePicker(scope,session.sessionId,t).catch(error=>{const binding=scope.sessions.binding(session.sessionId);if(binding) scope.conversation.input.for(binding.ctx).notify('error',errorText(error,t));});}}}),'dsh-space: composer action');
  });
}
