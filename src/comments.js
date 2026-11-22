import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { ReviewError } from './review-core.js';
const fail=(code,message)=>{throw new ReviewError(code,message)};
const nonempty=x=>typeof x==='string' && x.trim().length>0 && x.length<=4000;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const parse=JSON.parse;
const CONTEXT=32;
export function acceptedText(markdown) { return {text:markdown,chars:Array.from({length:markdown.length},(_,i)=>({ch:markdown[i],start:i,end:i+1}))}; }

function locateQuote(textInfo,quote,contextBefore,contextAfter) {
  const {text}=textInfo, found=[];
  for(let at=text.indexOf(quote);at!==-1;at=text.indexOf(quote,at+1)) {
    const before=text.slice(Math.max(0,at-contextBefore.length),at);
    const after=text.slice(at+quote.length,at+quote.length+contextAfter.length);
    let score=0;
    if(contextBefore && (before===contextBefore || before.endsWith(contextBefore) || contextBefore.endsWith(before))) score++;
    if(contextAfter && (after===contextAfter || after.startsWith(contextAfter) || contextAfter.startsWith(after))) score++;
    found.push({from:at,to:at+quote.length,score});
  }
  if(!found.length) return null;
  // A unique quote is safe even when surrounding text changed. Only repeated
  // quotes need stored context to disambiguate; ties stay unresolved.
  if(found.length===1) return {from:found[0].from,to:found[0].to};
  found.sort((a,b)=>b.score-a.score);
  return found[0].score>found[1].score ? {from:found[0].from,to:found[0].to} : null;
}

function occurrences(text,needle) {
  const found=[];
  for(let at=text.indexOf(needle);at!==-1;at=text.indexOf(needle,at+1)) found.push(at);
  return found;
}

// When the quote itself was edited, the surrounding context usually survives.
// Map the anchor to the text between the stored before/after context instead of
// declaring the comment stale just because the quote no longer matches.
function locateContext(textInfo,contextBefore,contextAfter,oldFrom) {
  const {text}=textInfo;
  if(!contextBefore && !contextAfter) return null;
  const lengths=value=>[...new Set([value.length,24,16,8].filter(length=>length>=4&&length<=value.length))];
  const before=[];
  for(const length of lengths(contextBefore)) for(const at of occurrences(text,contextBefore.slice(-length))) before.push({end:at+length,score:length});
  const after=[];
  for(const length of lengths(contextAfter)) for(const at of occurrences(text,contextAfter.slice(0,length))) after.push({start:at,score:length});
  if(!contextBefore) before.push({end:0,score:0});
  if(!contextAfter) after.push({start:text.length,score:0});
  const candidates=[];
  for(const left of before) for(const right of after) {
    if(left.end>=right.start) continue;
    const from=left.end, to=right.start;
    if(from>=to) continue;
    candidates.push({from,to,score:left.score+right.score,distance:Math.abs(from-oldFrom)});
  }
  if(!candidates.length) return null;
  candidates.sort((a,b)=>b.score-a.score||a.distance-b.distance);
  return {from:candidates[0].from,to:candidates[0].to};
}

function contextFor(doc,from,to) {
  return {
    before:doc.slice(0,from).slice(-CONTEXT),
    after:doc.slice(to,to+CONTEXT),
  };
}

function resolveAnchor(doc,textInfo,row,currentVersion) {
  if(row.doc_version===undefined || row.doc_version===null) return null;
  // Stored coordinates are only authoritative for the version they were made
  // against. After any version change, re-locate the quote so an insertion that
  // happens to recreate the same text at the old position cannot be mistaken
  // for the original comment.
  if(row.doc_version===currentVersion) {
      const exact=row.from_pos>=0 && row.to_pos<=doc.length && doc.slice(row.from_pos,row.to_pos)===row.quote;
    if(exact) return {from:row.from_pos,to:row.to_pos};
  }
  const byQuote=locateQuote(textInfo,row.quote,row.context_before||'',row.context_after||'');
  if(byQuote) return byQuote;
  return locateContext(textInfo,row.context_before||'',row.context_after||'',row.from_pos);
}

export class CommentStore {
  constructor(path) {
    this.db=new DatabaseSync(path,{timeout:5000});
    this.db.exec(`PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS space_comments(id TEXT PRIMARY KEY, doc_id TEXT NOT NULL, quote TEXT NOT NULL, body TEXT NOT NULL, from_pos INTEGER NOT NULL, to_pos INTEGER NOT NULL, doc_version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', request_id TEXT, context_before TEXT NOT NULL DEFAULT '', context_after TEXT NOT NULL DEFAULT '');
      CREATE TABLE IF NOT EXISTS space_comment_sends(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, session_id TEXT NOT NULL, doc_id TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, error TEXT);`);
    const columns=new Set(this.db.prepare('PRAGMA table_info(space_comments)').all().map(column=>column.name));
    if(!columns.has('context_before')) this.db.exec("ALTER TABLE space_comments ADD COLUMN context_before TEXT NOT NULL DEFAULT ''");
    if(!columns.has('context_after')) this.db.exec("ALTER TABLE space_comments ADD COLUMN context_after TEXT NOT NULL DEFAULT ''");
  }
  close(){this.db.close()}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const result=fn();this.db.exec('COMMIT');return result}catch(e){try{this.db.exec('ROLLBACK')}catch{}throw e}}
  create({docId,quote,body,anchor}) {
    if(!nonempty(docId)||!nonempty(quote)||!nonempty(body)||!anchor||!Number.isInteger(anchor.from)||!Number.isInteger(anchor.to)||!Number.isInteger(anchor.version)||anchor.from>=anchor.to) fail('INVALID_INPUT','Comment requires document, body and non-empty selection');
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT version,content FROM review_documents WHERE id=?').get(docId);if(!row) fail('DOCUMENT_NOT_FOUND','Document not found');
      if(row.version!==anchor.version) fail('VERSION_CONFLICT','Document changed; select the text again');
      let doc,contextBefore='',contextAfter='';
      try {
        doc=row.content;
        if(anchor.from<0||anchor.to>doc.length||doc.slice(anchor.from,anchor.to)!==quote) fail('ANCHOR_STALE','Selected text does not match');
        contextBefore=doc.slice(Math.max(0,anchor.from-CONTEXT),anchor.from);
        contextAfter=doc.slice(anchor.to,anchor.to+CONTEXT);
      } catch(e) {if(e instanceof ReviewError)throw e;fail('ANCHOR_STALE','Invalid selected range')}
      const id=randomUUID();
      this.db.prepare('INSERT INTO space_comments (id,doc_id,quote,body,from_pos,to_pos,doc_version,status,request_id,context_before,context_after) VALUES (?,?,?,?,?,?,?,?,NULL,?,?)').run(id,docId,quote,body,anchor.from,anchor.to,anchor.version,'pending',contextBefore,contextAfter);
      return {id,docId,quote,body,anchor,status:'pending',stale:false};
    });
  }
  delete({docId,commentId}) {
    if(!nonempty(docId)||!nonempty(commentId)) fail('INVALID_INPUT','Comment id and document are required');
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT id,doc_id,status FROM space_comments WHERE id=? AND doc_id=?').get(commentId,docId);
      if(!row) fail('COMMENT_NOT_FOUND','Comment not found');
      if(row.status==='sending') fail('COMMENT_BUSY','Comment is being sent');
      this.db.prepare('DELETE FROM space_comments WHERE id=? AND doc_id=?').run(commentId,docId);
      return {id:commentId,deleted:true};
    });
  }
  deleteDocument(docId) {
    if(!nonempty(docId)) fail('INVALID_INPUT','Document ID is required');
    return this.transaction(()=>{
      if(this.db.prepare("SELECT id FROM space_comments WHERE doc_id=? AND status='sending' LIMIT 1").get(docId)) fail('COMMENT_BUSY','A comment for this document is being sent');
      this.db.prepare('DELETE FROM space_comments WHERE doc_id=?').run(docId);
      this.db.prepare('DELETE FROM space_comment_sends WHERE doc_id=?').run(docId);
      return {docId,deleted:true};
    });
  }
  list(docId) {
    const document=this.db.prepare('SELECT version,content FROM review_documents WHERE id=?').get(docId);if(!document) fail('DOCUMENT_NOT_FOUND','Document not found');
    const doc=document.content;let textInfo;
    const backfill=this.db.prepare('UPDATE space_comments SET context_before=?,context_after=? WHERE id=?');
    return this.db.prepare('SELECT * FROM space_comments WHERE doc_id=? ORDER BY rowid').all(docId).map(r=>{
      let contextBefore=r.context_before||'', contextAfter=r.context_after||'';
      // Comments created before context columns existed can be backfilled while
      // their stored coordinates still match the current accepted text.
      if(!contextBefore && !contextAfter && r.from_pos>=0 && r.to_pos<=doc.length) {
        try {
          if(doc.slice(r.from_pos,r.to_pos)===r.quote) {
            const context=contextFor(doc,r.from_pos,r.to_pos);
            contextBefore=context.before;contextAfter=context.after;
            backfill.run(contextBefore,contextAfter,r.id);
          }
        } catch {}
      }
      const row={...r,context_before:contextBefore,context_after:contextAfter};
      const resolved=resolveAnchor(doc,textInfo ??= acceptedText(doc),row,document.version);
      return {id:r.id,docId:r.doc_id,quote:r.quote,body:r.body,anchor:{from:r.from_pos,to:r.to_pos,version:r.doc_version},resolved,status:r.status,stale:resolved===null,requestId:r.request_id};
    });
  }
  prepareSend({docId,commentIds,sessionId,operationId}) {
    if(!nonempty(docId)||!nonempty(sessionId)||!nonempty(operationId)||!Array.isArray(commentIds)||!commentIds.length||commentIds.some(x=>!nonempty(x))||new Set(commentIds).size!==commentIds.length) fail('INVALID_INPUT','Choose comments and a current session');
    const fp=digest({docId,commentIds,sessionId});
    return this.transaction(()=>{
      const prior=this.db.prepare('SELECT * FROM space_comment_sends WHERE id=?').get(operationId);
      if(prior){if(prior.fingerprint!==fp)fail('OPERATION_ID_CONFLICT','Send ID already used');return {requestId:operationId,sessionId,comments:parse(prior.payload),status:prior.status,replay:true};}
      const all=this.list(docId), selected=commentIds.map(id=>all.find(x=>x.id===id));
      if(selected.some(x=>!x)) fail('COMMENT_NOT_FOUND','Comment not found');
      if(selected.some(x=>x.status!=='pending' && x.status!=='failed')) fail('COMMENT_NOT_SENDABLE','Comment already sending, sent or unknown');
      const payload=selected.map(({id,docId,quote,body,anchor,stale})=>({id,docId,quote,body,anchor,stale}));
      this.db.prepare('INSERT INTO space_comment_sends VALUES (?,?,?,?,?,?,NULL)').run(operationId,fp,sessionId,docId,JSON.stringify(payload),'sending');
      const update=this.db.prepare("UPDATE space_comments SET status='sending',request_id=? WHERE id=?"); for(const id of commentIds)update.run(operationId,id);
      return {requestId:operationId,sessionId,comments:payload,status:'sending',replay:false};
    });
  }
  finishSend({operationId,status,error=null}) {
    if(!['sent','failed','unknown'].includes(status))fail('INVALID_INPUT','Invalid send status');
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT * FROM space_comment_sends WHERE id=?').get(operationId);if(!row)fail('SEND_NOT_FOUND','Send not found');
      if(row.status!=='sending') {if(row.status===status)return {requestId:operationId,status};fail('SEND_CONFLICT','Send already resolved');}
      this.db.prepare('UPDATE space_comment_sends SET status=?,error=? WHERE id=?').run(status,error===null?null:String(error).slice(0,1000),operationId);
      this.db.prepare('UPDATE space_comments SET status=? WHERE request_id=?').run(status,operationId);
      return {requestId:operationId,status};
    });
  }
  markInterruptedUnknown() {
    return this.transaction(()=>{this.db.prepare("UPDATE space_comments SET status='unknown' WHERE status='sending'").run();this.db.prepare("UPDATE space_comment_sends SET status='unknown',error='interrupted' WHERE status='sending'").run();});
  }
}
