import { Fragment, createElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { Trash2, Check, X, MessageSquare, Search, Plus, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { BRAND, brandIcon as cospaceIcon } from '../../brand/brand.js';
import { errorText, translate, zh } from './locale.js';
import { MarkdownEditor } from './markdown-editor.jsx';
import { capturePreviewSelection, rangeRects, readSourceSpans, scrollSourceRange, sourceOffsetAtDomPoint, sourceRangeToDom } from './markdown-dom.js';
import { rememberDocumentTitle } from './document-titles.js';
import { createDocx, exportFileName } from './export.js';
import { useCurrentUser } from './current-user.js';
import { annotationConnector } from './annotation-connector.js';
import { supportsCapability } from '../../adapter-contract/src/index.js';
import { autonomousReviewPrompt, commentProcessingPrompt } from '../../adapter-contract/src/prompts.js';
import './space.css';

const h = createElement;
const requestId = () => globalThis.crypto.randomUUID();
function HomeSelect({ label, value, options, onChange }) {
  const [open,setOpen]=useState(false);
  const root=useRef(null);
  useEffect(()=>{if(!open)return;const close=event=>{if(!root.current?.contains(event.target))setOpen(false)};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close)},[open]);
  const current=options.findIndex(option=>option.value===value);
  return <div className="space-home-select" ref={root}>
    <button type="button" className="space-home-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(value=>!value)} onKeyDown={event=>{if(event.key==='Escape'){setOpen(false);return}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const direction=event.key==='ArrowDown'?1:-1;onChange(options[(current+direction+options.length)%options.length].value)}}}>
      <span>{options[current]?.label}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg>
    </button>
    {open&&<div className="space-home-select-menu" role="listbox" aria-label={label}>{options.map(option=><button type="button" role="option" aria-selected={value===option.value} key={option.value} onClick={()=>{onChange(option.value);setOpen(false)}}>{option.label}{value===option.value&&<span aria-hidden="true">✓</span>}</button>)}</div>}
  </div>;
}
function scrollToSourceOffset(surface, offset, markdownSource) {
  if (!surface) return false;
  if (scrollSourceRange(surface, offset, offset, markdownSource)) return true;
  const wrap=surface.closest('.space-paper-wrap');
  if(!wrap) return false;
  const ratio=markdownSource.length?Math.max(0,Math.min(1,offset/markdownSource.length)):0;
  wrap.scrollTo({top:Math.max(0,surface.offsetTop+surface.offsetHeight*ratio-wrap.clientHeight*.3),behavior:'auto'});
  return true;
}
const statusKeys = {pending:'status.pending', sending:'status.sending', sent:'status.sent', failed:'status.failed', unknown:'status.unknown', processed:'status.processed'};
const suggestionStatusKeys = {pending:'suggestion.pendingStatus', accepted:'suggestion.acceptedStatus', rejected:'suggestion.rejectedStatus', conflicted:'suggestion.conflictedStatus'};
const safeUrl = value => typeof value === 'string' && /^(https?:|mailto:)/i.test(value) ? value : null;
const documentCardTime = (item,t) => {
  const timestamp=item.updatedAt || item.createdAt;
  if(!timestamp || !Number.isFinite(Date.parse(timestamp))) return t('home.timeUnknown');
  const time=new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(timestamp));
  return t(item.updatedAt?'home.updated':'home.created',{time});
};

/** Fallback translator keeps the panel renderable outside a locale seat, as in the DOM smoke test. */
const defaultT = (key, vars) => translate(zh, key, vars);
const localBuildVersion = typeof __COSPACE_BUILD_VERSION__ === 'undefined' ? 'development' : __COSPACE_BUILD_VERSION__;

export function CospaceMark({ className = '' }) {
  return <img className={className} src={cospaceIcon} alt="" aria-hidden="true"/>;
}

function TrashIcon({size=14}) {
  return <Trash2 size={size} strokeWidth={1.8} aria-hidden="true"/>;
}

function CommentIcon({size=15}) {
  return <MessageSquare size={size} strokeWidth={1.8} aria-hidden="true"/>;
}

function IconButton({ label, children, ...props }) {
  return <button type="button" aria-label={label} title={label} {...props}>{children}</button>;
}

function ReviewToolsMenu({ exporting, onExport, onReview, onPreferences, onOpenAgents, canExport, t }) {
  const [open,setOpen]=useState(false);
  const rootRef=useRef(null), triggerRef=useRef(null);
  const panelId=useId();
  useEffect(()=>{
    if(!open) return;
    const dismiss=event=>{if(!rootRef.current?.contains(event.target)) setOpen(false);};
    const keydown=event=>{if(event.key==='Escape'){setOpen(false);triggerRef.current?.focus();}};
    document.addEventListener('pointerdown',dismiss);
    document.addEventListener('keydown',keydown);
    return ()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',keydown);};
  },[open]);
  const run=action=>{setOpen(false);action?.();};
  return <div className="space-tools-menu" ref={rootRef}>
    <button ref={triggerRef} type="button" className="space-tools-menu-trigger" aria-label={t('toolbar.more')} title={t('toolbar.more')} aria-haspopup="true" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(value=>!value)}><MoreHorizontal size={19} aria-hidden="true"/></button>
    {open&&<div id={panelId} className="space-tools-menu-panel">
      {onOpenAgents&&<button type="button" onClick={()=>run(onOpenAgents)}>Agent 接入</button>}
      {onReview&&<button type="button" onClick={()=>run(onReview)}>让 Agent 审阅</button>}
      {onPreferences&&<button type="button" onClick={()=>run(onPreferences)}>{t('collab.open')}</button>}
      {canExport&&<>
        <div className="space-tools-menu-divider" role="separator"/>
        <p>{t('export.button')}</p>
        <button type="button" disabled={exporting} onClick={()=>run(()=>onExport('md'))}>Markdown <span>.md</span></button>
        <button type="button" disabled={exporting} onClick={()=>run(()=>onExport('docx'))}>Word <span>.docx</span></button>
      </>}
    </div>}
  </div>;
}

/** Shared accessible modal surface for all workbench dialogs. */
function SpaceDialog({ open, onClose, labelledBy, title, closeLabel, className = '', closeOnBackdrop = false, actions, children }) {
  const dialogRef=useRef(null);
  const onCloseRef=useRef(onClose);
  onCloseRef.current=onClose;
  useEffect(()=>{
    if(!open||typeof document==='undefined')return;
    const dialog=dialogRef.current;
    const previousFocus=document.activeElement;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const focusable=()=>[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')];
    const initial=dialog.querySelector('[autofocus]')||focusable()[0]||dialog;
    initial.focus();
    const onKeyDown=event=>{
      if(event.key==='Escape'){event.preventDefault();onCloseRef.current?.();return}
      if(event.key!=='Tab')return;
      const items=focusable();
      if(!items.length){event.preventDefault();dialog.focus();return}
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    };
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('keydown',onKeyDown);document.body.style.overflow=previousOverflow;if(previousFocus instanceof HTMLElement&&previousFocus.isConnected)previousFocus.focus()};
  },[open]);
  if(!open||typeof document==='undefined')return null;
  return <div className="space-dialog-backdrop" onMouseDown={event=>{if(closeOnBackdrop&&event.target===event.currentTarget)onClose()}}><section ref={dialogRef} className={`space-dialog ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} onMouseDown={event=>event.stopPropagation()}><header className="space-dialog-header"><h2 id={labelledBy}>{title}</h2><button type="button" className="space-dialog-close" aria-label={closeLabel} onClick={()=>onCloseRef.current?.()}><X size={17} aria-hidden="true"/></button></header><div className="space-dialog-content">{children}</div>{actions&&<footer className="space-dialog-actions">{actions}</footer>}</section></div>;
}

/**
 * Load and drive one document's review state.
 *
 * One controller serves the Space page and the right Sidebar tab: both read the
 * same authoritative document, decide suggestions, save comments and request
 * comment processing. The controller owns no layout; the surface
 * decides where the paper, comment rail and review panel sit.
 * @param {(method: string, args?: object) => Promise<any>} api - plugin HTTP client.
 * @param {string | null} docId - document to review, or null for no selection.
 * @param {string | null} sessionId - conversation that receives sent comments.
 * @param {(key: string, vars?: object) => string} t - bound translator.
 * @param {{mode?: 'copy', canCreate?: boolean, openSession?: (sessionId: string) => void} | null} sendTarget - optional comment processing action mode.
 * @returns {object} review state and the actions that change it.
 */
export function useSpaceReview(api, docId, sessionId, t = defaultT, adapter = null, autoEditDocId = null) {
  const sendTarget=adapter?.conversation || null;
  const [doc,setDoc]=useState(null);
  const [comments,setComments]=useState([]);
  const [active,setActive]=useState(null);
  const [activeComment,setActiveComment]=useState(null);
  const [draft,setDraft]=useState('');
  const [selection,setSelection]=useState(null);
  const [zoom,setZoom]=useState(1);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [editing,setEditing]=useState(false);
  const [editSaveError,setEditSaveError]=useState('');
  const [editBaseVersion,setEditBaseVersion]=useState(null);
  const [editDirty,setEditDirty]=useState(false);
  const surface=useRef(null), cardRefs=useRef(new Map()), commentRefs=useRef(new Map()), loadSequence=useRef(0);
  const editorRef=useRef(null);
  const snapshot=useRef(null), busyRef=useRef(false);
  // Async callbacks may outlive a render; read the active locale at completion time.
  const translateNow=useRef(t); translateNow.current=t;
  const call=useCallback((method,args={})=>api(method,args),[api]);
  useEffect(()=>{setZoom(1)},[docId]);
  const reload=useCallback(async id=>{
    const sequence=++loadSequence.current;
    const next=await call('readDocument',{docId:id});
    if (sequence!==loadSequence.current) return;
    if(id===autoEditDocId){setEditing(true);setEditBaseVersion(next?.version??null);setEditDirty(false)}
    const nextComments=next?.comments || [];
    const signature=JSON.stringify(next);
    const contentChanged=!snapshot.current || snapshot.current.content!==next?.content || snapshot.current.version!==next?.version;
    if(snapshot.current?.signature!==signature){setDoc(next);setComments(nextComments)}
    snapshot.current={signature,content:next?.content,version:next?.version};
    if(contentChanged) setSelection(null);
    if (next?.title) rememberDocumentTitle(id,next.title,api);
  },[call,autoEditDocId]);
  useEffect(()=>{
    setEditing(false);setEditBaseVersion(null);setEditDirty(false);editorRef.current=null;
    if (!docId) {
      loadSequence.current++;
      snapshot.current=null;
      setDoc(null);setComments([]);setActive(null);setActiveComment(null);setSelection(null);setDraft('');setMessage('');
      return;
    }
    snapshot.current=null;
    setDoc(null);setMessage('');
    reload(docId).catch(e=>setMessage(errorText(e,translateNow.current)));
  },[docId,reload]);
  useEffect(()=>()=>{loadSequence.current++;},[]);
  useEffect(()=>{busyRef.current=busy},[busy]);
  useEffect(()=>{
    if(!docId) return;
    let stopped=false;
    const sync=()=>{if(stopped||document.visibilityState==='hidden'||busyRef.current)return;reload(docId).catch(()=>{})};
    const timer=setInterval(sync,2500);
    document.addEventListener('visibilitychange',sync);
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',sync)};
  },[docId,reload]);

  // Suggestion ids follow submission order; review cards follow document order.
  const suggestions=useMemo(()=>[...(doc?.suggestions || [])].sort((left,right)=>(left.from ?? 0)-(right.from ?? 0)),[doc]);
  // The annotation rows are the source of truth for the UI affordance. `editable`
  // is a cached convenience flag from the host and may be stale during reloads.
  const canEdit=Boolean(doc)
    && !suggestions.some(item=>['pending','conflicted'].includes(item.status))
    && !comments.some(item=>['pending','sending','failed','unknown'].includes(item.status));
  const statusText=item=>statusKeys[item.status] ? t(statusKeys[item.status]) : item.status;
  const chooseCard=id=>{setActiveComment(null);setActive(id);const item=doc?.suggestions?.find(suggestion=>suggestion.id===id);if(!item||!scrollToSourceOffset(surface.current,item.from,doc?.content||''))setMessage(t('suggestion.unavailable'));};
  const chooseFromText=id=>{setActiveComment(null);setActive(id);cardRefs.current.get(id)?.scrollIntoView({block:'nearest',behavior:'auto'});};
  const perform=async fn=>{setBusy(true);setMessage('');try{return await fn()}catch(e){setMessage(errorText(e,translateNow.current));return null}finally{setBusy(false)}};
  const decide=(suggestionId,decision)=>perform(async()=>{await call('decide',{docId,suggestionId,decision,operationId:requestId()});await reload(docId)});
  const startEditing=()=>{if(!canEdit){setMessage(t('edit.unavailable'));return}setMessage('');setEditSaveError('');setSelection(null);setEditBaseVersion(doc.version);setEditDirty(false);setEditing(true)};
  const switchToReview=()=>perform(async()=>{
    if(editBaseVersion===null) throw Object.assign(new Error(t('edit.unavailable')),{code:'EDIT_REQUIRES_UNANNOTATED_DOCUMENT'});
    const content=editorRef.current?.getMarkdown();
    const changed=editDirty&&typeof content==='string'&&content!==doc?.content;
    if(changed) {
      try { await call('updateDocument',{docId,baseVersion:editBaseVersion,content,operationId:requestId()}); }
      catch(error) { setEditSaveError(errorText(error,translateNow.current)); throw error; }
    }
    setEditing(false);setEditBaseVersion(null);setEditDirty(false);editorRef.current=null;
    setEditSaveError('');
    if(changed) await reload(docId);
    return true;
  });
  const dismissEditSaveError=()=>{setEditSaveError('');setMessage('')};
  const addComment=()=>perform(async()=>{
    if(!selection || !draft.trim()) throw Error(t('comment.required'));
    const created=await call('createComment',{docId,quote:selection.quote,body:draft.trim(),anchor:{from:selection.from,to:selection.to,version:selection.version}});
    setDraft('');await reload(docId);setActiveComment(created.id);return created;
  });
  const canCopy=supportsCapability(adapter?.capabilities,'clipboard.write') && typeof adapter?.clipboard?.writeText==='function';
  const canSend=supportsCapability(adapter?.capabilities,'conversation.send');
  const canCreate=supportsCapability(adapter?.capabilities,'conversation.create') && sendTarget?.canCreate===true;
  const send=(mode=sessionId&&canSend?'current':canCreate?'new':canCopy?'copy':'unavailable')=>perform(async()=>{
    const ids=comments.filter(item=>['pending','failed'].includes(item.status)).map(item=>item.id);
    if(!ids.length) throw Error(t('send.none'));
    if(mode==='copy') {
      if(!canCopy) throw Object.assign(new Error(t('send.clipboardUnavailable')),{code:'CLIPBOARD_UNAVAILABLE'});
      if(typeof adapter?.clipboard?.writeText!=='function') throw Object.assign(new Error(t('send.clipboardUnavailable')),{code:'CLIPBOARD_UNAVAILABLE'});
      const text=commentProcessingPrompt(`space:${encodeURIComponent(docId)}`,ids);
      await adapter.clipboard.writeText(text);
      setMessage(t('send.copied'));
      setActiveComment(null);
      return {copied:true};
    }
    if(mode!=='current' && mode!=='new') throw Object.assign(new Error(t('send.createUnavailable')),{code:'SESSION_UNAVAILABLE'});
    if(!canSend) throw Object.assign(new Error(t('send.createUnavailable')),{code:'SESSION_UNAVAILABLE'});
    // The current conversation wins. Without one, the Host resolves the most
    // recent workspace (creating a default one when necessary), creates or
    // reuses a Session, and returns the exact identity it used. The client only
    // opens that identity, so creation and retry cannot disagree.
    if(mode==='current' && !sessionId) throw Object.assign(new Error(t('send.noSession')),{code:'SESSION_UNAVAILABLE'});
    if(mode==='new' && !canCreate) throw Object.assign(new Error(t('send.createUnavailable')),{code:'SESSION_UNAVAILABLE'});
    const targetSessionId=mode==='current'?sessionId:undefined;
    try {
      if(typeof sendTarget?.send!=='function') throw Object.assign(new Error(t('send.createUnavailable')),{code:'SESSION_UNAVAILABLE'});
      const result=await sendTarget.send({
        intent:'process-comments',documentId:docId,commentIds:ids,
        ...(targetSessionId?{conversationId:targetSessionId}:{createConversation:true,...sessionId?{excludeConversationId:sessionId}:{}}),
        requestId:requestId(),
      });
      if(!targetSessionId && result?.createdConversation && result.conversationId && typeof sendTarget?.open==='function') sendTarget.open(result.conversationId);
      return result;
    } finally { await reload(docId);setActiveComment(null); }
  });
  const deleteComment=id=>perform(async()=>{await call('deleteComment',{docId,commentId:id});setActiveComment(null);await reload(docId);});
  return {doc,setDoc,comments,active,setActive,activeComment,setActiveComment,draft,setDraft,selection,setSelection,zoom,setZoom,busy,message,setMessage,surface,cardRefs,commentRefs,reload,suggestions,statusText,chooseCard,chooseFromText,decide,addComment,deleteComment,send,canCopy,canSend,canCreate,canEdit,editing,autoFocus:doc?.id===autoEditDocId,editSaveError,dismissEditSaveError,editorRef,startEditing,switchToReview,markEditDirty:()=>setEditDirty(true)};
}

export function ReviewZoomControls({ review, t = defaultT }) {
  const {zoom,setZoom}=review;
  return <div className="space-zoom-tools" role="group" aria-label={t('zoom.label')}>
    <button type="button" aria-label={t('zoom.out')} title={t('zoom.out')} disabled={zoom<=.6} onClick={()=>setZoom(value=>Math.max(.6,Math.round((value-.1)*10)/10))}>−</button>
    <span>{Math.round(zoom*100)}%</span>
    <button type="button" aria-label={t('zoom.in')} title={t('zoom.in')} disabled={zoom>=1.5} onClick={()=>setZoom(value=>Math.min(1.5,Math.round((value+.1)*10)/10))}>＋</button>
  </div>;
}

/**
 * One comment balloon in the margin rail or the stacked mobile fallback.
 * @param {object} props - comment, active/checked state, and actions.
 * @returns {React.ReactElement} a Word-style comment card.
 */
/** A host running an older server may not return `resolved`; its anchor is current when not stale. */
function commentRange(comment) {
  return comment.resolved || (!comment.stale && Number.isInteger(comment.anchor?.from) && Number.isInteger(comment.anchor?.to)
    ? {from:comment.anchor.from,to:comment.anchor.to}
    : null);
}

function AnnotationAvatar({ name, avatarUrl }) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>{setFailed(false)},[avatarUrl]);
  const initial=Array.from(name.trim())[0]?.toLocaleUpperCase() || '?';
  return <span className={`space-annotation-avatar${avatarUrl && !failed?' is-image':''}`} aria-hidden="true">
    {avatarUrl && !failed
      ? <img src={avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>
      : initial}
  </span>;
}

function AnnotationIdentity({ name, createdAt, fallback, fallbackTime = '', avatarUrl = null }) {
  const displayName=name || fallback;
  const time=Number.isFinite(Date.parse(createdAt))
    ? new Intl.DateTimeFormat(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(createdAt))
    : '';
  return <div className="space-annotation-identity">
    <AnnotationAvatar name={displayName} avatarUrl={avatarUrl}/>
    <span className="space-annotation-byline"><strong>{displayName}</strong>{(time || fallbackTime) && <time dateTime={time?createdAt:undefined}>{time || fallbackTime}</time>}</span>
  </div>;
}

function CommentBalloon({ comment, author, active, busy, t, statusText, confirming, onAskDelete, onConfirmDelete, onCancelDelete, onActivate, setRef, style, className = '', onPointerEnter, onPointerLeave }) {
  const visibleStatus=comment.status;
  const locked=busy || comment.status==='sending';
  const status=comment.status==='pending'
    ? (comment.stale?t('comment.staleStatus'):null)
    : `${statusText(comment)}${comment.stale?t('comment.stale'):''}`;
  const authorName=author?.name || (author?.signedIn?t('comment.accountUser'):null);
  return <article className={`space-annotation-balloon space-comment-balloon${active?' is-active':''}${comment.stale?' is-stale':''}${confirming?' is-confirming':''} ${className}`} data-comment-id={comment.id} ref={el=>setRef(comment.id,el)} style={style} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onClick={()=>onActivate(comment.id)}>
    <AnnotationIdentity name={authorName} avatarUrl={author?.avatarUrl} createdAt={comment.createdAt} fallback={t('comment.author')}/>
    {status && <div className="space-annotation-head"><span className={`space-comment-status is-${visibleStatus}`}>{status}</span></div>}
    <p className="space-comment-body">{comment.body}</p>
    {comment.processing?.suggestions?.length>0 && <div className="space-comment-processing-meta">{t('comment.relatedSuggestions',{states:comment.processing.suggestions.map(item=>suggestionStatusKeys[item.status]?t(suggestionStatusKeys[item.status]):item.status).join('、')})}</div>}
    <button type="button" className="space-annotation-action space-comment-delete-icon" disabled={locked} aria-label={t('comment.delete')} title={t('comment.delete')} onClick={event=>{event.stopPropagation();onAskDelete(comment.id)}}><Trash2 size={18} strokeWidth={2} aria-hidden="true"/></button>
    {confirming && <div className="space-comment-footer is-confirming" onClick={event=>event.stopPropagation()}>
      <span className="space-comment-confirm-text">{t('comment.deleteConfirm')}</span>
      <button type="button" className="space-comment-delete is-danger" disabled={locked} onClick={()=>onConfirmDelete(comment.id)}>{t('comment.delete')}</button>
      <button type="button" className="space-comment-delete" disabled={locked} onClick={()=>onCancelDelete()}>{t('comment.cancel')}</button>
    </div>}
  </article>;
}

/** Render a compact decision card linked to an inline preview difference. */
function SuggestionBalloon({ item, active, busy, t, onActivate, onDecide, setRef, style, className = '', onPointerEnter, onPointerLeave }) {
  const conflicted=item.status==='conflicted';
  return <article className={`space-annotation-balloon space-suggestion-balloon${active?' is-active':''}${conflicted?' is-conflicted':''} ${className}`} data-suggestion-card={item.id} ref={el=>setRef(item.id,el)} style={style} onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave} onClick={onActivate}>
    <div className="space-suggestion-head"><AnnotationIdentity name={item.author} createdAt={item.createdAt} fallback={t('suggestion.defaultAuthor')} fallbackTime={t('suggestion.unknownTime')}/>{!conflicted && <div className="space-suggestion-actions"><button type="button" className="space-annotation-action is-accept" disabled={busy} aria-label={t('action.accept')} title={t('action.accept')} onClick={event=>{event.stopPropagation();onDecide('accept')}}><Check size={18} strokeWidth={2} aria-hidden="true"/></button><button type="button" className="space-annotation-action is-reject" disabled={busy} aria-label={t('action.reject')} title={t('action.reject')} onClick={event=>{event.stopPropagation();onDecide('reject')}}><X size={18} strokeWidth={2} aria-hidden="true"/></button></div>}</div>
    <div className="space-suggestion-change">
      {item.expected && <p className="is-deleted"><strong>{t('suggestion.deletedLabel')}：</strong>{item.expected}</p>}
      {item.replacement && <p className="is-inserted"><strong>{t('suggestion.insertedLabel')}：</strong>{item.replacement}</p>}
      {!item.expected && !item.replacement && <p className="is-unavailable">{t('suggestion.unavailable')}</p>}
    </div>
    {conflicted && <div className="space-suggestion-meta"><span className="space-suggestion-conflict">{t('suggestion.conflicted')}</span></div>}
  </article>;
}

/**
 * The one explicit send action. It stays usable without a selected
 * conversation: the click asks before the host creates/reuses one, so comments
 * never disappear into a disabled button with no explanation.
 * @param {object} props - review controller, current conversation, optional creator, and translator.
 * @returns {React.ReactElement} the send button and its confirmation dialog.
 */
export function ReviewSendButton({ review, sessionId, adapter = null, t = defaultT, compact = false }) {
  const titleId=useId(), groupId=useId();
  const [confirming,setConfirming]=useState(false);
  const [mode,setMode]=useState('copy');
  const sendable=review.comments.filter(item=>['pending','failed'].includes(item.status));
  const sendTarget=adapter?.conversation || null;
  const canCurrent=review.canSend && Boolean(sessionId);
  const canCreate=review.canCreate;
  const canCopy=review.canCopy;
  useEffect(()=>{setConfirming(false)},[review.doc?.id,sessionId,canCopy,canCreate,sendable.length===0]);
  const disabled=review.busy || !sendable.length;
  const hint=!canCurrent&&!canCreate&&canCopy?t('send.copyHint'):undefined;
  let sessionLabel=null, workspaceLabel=null;
  try { sessionLabel=sessionId && sendTarget?.getConversationLabel?.(sessionId); } catch { /* Use the session id when the catalog is unavailable. */ }
  try { workspaceLabel=sessionId && sendTarget?.getWorkspaceLabel?.(sessionId); } catch { /* The workspace label is optional. */ }
  const open=()=>{setMode(canCurrent?'current':canCreate?'new':canCopy?'copy':'unavailable');setConfirming(true);};
  const confirmKey=mode==='copy'?'send.copyConfirm':mode==='new'?'send.newSessionConfirm':'send.confirm';
  if(!sendable.length || (!canCurrent&&!canCreate&&!canCopy)) return null;
  return <>
    <button type="button" className={`space-send ${compact?'space-send-compact':'space-send-header'}`} disabled={disabled} title={hint} onClick={open}><MessageSquare size={14} aria-hidden="true"/><span>{t('send.action')}</span></button>
    <SpaceDialog open={confirming} onClose={()=>setConfirming(false)} labelledBy={titleId} title={t('send.chooseTitle')} closeLabel={t('dialog.close')} className="space-send-dialog" actions={<><button type="button" autoFocus onClick={()=>setConfirming(false)}>{t('comment.cancel')}</button><button type="button" className="is-primary" disabled={review.busy || !sendable.length || (mode==='current'&&!canCurrent) || (mode==='new'&&!canCreate)} onClick={()=>{setConfirming(false);void review.send(mode);}}>{t(confirmKey)}</button></>}>
      <p>{t('send.chooseDescription',{count:sendable.length})}</p>
      <fieldset className="space-send-options"><legend>{t('send.destination')}</legend>
        <label className="space-send-option"><input type="radio" name={groupId} value="current" checked={mode==='current'} disabled={!canCurrent} onChange={()=>setMode('current')}/><span><strong>{t('send.currentOption')}</strong><small className="space-send-conversation">{canCurrent && workspaceLabel && <span className="space-send-workspace">{workspaceLabel}</span>}{canCurrent ? (sessionLabel || t('send.sessionId',{id:sessionId})) : t('send.currentUnavailable')}</small></span></label>
        <label className="space-send-option"><input type="radio" name={groupId} value="new" checked={mode==='new'} disabled={!canCreate} onChange={()=>setMode('new')}/><span><strong>{t('send.newOption')}</strong><small>{canCreate?t('send.newOptionHint'):t('send.newUnavailable')}</small></span></label>
        {canCopy&&<label className="space-send-option"><input type="radio" name={groupId} value="copy" checked={mode==='copy'} onChange={()=>setMode('copy')}/><span><strong>{t('send.copyOption')}</strong><small>{t('send.copyOptionHint')}</small></span></label>}
      </fieldset>
    </SpaceDialog>
  </>;
}

/**
 * Coalesce overlapping comment rectangles so translucent anchor fills are
 * painted once. Keep an active range as a transparent outline over that fill.
 * @param {Array<object>} highlights - comment rectangles and zero-width carets.
 * @returns {Array<object>} non-overlapping fills plus active outlines.
 */
export function mergeCommentHighlights(highlights) {
  const carets=highlights.filter(item=>item.caret);
  const passthrough=highlights.filter(item=>!item.caret&&item.kind!=='comment');
  const rectangles=highlights.filter(item=>!item.caret&&item.kind==='comment').sort((a,b)=>a.top-b.top||a.height-b.height||a.left-b.left);
  const merged=[];
  for(const item of rectangles){
    const previous=merged.at(-1);
    if(previous&&Math.abs(previous.top-item.top)<=1&&Math.abs(previous.height-item.height)<=1&&item.left<=previous.left+previous.width){
      const right=Math.max(previous.left+previous.width,item.left+item.width);
      previous.width=right-previous.left;
      previous.active=previous.active||item.active;
      previous.keys.push(item.key);
      if(item.active) previous.activeRects.push(item);
    }else{
      merged.push({...item,active:false,keys:[item.key],activeRects:item.active?[item]:[]});
    }
  }
  const fills=merged.map(item=>({key:`comment-fill:${item.keys.join('|')}`,kind:'comment',active:false,left:item.left,top:item.top,width:item.width,height:item.height,caret:false}));
  const outlines=merged.flatMap(item=>item.activeRects.map(rect=>({...rect,key:`${rect.key}:active-outline`,active:true,outline:true})));
  return [...fills,...passthrough,...carets,...outlines];
}

/**
 * The paper and one Word-style annotation rail. Suggestions and comments share
 * the same margin cards, ordered by source position, and the document keeps
 * a minimum width instead of switching to a narrow stacked layout.
 * @param {object} props - review controller, signed-in author, and translator.
 * @returns {React.ReactElement} the scrollable document body and its annotation rail.
 */
export function SpaceReviewSurface({ review, user = null, t = defaultT }) {
  const [composerOpen,setComposerOpen]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [resizeTick,setResizeTick]=useState(0);
  const [hoverPreview,setHoverPreview]=useState(null);
  const hoverTimer=useRef(null);
  const [layout,setLayout]=useState({positions:{},lines:[],highlights:[],height:0,minHeight:0});
  const commentFieldId=useId(), commentTitleId=useId(), editSaveErrorTitleId=useId(), textareaRef=useRef(null), scrollRef=useRef(null), stageRef=useRef(null), railRef=useRef(null), fabRef=useRef(null);
  const [fabPosition,setFabPosition]=useState(null);
  const {doc,comments,active,setActive,activeComment,setActiveComment,draft,setDraft,selection,setSelection,zoom,busy,message,setMessage,surface,cardRefs,commentRefs,suggestions,statusText,chooseCard,chooseFromText,decide,addComment,deleteComment,editing,editorRef,markEditDirty}=review;
  const visibleComments=useMemo(()=>comments.filter(comment=>!['sent','processed'].includes(comment.status)),[comments]);
  const liveComments=useMemo(()=>visibleComments.filter(comment=>commentRange(comment)),[visibleComments]);
  const staleComments=useMemo(()=>visibleComments.filter(comment=>!commentRange(comment)),[visibleComments]);
  const hasAnnotations=suggestions.length>0 || visibleComments.length>0;
  const suggestionItems=useMemo(()=>suggestions.map((item,index)=>({kind:'suggestion',key:`suggestion:${item.id}`,id:item.id,item,index})),[suggestions]);
  const commentItems=useMemo(()=>liveComments.map(item=>({kind:'comment',key:`comment:${item.id}`,id:item.id,item})),[liveComments]);
  const items=useMemo(()=>[...suggestionItems,...commentItems],[suggestionItems,commentItems]);

  useLayoutEffect(()=>{
    const element=scrollRef.current;
    if(!element) return;
    const update=()=>setResizeTick(tick=>tick+1);
    update();
    const observer=typeof ResizeObserver==='function' ? new ResizeObserver(update) : null;
    observer?.observe(element);
    if(surface.current) observer?.observe(surface.current);
    window.addEventListener('resize',update);
    return ()=>{observer?.disconnect();window.removeEventListener('resize',update)};
  },[doc?.content]);
  useEffect(()=>{
    if(!document.fonts?.ready) return;
    let alive=true;document.fonts.ready.then(()=>{if(alive)setResizeTick(tick=>tick+1)});
    return ()=>{alive=false};
  },[]);
  // Direct selection on the rendered paper is the primary comment entry point.
  // Comments are anchored to rendered Markdown text; source editing is not exposed.
  useEffect(()=>{
    const element=surface.current;
    if(!element||!doc||editing) return;
    const raf=typeof requestAnimationFrame==='function'?requestAnimationFrame:callback=>setTimeout(callback,0);
    const caf=typeof cancelAnimationFrame==='function'?cancelAnimationFrame:clearTimeout;
    let frame=0;
    const capture=()=>{
      frame=0;
      if(composerOpen) return;
      if(document.activeElement?.tagName==='TEXTAREA') return;
      const selection=window.getSelection?.();
      if(!selection||selection.rangeCount===0){setSelection(previous=>previous?null:previous);return;}
      const range=selection.getRangeAt(0);
      if(range.collapsed){setSelection(previous=>previous?null:previous);return;}
      if(!element.contains(range.commonAncestorContainer)){setSelection(previous=>previous?null:previous);return;}
      try{
        const next=capturePreviewSelection(element,range,doc.content,doc.version);
        if(next) setSelection(previous=>previous&&previous.from===next.from&&previous.to===next.to&&previous.quote===next.quote?previous:next);
      }catch{}
    };
    const schedule=()=>{if(!frame)frame=raf(capture)};
    document.addEventListener('selectionchange',schedule);
    return ()=>{document.removeEventListener('selectionchange',schedule);if(frame)caf(frame)};
  },[composerOpen,doc,editing,setSelection,surface]);

  // Balloons are absolutely placed in the gutter, aligned to their anchor's
  // first line. The same DOM ranges drive the text highlights, connector dots
  // and SVG paths, so all three stay in sync with the Markdown source.
  useLayoutEffect(()=>{
    if(!hasAnnotations){
      setLayout(previous=>(previous.height===0&&!previous.lines.length&&!previous.highlights?.length&&!Object.keys(previous.positions).length
        ? previous : {positions:{},lines:[],highlights:[],height:0,minHeight:0}));
      return;
    }
    const stage=stageRef.current, paper=surface.current, rail=railRef.current;
    if(!stage||!paper||!rail) return;
    const stageRect=stage.getBoundingClientRect();
    const scale=zoom;
    const paperRect=paper.getBoundingClientRect();
    const railRect=rail.getBoundingClientRect();
    const spans=readSourceSpans(paper,doc.content);
    const activeKey=active!=null?`suggestion:${active}`:activeComment!=null?`comment:${activeComment}`:null;
    const anchorRects=new Map(), highlights=[];
    for(const annotation of items){
      const range=annotation.kind==='suggestion'
        ? {from:annotation.item.from,to:annotation.item.to}
        : commentRange(annotation.item);
      if(!range) continue;
      const mapped=sourceRangeToDom(spans,range.from,range.to);
      if(!mapped) continue;
      let rects=rangeRects(mapped.range,stageRect).map(rect=>Object.fromEntries(Object.entries(rect).map(([key,value])=>[key,typeof value==='number'?value/scale:value])));
      if(!rects.length){
        const fallback=mapped.startSpan.element.getBoundingClientRect();
        if(fallback&&(fallback.width||fallback.height)) rects=[{left:(fallback.left-stageRect.left)/scale,top:(fallback.top-stageRect.top)/scale,right:(fallback.right-stageRect.left)/scale,bottom:(fallback.bottom-stageRect.top)/scale,width:fallback.width/scale,height:fallback.height/scale}];
      }
      const first=rects[0];
      if(!first) continue;
      const last=rects[rects.length-1];
      anchorRects.set(annotation.key,{left:first.left,right:first.right,top:first.top,bottom:first.bottom,height:first.height,end:last});
      const isActive=annotation.key===activeKey;
      if(range.from===range.to){
        highlights.push({key:`${annotation.key}:caret`,kind:annotation.kind,active:isActive,left:Math.max(0,first.left-1),top:first.top,width:2,height:Math.max(first.height,18),caret:true});
      } else {
        rects.forEach((rect,index)=>{if(rect.width>0&&rect.height>0)highlights.push({key:`${annotation.key}:${index}`,kind:annotation.kind,deleted:annotation.kind==='suggestion'&&Boolean(annotation.item.expected),active:isActive,left:rect.left,top:rect.top,width:rect.width,height:rect.height,caret:false});});
      }
    }
    const mergedHighlights=mergeCommentHighlights(highlights);
    const ordered=[...items].sort((left,right)=>{
      const a=anchorRects.get(left.key)?.top ?? left.item.from ?? 0;
      const b=anchorRects.get(right.key)?.top ?? right.item.from ?? 0;
      return a-b || left.key.localeCompare(right.key);
    });
    const positions={}, lines=[]; let cursor=8;
    for(const annotation of ordered){
      const balloon=annotation.kind==='suggestion' ? cardRefs.current.get(annotation.id) : commentRefs.current.get(annotation.id);
      if(!balloon) continue;
      const anchor=anchorRects.get(annotation.key);
      const height=balloon.offsetHeight || 0;
      const offset=annotation.item.from ?? annotation.item.anchor?.from ?? 0;
      const sourceTop=doc.content.length?paper.offsetHeight*Math.max(0,Math.min(1,offset/doc.content.length)):0;
      const top=Math.max(anchor?.top ?? sourceTop,cursor);
      positions[annotation.key]=top;
      cursor=top+height+10;
      if(anchor){
        const geometry=annotationConnector(anchor.end,(railRect.left-stageRect.left)/scale,top,height,(paperRect.right-stageRect.left)/scale);
        lines.push({key:annotation.key,kind:annotation.kind,active:annotation.key===activeKey,...geometry});
      }
    }
    const minHeight=Math.max(paper.offsetHeight,cursor);
    setLayout(previous=>{
      if(JSON.stringify(previous.positions)===JSON.stringify(positions) && JSON.stringify(previous.lines)===JSON.stringify(lines) && JSON.stringify(previous.highlights||[])===JSON.stringify(mergedHighlights) && previous.height===cursor && previous.minHeight===minHeight) return previous;
      return {positions,lines,highlights:mergedHighlights,height:cursor,minHeight};
    });
  },[hasAnnotations,items,suggestions,liveComments,doc?.content,resizeTick,active,activeComment,confirmDelete,cardRefs,commentRefs,t,zoom]);
  useEffect(()=>{ if(!selection) setComposerOpen(false); },[selection]);
  useEffect(()=>{setConfirmDelete(null)},[comments]);
  useEffect(()=>{
    setHoverPreview(null);
    return ()=>{clearTimeout(hoverTimer.current);hoverTimer.current=null;};
  },[doc?.id]);
  useLayoutEffect(()=>{
    const button=fabRef.current, paper=surface.current;
    if(!selection || composerOpen || busy || !button || !paper) return;
    const virtual={contextElement:paper,getBoundingClientRect(){
      const mapped=sourceRangeToDom(readSourceSpans(paper,doc?.content),selection.from,selection.to);
      if(mapped) return mapped.range.getBoundingClientRect?.() || paper.getBoundingClientRect();
      const wrap=paper.closest('.space-paper-wrap'), rect=wrap?.getBoundingClientRect(), anchor=selection.anchor;
      if(rect&&anchor){const left=rect.left+anchor.x-wrap.scrollLeft,top=rect.top+anchor.top-wrap.scrollTop;return{x:left,y:top,left,right:left,top,bottom:rect.top+anchor.bottom-wrap.scrollTop,width:1,height:Math.max(1,anchor.bottom-anchor.top)}}
      return paper.getBoundingClientRect();
    }};
    let alive=true;
    const update=()=>computePosition(virtual,button,{placement:'top',middleware:[offset(10),flip(),shift({padding:8})]})
      .then(({x,y})=>{if(alive)setFabPosition({left:x,top:y});}).catch(()=>{});
    const cleanup=autoUpdate(virtual,button,update);
    return ()=>{alive=false;cleanup();};
  },[selection,composerOpen,busy,surface,resizeTick,zoom,doc?.content]);
  if (!doc) return <section className="space-paper-wrap"><p className="space-loading" role="status">{review.message || t('empty.loading')}</p></section>;

  const openComposer=()=>{setMessage('');setComposerOpen(true)};
  const closeComposer=()=>{setComposerOpen(false);setMessage('')};
  const saveComment=async()=>{const created=await addComment();if(created){setComposerOpen(false);setMessage('');setSelection(null)}};
  const askDelete=id=>setConfirmDelete(id);
  const doDelete=async id=>{await deleteComment(id);setConfirmDelete(null)};
  const scrollToAnchor=id=>{const comment=liveComments.find(item=>item.id===id);if(comment){const range=commentRange(comment);scrollToSourceOffset(surface.current,range.from,doc.content);}};
  const activateFromAnchor=id=>{setActive(null);setActiveComment(id);commentRefs.current.get(id)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'})};
  const activateFromBalloon=id=>{setActive(null);setActiveComment(id);scrollToAnchor(id)};
  const activateSuggestion=id=>{setActiveComment(null);setActive(id);chooseCard(id)};
  const keepHover=()=>{clearTimeout(hoverTimer.current);hoverTimer.current=null;};
  const closeHover=()=>{
    if(hoverTimer.current!==null) return;
    hoverTimer.current=setTimeout(()=>{hoverTimer.current=null;setHoverPreview(null);},180);
  };
  const trackHover=event=>{
    // Insertions are rendered as widgets/ins nodes outside the source text
    // spans, so map their explicit suggestion id before trying source offsets.
    const suggestionId=event.target?.closest?.('[data-suggestion-id]')?.getAttribute('data-suggestion-id');
    const insertedAnnotation=suggestionId==null?null:suggestionItems.find(item=>String(item.id)===suggestionId);
    if(insertedAnnotation){
      keepHover();
      setHoverPreview(previous=>previous?.key===insertedAnnotation.key ? previous : {key:insertedAnnotation.key,left:event.clientX,top:event.clientY});
      return;
    }
    const range=document.caretRangeFromPoint?.(event.clientX,event.clientY);
    const point=range
      ? {node:range.startContainer,offset:range.startOffset}
      : document.caretPositionFromPoint?.(event.clientX,event.clientY);
    if(!point) {closeHover();return;}
    const sourceOffset=sourceOffsetAtDomPoint(surface.current,point.node||point.offsetNode,point.offset,doc.content);
    if(!Number.isInteger(sourceOffset)) {closeHover();return;}
    const annotation=items.find(item=>{
      const range=item.kind==='suggestion'?{from:item.item.from,to:item.item.to}:commentRange(item.item);
      return range && (range.from===range.to ? sourceOffset===range.from : sourceOffset>=range.from&&sourceOffset<=range.to);
    });
    if(annotation) {
      keepHover();
      setHoverPreview(previous=>previous?.key===annotation.key ? previous : {key:annotation.key,left:event.clientX,top:event.clientY});
    }
    else closeHover();
  };
  const handleMarkdownLinkClick=event=>{
    const link=event.target?.closest?.('a[href]');
    if(!link||!surface.current?.contains(link)) return;
    const href=link.getAttribute('href')?.trim();
    if(!href) return;
    let destination;
    try { destination=new URL(href,window.location.href); }
    catch { event.preventDefault();return; }
    const current=new URL(window.location.href);
    if(href.startsWith('#')&&destination.origin===current.origin&&destination.pathname===current.pathname&&destination.search===current.search) return;
    if(['http:','https:','mailto:','tel:'].includes(destination.protocol)) {
      // Tauri's shell plugin opens external links with target="_blank" in the
      // system browser; regular browsers keep the CoSpace tab and open a tab.
      link.target='_blank';
      link.rel='noopener noreferrer';
      return;
    }
    // DSH resource links are resolved by the host. Other schemes are not
    // allowed to replace the active CoSpace view.
    if(destination.protocol!=='dsh-resource:') event.preventDefault();
  };
  const anchor=selection?.anchor;
  const fabBelow=(anchor?.top || 0)<60;
  const fabLeft=Math.max(40,Math.min(anchor?.x || 0,(anchor?.wrapWidth || 120)-40));
  return <section className={`space-paper-wrap${editing?' is-editing':''}`} aria-label={t('paper.aria')} ref={scrollRef}>
    <div className={`space-doc-stage${hasAnnotations?' has-annotations':''}`} ref={stageRef} style={{zoom}}>
      <div ref={surface} onClickCapture={handleMarkdownLinkClick} onPointerMove={editing?undefined:trackHover} onPointerLeave={closeHover} className={`space-paper${doc.content.replace(/^# [^\r\n]*(?:\r?\n)+/,'').trim()?'':' is-empty'}`} tabIndex={-1}><MarkdownEditor key={editing?'edit':`review-${doc.version}`} markdown={doc.content} editorRef={editorRef} onChange={markEditDirty} onDecorationsReady={()=>setResizeTick(tick=>tick+1)} t={t} readOnly={!editing} autoFocus={review.autoFocus} suggestions={suggestions}/></div>
      <div className="space-anchor-layer" aria-hidden="true">{layout.highlights?.map(highlight=><span key={highlight.key} className={`space-anchor-rect is-${highlight.kind}${highlight.deleted?' is-deleted':''}${highlight.active?' is-active':''}${highlight.caret?' is-caret':''}${highlight.outline?' is-outline':''}`} style={{left:highlight.left,top:highlight.top,width:highlight.width,height:highlight.height}}/>)}</div>
      {hasAnnotations && <aside className="space-comment-rail" ref={railRef} aria-label={t('annotations.title')} style={{minHeight:layout.minHeight||undefined}}>
        <div className="space-comment-spacer" style={{height:layout.height||0}} />
        <div className="space-comment-balloons is-positioned">
          {suggestionItems.map(annotation=><SuggestionBalloon key={annotation.key} item={annotation.item} index={annotation.index} active={active===annotation.item.id} busy={busy} t={t} onActivate={()=>activateSuggestion(annotation.item.id)} onDecide={decision=>decide(annotation.item.id,decision)} onPointerEnter={keepHover} onPointerLeave={closeHover} setRef={(id,el)=>{if(el)cardRefs.current.set(id,el);else cardRefs.current.delete(id)}} style={{top:layout.positions[annotation.key],visibility:layout.positions[annotation.key]===undefined?'hidden':undefined,...(hoverPreview?.key===annotation.key?{'--hover-x':`${hoverPreview.left}px`,'--hover-y':`${hoverPreview.top}px`}: {})}} className={hoverPreview?.key===annotation.key?'is-hover-preview':''}/>) }
          {liveComments.map(comment=><CommentBalloon key={comment.id} comment={comment} author={user} active={activeComment===comment.id} busy={busy} t={t} statusText={statusText} confirming={confirmDelete===comment.id} onAskDelete={askDelete} onConfirmDelete={doDelete} onCancelDelete={()=>setConfirmDelete(null)} onActivate={activateFromBalloon} onPointerEnter={keepHover} onPointerLeave={closeHover} setRef={(id,el)=>{if(el)commentRefs.current.set(id,el);else commentRefs.current.delete(id)}} style={{top:layout.positions[`comment:${comment.id}`],visibility:layout.positions[`comment:${comment.id}`]===undefined?'hidden':undefined,...(hoverPreview?.key===`comment:${comment.id}`?{'--hover-x':`${hoverPreview.left}px`,'--hover-y':`${hoverPreview.top}px`}: {})}} className={hoverPreview?.key===`comment:${comment.id}`?'is-hover-preview':''}/>) }
        </div>
        {staleComments.length>0 && <section className="space-comment-stale" aria-label={t('comment.staleGroup')}>
          <h3>{t('comment.staleGroup')}</h3><p className="space-muted">{t('comment.staleHint')}</p>
          {staleComments.map(comment=><CommentBalloon key={comment.id} comment={comment} author={user} active={activeComment===comment.id} busy={busy} t={t} statusText={statusText} confirming={confirmDelete===comment.id} onAskDelete={askDelete} onConfirmDelete={doDelete} onCancelDelete={()=>setConfirmDelete(null)} onActivate={()=>{}} setRef={(id,el)=>{if(el)commentRefs.current.set(id,el);else commentRefs.current.delete(id)}}/>)}
        </section>}
      </aside>}
      {layout.lines.length>0 && <svg className="space-comment-lines" aria-hidden="true">{layout.lines.map(line=><g key={line.key} className={line.active?'is-active':undefined}>
        <path pathLength="1" className={`space-connector-line ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} d={line.d}/>
        <circle className={`space-connector-dot is-origin ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} cx={line.x1} cy={line.y1} r="2"/>
        <circle className={`space-connector-dot is-target ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} cx={line.x2} cy={line.y2} r="4"/>
      </g>)}</svg>}
    </div>
    <div className="space-comment-layer">
      {selection && !composerOpen && !busy && <button ref={fabRef} type="button" className={`space-comment-fab${!fabPosition && fabBelow?' is-below':''}${fabPosition?' is-positioned':''}`} style={fabPosition || {left:fabLeft,top:fabBelow?(anchor?.bottom||0)+10:(anchor?.top||0)-10}} onMouseDown={event=>event.preventDefault()} onClick={openComposer} aria-haspopup="dialog" aria-label={t('comment.bubble')}><CommentIcon/><span>{t('comment.bubble')}</span></button>}
      <SpaceDialog open={Boolean(selection && composerOpen)} onClose={()=>{setComposerOpen(false);setMessage('')}} labelledBy={commentTitleId} title={t('comment.addTitle')} closeLabel={t('dialog.close')} className="space-comment-dialog" actions={selection&&<><button type="button" onClick={closeComposer}>{t('comment.cancel')}</button><button type="button" className="is-primary" disabled={busy || !draft.trim()} onClick={saveComment}>{t('comment.save')}</button></>}>
        {selection && <>
          <p className="space-comment-selected">{t('comment.selected',{quote:selection.quote})}</p>
          <label htmlFor={commentFieldId}>{t('comment.label')}</label>
          <textarea ref={textareaRef} autoFocus id={commentFieldId} rows="4" maxLength="4000" value={draft} onChange={event=>{setDraft(event.target.value);if(message)setMessage('')}} onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();if(!busy&&draft.trim())saveComment()}}}/>
          {message && <p className="space-comment-error" role="alert">{message}</p>}
        </>}
      </SpaceDialog>
      <SpaceDialog open={Boolean(review.editSaveError)} onClose={review.dismissEditSaveError} labelledBy={editSaveErrorTitleId} title={t('edit.saveErrorTitle')} closeLabel={t('dialog.close')} className="space-comment-dialog" actions={<button type="button" autoFocus onClick={review.dismissEditSaveError}>{t('edit.keepEditing')}</button>}>
        <p role="alert">{review.editSaveError}</p>
        <p className="space-muted">{t('edit.saveErrorKeepEditing')}</p>
      </SpaceDialog>
      {composerOpen && selection?.rects?.map((rect,index)=><span key={index} className="space-selection-hint" style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}/>)}
    </div>
  </section>;
}

export function SpaceApp({ adapter, onOpenAgents, t = defaultT }) {
  const sessionId=adapter.conversation?.current?.id || null;
  const api=adapter.core.request;
  const [documents,setDocuments]=useState([]), [docId,setDocId]=useState(null), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const [autoEditDocId,setAutoEditDocId]=useState(null);
  const [query,setQuery]=useState(''), [filter,setFilter]=useState('all'), [sort,setSort]=useState('recent');
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [settingsOpen,setSettingsOpen]=useState(false),[settings,setSettings]=useState(null),[settingsError,setSettingsError]=useState(''),[settingsScope,setSettingsScope]=useState('document'),[instructionText,setInstructionText]=useState(''),[instructionSaveState,setInstructionSaveState]=useState('idle'),[settingsBusy,setSettingsBusy]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [promptTask,setPromptTask]=useState(null),[copiedPrompt,setCopiedPrompt]=useState(false);
  const deleteTitleId=useId();
  const editUnavailableTipId=useId();
  const user=useCurrentUser(adapter.identity?.getCurrentUser);
  const review=useSpaceReview(api,docId,sessionId,t,adapter,autoEditDocId);
  const translateNow=useRef(t); translateNow.current=t;
  const call=useCallback((method,args={})=>api(method,args),[api]);
  const documentsSnapshot=useRef(null);
  const reloadDocs=useCallback(async()=>{const list=await call('listDocuments');const signature=JSON.stringify(list);if(signature!==documentsSnapshot.current){documentsSnapshot.current=signature;setDocuments(list)}return list;},[call]);
  useEffect(()=>{let cancelled=false;reloadDocs().catch(e=>{if(!cancelled)setMessage(errorText(e,translateNow.current))});return()=>{cancelled=true}},[reloadDocs]);
  useEffect(()=>{
    if(docId) return;
    let stopped=false;
    const sync=()=>{if(!stopped&&document.visibilityState!=='hidden')reloadDocs().catch(()=>{})};
    const timer=setInterval(sync,4000);
    document.addEventListener('visibilitychange',sync);
    return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',sync)};
  },[docId,reloadDocs]);
  const newDocument=async()=>{
    setBusy(true);setMessage('');
    try {
      const created=await call('createDocument',{title:t('document.untitled'),operationId:requestId()});
      await reloadDocs();setAutoEditDocId(created.id);setDocId(created.id);
    } catch (e) { setMessage(errorText(e,t)); }
    finally { setBusy(false); }
  };
  const deleteDocument=async()=>{
    if(!deleteTarget) return;
    setBusy(true);setMessage('');
    try {
      await call('deleteDocument',{docId:deleteTarget.id});
      await reloadDocs();
      setDeleteTarget(null);
      if(docId===deleteTarget.id) setDocId(null);
    } catch (e) { setMessage(errorText(e,translateNow.current)); }
    finally { setBusy(false); }
  };
  const exportDocument=async (format)=>{
    setExporting(true);setMessage('');
    try {
      const snapshot=await call('readDocument',{docId});
      if(!snapshot || typeof snapshot.content!=='string') throw new Error('Document unavailable');
      const filename=exportFileName(snapshot.title,format);
      const file=format==='md'
        ? {name:filename,type:'text/markdown;charset=utf-8',bytes:new TextEncoder().encode(snapshot.content)}
        : format==='docx'
          ? {name:filename,type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes:new Uint8Array(await createDocx(snapshot.content).arrayBuffer())}
          : null;
      if(!file || !supportsCapability(adapter.capabilities,'files.export.save') || typeof adapter.files?.saveExport!=='function') throw new Error('Export saving is unavailable');
      const saved=await adapter.files.saveExport(file);
      if(saved!==true) throw new Error('Export saving was not accepted');
    } catch {
      setMessage(t('export.failed'));
    }
    finally { setExporting(false); }
  };
  const openCollaboration=async(scope)=>{setSettings(null);setSettingsError('');setSettingsScope(scope);setInstructionText('');setInstructionSaveState('idle');setSettingsOpen(true);setSettingsBusy(true);try{const next=await call('readCollaboration',{docId:scope==='document'?docId:undefined});setSettings(next);setInstructionText((scope==='global'?next.global:next.document)?.content||'')}catch(e){setSettingsError(e?.code==='METHOD_NOT_FOUND'?t('collab.backendOutdated'):errorText(e,t))}finally{setSettingsBusy(false)}};
  const saveCollaboration=useCallback(async(content)=>{const current=settingsScope==='global'?settings?.global:settings?.document;setInstructionSaveState('saving');try{await call('saveInstructions',{scope:settingsScope,docId:settingsScope==='document'?docId:undefined,content,baseVersion:current?.version||0,operationId:requestId()});const next=await call('readCollaboration',{docId:settingsScope==='document'?docId:undefined});setSettings(next);setInstructionSaveState('saved')}catch(e){setSettingsError(e?.code==='METHOD_NOT_FOUND'?t('collab.backendOutdated'):errorText(e,t));setInstructionSaveState('error')}},[call,docId,settingsScope,settings,t]);
  const saveInstructionNow=async()=>{await saveCollaboration(instructionText)};
  const closeCollaboration=()=>{setSettingsOpen(false)};
  const backToHome=async()=>{
    if(review.editing){const saved=await review.switchToReview();if(!saved)return;}
    setDocId(null);
  };
  const visibleComments=review.comments.filter(comment=>!['sent','processed'].includes(comment.status));
  const selectedDocument=documents.find(item=>item.id===docId);
  const promptText=promptTask ? (promptTask.docId ? autonomousReviewPrompt(`space:${encodeURIComponent(promptTask.docId)}`) : '请根据我的要求，通过 CoSpace MCP 创建一份新文档并提交完整初稿。') : '';
  const copyPrompt=async()=>{try{await navigator.clipboard.writeText(promptText);setCopiedPrompt(true)}catch{setCopiedPrompt(false)}};
  const pendingTotal=documents.reduce((total,item)=>total+(item.pending||0),0);
  const shownDocuments=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase();
    const time=item=>{const value=Date.parse(item.updatedAt || item.createdAt || '');return Number.isFinite(value)?value:0;};
    return documents.filter(item=>(!needle || (item.title || item.id || '').toLocaleLowerCase().includes(needle)) && (filter!=='pending' || item.pending>0))
      .sort((a,b)=>sort==='title' ? (a.title||a.id||'').localeCompare(b.title||b.id||'',undefined,{numeric:true}) : time(b)-time(a));
  },[documents,query,filter,sort]);
  const home=!docId;
  const savedInstruction=settingsScope==='global'?settings?.global:settings?.document;
  const instructionDirty=Boolean(settings)&&instructionText!==(savedInstruction?.content||'');
  return <div className="space-app">
    {home ? <main className="space-home" aria-labelledby="space-home-title">
      <header className="space-home-header"><div className="space-brand"><CospaceMark className="space-brand-icon"/><span className="space-brand-names"><strong>{t('brand.name')}</strong><small>{t('brand.nameEnglish')}</small></span><small className="space-build-version" title={t('build.versionTitle')}>{localBuildVersion}</small></div><div className="space-header-tools">{onOpenAgents&&<button type="button" className="space-collab-trigger" onClick={onOpenAgents}>Agent 接入</button>}{adapter.prompts&&<button type="button" className="space-collab-trigger" onClick={()=>setPromptTask({kind:'create'})}>让 Agent 起草</button>}<button type="button" className="space-home-new" disabled={busy} onClick={newDocument}><Plus size={16} aria-hidden="true"/>{t('nav.newDocument')}</button></div></header>
      <section className="space-home-intro"><div><p className="space-home-eyebrow">{t('home.eyebrow')}</p><h1 id="space-home-title">{t('home.title')}</h1><p className="space-home-description">{t('home.description')}</p></div><div className="space-home-stats" aria-label={t('nav.aria')}><span><strong>{documents.length}</strong>{t('home.documentCount',{count:documents.length})}</span><i aria-hidden="true"/><span><strong>{pendingTotal}</strong>{t('home.pendingCount',{count:pendingTotal})}</span></div></section>
      <section className="space-home-content" aria-label={t('nav.documents')}><div className="space-home-section-title"><h2>{t('nav.documents')}</h2>{documents.length>0&&<span>{documents.length}</span>}</div>
        {documents.length>0 && <div className="space-document-tools"><label className="space-document-search"><Search size={16} aria-hidden="true"/><span className="space-visually-hidden">{t('home.search')}</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder={t('home.search')}/></label><span className="space-visually-hidden">{t('home.filter')}</span><HomeSelect label={t('home.filter')} value={filter} onChange={setFilter} options={[{value:'all',label:t('home.filterAll')},{value:'pending',label:t('home.filterPending')}]}/><span className="space-visually-hidden">{t('home.sort')}</span><HomeSelect label={t('home.sort')} value={sort} onChange={setSort} options={[{value:'recent',label:t('home.sortRecent')},{value:'title',label:t('home.sortTitle')}]}/></div>}
        {shownDocuments.length ? <div className="space-home-grid">{shownDocuments.map((item,index)=><article className="space-home-card" key={item.id}>
          <button type="button" className="space-home-card-open" aria-label={t('home.openDocument',{title:item.title||item.id})} onClick={()=>setDocId(item.id)}>
            <span className={`space-home-card-art is-tone-${index%4}`} aria-hidden="true"><span className="space-paper-icon"><i/><i/><i/><b/></span><span className="space-home-card-art-label">{BRAND.name.en.toUpperCase()}</span></span>
            <span className="space-home-card-copy"><strong title={item.title||item.id}>{item.title||item.id}</strong><span className="space-home-card-meta">{documentCardTime(item,t)}</span></span>
            <span className="space-home-card-footer">{item.pending>0?<span className="space-home-pending"><i aria-hidden="true"/>{t('annotations.suggestions',{count:item.pending})}</span>:<span className="space-home-clear">{t('home.noPending')}</span>}<span className="space-home-open-icon" aria-hidden="true">↗</span></span>
          </button><button type="button" className="space-home-delete" disabled={busy} aria-label={t('nav.deleteDocumentLabel',{title:item.title||item.id})} title={t('nav.deleteDocument')} onClick={()=>setDeleteTarget(item)}><TrashIcon size={15}/></button>
        </article>)}</div> : documents.length ? <p className="space-document-no-results" role="status">{t('home.noResults')}</p> : <div className="space-home-empty"><span className="space-empty-mark" aria-hidden="true"><span/><span/><span/></span><h2>{t('home.emptyTitle')}</h2><p>{t('home.emptyDescription')}</p><button type="button" className="space-home-new" disabled={busy} onClick={newDocument}><Plus size={16} aria-hidden="true"/>{t('nav.newDocument')}</button></div>}
      </section><div className="space-message space-home-message" role="status" aria-live="polite">{message}</div>
    </main> : <>
      <header className="space-top space-preview-top"><IconButton className="space-back" label={t('home.back')} disabled={busy||review.busy} onClick={backToHome}><ArrowLeft size={18} aria-hidden="true"/></IconButton><div className="space-preview-heading"><span>{t('home.eyebrow')} <small className="space-build-version" title={t('build.versionTitle')}>{localBuildVersion}</small></span><h1 title={review.doc?.title||selectedDocument?.title||docId}>{review.doc?.title||selectedDocument?.title||docId}</h1></div>
            <div className="space-header-tools" role="group" aria-label={t('toolbar.aria')}>
              {review.doc&&<ReviewToolsMenu exporting={exporting} onExport={exportDocument} onReview={adapter.prompts?()=>setPromptTask({kind:'review',docId}):null} onPreferences={()=>openCollaboration('document')} onOpenAgents={onOpenAgents} canExport={supportsCapability(adapter.capabilities,'files.export.save')} t={t}/>}
              {review.doc&&<div className="space-toolbar-group is-view">
                <div className="space-mode-switch" role="group" aria-label={t('edit.modeLabel')}><button type="button" aria-pressed={!review.editing} disabled={busy||review.busy} title={review.editing?t('edit.autoSaveHint'):undefined} onClick={()=>review.editing?review.switchToReview():null}>{t('edit.reviewMode')}</button><span className={`space-edit-mode-option${!review.canEdit&&!review.editing?' is-unavailable':''}`} tabIndex={!review.canEdit&&!review.editing?0:undefined} aria-describedby={!review.canEdit&&!review.editing?editUnavailableTipId:undefined} data-tooltip={t('edit.unavailableReason')}><button type="button" aria-pressed={review.editing} disabled={busy||review.busy||(!review.canEdit&&!review.editing)} onClick={()=>review.editing?null:review.startEditing()}>{t('edit.editMode')}</button>{!review.canEdit&&!review.editing&&<span id={editUnavailableTipId} role="tooltip" className="space-edit-tooltip">{t('edit.unavailableReason')}</span>}</span></div>
                <ReviewZoomControls review={review} t={t}/>
              </div>}
              {review.editing&&review.busy&&<span className="space-edit-status" role="status">{t('edit.saving')}</span>}
              {!review.editing&&visibleComments.length>0&&<ReviewSendButton review={review} sessionId={sessionId} adapter={adapter} t={t}/>}
            </div>
      </header>
      {!review.doc ? <main className="space-preview-loading" aria-live="polite">{review.message||t('empty.loading')}</main> : <main className="space-main"><SpaceReviewSurface review={review} user={user} t={t}/></main>}
    </>}
    {!home&&<div className="space-message" role="status" aria-live="polite">{review.editSaveError ? '' : message || (review.doc ? review.message : '')}</div>}
    <SpaceDialog open={Boolean(promptTask)} onClose={()=>{setPromptTask(null);setCopiedPrompt(false)}} labelledBy="space-agent-prompt-title" title="发送给 Agent 的提示词" closeLabel={t('dialog.close')} actions={<><button type="button" onClick={()=>{setPromptTask(null);setCopiedPrompt(false)}}>{t('dialog.close')}</button><button type="button" className="is-primary" onClick={copyPrompt}>{copiedPrompt?'已复制':'复制提示词'}</button></>}>{adapter.prompts?.mcpReady===false&&<p>请先在 Agent 接入设置中配置 CoSpace MCP。</p>}<textarea readOnly rows="8" value={promptText}/></SpaceDialog>
    <SpaceDialog open={Boolean(deleteTarget)} onClose={()=>setDeleteTarget(null)} labelledBy={deleteTitleId} title={t('document.deleteTitle')} closeLabel={t('dialog.close')} className="space-delete-dialog" actions={<><button type="button" autoFocus disabled={busy} onClick={()=>setDeleteTarget(null)}>{t('document.deleteCancel')}</button><button type="button" className="is-danger" disabled={busy} onClick={deleteDocument}>{t('document.deleteConfirm')}</button></>}>
      <p>{t('document.deleteDescription',{title:deleteTarget?.title || deleteTarget?.id || ''})}</p>
    </SpaceDialog>
    <SpaceDialog open={settingsOpen} onClose={closeCollaboration} labelledBy="space-collab-title" title={t('collab.documentTitle')} closeLabel={t('dialog.close')} closeOnBackdrop actions={<button type="button" className="is-primary" disabled={!instructionDirty||instructionSaveState==='saving'||settingsBusy||Boolean(settingsError)} onClick={saveInstructionNow}>{t('collab.save')}</button>}>{settingsError&&<p className="space-collab-error" role="alert">{settingsError}</p>}{settingsBusy&&!settings?<p role="status">{t('collab.loading')}</p>:<><textarea rows="8" maxLength={12000} value={instructionText} onChange={event=>{setSettingsError('');setInstructionSaveState('idle');setInstructionText(event.target.value)}} placeholder={t('collab.placeholder')}/><p className="space-collab-save-status" role="status">{instructionSaveState==='saving'?t('collab.saving'):instructionSaveState==='saved'?t('collab.saved'):instructionSaveState==='error'?t('collab.saveError'):''}</p></>}</SpaceDialog>
  </div>;
}
