import { Fragment, createElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { errorText, translate, zh } from './locale.js';
import { capturePreviewSelection, rangeRects, readSourceSpans, renderMarkdown, scrollSourceRange, sourceRangeToDom } from './markdown.js';
import { rememberDocumentTitle } from './document-titles.js';
import './space.css';

const h = createElement;
const requestId = () => globalThis.crypto.randomUUID();
const statusKeys = {pending:'status.pending', sending:'status.sending', sent:'status.sent', failed:'status.failed', unknown:'status.unknown'};
const safeUrl = value => typeof value === 'string' && /^(https?:|mailto:)/i.test(value) ? value : null;

/** Fallback translator keeps the panel renderable outside a locale seat, as in the DOM smoke test. */
const defaultT = (key, vars) => translate(zh, key, vars);

/** Render Markdown as annotated, escaped HTML; raw HTML stays disabled. */
function documentView(html) { return <div className="space-markdown" dangerouslySetInnerHTML={{__html:html}} />; }

function TrashIcon({size=14}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
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

function captureMarkdownSelection(textarea,version) {
  if(!textarea || textarea.selectionStart===textarea.selectionEnd) return null;
  const from=textarea.selectionStart,to=textarea.selectionEnd,quote=textarea.value.slice(from,to);
  if(!quote.trim()) return null;
  const wrap=textarea.closest('.space-paper-wrap');if(!wrap)return null;
  const rect=textarea.getBoundingClientRect(),parent=wrap.getBoundingClientRect();
  const anchor={x:rect.left-parent.left+wrap.scrollLeft+24,left:rect.left-parent.left+wrap.scrollLeft,right:rect.left-parent.left+wrap.scrollLeft+48,top:rect.top-parent.top+wrap.scrollTop,bottom:rect.top-parent.top+wrap.scrollTop+24,width:48,height:24,wrapWidth:wrap.clientWidth};
  return {from,to,version,quote,anchor,rects:[]};
}

function locateMarkdownRange(surface,from,to) {
  const source=surface?.querySelector('.space-markdown-source');
  const textarea=source?.querySelector('textarea');
  if(!source||!textarea||!Number.isInteger(from)||!Number.isInteger(to)) return false;
  source.open=true;
  requestAnimationFrame(()=>{
    textarea.focus({preventScroll:true});
    textarea.setSelectionRange(from,to);
    textarea.scrollIntoView({block:'center',behavior:'auto'});
  });
  return true;
}

/**
 * Load and drive one document's review state.
 *
 * One controller serves the Space page and the right Sidebar tab: both read the
 * same authoritative document, decide suggestions, save comments and send them
 * to the current conversation. The controller owns no layout; the surface
 * decides where the paper, comment rail and review panel sit.
 * @param {(method: string, args?: object) => Promise<any>} api - plugin HTTP client.
 * @param {string | null} docId - document to review, or null for no selection.
 * @param {string | null} sessionId - conversation that receives sent comments.
 * @param {(key: string, vars?: object) => string} t - bound translator.
 * @returns {object} review state and the actions that change it.
 */
export function useSpaceReview(api, docId, sessionId, t = defaultT) {
  const [doc,setDoc]=useState(null);
  const [comments,setComments]=useState([]);
  const [active,setActive]=useState(null);
  const [activeComment,setActiveComment]=useState(null);
  const [draft,setDraft]=useState('');
  const [selection,setSelection]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const surface=useRef(null), cardRefs=useRef(new Map()), commentRefs=useRef(new Map()), loadSequence=useRef(0);
  // Async callbacks may outlive a render; read the active locale at completion time.
  const translateNow=useRef(t); translateNow.current=t;
  const call=useCallback((method,args={})=>api(method,args),[api]);
  const reload=useCallback(async id=>{
    const sequence=++loadSequence.current;
    const [next,notes]=await Promise.all([call('readDocument',{docId:id}),call('listComments',{docId:id})]);
    if (sequence!==loadSequence.current) return;
    setDoc(next);setComments(notes);setSelection(null);
    if (next?.title) rememberDocumentTitle(id,next.title);
  },[call]);
  useEffect(()=>{
    if (!docId) {
      loadSequence.current++;
      setDoc(null);setComments([]);setActive(null);setActiveComment(null);setSelection(null);setDraft('');setMessage('');
      return;
    }
    setDoc(null);setMessage('');
    reload(docId).catch(e=>setMessage(errorText(e,translateNow.current)));
  },[docId,reload]);
  useEffect(()=>()=>{loadSequence.current++;},[]);

  // Suggestion ids follow submission order; review cards follow document order.
  const suggestions=useMemo(()=>[...(doc?.suggestions || [])].sort((left,right)=>(left.from ?? 0)-(right.from ?? 0)),[doc]);
  const statusText=item=>statusKeys[item.status] ? t(statusKeys[item.status]) : item.status;
  const chooseCard=id=>{setActiveComment(null);setActive(id);const item=doc?.suggestions?.find(suggestion=>suggestion.id===id);if(!item||!(scrollSourceRange(surface.current,item.from,item.to)||locateMarkdownRange(surface.current,item.from,item.to)))setMessage(t('suggestion.unavailable'));};
  const chooseFromText=id=>{setActiveComment(null);setActive(id);cardRefs.current.get(id)?.scrollIntoView({block:'nearest',behavior:'auto'});};
  const perform=async fn=>{setBusy(true);setMessage('');try{return await fn()}catch(e){setMessage(errorText(e,translateNow.current));return null}finally{setBusy(false)}};
  const decide=(suggestionId,decision)=>perform(async()=>{await call('decide',{docId,suggestionId,decision,operationId:requestId()});await reload(docId)});
  const addComment=()=>perform(async()=>{
    if(!selection || !draft.trim()) throw Error(t('comment.required'));
    const created=await call('createComment',{docId,quote:selection.quote,body:draft.trim(),anchor:{from:selection.from,to:selection.to,version:selection.version}});
    setDraft('');await reload(docId);setActiveComment(created.id);return created;
  });
  const send=()=>perform(async()=>{
    if(!sessionId) throw Error(t('send.noSession'));
    const ids=comments.filter(item=>item.status==='pending'||item.status==='failed').map(item=>item.id);
    if(!ids.length) throw Error(t('send.none'));
    try { await call('sendComments',{docId,commentIds:ids,sessionId,operationId:requestId()}); } finally { await reload(docId);setActiveComment(null); }
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

function CommentBalloon({ comment, active, busy, t, statusText, confirming, onAskDelete, onConfirmDelete, onCancelDelete, onActivate, setRef, style }) {
  const locked=busy || comment.status==='sending';
  const status=comment.status==='pending'
    ? (comment.stale?t('comment.staleStatus'):null)
    : `${statusText(comment)}${comment.stale?t('comment.stale'):''}`;
  return <article className={`space-annotation-balloon space-comment-balloon${active?' is-active':''}${comment.stale?' is-stale':''}${confirming?' is-confirming':''}`} data-comment-id={comment.id} ref={el=>setRef(comment.id,el)} style={style} onClick={()=>onActivate(comment.id)}>
    {status && <div className="space-annotation-head"><span className={`space-comment-status is-${comment.status}`}>{status}</span></div>}
    <p className="space-comment-body">{comment.body}</p>
    <button type="button" className="space-comment-delete-icon" disabled={locked} aria-label={t('comment.delete')} title={t('comment.delete')} onClick={event=>{event.stopPropagation();onAskDelete(comment.id)}}><TrashIcon/></button>
    {confirming && <div className="space-comment-footer is-confirming" onClick={event=>event.stopPropagation()}>
      <span className="space-comment-confirm-text">{t('comment.deleteConfirm')}</span>
      <button type="button" className="space-comment-delete is-danger" disabled={locked} onClick={()=>onConfirmDelete(comment.id)}>{t('comment.delete')}</button>
      <button type="button" className="space-comment-delete" disabled={locked} onClick={()=>onCancelDelete()}>{t('comment.cancel')}</button>
    </div>}
  </article>;
}

/** Render a compact decision card linked to an inline preview difference. */
function SuggestionBalloon({ item, index, active, busy, t, onActivate, onDecide, setRef, style }) {
  const conflicted=item.status==='conflicted';
  const kind=item.expected ? (item.replacement ? 'replace' : 'delete') : (item.replacement ? 'insert' : 'unknown');
  const createdAt=Number.isFinite(Date.parse(item.createdAt)) ? new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.createdAt)) : '';
  return <article className={`space-annotation-balloon space-suggestion-balloon${active?' is-active':''}${conflicted?' is-conflicted':''}`} data-suggestion-card={item.id} ref={el=>setRef(item.id,el)} style={style} onClick={onActivate}>
    <div className="space-suggestion-meta"><strong>{item.author || t('suggestion.defaultAuthor')}</strong><time dateTime={createdAt?item.createdAt:undefined}>{createdAt || t('suggestion.unknownTime')}</time><span className="space-suggestion-kind">{t(`suggestion.kind.${kind}`)} · {index+1}</span>{conflicted && <span className="space-suggestion-conflict">{t('suggestion.conflicted')}</span>}</div>
    {!conflicted && <div className="space-actions"><button type="button" disabled={busy} onClick={event=>{event.stopPropagation();onDecide('accept')}}>{t('action.accept')}</button><button type="button" disabled={busy} onClick={event=>{event.stopPropagation();onDecide('reject')}}>{t('action.reject')}</button></div>}
  </article>;
}

/**
 * The paper and one Word-style annotation rail. Suggestions and comments share
 * the same margin cards, ordered by source position, and the document keeps
 * a minimum width instead of switching to a narrow stacked layout.
 * @param {object} props - review controller and translator.
 * @returns {React.ReactElement} the scrollable document body and its annotation rail.
 */
export function SpaceReviewSurface({ review, t = defaultT }) {
  const [composerOpen,setComposerOpen]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(null);
  const [resizeTick,setResizeTick]=useState(0);
  const [layout,setLayout]=useState({positions:{},lines:[],highlights:[],height:0,minHeight:0});
  const commentFieldId=useId(), commentTitleId=useId(), textareaRef=useRef(null), scrollRef=useRef(null), stageRef=useRef(null), railRef=useRef(null);
  const {doc,comments,active,setActive,activeComment,setActiveComment,draft,setDraft,selection,setSelection,busy,message,setMessage,surface,cardRefs,commentRefs,suggestions,statusText,chooseCard,chooseFromText,decide,addComment,deleteComment}=review;
  // Keep the annotated HTML stable across selection/card state so the browser
  // selection and its text nodes are never replaced by an equal re-render.
  const markdownHtml=useMemo(()=>doc?renderMarkdown(doc.content,doc.suggestions||[]):'',[doc?.content,doc?.suggestions]);
  const visibleComments=useMemo(()=>comments.filter(comment=>comment.status!=='sent'),[comments]);
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
  // The Markdown source view stays available, but comments never require it.
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
      let rects=rangeRects(mapped.range,stageRect);
      if(!rects.length){
        const fallback=mapped.startSpan.element.getBoundingClientRect();
        if(fallback&&(fallback.width||fallback.height)) rects=[{left:fallback.left-stageRect.left,top:fallback.top-stageRect.top,right:fallback.right-stageRect.left,bottom:fallback.bottom-stageRect.top,width:fallback.width,height:fallback.height}];
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
    highlights.sort((left,right)=>Number(left.active)-Number(right.active));
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
        const x1=anchor.right+3, y1=anchor.top+anchor.height/2;
        const x2=railRect.left-stageRect.left-3, y2=top+18;
        const paperRight=paperRect.right-stageRect.left;
        const lane=Math.max(x1+24,paperRight-8);
        if(lane<x2-10){
          // Start at the quote, dip into the leading under that line, then run
          // through the right margin and curve into the card with soft corners.
          const under=anchor.bottom+3, dir=y2>=under?1:-1;
          const radius=Math.max(2,Math.min(8,Math.abs(y2-under)/2));
          const d=`M ${x1} ${y1} C ${x1+2} ${y1}, ${x1+4} ${under}, ${x1+10} ${under} H ${lane-8} Q ${lane} ${under} ${lane} ${under+dir*radius} V ${y2-dir*radius} Q ${lane} ${y2} ${lane+radius} ${y2} H ${x2}`;
          lines.push({key:annotation.key,kind:annotation.kind,active:annotation.key===activeKey,x1,y1,x2,y2,d});
        } else {
          const reach=Math.max(10,(x2-x1)*0.5);
          lines.push({key:annotation.key,kind:annotation.kind,active:annotation.key===activeKey,x1,y1,x2,y2,d:`M ${x1} ${y1} C ${x1+reach} ${y1}, ${x2-reach} ${y2}, ${x2} ${y2}`});
        }
      }
    }
    const minHeight=Math.max(paper.offsetHeight,cursor);
    setLayout(previous=>{
      if(JSON.stringify(previous.positions)===JSON.stringify(positions) && JSON.stringify(previous.lines)===JSON.stringify(lines) && JSON.stringify(previous.highlights||[])===JSON.stringify(highlights) && previous.height===cursor && previous.minHeight===minHeight) return previous;
      return {positions,lines,highlights,height:cursor,minHeight};
    });
  },[hasAnnotations,items,suggestions,liveComments,doc?.content,resizeTick,active,activeComment,confirmDelete,cardRefs,commentRefs,t]);
  useEffect(()=>{ if(!selection) setComposerOpen(false); },[selection]);
  useEffect(()=>{setConfirmDelete(null)},[comments]);
  if (!doc) return <section className="space-paper-wrap"><p className="space-loading" role="status">{review.message || t('empty.loading')}</p></section>;

  const openComposer=()=>{setMessage('');setComposerOpen(true)};
  const closeComposer=()=>{setComposerOpen(false);setMessage('')};
  const saveComment=async()=>{const created=await addComment();if(created){setComposerOpen(false);setMessage('');setSelection(null)}};
  const askDelete=id=>setConfirmDelete(id);
  const doDelete=async id=>{await deleteComment(id);setConfirmDelete(null)};
  const scrollToAnchor=id=>{const comment=liveComments.find(item=>item.id===id);if(comment){const range=commentRange(comment);if(!scrollSourceRange(surface.current,range.from,range.to))locateMarkdownRange(surface.current,range.from,range.to);}};
  const activateFromAnchor=id=>{setActive(null);setActiveComment(id);commentRefs.current.get(id)?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'})};
  const activateFromBalloon=id=>{setActive(null);setActiveComment(id);scrollToAnchor(id)};
  const activateSuggestion=id=>{setActiveComment(null);setActive(id);chooseCard(id)};
  const anchor=selection?.anchor;
  const fabBelow=(anchor?.top || 0)<60;
  const fabLeft=Math.max(40,Math.min(anchor?.x || 0,(anchor?.wrapWidth || 120)-40));
  return <section className="space-paper-wrap" aria-label={t('paper.aria')} ref={scrollRef}>
    <div className={`space-doc-stage${hasAnnotations?' has-annotations':''}`} ref={stageRef}>
      <div ref={surface} className="space-paper" tabIndex={-1}>{documentView(markdownHtml)}<details className="space-markdown-source"><summary>{t('markdown.sourceTitle')}</summary><textarea aria-label={t('markdown.sourceLabel')} readOnly value={doc.content} onSelect={event=>setSelection(captureMarkdownSelection(event.currentTarget,doc.version))}/></details></div>
      <div className="space-anchor-layer" aria-hidden="true">{layout.highlights?.map(highlight=><span key={highlight.key} className={`space-anchor-rect is-${highlight.kind}${highlight.active?' is-active':''}${highlight.caret?' is-caret':''}`} style={{left:highlight.left,top:highlight.top,width:highlight.width,height:highlight.height}}/>)}</div>
      <aside className="space-comment-rail" ref={railRef} aria-label={t('annotations.title')} style={{minHeight:layout.minHeight||undefined}}>
        {!hasAnnotations && <div className="space-comment-empty"><CommentIcon size={22}/><strong>{t('annotations.emptyTitle')}</strong><p>{t('annotations.emptyHint')}</p></div>}
        <div className="space-comment-spacer" style={{height:layout.height||0}} />
        <div className="space-comment-balloons is-positioned">
          {suggestionItems.map(annotation=><SuggestionBalloon key={annotation.key} item={annotation.item} index={annotation.index} active={active===annotation.item.id} busy={busy} t={t} onActivate={()=>activateSuggestion(annotation.item.id)} onDecide={decision=>decide(annotation.item.id,decision)} setRef={(id,el)=>{if(el)cardRefs.current.set(id,el);else cardRefs.current.delete(id)}} style={{top:layout.positions[annotation.key],visibility:layout.positions[annotation.key]===undefined?'hidden':undefined}}/>)}
          {liveComments.map(comment=><CommentBalloon key={comment.id} comment={comment} active={activeComment===comment.id} busy={busy} t={t} statusText={statusText} confirming={confirmDelete===comment.id} onAskDelete={askDelete} onConfirmDelete={doDelete} onCancelDelete={()=>setConfirmDelete(null)} onActivate={activateFromBalloon} setRef={(id,el)=>{if(el)commentRefs.current.set(id,el);else commentRefs.current.delete(id)}} style={{top:layout.positions[`comment:${comment.id}`],visibility:layout.positions[`comment:${comment.id}`]===undefined?'hidden':undefined}}/>)}
        </div>
        {staleComments.length>0 && <section className="space-comment-stale" aria-label={t('comment.staleGroup')}>
          <h3>{t('comment.staleGroup')}</h3><p className="space-muted">{t('comment.staleHint')}</p>
          {staleComments.map(comment=><CommentBalloon key={comment.id} comment={comment} active={activeComment===comment.id} busy={busy} t={t} statusText={statusText} confirming={confirmDelete===comment.id} onAskDelete={askDelete} onConfirmDelete={doDelete} onCancelDelete={()=>setConfirmDelete(null)} onActivate={()=>{}} setRef={(id,el)=>{if(el)commentRefs.current.set(id,el);else commentRefs.current.delete(id)}}/>)}
        </section>}
      </aside>
      {layout.lines.length>0 && <svg className="space-comment-lines" aria-hidden="true">{layout.lines.map(line=><g key={line.key} className={line.active?'is-active':undefined}>
        <path pathLength="1" className={`space-connector-line ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} d={line.d}/>
        <circle className={`space-connector-dot ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} cx={line.x1} cy={line.y1} r="2.8"/>
        <circle className={`space-connector-dot ${line.kind==='suggestion'?'is-suggestion':'is-comment'}`} cx={line.x2} cy={line.y2} r="2.8"/>
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

export function SpaceApp({ api, sessionId = null, t = defaultT }) {
  const [documents,setDocuments]=useState([]), [docId,setDocId]=useState(null), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const deleteTitleId=useId();
  const review=useSpaceReview(api,docId,sessionId,t);
  const translateNow=useRef(t); translateNow.current=t;
  const call=useCallback((method,args={})=>api(method,args),[api]);
  const reloadDocs=useCallback(async()=>{const list=await call('listDocuments');setDocuments(list);return list;},[call]);
  useEffect(()=>{let cancelled=false;reloadDocs().catch(e=>{if(!cancelled)setMessage(errorText(e,translateNow.current))});return()=>{cancelled=true}},[reloadDocs]);
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
      const remaining=await reloadDocs();
      setDeleteTarget(null);
      if(docId===deleteTarget.id) setDocId(remaining[0]?.id || null);
    } catch (e) { setMessage(errorText(e,translateNow.current)); }
    finally { setBusy(false); }
  };
  const visibleComments=review.comments.filter(comment=>comment.status!=='sent');
  const sendableComments=visibleComments.filter(comment=>comment.status==='pending'||comment.status==='failed');
  return <div className="space-app">
    {review.doc && <header className="space-top"><div className="space-header-tools">
          <div className="space-header-counts" role="group" aria-label={t('annotations.title')}><span className="is-suggestion"><i aria-hidden="true"/>{t('annotations.suggestions',{count:review.suggestions.length})}</span><span className="is-comment"><i aria-hidden="true"/>{t('annotations.comments',{count:visibleComments.length})}</span></div>
          {visibleComments.length>0 && <button type="button" className="space-send space-send-header" disabled={review.busy || !sendableComments.length || !sessionId} title={!sessionId?t('send.hint'):undefined} onClick={()=>review.send()}>{t('send.all',{count:sendableComments.length})}</button>}
      </div></header>}
    <div className="space-shell"><nav className="space-nav" aria-label={t('nav.aria')}><div className="space-nav-head"><h2>{t('nav.documents')}</h2><button type="button" className="space-new-document" disabled={busy} onClick={newDocument}>{t('nav.newDocument')}</button></div>{documents.length ? <div className="space-document-list">{documents.map(item=><div className={`space-document-row${item.id===docId?' is-current':''}`} key={item.id}><button type="button" aria-current={item.id===docId?'page':undefined} className="space-doc-button" onClick={()=>setDocId(item.id)} title={item.title || item.id}>{item.title || item.id}</button><button type="button" className="space-document-delete" disabled={busy} aria-label={t('nav.deleteDocumentLabel',{title:item.title || item.id})} title={t('nav.deleteDocument')} onClick={()=>setDeleteTarget(item)}><span aria-hidden="true">×</span></button></div>)}</div> : <p className="space-nav-empty">{t('nav.empty')}</p>}</nav>
    {!review.doc ? <main className="space-empty" aria-live="polite">{docId ? (review.message || t('empty.loading')) : t('empty.pick')}</main> : <main className="space-main"><SpaceReviewSurface review={review} sessionId={sessionId} t={t}/></main>}</div>
    <div className="space-message" role="status" aria-live="polite">{message || (review.doc ? review.message : '')}</div>
    <SpaceDialog open={Boolean(deleteTarget)} onClose={()=>setDeleteTarget(null)} labelledBy={deleteTitleId} className="space-delete-dialog">
      <h2 id={deleteTitleId}>{t('document.deleteTitle')}</h2>
      <p>{t('document.deleteDescription',{title:deleteTarget?.title || deleteTarget?.id || ''})}</p>
      <div className="space-delete-actions"><button type="button" autoFocus disabled={busy} onClick={()=>setDeleteTarget(null)}>{t('document.deleteCancel')}</button><button type="button" className="is-danger" disabled={busy} onClick={deleteDocument}>{t('document.deleteConfirm')}</button></div>
    </SpaceDialog>
  </div>;
}
