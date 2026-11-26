import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: false }).enable('table');
const PAGE_WIDTH = 9026;
const xml = value => String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);

export function exportFileName(title, extension) {
  const clean = String(title || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').replace(/^[. -]+|[. -]+$/g, '').slice(0, 100).replace(/^[. -]+|[. -]+$/g, '') || '未命名文档';
  return `${clean}.${extension}`;
}

function inlineRuns(tokens = []) {
  const runs = [];
  const markers = { strong_open: 'strong', strong_close: 'strong', em_open: 'em', em_close: 'em', s_open: 'strike', s_close: 'strike' };
  for (const token of tokens) {
    if (markers[token.type]) {
      runs.push({ marker: markers[token.type], close: token.type.endsWith('_close') });
    } else if (token.type === 'text' || token.type === 'code_inline' || token.type === 'html_inline') {
      runs.push({ text: token.content, code: token.type === 'code_inline' });
    } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
      runs.push({ text: '\n' });
    } else if (token.type === 'image') {
      runs.push({ text: token.content || token.attrGet('alt') || '' });
    } else if (token.type === 'link_open') {
      runs.push({ marker: 'link', href: token.attrGet('href') });
    } else if (token.type === 'link_close') {
      runs.push({ marker: 'link', close: true });
    }
  }
  return runs;
}

function inlineBlock(token, type, level = 0) {
  return { type, level, runs: inlineRuns(token.children) };
}

export function markdownBlocks(source) {
  const tokens = md.parse(String(source ?? ''), {}), blocks = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open' || token.type === 'paragraph_open') {
      const inline = tokens[++i];
      blocks.push(inlineBlock(inline, token.type === 'heading_open' ? 'heading' : 'paragraph', Number(token.tag.slice(1)) || 0));
    } else if (token.type === 'fence' || token.type === 'code_block') {
      blocks.push({ type: 'code', text: token.content, language: token.info.trim().split(/\s+/)[0] || '' });
    } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const items = [], listStack = [{ ordered: token.type === 'ordered_list_open', start: Number(token.attrGet('start')) || 1, index: 0 }];
      let current = null;
      while (i + 1 < tokens.length) {
        const next = tokens[++i];
        if (next.type === 'bullet_list_open' || next.type === 'ordered_list_open') {
          if (current) {
            items.push(current);
            current = null;
          }
          listStack.push({ ordered: next.type === 'ordered_list_open', start: Number(next.attrGet('start')) || 1, index: 0 });
        } else if (next.type === 'bullet_list_close' || next.type === 'ordered_list_close') {
          listStack.pop();
          if (!listStack.length) break;
        } else if (next.type === 'list_item_open') {
          const list = listStack[listStack.length - 1] || { ordered: false, start: 1, index: 0 };
          current = { runs: [], depth: Math.max(0, listStack.length - 1), ordered: list.ordered, number: list.start + list.index++ };
        } else if (next.type === 'inline' && current) {
          current.runs.push(...inlineRuns(next.children));
        } else if (next.type === 'list_item_close' && current) {
          items.push(current);
          current = null;
        }
      }
      blocks.push({ type: 'list', items });
    } else if (token.type === 'blockquote_open') {
      let depth = 1;
      const paragraphs = [];
      while (++i < tokens.length && depth) {
        const current = tokens[i];
        if (current.type === 'blockquote_open') depth++;
        else if (current.type === 'blockquote_close') depth--;
        else if (current.type === 'paragraph_open' && tokens[i + 1]?.type === 'inline') {
          paragraphs.push(inlineRuns(tokens[++i].children));
        }
      }
      blocks.push({ type: 'quote', paragraphs });
    } else if (token.type === 'table_open') {
      const rows = [];
      let row = null, header = false, alignments = [];
      while (++i < tokens.length && tokens[i].type !== 'table_close') {
        const current = tokens[i];
        if (current.type === 'thead_open') header = true;
        else if (current.type === 'tbody_open') header = false;
        else if (current.type === 'tr_open') row = [];
        else if (current.type === 'th_open' || current.type === 'td_open') {
          const align = current.attrGet('style')?.match(/text-align:\s*(left|center|right)/)?.[1] || 'left';
          if (header) alignments.push(align);
          if (row) row.push({ runs: [], header, align });
        } else if (current.type === 'inline' && row?.length) {
          row[row.length - 1].runs = inlineRuns(current.children);
        } else if (current.type === 'tr_close' && row) {
          rows.push(row);
          row = null;
        }
      }
      blocks.push({ type: 'table', rows, alignments });
    }
  }
  return blocks;
}

function runXml(runs = [], relationships = []) {
  const stack = [];
  let link = null;
  return runs.map(run => {
    if (run.marker === 'link') {
      link = run.close ? null : run.href;
      return '';
    }
    if (run.marker) {
      if (run.close) {
        const index = stack.lastIndexOf(run.marker);
        if (index >= 0) stack.splice(index, 1);
      } else stack.push(run.marker);
      return '';
    }
    const properties = [
      stack.includes('strong') ? '<w:b/>' : '',
      stack.includes('em') ? '<w:i/>' : '',
      stack.includes('strike') ? '<w:strike/>' : '',
      run.code ? '<w:rStyle w:val="InlineCode"/>' : '',
      link ? '<w:color w:val="0563C1"/><w:u w:val="single"/>' : '',
    ].filter(Boolean).join('');
    const content = String(run.text || '').split('\n').map((line, index) => `${index ? '<w:r><w:br/></w:r>' : ''}<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join('');
    if (link && /^(https?:|mailto:)/i.test(link)) {
      let id = relationships.find(item => item.target === link)?.id;
      if (!id) {
        id = `rId${relationships.length + 1}`;
        relationships.push({ id, target: link });
      }
      return `<w:hyperlink r:id="${id}">${content}</w:hyperlink>`;
    }
    return content;
  }).join('');
}

function paragraphXml(runs, style = 'Normal', relationships = [], options = {}) {
  const pProperties = [
    `<w:pStyle w:val="${style}"/>`,
    options.left ? `<w:ind w:left="${options.left}"/>` : '',
    options.hanging ? `<w:ind w:left="${options.left || 720}" w:hanging="${options.hanging}"/>` : '',
    options.align ? `<w:jc w:val="${options.align}"/>` : '',
    options.shading ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.shading}"/>` : '',
    options.borderLeft ? `<w:pBdr><w:left w:val="single" w:sz="16" w:space="8" w:color="${options.borderLeft}"/></w:pBdr>` : '',
  ].filter(Boolean).join('');
  return `<w:p><w:pPr>${pProperties}</w:pPr>${runXml(runs, relationships)}</w:p>`;
}

function weightedColumnWidths(rows, columnCount) {
  const weights = Array.from({ length: columnCount }, (_, column) => Math.max(1, ...rows.map(row => Array.from(row[column]?.runs || []).reduce((size, run) => size + String(run.text || '').length, 0))));
  const minimum = Math.min(1080, Math.floor(PAGE_WIDTH / columnCount));
  const remaining = PAGE_WIDTH - minimum * columnCount;
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const widths = weights.map(weight => minimum + Math.floor(remaining * weight / weightTotal));
  widths[widths.length - 1] += PAGE_WIDTH - widths.reduce((sum, width) => sum + width, 0);
  return widths;
}

function tableXml(block, relationships) {
  const columnCount = Math.max(1, ...block.rows.map(row => row.length));
  const widths = weightedColumnWidths(block.rows, columnCount);
  const grid = widths.map(width => `<w:gridCol w:w="${width}"/>`).join('');
  const borders = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="C8D2DC"/><w:left w:val="single" w:sz="4" w:color="C8D2DC"/><w:bottom w:val="single" w:sz="4" w:color="C8D2DC"/><w:right w:val="single" w:sz="4" w:color="C8D2DC"/><w:insideH w:val="single" w:sz="4" w:color="C8D2DC"/><w:insideV w:val="single" w:sz="4" w:color="C8D2DC"/></w:tblBorders>';
  const rows = block.rows.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const cells = Array.from({ length: columnCount }, (_, column) => {
      const cell = row[column] || { runs: [], header: isHeader, align: 'left' };
      const properties = `<w:tcW w:w="${widths[column]}" w:type="dxa"/><w:vAlign w:val="center"/>${cell.header ? '<w:shd w:val="clear" w:color="auto" w:fill="EAF1F8"/>' : ''}`;
      const runs = cell.header ? [{ marker: 'strong' }, ...cell.runs, { marker: 'strong', close: true }] : cell.runs;
      const cellParagraph = paragraphXml(runs, cell.header ? 'TableHeader' : 'TableCell', relationships, { align: cell.align });
      return `<w:tc><w:tcPr>${properties}</w:tcPr>${cellParagraph}</w:tc>`;
    }).join('');
    return `<w:tr>${isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${cells}</w:tr>`;
  }).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${PAGE_WIDTH}" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}<w:tblCellMar><w:top w:w="90" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`;
}

function stylesXml() {
  const headings = [1, 2, 3, 4, 5, 6].map(level => {
    const size = [36, 30, 26, 24, 22, 22][level - 1];
    return `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${level === 1 ? 300 : 220}" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="${level < 3 ? '1F2937' : '374151'}"/><w:sz w:val="${size}"/></w:rPr></w:style>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/><w:lang w:val="en-US" w:eastAsia="zh-CN"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${headings}<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360"/><w:spacing w:before="80" w:after="160"/></w:pPr><w:rPr><w:color w:val="5B6470"/><w:i/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="180" w:right="180"/><w:spacing w:before="60" w:after="60"/><w:shd w:val="clear" w:color="auto" w:fill="F1F3F5"/></w:pPr><w:rPr><w:rFonts w:ascii="Menlo" w:hAnsi="Menlo" w:eastAsia="Microsoft YaHei"/><w:sz w:val="19"/><w:color w:val="24292F"/></w:rPr></w:style><w:style w:type="character" w:styleId="InlineCode"><w:name w:val="Inline Code"/><w:rPr><w:rFonts w:ascii="Menlo" w:hAnsi="Menlo"/><w:shd w:val="clear" w:color="auto" w:fill="F1F3F5"/><w:color w:val="24292F"/><w:sz w:val="19"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="TableHeader"><w:name w:val="Table Header"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="260" w:lineRule="auto"/></w:pPr><w:rPr><w:b/><w:color w:val="243447"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="TableCell"><w:name w:val="Table Cell"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="260" w:lineRule="auto"/></w:pPr></w:style></w:styles>`;
}

export function docxParts(source) {
  const relationships = [];
  const body = markdownBlocks(source).map(block => {
    if (block.type === 'heading') return paragraphXml(block.runs, `Heading${block.level}`, relationships);
    if (block.type === 'code') return block.text.replace(/\n$/, '').split('\n').map(line => paragraphXml([{ text: line }], 'Code', relationships)).join('');
    if (block.type === 'quote') return block.paragraphs.map(runs => paragraphXml(runs, 'Quote', relationships, { borderLeft: 'C8D2DC' })).join('');
    if (block.type === 'list') return block.items.map(item => {
      const indent = 720 * (item.depth + 1);
      const marker = item.ordered ? `${item.number}. ` : '• ';
      return paragraphXml([{ text: marker }, ...item.runs], 'ListParagraph', relationships, { left: indent });
    }).join('');
    if (block.type === 'table') return tableXml(block, relationships);
    return paragraphXml(block.runs, 'Normal', relationships);
  }).join('');
  return {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${relationships.map(relationship => `<Relationship Id="${relationship.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(relationship.target)}" TargetMode="External"/>`).join('')}</Relationships>`,
    'word/styles.xml': stylesXml(),
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
  };
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let value = 0; value < 256; value++) {
    let crc = value;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    table[value] = crc >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipStore(files) {
  const encoder = new TextEncoder(), locals = [], centrals = [];
  let offset = 0;
  for (const [name, value] of Object.entries(files)) {
    const fileName = encoder.encode(name), data = typeof value === 'string' ? encoder.encode(value) : value;
    const checksum = crc32(data), local = new Uint8Array(30 + fileName.length), localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true); localView.setUint16(4, 20, true); localView.setUint16(6, 0x0800, true);
    localView.setUint32(14, checksum, true); localView.setUint32(18, data.length, true); localView.setUint32(22, data.length, true);
    localView.setUint16(26, fileName.length, true); local.set(fileName, 30);
    locals.push(local, data);
    const central = new Uint8Array(46 + fileName.length), centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true); centralView.setUint16(4, 20, true); centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true); centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true); centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, fileName.length, true); centralView.setUint32(42, offset, true); central.set(fileName, 46);
    centrals.push(central);
    offset += local.length + data.length;
  }
  const centralLength = centrals.reduce((sum, entry) => sum + entry.length, 0), end = new Uint8Array(22), endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, centrals.length, true); endView.setUint16(10, centrals.length, true);
  endView.setUint32(12, centralLength, true); endView.setUint32(16, offset, true);
  return new Blob([...locals, ...centrals, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export function createDocx(source) {
  return zipStore(docxParts(source));
}
