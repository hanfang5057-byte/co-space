import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: false }).enable('table');
const xml = value => String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
export function exportFileName(title, extension) {
  const clean = String(title || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/^[. -]+|[. -]+$/g, '').slice(0, 100).replace(/^[. -]+|[. -]+$/g, '') || '未命名文档';
  return `${clean}.${extension}`;
}
function inlineRuns(tokens = []) {
  return tokens.map(token => {
    if (token.type === 'text' || token.type === 'code_inline' || token.type === 'html_inline') {
      const output=[];const pattern=/\[([^\]]+)\]\(([^)]+)\)/g;let cursor=0,match;
      while((match=pattern.exec(token.content))){if(match.index>cursor)output.push({text:token.content.slice(cursor,match.index)});const href=match[2];if(/^(https?:|mailto:)/i.test(href))output.push({marker:'link',href},{text:match[1]},{marker:'link',close:true});else output.push({text:match[1]});cursor=pattern.lastIndex;}
      if(cursor<token.content.length)output.push({text:token.content.slice(cursor)});
      return output.length?output:[{text:token.content}];
    }
    if (token.type === 'softbreak' || token.type === 'hardbreak') return [{ text: '\n' }];
    if (token.type === 'image') return [{ text: token.content || token.attrGet('alt') || '' }];
    if (token.type === 'link_open') return [{ marker: 'link', href: token.attrGet('href') }];
    if (token.type === 'link_close') return [{ marker: 'link', close: true }];
    if (token.type.endsWith('_open') && ['strong','em','s'].some(name => token.type === `${name}_open`)) return [{ marker: token.type.slice(0,-5) }];
    if (token.type.endsWith('_close') && ['strong','em','s'].some(name => token.type === `${name}_close`)) return [{ marker: token.type.slice(0,-6), close: true }];
    return [];
  }).flat();
}
export function markdownBlocks(source) {
  const tokens=md.parse(String(source ?? ''), {}), blocks=[];
  for (let i=0;i<tokens.length;i++) {
    const token=tokens[i];
    if(token.type==='heading_open'||token.type==='paragraph_open') { const inline=tokens[++i]; blocks.push({type:token.type==='heading_open'?'heading':'paragraph',level:Number(token.tag.slice(1))||0,runs:inlineRuns(inline?.children)}); }
    else if(token.type==='fence'||token.type==='code_block') blocks.push({type:'code',text:token.content});
    else if(token.type==='bullet_list_open'||token.type==='ordered_list_open') {
      const ordered=token.type==='ordered_list_open'; let depth=1, items=[];
      while(i+1<tokens.length&&depth){const t=tokens[++i];if(t.type.endsWith('_list_open'))depth++;if(t.type.endsWith('_list_close'))depth--;if(t.type==='inline')items.push(inlineRuns(t.children));}
      blocks.push({type:'list',ordered,items});
    } else if(token.type==='blockquote_open') {let depth=1,text=[];while(++i<tokens.length&&depth){const t=tokens[i];if(t.type==='blockquote_open')depth++;if(t.type==='blockquote_close')depth--;if(t.type==='inline')text.push(t.content);}blocks.push({type:'quote',text:text.join('\n')});}
    else if(token.type==='table_open'){let rows=[],row=null;while(++i<tokens.length&&tokens[i].type!=='table_close'){const t=tokens[i];if(t.type==='tr_open')row=[];else if(t.type==='tr_close'&&row){rows.push(row);row=null;}else if(t.type==='inline'&&row)row.push(t.content);}blocks.push({type:'table',rows});}
  }
  return blocks;
}
function runsXml(runs=[],relationships=[]) { let stack=[],link=null;return runs.map(run=>{if(run.marker==='link'){link=run.close?null:run.href;return '';}if(run.marker){if(run.close)stack=stack.filter(x=>x!==run.marker);else stack.push(run.marker);return '';}const props=[stack.includes('strong')?'<w:b/>':'',stack.includes('em')?'<w:i/>':'',stack.includes('s')?'<w:strike/>':'',stack.includes('code_inline')?'<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/>':'',link?'<w:color w:val="0563C1"/><w:u w:val="single"/>':''].filter(Boolean).join('');const content=`<w:r>${props?`<w:rPr>${props}</w:rPr>`:''}<w:t xml:space="preserve">${xml(run.text||'')}</w:t></w:r>`;if(link&&/^(https?:|mailto:)/i.test(link)){let id=relationships.find(item=>item.target===link)?.id;if(!id){id=`rId${relationships.length+1}`;relationships.push({id,target:link});}return `<w:hyperlink r:id="${id}">${content}</w:hyperlink>`;}return content;}).join(''); }
function paragraphXml(text,style='Normal',isRuns=false,relationships=[]) { const content=isRuns?runsXml(text,relationships):String(text).split('\n').map((line,i)=>`${i?'<w:r><w:br/></w:r>':''}<w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join('');return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${content}</w:p>`; }
export function docxParts(source) {
 const relationships=[];
 const body=markdownBlocks(source).map(b=>b.type==='heading'?paragraphXml(b.runs,`Heading${b.level}`,true,relationships):b.type==='code'?paragraphXml(b.text,'Code'):b.type==='quote'?paragraphXml(b.text,'Quote'):b.type==='list'?b.items.map((r,i)=>paragraphXml([{text:`${b.ordered?`${i+1}.`:'•'} `},...r],'ListParagraph',true,relationships)).join(''):b.type==='table'?`<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${b.rows.map(row=>`<w:tr>${row.map(cell=>`<w:tc>${paragraphXml(cell)}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`:paragraphXml(b.runs,'Normal',true,relationships)).join('');
 return { '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>', '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>', 'word/_rels/document.xml.rels':`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${relationships.map(r=>`<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(r.target)}" TargetMode="External"/>`).join('')}</Relationships>`, 'word/styles.xml':`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="20"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:pPr><w:ind w:left="360"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/></w:style>${[1,2,3,4,5,6].map(n=>`<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:b/><w:sz w:val="${Math.max(22,36-n*2)}"/></w:rPr></w:style>`).join('')}</w:styles>`, 'word/document.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>` };
}
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
export function zipStore(files){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const [name,value] of Object.entries(files)){const n=enc.encode(name),d=typeof value==='string'?enc.encode(value):value,crc=crc32(d),lh=new Uint8Array(30+n.length),lv=new DataView(lh.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint32(14,crc,true);lv.setUint32(18,d.length,true);lv.setUint32(22,d.length,true);lv.setUint16(26,n.length,true);lh.set(n,30);locals.push(lh,d);const ch=new Uint8Array(46+n.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint32(16,crc,true);cv.setUint32(20,d.length,true);cv.setUint32(24,d.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);ch.set(n,46);centrals.push(ch);offset+=lh.length+d.length;}const centralLength=centrals.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,centrals.length,true);v.setUint16(10,centrals.length,true);v.setUint32(12,centralLength,true);v.setUint32(16,offset,true);return new Blob([...locals,...centrals,end],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}
export function createDocx(source){return zipStore(docxParts(source));}
export function createPdfHtml(title,source){return `<!doctype html><meta charset="utf-8"><title>${xml(title)}</title><style>body{font:16px/1.75 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;max-width:760px;margin:48px auto;color:#222}h1,h2,h3{line-height:1.3}pre{white-space:pre-wrap;background:#f4f4f4;padding:12px}table{border-collapse:collapse}td,th{border:1px solid #aaa;padding:6px}@page{margin:20mm}</style>${md.render(source)}`;}
