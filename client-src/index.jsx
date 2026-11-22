import {useSyncExternalStore} from 'react';
import { SpaceApp } from './SpaceApp.jsx';
import { SpaceDocumentReference } from './SpaceReference.jsx';
import { SpaceSidebarDocument, SpaceSidebarTitle } from './SpaceSidebar.jsx';
import { api as request } from './api.js';
import { NS, en, errorText, zh } from './locale.js';
import { documentIdFromReference, matchSpaceReference, spaceReferenceFor, spaceResourceFor, documentIdFromResource } from './space-reference.js';
import { documentTitle } from './document-titles.js';

export const name = 'dsh-space-client';
/** Client services: slots, the current Session, copy, conversation text, and the right Sidebar. */
export const inject = ['slots','uiSession','locale','uiConversation','sidebarRight','sidebarRightTabs'];
export const api = request;

/** The right-Sidebar tab type this plugin owns; the id keys its body and title seats. */
const SIDEBAR_ID = '@local/dsh-space';
const SIDEBAR_KIND = 'space-document';
const SIDEBAR_PATTERN = 'dsh-resource://space/**';

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
    canCreate: true,
    openSession(sessionId) {
      try { service('uiWorkspace')?.openSession(sessionId); } catch { /* navigation is best effort */ }
    },
  };
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
    ctx.sidebarRight.openResource(spaceResourceFor(docId));
    return true;
  } catch {
    const layout=ctx.get?.('layout');
    if(!layout?.selectPanel) return false;
    try { layout.selectPanel('spaces'); return true; } catch { return false; }
  }
}

/** The native modal owns focus and dismissal. References enter the captured session only. */
export async function openSpacePicker(ctx, sessionId, t) {
  const binding=ctx.sessions.binding(sessionId);
  if(!binding) return;
  const documents=await api('listDocuments');
  if(ctx.sessions.binding(sessionId)!==binding) return;
  const modal=document.createElement('dialog'); modal.className='space-dialog space-picker-dialog'; modal.setAttribute('aria-labelledby','space-picker-title');
  const title=document.createElement('h2');title.id='space-picker-title';title.textContent=t('picker.title');modal.append(title);
  const description=document.createElement('p');description.textContent=t('picker.description');modal.append(description);
  const list=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=t('picker.documents');list.append(legend);
  for(const doc of documents) {const label=document.createElement('label');label.style.display='block';const check=document.createElement('input');check.type='checkbox';check.value=doc.id;label.append(check,document.createTextNode(' '+doc.title));list.append(label);}
  if(!documents.length){const empty=document.createElement('p');empty.textContent=t('picker.empty');list.append(empty);}
  modal.append(list);
  const note=document.createElement('p');note.setAttribute('role','status');modal.append(note);
  const add=document.createElement('button');add.type='button';add.textContent=t('picker.add');add.disabled=!documents.length;
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent=t('picker.cancel');cancel.addEventListener('click',()=>modal.close());
  add.addEventListener('click',()=>{
    const chosen=[...list.querySelectorAll('input:checked')];if(!chosen.length){note.textContent=t('picker.choose');return;}
    if(ctx.sessions.binding(sessionId)!==binding){note.textContent=t('picker.closed');return;}
    const input=ctx.conversation.input.for(binding.ctx);
    const references=chosen.map(checkbox=>{const doc=documents.find(item=>item.id===checkbox.value);const ref=spaceReferenceFor(doc.id);return {source:'space',ref,label:doc.title,appearance:'file',clipboardText:ref};});
    if(!input.canInsertReferences() || !input.addReferences(references)){note.textContent=t('picker.failed');return;}
    modal.close();input.focus();
  });
  modal.append(cancel,add);modal.addEventListener('close',()=>modal.remove(),{once:true});document.body.append(modal);modal.showModal();
}

export function apply(ctx) {
  const t=ctx.locale.bind(NS);
  const sendBridge=createSendBridge(ctx);
  ctx.effect(()=>ctx.locale.register(NS,{zh,en}),'dsh-space: dictionaries');
  ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'spaces',locale:NS},function SpaceMain({t:translate}){
    const current=ctx.uiSession?.adapter?.current;
    const state=useSyncExternalStore(current?.subscribe || (()=>()=>{}),current?.getSnapshot || (()=>null),()=>null);
    return <SpaceApp api={api} sessionId={state?.key || null} t={translate} sendTarget={sendBridge}/>;
  }));
  ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'spaces',order:20,label:()=> 'Space'},SpaceIcon));

  // Sent references stay protocol text; this rule turns each complete token into
  // one document card instead of leaving `space:<docId>` in the bubble.
  ctx.effect(()=>ctx.uiConversation.userText.register({
    id:'space-document', order:40,
    match:(text,from)=>matchSpaceReference(text,from),
  }),'dsh-space: reference text rule');
  ctx.slots.inject('conversation.user.text.node',()=>ctx.slots.register({
    name:'conversation.user.text.node', key:'space-document', priority:100, locale:NS,
    inject:()=>({openDocument:docId=>{openSpaceDocument(ctx,docId);}}),
  },SpaceDocumentReference));

  // One resource tab type per document; the persisted address is the document
  // identity, so a reload restores the same document rather than a blank page.
  ctx.effect(()=>ctx.sidebarRightTabs.register({
    id:SIDEBAR_ID, kind:SIDEBAR_KIND, patterns:[SIDEBAR_PATTERN], priority:'extension',
    canOpen:address=>documentIdFromResource(address)!==null,
    title:address=>documentTitle(documentIdFromResource(address)) || t('sidebar.title'),
  }),'dsh-space: sidebar document type');
  ctx.slots.inject('sidebar.right.pane.tab',()=>ctx.slots.register({
    name:'sidebar.right.pane.tab', key:SIDEBAR_ID, locale:NS,
    inject:()=>({sendTarget:sendBridge}),
  },SpaceSidebarDocument));
  ctx.slots.inject('sidebar.right.pane.tab.title',()=>ctx.slots.register({
    name:'sidebar.right.pane.tab.title', key:SIDEBAR_ID, locale:NS,
  },SpaceSidebarTitle));

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
    scope.effect(()=>scope.commandUi.register({name:'space',label:()=>t('command.label'),description:()=>t('command.description'),available:session=>!!scope.sessions.binding(session.sessionId),ui:{kind:'action',run:session=>{openSpacePicker(scope,session.sessionId,t).catch(error=>{const binding=scope.sessions.binding(session.sessionId);if(binding) scope.conversation.input.for(binding.ctx).notify('error',errorText(error,t));});}}}),'dsh-space: composer action');
  });
}
