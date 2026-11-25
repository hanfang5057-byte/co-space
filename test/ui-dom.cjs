const {JSDOM}=require('jsdom');const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,Node:dom.window.Node,Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,getComputedStyle:dom.window.getComputedStyle,IS_REACT_ACT_ENVIRONMENT:true});
window.HTMLElement.prototype.scrollTo=function(){};
Object.defineProperty(globalThis,'crypto',{value:require('node:crypto').webcrypto,configurable:true});
const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');const {SpaceApp,mergeCommentHighlights}=require('./ui.cjs');
const coalesced=mergeCommentHighlights([
  {key:'comment:a:0',kind:'comment',active:false,left:10,top:20,width:60,height:18,caret:false},
  {key:'comment:b:0',kind:'comment',active:true,left:40,top:20,width:50,height:18,caret:false},
  {key:'comment:c:0',kind:'comment',active:false,left:110,top:20,width:20,height:18,caret:false},
]);
const fills=coalesced.filter(item=>!item.outline&&!item.caret);const outlines=coalesced.filter(item=>item.outline);
if(fills.length!==2||fills[0].left!==10||fills[0].width!==80)throw Error('overlapping comment anchors were not painted as one fill');
if(outlines.length!==1||outlines[0].key!=='comment:b:0:active-outline')throw Error('active comment outline was not preserved separately');
const reviewData=require('./fixtures/review-data.cjs');let markdown=reviewData.content;let comments=[];let suggestions=reviewData.suggestions;const calls=[];
const api=async(method,args)=>{calls.push([method,args]);switch(method){case'listDocuments':return[{id:'d',title:'Review sample',pending:1},{id:'e',title:'Another document',pending:0}];case'getUser':return{signedIn:true,name:'Ada Lovelace',avatarUrl:null};case'readDocument':return{id:'d',title:'Review sample',version:0,content:markdown,suggestions,comments};case'listComments':return comments;case'createComment':comments=[{id:'c',docId:'d',quote:args.quote,body:args.body,anchor:args.anchor,resolved:{from:args.anchor.from,to:args.anchor.to},status:'pending',stale:false}];return comments[0];case'decide':return{status:'accepted'};case'sendComments':return{status:'sent',sessionId:args.sessionId||'new-session',createdSession:!args.sessionId};case'deleteComment':return{deleted:true};default:throw Error(method)}};
function testAdapter({sessionId=null,canCreate=false,getSessionLabel,getWorkspaceLabel,openSession}={}){
  const available=['conversation.send','clipboard.write'];if(canCreate)available.push('conversation.create');
  return {
    core:{request:api},capabilities:{declared:available,available},identity:{getCurrentUser:()=>api('getUser')},
    clipboard:{writeText:text=>window.navigator.clipboard.writeText(text)},
    conversation:{
      current:sessionId?{id:sessionId}:null,canCreate,
      getConversationLabel:getSessionLabel,getWorkspaceLabel,
      send:async request=>{const result=await api('sendComments',{sessionId:request.conversationId,commentIds:request.commentIds,newSessionFrom:request.excludeConversationId,forceNew:Boolean(request.excludeConversationId)});return{createdConversation:request.createConversation===true,conversationId:result.sessionId};},
      open:openSession,
    },
  };
}
(async()=>{const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(SpaceApp,{adapter:testAdapter({sessionId:'s'})})));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});
const click=async el=>{if(!el)throw Error('missing control');await act(async()=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));};
const search=document.querySelector('.space-document-search input');
const setInput=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
await act(async()=>{setInput.call(search,'missing');search.dispatchEvent(new window.Event('input',{bubbles:true}));});
if(document.querySelector('.space-home-card')||!document.querySelector('.space-document-no-results'))throw Error('search empty state missing');
await act(async()=>{setInput.call(search,'Review');search.dispatchEvent(new window.Event('input',{bubbles:true}));});
if(document.querySelectorAll('.space-home-card').length!==1||!document.querySelector('.space-home-card').textContent.includes('Review sample'))throw Error('document search did not filter titles');
await act(async()=>{setInput.call(search,'');search.dispatchEvent(new window.Event('input',{bubbles:true}));});
const filter=document.querySelectorAll('.space-document-tools select')[0];
await act(async()=>{filter.value='pending';filter.dispatchEvent(new window.Event('change',{bubbles:true}));});
if(document.querySelectorAll('.space-home-card').length!==1||!document.querySelector('.space-home-card').textContent.includes('Review sample'))throw Error('pending filter failed');
await act(async()=>{filter.value='all';filter.dispatchEvent(new window.Event('change',{bubbles:true}));});
const sort=document.querySelectorAll('.space-document-tools select')[1];
await act(async()=>{sort.value='title';sort.dispatchEvent(new window.Event('change',{bubbles:true}));});
if(!document.querySelector('.space-home-card').textContent.includes('Another document'))throw Error('title sort failed');
await click([...document.querySelectorAll('.space-home-card-open')].find(el=>el.textContent.includes('Review sample')));
if(!document.body.textContent.includes('The'))throw Error('Markdown text missing');
if(document.querySelectorAll('.space-markdown .space-suggestion-delete').length!==2)throw Error('inline deletion and replacement source missing');
if(document.querySelectorAll('.space-markdown .space-suggestion-insert').length!==2)throw Error('inline replacement and insertion missing');
if(document.querySelectorAll('.space-suggestion-balloon .space-suggestion-actions button').length!==6)throw Error('compact decision cards missing');
if(!document.querySelector('.space-suggestion-head time[datetime="2026-11-22T08:30:00.000Z"]'))throw Error('suggestion time missing');
if(document.querySelector('.space-preview-top .space-refresh, .space-preview-top .space-header-counts'))throw Error('obsolete header controls remain');

if(!document.querySelector('.space-preview-top .space-zoom-tools')||document.querySelector('.space-paper-wrap .space-zoom-tools'))throw Error('zoom controls must be in the header');
await click(document.querySelector('[aria-label="放大纸张"]'));
if(document.querySelector('.space-doc-stage').style.zoom!=='1.1'||!document.querySelector('.space-zoom-tools').textContent.includes('110%'))throw Error('header zoom did not update the document');
await click(document.querySelector('[aria-label="缩小纸张"]'));


const exportRoot=document.querySelector('.space-export-menu'),exportTrigger=exportRoot.querySelector('.space-export-trigger');
await act(async()=>exportRoot.dispatchEvent(new window.MouseEvent('pointerover',{bubbles:true})));
if(exportTrigger.getAttribute('aria-expanded')!=='true'||exportRoot.querySelectorAll('.space-export-panel button').length!==2)throw Error('hover export options missing');
await act(async()=>exportRoot.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
if(exportRoot.querySelector('.space-export-panel'))throw Error('Escape did not close export options');
await click(exportTrigger);if(!exportRoot.querySelector('.space-export-panel'))throw Error('click did not open export options');
const downloads=[];const oldAnchorClick=window.HTMLAnchorElement.prototype.click;
window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download)};
URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>{};
await click([...exportRoot.querySelectorAll('.space-export-panel button')].find(button=>button.textContent.includes('Markdown')));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});
if(!downloads[0]?.endsWith('.md')||exportRoot.querySelector('.space-export-panel'))throw Error('Markdown export did not download directly');
await click(exportTrigger);await click([...exportRoot.querySelectorAll('.space-export-panel button')].find(button=>button.textContent.includes('Word')));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});
if(!downloads[1]?.endsWith('.docx'))throw Error('Word export did not download directly');
window.HTMLAnchorElement.prototype.click=oldAnchorClick;

if(document.querySelector('.space-review-navigation'))throw Error('review navigation should be removed');
const marked=document.querySelector('.space-suggestion-delete');const paper=document.querySelector('.space-paper');
const pointer=(element,type,relatedTarget=null)=>element.dispatchEvent(new window.MouseEvent(type,{bubbles:true,relatedTarget,clientX:200,clientY:200}));
await act(async()=>pointer(marked,'pointermove'));
if(!document.querySelector('.space-suggestion-balloon.is-hover-preview'))throw Error('hover did not open suggestion card');
const initialCard=document.querySelector('.space-suggestion-balloon.is-hover-preview');const initialX=initialCard.style.getPropertyValue('--hover-x');
await act(async()=>marked.dispatchEvent(new window.MouseEvent('pointermove',{bubbles:true,clientX:260,clientY:260})));
if(initialCard.style.getPropertyValue('--hover-x')!==initialX)throw Error('hover card followed the pointer');
await act(async()=>{pointer(paper,'pointermove');await new Promise(resolve=>setTimeout(resolve,210));});
if(document.querySelector('.space-annotation-balloon.is-hover-preview'))throw Error('hover card remained after leaving annotated text');
await act(async()=>pointer(marked,'pointermove'));
const hoverCard=document.querySelector('.space-suggestion-balloon.is-hover-preview');
await act(async()=>{pointer(paper,'pointerout',hoverCard);pointer(hoverCard,'pointerover',paper);await new Promise(resolve=>setTimeout(resolve,210));});
if(!hoverCard.classList.contains('is-hover-preview'))throw Error('hover card closed while pointer entered it');
await act(async()=>{pointer(hoverCard,'pointerout',paper);await new Promise(resolve=>setTimeout(resolve,210));});
if(document.querySelector('.space-annotation-balloon.is-hover-preview'))throw Error('hover card remained after pointer left card');
const foxSpan=[...document.querySelectorAll('.space-src')].find(el=>el.textContent.includes('fox'));if(!foxSpan)throw Error('annotated Markdown text missing');
const foxOffset=foxSpan.firstChild.nodeValue.indexOf('fox');const previewRange=document.createRange();previewRange.setStart(foxSpan.firstChild,foxOffset);previewRange.setEnd(foxSpan.firstChild,foxOffset+3);const previewSelection=window.getSelection();previewSelection.removeAllRanges();previewSelection.addRange(previewRange);document.dispatchEvent(new window.Event('selectionchange'));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});const fab=document.querySelector('.space-comment-fab');if(!fab)throw Error('preview selection did not offer a comment');await click(fab);
const dialog=document.querySelector('.space-comment-dialog');if(!dialog||!dialog.open)throw Error('comment composer did not open');if(!dialog.querySelector('.space-comment-selected')?.textContent.includes('fox'))throw Error('comment composer lost the preview selection');
const commentField=dialog.querySelector('textarea');const setValue=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;setValue.call(commentField,'来自预览选区的评论');commentField.dispatchEvent(new window.Event('input',{bubbles:true}));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))});await click([...dialog.querySelectorAll('button')].find(button=>button.textContent==='保存评论'));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});
const created=calls.find(call=>call[0]==='createComment');if(!created)throw Error('preview selection did not create a comment');
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});if(!document.querySelector('.space-comment-balloon .space-annotation-byline strong')?.textContent.includes('Ada Lovelace'))throw Error('signed-in author missing from comment card');if(!document.querySelector('.space-comment-balloon .space-comment-delete-icon.space-annotation-action svg')||!document.querySelector('.space-suggestion-actions .space-annotation-action svg'))throw Error('annotation actions do not share the icon button style');const fox=markdown.indexOf('fox');if(created[1].anchor.from!==fox||created[1].anchor.to!==fox+3||created[1].quote!=='fox')throw Error('preview selection mapped to the wrong Markdown range: '+JSON.stringify(created[1]));
const commentAnchor=[...document.querySelectorAll('.space-src')].find(el=>el.textContent.includes('fox'));
const priorFrom=commentAnchor.getAttribute('data-src-from'),priorTo=commentAnchor.getAttribute('data-src-to');
commentAnchor.setAttribute('data-src-from',String(fox));commentAnchor.setAttribute('data-src-to',String(fox+3));
await act(async()=>pointer(commentAnchor,'pointermove'));
if(!document.querySelector('.space-comment-balloon.is-hover-preview'))throw Error('hover did not open comment card');
await act(async()=>{pointer(paper,'pointermove');await new Promise(resolve=>setTimeout(resolve,210));});
if(document.querySelector('.space-comment-balloon.is-hover-preview'))throw Error('comment hover card remained after leaving its anchor');
commentAnchor.setAttribute('data-src-from',priorFrom);commentAnchor.setAttribute('data-src-to',priorTo);
if(document.querySelector('.space-markdown-source textarea'))throw Error('unexpected editable Markdown source view');
await click(document.querySelector('.space-suggestion-balloon .is-accept'));if(!calls.some(x=>x[0]==='decide'))throw Error('suggestion decision missing');
const sendButton=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('处理评论'));if(!sendButton?.querySelector('svg')||/\d/.test(sendButton.textContent))throw Error('comment action must have an icon and no count');
await click(sendButton);if(!document.querySelector('.space-send-dialog')?.open)throw Error('current conversation confirmation missing');
if(calls.some(x=>x[0]==='sendComments'))throw Error('processing request sent before confirmation');
await click([...document.querySelectorAll('.space-send-dialog button')].find(x=>x.textContent==='取消'));
if(calls.some(x=>x[0]==='sendComments'))throw Error('cancelling confirmation sent comments');
await click(sendButton);await click([...document.querySelectorAll('.space-send-dialog button')].find(x=>x.textContent==='发送处理请求'));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});if(!calls.some(x=>x[0]==='sendComments'&&x[1].sessionId==='s'))throw Error('processing request did not target the current conversation');const prompt=calls.find(x=>x[0]==='sendComments')[1];if(prompt.commentIds.length!==1||prompt.commentIds[0]!=='c')throw Error('processing request did not identify the pending comment set');
await act(async()=>root.unmount());
// A Space page without a conversation must be able to create one instead of disabling send.
const opened=[];const secondRoot=createRoot(document.getElementById('root'));await act(async()=>secondRoot.render(React.createElement(SpaceApp,{adapter:testAdapter({canCreate:true,openSession:id=>opened.push(id)})})));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});
await click(document.querySelector('.space-home-card-open'));
await click([...document.querySelectorAll('button')].find(x=>x.textContent.includes('处理评论')));
const confirmTitle=document.querySelector('.space-send-dialog h2');if(!confirmTitle||!document.querySelector('.space-send-dialog')?.open||!document.querySelector('.space-send-dialog input[value=new]')?.checked)throw Error('missing new-conversation confirmation');
await click([...document.querySelectorAll('.space-send-dialog button')].find(x=>x.textContent==='新建并处理'));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});if(!calls.some(x=>x[0]==='sendComments'&&!x[1].sessionId))throw Error('new conversation was not requested from the host');if(opened[0]!=='new-session')throw Error('new conversation was not opened after sending');

await act(async()=>secondRoot.unmount());
const selected=[];const choiceRoot=createRoot(document.getElementById('root'));
await act(async()=>choiceRoot.render(React.createElement(SpaceApp,{adapter:testAdapter({sessionId:'current-session',canCreate:true,getSessionLabel:()=> '项目讨论',getWorkspaceLabel:()=> '产品工作区',openSession:id=>selected.push(id)})})));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});await click(document.querySelector('.space-home-card-open'));await click([...document.querySelectorAll('button')].find(x=>x.textContent.includes('处理评论')));
if(!document.querySelector('.space-send-dialog')?.textContent.includes('项目讨论')||!document.querySelector('.space-send-dialog input[value=current]')?.checked)throw Error('current conversation title or default missing');
if(document.querySelector('.space-send-workspace')?.textContent!=='产品工作区')throw Error('workspace tag missing from current conversation');
await click(document.querySelector('.space-send-dialog input[value=copy]'));if(!document.querySelector('.space-send-dialog input[value=copy]').checked)throw Error('copy option unavailable in DSH');
await click(document.querySelector('.space-send-dialog input[value=new]'));
await click([...document.querySelectorAll('.space-send-dialog button')].find(x=>x.textContent==='新建并处理'));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});
if(!calls.some(x=>x[0]==='sendComments'&&x[1].newSessionFrom==='current-session'&&x[1].forceNew===true&&!x[1].sessionId)||selected[0]!=='new-session')throw Error('new conversation choice was not honoured');
await act(async()=>choiceRoot.unmount());

let copied='';Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async text=>{copied=text}},configurable:true});Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
const thirdRoot=createRoot(document.getElementById('root'));await act(async()=>thirdRoot.render(React.createElement(SpaceApp,{adapter:testAdapter()})));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});await click(document.querySelector('.space-home-card-open'));const copyButton=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('处理评论'));await click(copyButton);
if(!document.querySelector('.space-send-dialog')?.open||copied||!document.querySelector('.space-send-dialog input[value=copy]')?.checked)throw Error('copy confirmation missing or clipboard written early');
await click([...document.querySelectorAll('.space-send-dialog button')].find(x=>x.textContent==='取消'));if(copied)throw Error('cancelling copied the prompt');
await click(copyButton);await click([...document.querySelectorAll('.space-send-dialog button')].find(x=>x.textContent==='复制提示词'));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});
if(!copied.startsWith('space:d\n'))throw Error('Copied prompt is missing the named document reference');if(copied.includes('来自预览选区的评论'))throw Error('Copied prompt leaked the comment body instead of keeping it in Space tools');
await act(async()=>thirdRoot.unmount());
console.log('Inline suggestions, comment processing prompt, account attribution, DSH send, and clipboard fallback rendered');})().catch(error=>{console.error(error);process.exit(1)});
