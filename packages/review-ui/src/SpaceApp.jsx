import { Fragment, createElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { errorText, translate, zh } from './locale.js';
import { renderMarkdown } from './markdown.js';
import { capturePreviewSelection, rangeRects, readSourceSpans, scrollSourceRange, sourceRangeToDom } from './markdown-dom.js';
import { rememberDocumentTitle } from './document-titles.js';
import { useCurrentUser } from './current-user.js';
import './space.css';

const h = createElement;
const requestId = () => globalThis.crypto.randomUUID();
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

/** Render Markdown as annotated, escaped HTML; raw HTML stays disabled. */
function documentView(html) { return <div className="space-markdown" dangerouslySetInnerHTML={{__html:html}} />; }

function TrashIcon({size=14}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function RefreshIcon({size=15}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 6M20 4v7h-7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function CommentIcon({size=15}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4.5 3v-4.2A7.5 7.5 0 0 1 1 11.5 7.5 7.5 0 0 1 8.5 4h5A7.5 7.5 0 0 1 21 11.5Z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

/** Shared native modal surface for workbench dialogs. */
function SpaceDialog({ open, onClose, labelledBy, className = '', children }) {
  const dialogRef=useRef(null);
  useEffect(()=>{
    const dialog=dialogRef.current;
    if(!dialog) return;
    if(open && !dialog.open) {
      if(typeof dialog.showModal==='function') dialog.showModal();
      else dialog.setAttribute('open','');
    } else if(!open && dialog.open) {
      if(typeof dialog.close==='function') dialog.close();
      else dialog.removeAttribute('open');
    }
  },[open]);
  return <dialog ref={dialogRef} className={`space-dialog ${className}`} aria-labelledby={labelledBy} onClose={onClose}>{children}</dialog>;
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
export function useSpaceReview(api, docId, sessionId, t = defaultT, sendTarget = null) {
  const [doc,setDoc]=useState(null);
  const [comments,setComments]=useState([]);
  const [active,setActive]=useState(null);
  const [activeComment,setActiveComment]=useState(null);
  const [draft,setDraft]=useState('');
  const [selection,setSelection]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const surface=useRef(null), cardRefs=useRef(new Map()), commentRefs=useRef(new Map()), loadSequence=useRef(0);
  const snapshot=useRef(null), busyRef=useRef(false);
  // Async callbacks may outlive a render; read the active locale at completion time.
  const translateNow=useRef(t); translateNow.current=t;
  const call=useCallback((method,args={})=>api(method,args),[api]);
  const reload=useCallback(async id=>{
    const sequence=++loadSequence.current;
    const next=await call('readDocument',{docId:id});
    if (sequence!==loadSequence.current) return;
    const nextComments=next?.comments || [];
    const signature=JSON.stringify(next);
    const contentChanged=!snapshot.current || snapshot.current.content!==next?.content || snapshot.current.version!==next?.version;
    if(snapshot.current?.signature!==signature){setDoc(next);setComments(nextComments)}
    snapshot.current={signature,content:next?.content,version:next?.version};
    if(contentChanged) setSelection(null);
    if (next?.title) rememberDocumentTitle(id,next.title);
  },[call]);
  useEffect(()=>{
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
  const statusText=item=>statusKeys[item.status] ? t(statusKeys[item.status]) : item.status;
  const chooseCard=id=>{setActiveComment(null);setActive(id);const item=doc?.suggestions?.find(suggestion=>suggestion.id===id);if(!item||!scrollSourceRange(surface.current,item.from,item.to))setMessage(t('suggestion.unavailable'));};
  const chooseFromText=id=>{setActiveComment(null);setActive(id);cardRefs.current.get(id)?.scrollIntoView({block:'nearest',behavior:'auto'});};
  const perform=async fn=>{setBusy(true);setMessage('');try{return await fn()}catch(e){setMessage(errorText(e,translateNow.current));return null}finally{setBusy(false)}};
  const decide=(suggestionId,decision)=>perform(async()=>{await call('decide',{docId,suggestionId,decision,operationId:requestId()});await reload(docId)});
  const addComment=()=>perform(async()=>{
    if(!selection || !draft.trim()) throw Error(t('comment.required'));
    const created=await call('createComment',{docId,quote:selection.quote,body:draft.trim(),anchor:{from:selection.from,to:selection.to,version:selection.version}});
    setDraft('');await reload(docId);setActiveComment(created.id);return created;
  });
  const send=()=>perform(async()=>{
    const ids=comments.filter(item=>['pending','failed'].includes(item.status)).map(item=>item.id);
    if(!ids.length) throw Error(t('send.none'));
    if(sendTarget?.mode==='copy') {
      if(typeof navigator?.clipboard?.writeText!=='function') throw Object.assign(new Error(t('send.clipboardUnavailable')),{code:'CLIPBOARD_UNAVAILABLE'});
      const text=`space:${encodeURIComponent(docId)}\n${t('send.processingPrompt')}`;
      await navigator.clipboard.writeText(text);
      setMessage(t('send.copied'));
      setActiveComment(null);
      return {copied:true};
    }
    // The current conversation wins. Without one, the Host resolves the most
    // recent workspace (creating a default one when necessary), creates or
    // reuses a Session, and returns the exact identity it used. The client only
    // opens that identity, so creation and retry cannot disagree.
    const targetSessionId=sessionId || undefined;
    try {
      const result=await call('sendComments',{docId,commentIds:ids,...targetSessionId?{sessionId:targetSessionId}:{},operationId:requestId()});
      if(!targetSessionId && result?.createdSession && result.sessionId && typeof sendTarget?.openSession==='function') sendTarget.openSession(result.sessionId);
      return result;
    } finally { await reload(docId);setActiveComment(null); }
  });
  const deleteComment=id=>perform(async()=>{await call('deleteComment',{docId,commentId:id});setActiveComment(null);await reload(docId);});
  return {doc,setDoc,comments,active,setActive,activeComment,setActiveComment,draft,setDraft,selection,setSelection,busy,message,setMessage,surface,cardRefs,commentRefs,reload,suggestions,statusText,chooseCard,chooseFromText,decide,addComment,deleteComment,send};
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

function CommentBalloon({ comment, author, active, busy, t, statusText, confirming, onAskDelete, onConfirmDelete, onCancelDelete, onActivate, setRef, style, className = '', onPointerEnter }) {
  const visibleStatus=comment.status;
  const locked=busy || comment.status==='sending';
  const status=comment.status==='pending'
    ? (comment.stale?t('comment.staleStatus'):null)
    : `${statusText(comment)}${comment.stale?t('comment.stale'):''}`;
  const authorName=author?.name || (author?.signedIn?t('comment.deepseekUser'):null);
  return <article className={`space-annotation-balloon space-comment-balloon${active?' is-active':''}${comment.stale?' is-stale':''}${confirming?' is-confirming':''} ${className}`} data-comment-id={comment.id} ref={el=>setRef(comment.id,el)} style={style} onPointerEnter={onPointerEnter} onPointerLeave={()=>{}} onClick={()=>onActivate(comment.id)}>
    <AnnotationIdentity name={authorName} avatarUrl={author?.avatarUrl} createdAt={comment.createdAt} fallback={t('comment.author')}/>
    {status && <div className="space-annotation-head"><span className={`space-comment-status is-${visibleStatus}`}>{status}</span></div>}
    <p className="space-comment-body">{comment.body}</p>
    {comment.processing?.suggestions?.length>0 && <div className="space-comment-processing-meta">{t('comment.relatedSuggestions',{states:comment.processing.suggestions.map(item=>suggestionStatusKeys[item.status]?t(suggestionStatusKeys[item.status]):item.status).join('、')})}</div>}
    <button type="button" className="space-comment-delete-icon" disabled={locked} aria-label={t('comment.delete')} title={t('comment.delete')} onClick={event=>{event.stopPropagation();onAskDelete(comment.id)}}><TrashIcon/></button>
    {confirming && <div className="space-comment-footer is-confirming" onClick={event=>event.stopPropagation()}>
      <span className="space-comment-confirm-text">{t('comment.deleteConfirm')}</span>
      <button type="button" className="space-comment-delete is-danger" disabled={locked} onClick={()=>onConfirmDelete(comment.id)}>{t('comment.delete')}</button>
      <button type="button" className="space-comment-delete" disabled={locked} onClick={()=>onCancelDelete()}>{t('comment.cancel')}</button>
    </div>}
  </article>;
}

/** Render a compact decision card linked to an inline preview difference. */
function SuggestionBalloon({ item, active, busy, t, onActivate, onDecide, setRef, style, className = '', onPointerEnter }) {
  const conflicted=item.status==='conflicted';
  return <article className={`space-annotation-balloon space-suggestion-balloon${active?' is-active':''}${conflicted?' is-conflicted':''} ${className}`} data-suggestion-card={item.id} ref={el=>setRef(item.id,el)} style={style} onPointerEnter={onPointerEnter} onClick={onActivate}>
    <div className="space-suggestion-head"><AnnotationIdentity name={item.author} createdAt={item.createdAt} fallback={t('suggestion.defaultAuthor')} fallbackTime={t('suggestion.unknownTime')}/>{!conflicted && <div className="space-suggestion-actions"><button type="button" className="is-accept" disabled={busy} aria-label={t('action.accept')} title={t('action.accept')} onClick={event=>{event.stopPropagation();onDecide('accept')}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg></button><button type="button" className="is-reject" disabled={busy} aria-label={t('action.reject')} title={t('action.reject')} onClick={event=>{event.stopPropagation();onDecide('reject')}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>}</div>
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
export function ReviewSendButton({ review, sessionId, sendTarget = null, t = defaultT, compact = false }) {
  const titleId=useId();
  const [confirming,setConfirming]=useState(false);
  const sendable=review.comments.filter(item=>['pending','failed'].includes(item.status));
  const copyMode=sendTarget?.mode==='copy';
  const canCreate=!sessionId && sendTarget?.canCreate === true;
  const disabled=review.busy || !sendable.length || (!copyMode && !sessionId && !canCreate);
  const hint=copyMode?t('send.copyHint'):!sessionId ? (canCreate?t('send.newSessionHint'):t('send.hint')) : undefined;
  const start=()=>{ if(copyMode) void review.send(); else if(canCreate) setConfirming(true); else void review.send(); };
  if(!sendable.length) return null;
  return <>
    <button type="button" className={`space-send ${compact?'space-send-compact':'space-send-header'}`} disabled={disabled} title={hint} onClick={start}>{t('send.all',{count:sendable.length})}</button>
    <SpaceDialog open={confirming} onClose={()=>setConfirming(false)} labelledBy={titleId} className="space-send-dialog">
      <h2 id={titleId}>{t('send.newSessionTitle')}</h2>
      <p>{t('send.newSessionDescription',{count:sendable.length})}</p>
      <div className="space-comment-actions">
        <button type="button" onClick={()=>setConfirming(false)}>{t('comment.cancel')}</button>
        <button type="button" className="is-primary" autoFocus onClick={()=>{setConfirming(false);void review.send();}}>{t('send.newSessionConfirm')}</button>
      </div>
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
  const rectangles=highlights.filter(item=>!item.caret).sort((a,b)=>a.top-b.top||a.height-b.height||a.left-b.left);
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
  return [...fills,...carets,...outlines];
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
  const [zoom,setZoom]=useState(1);
  const [hoverPreview,setHoverPreview]=useState(null);
  const hoverTimer=useRef(null);
  const [layout,setLayout]=useState({positions:{},lines:[],highlights:[],height:0,minHeight:0});
  const commentFieldId=useId(), commentTitleId=useId(), textareaRef=useRef(null), scrollRef=useRef(null), stageRef=useRef(null), railRef=useRef(null);
  const {doc,comments,active,setActive,activeComment,setActiveComment,draft,setDraft,selection,setSelection,busy,message,setMessage,surface,cardRefs,commentRefs,suggestions,statusText,chooseCard,chooseFromText,decide,addComment,deleteComment}=review;
  // Keep the annotated HTML stable across selection/card state so the browser
  // selection and its text nodes are never replaced by an equal re-render.
  const markdownHtml=useMemo(()=>doc?renderMarkdown(doc.content,doc.suggestions||[]):'',[doc?.content,doc?.suggestions]);
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
    if(!element||!doc) return;
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
  },[composerOpen,doc,setSelection,surface]);

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
    const spans=readSourceSpans(paper);
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
      anchorRects.set(annotation.key,{left:first.left,right:first.right,top:first.top,bottom:first.bottom,height:first.height});
      const isActive=annotation.key===activeKey;
      if(annotation.kind==='comment' && range.from===range.to){
        highlights.push({key:`${annotation.key}:caret`,kind:annotation.kind,active:isActive,left:Math.max(0,first.left-1),top:first.top,width:2,height:Math.max(first.height,18),caret:true});
      } else if(annotation.kind==='comment') {
        rects.forEach((rect,index)=>{if(rect.width>0&&rect.height>0)highlights.push({key:`${annotation.key}:${index}`,kind:annotation.kind,active:isActive,left:rect.left,top:rect.top,width:rect.width,height:rect.height,caret:false});});
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
        const x1=anchor.right-1, y1=anchor.top+anchor.height/2;
        const x2=(railRect.left-stageRect.left)/scale-3, y2=top+18;
        const paperRight=(paperRect.right-stageRect.left)/scale;
        const lane=Math.max(x1+24,paperRight-8);
        if(lane<x2-10){
          // Slip below the quoted line, then use one continuous curve through
          // the gutter so the connector reads as a link rather than a route.
          const under=anchor.bottom+4;
          const d=`M ${x1} ${y1} C ${x1+3} ${y1}, ${x1+6} ${under}, ${x1+14} ${under} C ${lane-18} ${under}, ${lane-8} ${y2}, ${lane} ${y2} H ${x2}`;
          lines.push({key:annotation.key,kind:annotation.kind,active:annotation.key===activeKey,x1,y1,x2,y2,d});
        } else {
          const reach=Math.max(12,Math.min(48,(x2-x1)*0.42));
          lines.push({key:annotation.key,kind:annotation.kind,active:annotation.key===activeKey,x1,y1,x2,y2,d:`M ${x1} ${y1} C ${x1+reach} ${y1}, ${x2-reach} ${y2}, ${x2} ${y2}`});
        }
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
  if (!doc) return <section className="space-paper-wrap"><p className="space-loading" role="status">{review.message || t('empty.loading')}</p></section>;

  const openComposer=()=>{setMessage('');setComposerOpen(true)};
  const closeComposer=()=>{setComposerOpen(false);setMessage('')};
  const saveComment=async()=>{const created=await addComment();if(created){setComposerOpen(false);setMessage('');setSelection(null)}};
  const askDelete=id=>setConfirmDelete(id);
  const doDelete=async id=>{await deleteComment(id);setConfirmDelete(null)};
  const scrollToAnchor=id=>{const comment=liveComments.find(item=>item.id===id);if(comment){const range=commentRange(comment);scrollSourceRange(surface.current,range.from,range.to);}};
  const activateFromAnchor=id=>{setActive(null);setActiveComment(id);commentRefs.current.get(id)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'})};
  const activateFromBalloon=id=>{setActive(null);setActiveComment(id);scrollToAnchor(id)};
  const activateSuggestion=id=>{setActiveComment(null);setActive(id);chooseCard(id)};
  const trackHover=event=>{
    const node=event.target.closest?.('[data-src-from]');
    if(!node) return;
    const from=Number(node.getAttribute('data-src-from')), to=Number(node.getAttribute('data-src-to'));
    const annotation=items.find(item=>{
      const range=item.kind==='suggestion'?{from:item.item.from,to:item.item.to}:commentRange(item.item);
      return range && from<=range.to && to>=range.from;
    });
    if(annotation) setHoverPreview({key:annotation.key,left:event.clientX,top:event.clientY});
  };
  const closeHover=()=>{hoverTimer.current=setTimeout(()=>setHoverPreview(null),180)};
  const keepHover=()=>clearTimeout(hoverTimer.current);
  const anchor=selection?.anchor;
  const fabBelow=(anchor?.top || 0)<60;
  const fabLeft=Math.max(40,Math.min(anchor?.x || 0,(anchor?.wrapWidth || 120)-40));
  return <section className="space-paper-wrap" aria-label={t('paper.aria')} ref={scrollRef}>
    <div className="space-zoom-tools" role="group" aria-label="纸张缩放"><button type="button" aria-label="缩小纸张" title="缩小纸张" disabled={zoom<=.6} onClick={()=>setZoom(value=>Math.max(.6,Math.round((value-.1)*10)/10))}>−</button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="放大纸张" title="放大纸张" disabled={zoom>=1.5} onClick={()=>setZoom(value=>Math.min(1.5,Math.round((value+.1)*10)/10))}>＋</button></div>
    <div className={`space-doc-stage${hasAnnotations?' has-annotations':''}`} ref={stageRef} style={{zoom}}>
      <div ref={surface} onPointerMove={trackHover} onPointerLeave={closeHover} className={`space-paper${doc.content.replace(/^# [^\r\n]*(?:\r?\n)+/,'').trim()?'':' is-empty'}`} tabIndex={-1}>{documentView(markdownHtml)}</div>
      <div className="space-anchor-layer" aria-hidden="true">{layout.highlights?.map(highlight=><span key={highlight.key} className={`space-anchor-rect is-${highlight.kind}${highlight.active?' is-active':''}${highlight.caret?' is-caret':''}${highlight.outline?' is-outline':''}`} style={{left:highlight.left,top:highlight.top,width:highlight.width,height:highlight.height}}/>)}</div>
      <aside className="space-comment-rail" ref={railRef} aria-label={t('annotations.title')} style={{minHeight:layout.minHeight||undefined}}>
        {!hasAnnotations && <div className="space-comment-empty"><CommentIcon size={22}/><strong>{t('annotations.emptyTitle')}</strong><p>{t('annotations.emptyHint')}</p></div>}
        <div className="space-comment-spacer" style={{height:layout.height||0}} />
        <div className="space-comment-balloons is-positioned">
          {suggestionItems.map(annotation=><SuggestionBalloon key={annotation.key} item={annotation.item} index={annotation.index} active={active===annotation.item.id} busy={busy} t={t} onActivate={()=>activateSuggestion(annotation.item.id)} onDecide={decision=>decide(annotation.item.id,decision)} onPointerEnter={keepHover} setRef={(id,el)=>{if(el)cardRefs.current.set(id,el);else cardRefs.current.delete(id)}} style={{top:layout.positions[annotation.key],visibility:layout.positions[annotation.key]===undefined?'hidden':undefined,...(hoverPreview?.key===annotation.key?{'--hover-x':`${hoverPreview.left}px`,'--hover-y':`${hoverPreview.top}px`}: {})}} className={hoverPreview?.key===annotation.key?'is-hover-preview':''}/>) }
          {liveComments.map(comment=><CommentBalloon key={comment.id} comment={comment} author={user} active={activeComment===comment.id} busy={busy} t={t} statusText={statusText} confirming={confirmDelete===comment.id} onAskDelete={askDelete} onConfirmDelete={doDelete} onCancelDelete={()=>setConfirmDelete(null)} onActivate={activateFromBalloon} onPointerEnter={keepHover} setRef={(id,el)=>{if(el)commentRefs.current.set(id,el);else commentRefs.current.delete(id)}} style={{top:layout.positions[`comment:${comment.id}`],visibility:layout.positions[`comment:${comment.id}`]===undefined?'hidden':undefined,...(hoverPreview?.key===`comment:${comment.id}`?{'--hover-x':`${hoverPreview.left}px`,'--hover-y':`${hoverPreview.top}px`}: {})}} className={hoverPreview?.key===`comment:${comment.id}`?'is-hover-preview':''}/>) }
        </div>
        {staleComments.length>0 && <section className="space-comment-stale" aria-label={t('comment.staleGroup')}>
          <h3>{t('comment.staleGroup')}</h3><p className="space-muted">{t('comment.staleHint')}</p>
          {staleComments.map(comment=><CommentBalloon key={comment.id} comment={comment} author={user} active={activeComment===comment.id} busy={busy} t={t} statusText={statusText} confirming={confirmDelete===comment.id} onAskDelete={askDelete} onConfirmDelete={doDelete} onCancelDelete={()=>setConfirmDelete(null)} onActivate={()=>{}} setRef={(id,el)=>{if(el)commentRefs.current.set(id,el);else commentRefs.current.delete(id)}}/>)}
        </section>}
      </aside>
      {layout.lines.length>0 && <svg className="space-comment-lines" aria-hidden="true">{layout.lines.map(line=><g key={line.key} className={line.active?'is-active':undefined}>
        <path pathLength="1" className={`space-connector-line ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} d={line.d}/>
        <circle className={`space-connector-dot is-origin ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} cx={line.x1} cy={line.y1} r="3"/>
        <circle className={`space-connector-dot is-target ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} cx={line.x2} cy={line.y2} r="2.5"/>
      </g>)}</svg>}
    </div>
    <div className="space-comment-layer">
      {selection && !composerOpen && !busy && <button type="button" className={`space-comment-fab${fabBelow?' is-below':''}`} style={{left:fabLeft,top:fabBelow?(anchor?.bottom||0)+10:(anchor?.top||0)-10}} onMouseDown={event=>event.preventDefault()} onClick={openComposer} aria-haspopup="dialog" aria-label={t('comment.bubble')}><CommentIcon/><span>{t('comment.bubble')}</span></button>}
      <SpaceDialog open={Boolean(selection && composerOpen)} onClose={()=>{setComposerOpen(false);setMessage('')}} labelledBy={commentTitleId} className="space-comment-dialog">
        {selection && <>
          <h2 id={commentTitleId}>{t('comment.addTitle')}</h2>
          <p className="space-comment-selected">{t('comment.selected',{quote:selection.quote})}</p>
          <label htmlFor={commentFieldId}>{t('comment.label')}</label>
          <textarea ref={textareaRef} autoFocus id={commentFieldId} rows="4" maxLength="4000" value={draft} onChange={event=>{setDraft(event.target.value);if(message)setMessage('')}} onKeyDown={event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();if(!busy&&draft.trim())saveComment()}}}/>
          {message && <p className="space-comment-error" role="alert">{message}</p>}
          <div className="space-comment-actions"><button type="button" onClick={closeComposer}>{t('comment.cancel')}</button><button type="button" disabled={busy || !draft.trim()} onClick={saveComment}>{t('comment.save')}</button></div>
        </>}
      </SpaceDialog>
      {composerOpen && selection?.rects?.map((rect,index)=><span key={index} className="space-selection-hint" style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}}/>)}
    </div>
  </section>;
}

export function SpaceApp({ api, sessionId = null, t = defaultT, sendTarget = null }) {
  const [documents,setDocuments]=useState([]), [docId,setDocId]=useState(null), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const deleteTitleId=useId();
  const user=useCurrentUser(api);
  const review=useSpaceReview(api,docId,sessionId,t,sendTarget);
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
      await reloadDocs();setDocId(created.id);
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
  const refreshAll=async()=>{
    setBusy(true);setMessage('');
    try { await reloadDocs(); await review.reload(docId); }
    catch (e) { setMessage(errorText(e,translateNow.current)); }
    finally { setBusy(false); }
  };
  const visibleComments=review.comments.filter(comment=>!['sent','processed'].includes(comment.status));
  const selectedDocument=documents.find(item=>item.id===docId);
  const pendingTotal=documents.reduce((total,item)=>total+(item.pending||0),0);
  const home=!docId;
  return <div className="space-app">
    {home ? <main className="space-home" aria-labelledby="space-home-title">
      <header className="space-home-header"><div className="space-brand"><span className="space-brand-mark" aria-hidden="true">S</span><span>SPACE</span></div><button type="button" className="space-home-new" disabled={busy} onClick={newDocument}><span aria-hidden="true">＋</span>{t('nav.newDocument')}</button></header>
      <section className="space-home-intro"><div><p className="space-home-eyebrow">{t('home.eyebrow')}</p><h1 id="space-home-title">{t('home.title')}</h1><p className="space-home-description">{t('home.description')}</p></div><div className="space-home-stats" aria-label={t('nav.aria')}><span><strong>{documents.length}</strong>{t('home.documentCount',{count:documents.length})}</span><i aria-hidden="true"/><span><strong>{pendingTotal}</strong>{t('home.pendingCount',{count:pendingTotal})}</span></div></section>
      <section className="space-home-content" aria-label={t('nav.documents')}><div className="space-home-section-title"><h2>{t('nav.documents')}</h2>{documents.length>0&&<span>{documents.length}</span>}</div>
        {documents.length ? <div className="space-home-grid">{documents.map((item,index)=><article className="space-home-card" key={item.id}>
          <button type="button" className="space-home-card-open" aria-label={t('home.openDocument',{title:item.title||item.id})} onClick={()=>setDocId(item.id)}>
            <span className={`space-home-card-art is-tone-${index%4}`} aria-hidden="true"><span className="space-paper-icon"><i/><i/><i/><b/></span><span className="space-home-card-art-label">SPACE</span></span>
            <span className="space-home-card-copy"><strong title={item.title||item.id}>{item.title||item.id}</strong><span className="space-home-card-meta">{documentCardTime(item,t)}</span></span>
            <span className="space-home-card-footer">{item.pending>0?<span className="space-home-pending"><i aria-hidden="true"/>{t('annotations.suggestions',{count:item.pending})}</span>:<span className="space-home-clear">{t('home.noPending')}</span>}<span className="space-home-open-icon" aria-hidden="true">↗</span></span>
          </button><button type="button" className="space-home-delete" disabled={busy} aria-label={t('nav.deleteDocumentLabel',{title:item.title||item.id})} title={t('nav.deleteDocument')} onClick={()=>setDeleteTarget(item)}><TrashIcon size={15}/></button>
        </article>)}</div> : <div className="space-home-empty"><span className="space-empty-mark" aria-hidden="true"><span/><span/><span/></span><h2>{t('home.emptyTitle')}</h2><p>{t('home.emptyDescription')}</p><button type="button" className="space-home-new" disabled={busy} onClick={newDocument}><span aria-hidden="true">＋</span>{t('nav.newDocument')}</button></div>}
      </section><div className="space-message space-home-message" role="status" aria-live="polite">{message}</div>
    </main> : <>
      <header className="space-top space-preview-top"><button type="button" className="space-back" aria-label={t('home.back')} title={t('home.back')} onClick={()=>setDocId(null)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6M9 12h12"/></svg></button><div className="space-preview-heading"><span>{t('home.eyebrow')}</span><h1 title={review.doc?.title||selectedDocument?.title||docId}>{review.doc?.title||selectedDocument?.title||docId}</h1></div>
        <div className="space-header-tools">{review.doc&&<div className="space-header-counts" role="group" aria-label={t('annotations.title')}><span className="is-suggestion"><i aria-hidden="true"/>{t('annotations.suggestions',{count:review.suggestions.length})}</span><span className="is-comment"><i aria-hidden="true"/>{t('annotations.comments',{count:visibleComments.length})}</span></div>}<button type="button" className="space-refresh" disabled={!docId||busy} aria-label={t('review.refresh')} title={t('review.refresh')} onClick={refreshAll}><RefreshIcon/></button>{review.doc&&visibleComments.length>0&&<ReviewSendButton review={review} sessionId={sessionId} sendTarget={sendTarget} t={t}/>}</div>
      </header>
      {!review.doc ? <main className="space-preview-loading" aria-live="polite">{review.message||t('empty.loading')}</main> : <main className="space-main"><SpaceReviewSurface review={review} user={user} t={t}/></main>}
    </>}
    {!home&&<div className="space-message" role="status" aria-live="polite">{message || (review.doc ? review.message : '')}</div>}
    <SpaceDialog open={Boolean(deleteTarget)} onClose={()=>setDeleteTarget(null)} labelledBy={deleteTitleId} className="space-delete-dialog">
      <h2 id={deleteTitleId}>{t('document.deleteTitle')}</h2>
      <p>{t('document.deleteDescription',{title:deleteTarget?.title || deleteTarget?.id || ''})}</p>
      <div className="space-delete-actions"><button type="button" autoFocus disabled={busy} onClick={()=>setDeleteTarget(null)}>{t('document.deleteCancel')}</button><button type="button" className="is-danger" disabled={busy} onClick={deleteDocument}>{t('document.deleteConfirm')}</button></div>
    </SpaceDialog>
  </div>;
}
