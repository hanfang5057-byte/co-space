import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import { ReviewError } from './review-core.js';
const fail=(code,message)=>{throw new ReviewError(code,message)};
const nonempty=x=>typeof x==='string' && x.trim().length>0 && x.length<=4000;
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const parse=JSON.parse;
const CONTEXT=32;
function locateQuote(text,quote,contextBefore,contextAfter) {
  const found=[];
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
function locateContext(text,contextBefore,contextAfter,oldFrom) {
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
  if(candidates.length>1 && candidates[0].score===candidates[1].score && candidates[0].distance===candidates[1].distance) return null;
  return {from:candidates[0].from,to:candidates[0].to};
}

function contextFor(doc,from,to) {
  return {
    before:doc.slice(0,from).slice(-CONTEXT),
    after:doc.slice(to,to+CONTEXT),
  };
}

function resolveAnchor(doc,row,currentVersion) {
  if(row.doc_version===undefined || row.doc_version===null) return null;
  // Stored coordinates are only authoritative for the version they were made
  // against. After any version change, re-locate the quote so an insertion that
  // happens to recreate the same text at the old position cannot be mistaken
  // for the original comment.
  if(row.doc_version===currentVersion) {
      const exact=row.from_pos>=0 && row.to_pos<=doc.length && doc.slice(row.from_pos,row.to_pos)===row.quote;
    if(exact) return {from:row.from_pos,to:row.to_pos};
  }
  const byQuote=locateQuote(doc,row.quote,row.context_before||'',row.context_after||'');
  if(byQuote) return byQuote;
  return locateContext(doc,row.context_before||'',row.context_after||'',row.from_pos);
}

export class CommentStore {
  constructor(database) {
    this.ownsDatabase = typeof database === 'string';
    this.db = this.ownsDatabase ? new DatabaseSync(database,{timeout:5000}) : database;
    if (!this.db?.prepare || !this.db?.exec) throw new TypeError('CommentStore requires a database path or SQLite connection');
    if (this.ownsDatabase) this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS space_comments(id TEXT PRIMARY KEY, doc_id TEXT NOT NULL, quote TEXT NOT NULL, body TEXT NOT NULL, from_pos INTEGER NOT NULL, to_pos INTEGER NOT NULL, doc_version INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', request_id TEXT, context_before TEXT NOT NULL DEFAULT '', context_after TEXT NOT NULL DEFAULT '', created_at TEXT);
        CREATE TABLE IF NOT EXISTS space_comment_sends(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, session_id TEXT NOT NULL, doc_id TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, error TEXT);
        CREATE TABLE IF NOT EXISTS space_comment_completions(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, doc_id TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS space_comment_results(comment_id TEXT PRIMARY KEY, doc_id TEXT NOT NULL, suggestion_ids TEXT NOT NULL, operation_id TEXT NOT NULL, updated_at TEXT NOT NULL);`);
      const columns=new Set(this.db.prepare('PRAGMA table_info(space_comments)').all().map(column=>column.name));
      if(!columns.has('context_before')) this.db.exec("ALTER TABLE space_comments ADD COLUMN context_before TEXT NOT NULL DEFAULT ''");
      if(!columns.has('context_after')) this.db.exec("ALTER TABLE space_comments ADD COLUMN context_after TEXT NOT NULL DEFAULT ''");
      if(!columns.has('created_at')) this.db.exec('ALTER TABLE space_comments ADD COLUMN created_at TEXT');
      const legacy=this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='space_comment_processing'").get();
      if(legacy){
        this.db.exec('DELETE FROM space_comments; DELETE FROM space_comment_sends; DELETE FROM space_comment_results; DELETE FROM space_comment_completions; DROP TABLE space_comment_processing');
      }
      this.db.exec('COMMIT');
    } catch(error) {
      try { this.db.exec('ROLLBACK'); } catch {}
      if(this.ownsDatabase) this.db.close();
      throw error;
    }
  }
  close(){if(this.ownsDatabase)this.db.close()}
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
      const createdAt=new Date().toISOString();
      this.db.prepare('INSERT INTO space_comments (id,doc_id,quote,body,from_pos,to_pos,doc_version,status,request_id,context_before,context_after,created_at) VALUES (?,?,?,?,?,?,?,?,NULL,?,?,?)').run(id,docId,quote,body,anchor.from,anchor.to,anchor.version,'pending',contextBefore,contextAfter,createdAt);
      return {id,docId,quote,body,anchor,status:'pending',stale:false,createdAt};
    });
  }
  delete({docId,commentId}) {
    if(!nonempty(docId)||!nonempty(commentId)) fail('INVALID_INPUT','Comment id and document are required');
    return this.transaction(()=>{
      const row=this.db.prepare('SELECT id,doc_id,status FROM space_comments WHERE id=? AND doc_id=?').get(commentId,docId);
      if(!row) fail('COMMENT_NOT_FOUND','Comment not found');
      if(row.status==='sending') fail('COMMENT_BUSY','Comment is being sent');
      this.db.prepare('DELETE FROM space_comment_results WHERE comment_id=?').run(commentId);
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
      this.db.prepare('DELETE FROM space_comment_results WHERE doc_id=?').run(docId);
      this.db.prepare('DELETE FROM space_comment_completions WHERE doc_id=?').run(docId);
      return {docId,deleted:true};
    });
  }
  list(docId) {
    const document=this.db.prepare('SELECT version,content FROM review_documents WHERE id=?').get(docId);if(!document) fail('DOCUMENT_NOT_FOUND','Document not found');
    const doc=document.content;
    const backfill=this.db.prepare('UPDATE space_comments SET context_before=?,context_after=? WHERE id=?');
    const results = new Map(this.db.prepare('SELECT * FROM space_comment_results WHERE doc_id=?').all(docId).map(row=>[row.comment_id,row]));
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
      const resolved=resolveAnchor(doc,row,document.version);
      const state=results.get(r.id);
      const suggestionIds=state?parse(state.suggestion_ids):[];
      const suggestions=suggestionIds.map(id=>this.db.prepare('SELECT id,status FROM review_suggestions WHERE id=? AND doc_id=?').get(id,r.doc_id)).filter(Boolean);
      return {id:r.id,docId:r.doc_id,quote:r.quote,body:r.body,anchor:{from:r.from_pos,to:r.to_pos,version:r.doc_version},resolved,status:r.status,stale:resolved===null,requestId:r.request_id,createdAt:r.created_at||null,processing:{suggestionIds,suggestions,operationId:state?.operation_id??null,updatedAt:state?.updated_at??null}};
    });
  }
  completeProcessing({docId,operationId,results}) {
    if(!nonempty(docId)||!nonempty(operationId)||!Array.isArray(results)||!results.length) fail('INVALID_INPUT','Document, operation ID and comment results are required');
    const normalized=results.map(result=>({
      commentId:result?.commentId,
      suggestionIds:[...(result?.suggestionIds||[])].sort((a,b)=>a-b),
    })).sort((a,b)=>String(a.commentId).localeCompare(String(b.commentId)));
    if(normalized.some(x=>!nonempty(x.commentId))||new Set(normalized.map(x=>x.commentId)).size!==normalized.length) fail('INVALID_INPUT','Comment IDs must be non-empty and unique');
    for(const result of normalized) {
      if(result.suggestionIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(result.suggestionIds).size!==result.suggestionIds.length) fail('INVALID_INPUT','Comment suggestion IDs must be unique positive integers');
    }
    const normalizedResults=normalized;
    const fingerprint=digest({docId,results:normalizedResults});
    return this.transaction(()=>{
      const prior=this.db.prepare('SELECT fingerprint,result FROM space_comment_completions WHERE id=?').get(operationId);
      if(prior) {
        if(prior.fingerprint!==fingerprint) fail('OPERATION_ID_CONFLICT','Completion ID already used');
        return {...parse(prior.result),replay:true};
      }
      const suggestionExists=this.db.prepare('SELECT id FROM review_suggestions WHERE id=? AND doc_id=?');
      for(const result of normalizedResults) {
        const comment=this.db.prepare('SELECT id,status FROM space_comments WHERE id=? AND doc_id=?').get(result.commentId,docId);
        if(!comment) fail('COMMENT_NOT_FOUND','Comment not found',{commentId:result.commentId});
        if(comment.status==='processed') fail('COMMENT_ALREADY_PROCESSED','Comment was already processed',{commentId:result.commentId});
        if(result.suggestionIds.length) for(const suggestionId of result.suggestionIds) {
          if(!suggestionExists.get(suggestionId,docId)) fail('SUGGESTION_NOT_FOUND','Suggestion does not belong to this document',{commentId:result.commentId,suggestionId});
        }
      }
      const updatedAt=new Date().toISOString();
      const upsert=this.db.prepare(`INSERT INTO space_comment_results(comment_id,doc_id,suggestion_ids,operation_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(comment_id) DO UPDATE SET suggestion_ids=excluded.suggestion_ids,operation_id=excluded.operation_id,updated_at=excluded.updated_at`);
      const updateStatus=this.db.prepare('UPDATE space_comments SET status=? WHERE id=? AND doc_id=?');
      for(const result of normalizedResults){upsert.run(result.commentId,docId,JSON.stringify(result.suggestionIds),operationId,updatedAt);updateStatus.run(result.suggestionIds.length?'processed':'pending',result.commentId,docId)}
      const result={docId,operationId,results:normalizedResults.map(({commentId,suggestionIds})=>({commentId,suggestionIds}))};
      this.db.prepare('INSERT INTO space_comment_completions(id,fingerprint,doc_id,result,created_at) VALUES(?,?,?,?,?)').run(operationId,fingerprint,docId,JSON.stringify(result),updatedAt);
      return {...result,replay:false};
    });
  }
  /**
   * Link one suggestion to the comment it answers and settle the comment.
   * Existing links are kept so a comment that needs several edits can be
   * settled one suggestion at a time; linking the same suggestion twice is a
   * no-op, which makes a retried `space_suggest` safe.
   */
  linkSuggestion({docId,commentId,suggestionId,operationId}) {
    if(!nonempty(docId)||!nonempty(commentId)||!Number.isSafeInteger(suggestionId)||suggestionId<=0) fail('INVALID_INPUT','Document, comment and suggestion are required');
    return this.transaction(()=>{
      if(!this.db.prepare('SELECT id FROM space_comments WHERE id=? AND doc_id=?').get(commentId,docId)) fail('COMMENT_NOT_FOUND','Comment not found',{commentId});
      if(!this.db.prepare('SELECT id FROM review_suggestions WHERE id=? AND doc_id=?').get(suggestionId,docId)) fail('SUGGESTION_NOT_FOUND','Suggestion does not belong to this document',{suggestionId});
      const prior=this.db.prepare('SELECT suggestion_ids,operation_id FROM space_comment_results WHERE comment_id=?').get(commentId);
      const existing=prior?parse(prior.suggestion_ids):[];
      const replay=existing.includes(suggestionId);
      const suggestionIds=replay?existing:[...existing,suggestionId].sort((a,b)=>a-b);
      if(!replay) this.db.prepare('INSERT INTO space_comment_results(comment_id,doc_id,suggestion_ids,operation_id,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(comment_id) DO UPDATE SET suggestion_ids=excluded.suggestion_ids,operation_id=excluded.operation_id,updated_at=excluded.updated_at').run(commentId,docId,JSON.stringify(suggestionIds),nonempty(operationId)?operationId:(prior?.operation_id||`link:${suggestionId}`),new Date().toISOString());
      this.db.prepare("UPDATE space_comments SET status='processed' WHERE id=? AND doc_id=?").run(commentId,docId);
      return {commentId,suggestionIds,replay};
    });
  }
  findSend(operationId) {
    if(!nonempty(operationId)) return undefined;
    const row=this.db.prepare('SELECT session_id,status FROM space_comment_sends WHERE id=?').get(operationId);
    return row ? {sessionId:row.session_id,status:row.status} : undefined;
  }
  prepareSend({docId,commentIds,sessionId,operationId}) {
    if(!nonempty(docId)||!nonempty(sessionId)||!nonempty(operationId)||!Array.isArray(commentIds)||!commentIds.length||commentIds.some(x=>!nonempty(x))||new Set(commentIds).size!==commentIds.length) fail('INVALID_INPUT','Choose comments and a current session');
    const fp=digest({docId,commentIds,sessionId});
    return this.transaction(()=>{
      const prior=this.db.prepare('SELECT * FROM space_comment_sends WHERE id=?').get(operationId);
      if(prior){if(prior.fingerprint!==fp)fail('OPERATION_ID_CONFLICT','Send ID already used');return {requestId:operationId,sessionId,comments:parse(prior.payload),status:prior.status,replay:true};}
      const all=this.list(docId), selected=commentIds.map(id=>all.find(x=>x.id===id));
      if(selected.some(x=>!x)) fail('COMMENT_NOT_FOUND','Comment not found');
      if(selected.some(x=>!['pending','failed'].includes(x.status))) fail('COMMENT_NOT_SENDABLE','Comment is currently sending, awaiting Agent processing, or already processed');
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
