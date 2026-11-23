const {JSDOM}=require('jsdom');const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,Node:dom.window.Node,IS_REACT_ACT_ENVIRONMENT:true});
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
const api=async(method,args)=>{calls.push([method,args]);switch(method){case'listDocuments':return[{id:'d',title:'Review sample'}];case'getUser':return{signedIn:true,name:'Ada Lovelace',avatarUrl:null};case'readDocument':return{id:'d',title:'Review sample',version:0,content:markdown,suggestions,comments};case'listComments':return comments;case'createComment':comments=[{id:'c',docId:'d',quote:args.quote,body:args.body,anchor:args.anchor,resolved:{from:args.anchor.from,to:args.anchor.to},status:'pending',stale:false}];return comments[0];case'decide':return{status:'accepted'};case'sendComments':return{status:'sent',sessionId:args.sessionId||'new-session',createdSession:!args.sessionId};case'deleteComment':return{deleted:true};default:throw Error(method)}};
(async()=>{const root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(SpaceApp,{api,sessionId:'s'})));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});
const click=async el=>{if(!el)throw Error('missing control');await act(async()=>el.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));};
await click(document.querySelector('.space-home-card-open'));
if(!document.body.textContent.includes('The'))throw Error('Markdown text missing');
if(document.querySelectorAll('.space-markdown .space-suggestion-delete').length!==2)throw Error('inline deletion and replacement source missing');
if(document.querySelectorAll('.space-markdown .space-suggestion-insert').length!==2)throw Error('inline replacement and insertion missing');
if(document.querySelectorAll('.space-suggestion-balloon .space-suggestion-actions button').length!==6)throw Error('compact decision cards missing');
if(!document.querySelector('.space-suggestion-head time[datetime="2026-11-22T08:30:00.000Z"]'))throw Error('suggestion time missing');
if(!document.querySelector('.space-refresh'))throw Error('document refresh control missing');
const foxSpan=[...document.querySelectorAll('.space-src')].find(el=>el.textContent.includes('fox'));if(!foxSpan)throw Error('annotated Markdown text missing');
const foxOffset=foxSpan.firstChild.nodeValue.indexOf('fox');const previewRange=document.createRange();previewRange.setStart(foxSpan.firstChild,foxOffset);previewRange.setEnd(foxSpan.firstChild,foxOffset+3);const previewSelection=window.getSelection();previewSelection.removeAllRanges();previewSelection.addRange(previewRange);document.dispatchEvent(new window.Event('selectionchange'));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});const fab=document.querySelector('.space-comment-fab');if(!fab)throw Error('preview selection did not offer a comment');await click(fab);
const dialog=document.querySelector('.space-comment-dialog');if(!dialog||!dialog.open)throw Error('comment composer did not open');if(!dialog.querySelector('.space-comment-selected')?.textContent.includes('fox'))throw Error('comment composer lost the preview selection');
const commentField=dialog.querySelector('textarea');const setValue=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;setValue.call(commentField,'来自预览选区的评论');commentField.dispatchEvent(new window.Event('input',{bubbles:true}));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,10))});await click([...dialog.querySelectorAll('button')].find(button=>button.textContent==='保存评论'));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});
const created=calls.find(call=>call[0]==='createComment');if(!created)throw Error('preview selection did not create a comment');
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});if(!document.querySelector('.space-comment-balloon .space-annotation-byline strong')?.textContent.includes('Ada Lovelace'))throw Error('signed-in author missing from comment card');const fox=markdown.indexOf('fox');if(created[1].anchor.from!==fox||created[1].anchor.to!==fox+3||created[1].quote!=='fox')throw Error('preview selection mapped to the wrong Markdown range: '+JSON.stringify(created[1]));
if(document.querySelector('.space-markdown-source textarea'))throw Error('unexpected editable Markdown source view');
await click(document.querySelector('.space-suggestion-balloon .is-accept'));if(!calls.some(x=>x[0]==='decide'))throw Error('suggestion decision missing');
const sendButton=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('处理评论'));await click(sendButton);await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});if(!calls.some(x=>x[0]==='sendComments'&&x[1].sessionId==='s'))throw Error('processing request did not target the current conversation');const prompt=calls.find(x=>x[0]==='sendComments')[1];if(prompt.commentIds.length!==1||prompt.commentIds[0]!=='c')throw Error('processing request did not identify the pending comment set');
await act(async()=>root.unmount());
// A Space page without a conversation must be able to create one instead of disabling send.
const opened=[];const secondRoot=createRoot(document.getElementById('root'));await act(async()=>secondRoot.render(React.createElement(SpaceApp,{api,sessionId:null,sendTarget:{canCreate:true,openSession:id=>opened.push(id)}})));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});
await click(document.querySelector('.space-home-card-open'));
await click([...document.querySelectorAll('button')].find(x=>x.textContent.includes('处理评论')));
const confirmTitle=document.querySelector('.space-send-dialog h2');if(!confirmTitle||!document.querySelector('.space-send-dialog')?.open)throw Error('missing new-conversation confirmation');
await click([...document.querySelectorAll('.space-send-dialog button')].find(x=>x.textContent==='新建并处理'));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});if(!calls.some(x=>x[0]==='sendComments'&&!x[1].sessionId))throw Error('new conversation was not requested from the host');if(opened[0]!=='new-session')throw Error('new conversation was not opened after sending');
await act(async()=>secondRoot.unmount());
let copied='';Object.defineProperty(window.navigator,'clipboard',{value:{writeText:async text=>{copied=text}},configurable:true});Object.defineProperty(globalThis,'navigator',{value:window.navigator,configurable:true});
const thirdRoot=createRoot(document.getElementById('root'));await act(async()=>thirdRoot.render(React.createElement(SpaceApp,{api,sessionId:null,sendTarget:{mode:'copy'}})));
await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});await click(document.querySelector('.space-home-card-open'));await click([...document.querySelectorAll('button')].find(x=>x.textContent.includes('处理评论')));await act(async()=>{await new Promise(resolve=>setTimeout(resolve,40))});
if(!copied.startsWith('space:d\n'))throw Error('WorkBuddy copied prompt is missing the named document reference');if(copied.includes('来自预览选区的评论'))throw Error('WorkBuddy copied comment text instead of keeping it in Space tools');
await act(async()=>thirdRoot.unmount());
console.log('Inline suggestions, comment processing prompt, account attribution, DSH send, and WorkBuddy copy flow rendered');})().catch(error=>{console.error(error);process.exit(1)});
