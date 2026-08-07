/* ==========================================================================
   pdf-to-word.js — Extract PDF text and save as .docx (or .html, .txt)
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  let pdfjsDoc = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  window.initDropzone('#dz', async (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());

  function escapeXml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  /* ----- 段落样式 -----
     中文 Word 默认会启用"中文文档网格"，导致行间距被撑大、字符间距变大。
     通过给段落显式指定 line/lineRule/font/size，先发制人，强制规整版式。
     twips (1/20 pt): 240 = 12pt; 480 = 2 字符 首行缩进; 360 = 1.5 倍行距。 */
  function styleBlock(kind) {
    // kind: 'body' | 'list' | 'title'
    if (kind === 'title') {
      return '<w:pPr>'
        + '<w:spacing w:before="120" w:after="80" w:line="360" w:lineRule="auto"/>'
        + '<w:ind w:firstLine="0"/>'
        + '<w:rPr>'
          + '<w:rFonts w:ascii="Times New Roman" w:eastAsia="SimHei" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
          + '<w:b/><w:bCs/>'
          + '<w:sz w:val="28"/><w:szCs w:val="28"/>'
        + '</w:rPr>'
      + '</w:pPr>';
    }
    if (kind === 'list') {
      return '<w:pPr>'
        + '<w:spacing w:before="40" w:after="40" w:line="360" w:lineRule="auto"/>'
        + '<w:ind w:firstLine="0" w:left="480" w:hanging="240"/>'
        + '<w:rPr>'
          + '<w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
          + '<w:sz w:val="24"/><w:szCs w:val="24"/>'
        + '</w:rPr>'
      + '</w:pPr>';
    }
    // body
    return '<w:pPr>'
      + '<w:spacing w:before="0" w:after="0" w:line="360" w:lineRule="auto"/>'
      + '<w:ind w:firstLine="480"/>'   /* 中文正文 2 字符首行缩进 */
      + '<w:rPr>'
        + '<w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
        + '<w:sz w:val="24"/><w:szCs w:val="24"/>'
      + '</w:rPr>'
    + '</w:pPr>';
  }

  /* ----- 段落识别 -----
     把 PDF 提取出的视觉行按"编号/标题/正文"三类归并成段。
     规则：编号项 (1. 2. （1） 一、 第一章 …… ) 独立成段；
           紧跟的非空视觉行算同一段，直到下一个编号项；段内连续多行合并。 */
  const LIST_RE = /^[　 ]*(?:第[一二三四五六七八九十百千零0-9]+[章节部分]|第[0-9]+[章节部分]|[一二三四五六七八九十]+[、.]|\d+[.、)）]|[（(]\s*\d+\s*[）)]|[•·●○◦▪▫\-—])\s*/;
  const TITLE_RE = /^(?:摘\s*要|摘\s*录|引\s*言|前\s*言|绪\s*论|正\s*文|结\s*论|结\s*束\s*语|参\s*考\s*文\s*献|附\s*录|Abstract|Introduction|Conclusion)\s*[:：]?\s*$/i;
  const PAGE_NUM_RE = /^[-—\s]*[-—]?\s*\d+\s*\/\s*\d+\s*[-—]?\s*$/;

  function splitIntoParagraphs(text) {
    /* text = 单页所有视觉行 (用 \n 连接) */
    const lines = text.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean);
    const out = [];
    let buf = [];

    function flush() {
      if (buf.length) {
        out.push({ kind: 'body', text: buf.join('').trim() });
        buf = [];
      }
    }

    for (const line of lines) {
      // 剥页码（"1 / 5" 等），保留段落的纯净度
      if (PAGE_NUM_RE.test(line)) continue;

      if (LIST_RE.test(line)) {
        flush();
        const stripped = line.replace(LIST_RE, '').trim();
        // 一些 PDF 提取把编号和正文拼成一行（如 "1. 前言"），把这两部分拆开更板正
        if (stripped) {
          out.push({ kind: 'list', text: line.match(LIST_RE)[0].trim() });
          buf.push(stripped);
        } else {
          out.push({ kind: 'list', text: line.trim() });
        }
      } else if (TITLE_RE.test(line)) {
        flush();
        out.push({ kind: 'title', text: line.trim() });
      } else {
        buf.push(line);
      }
    }
    flush();
    return out;
  }

  /* ----- DOCX 输出 ----- */
  function paragraphToXml(p) {
    const style = styleBlock(p.kind);
    const text = escapeXml(p.text || ' ');
    return `<w:p>${style}<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:eastAsia="SimSun" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
  }

  function pageBreakXml() {
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  }

  function documentXml(pageParagraphs) {
    /* pageParagraphs: [{ paragraphs: [{kind,text}] }, ...] */
    let body = '';
    pageParagraphs.forEach((page, i) => {
      page.paragraphs.forEach(p => { body += paragraphToXml(p); });
      if (i < pageParagraphs.length - 1) body += pageBreakXml();
    });

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
      <w:cols w:space="425"/>
      <w:docGrid w:type="lines" w:linePitch="312"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  }

  /* settings.xml —— 关掉中文 Word 的"文档网格"，避免行距被自动撑大 */
  function settingsXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="420"/>
  <w:characterSpacingControl w:val="compressPunctuation"/>
  <w:themeFontLang w:val="en-US" w:eastAsia="zh-CN"/>
  <w:compat>
    <w:doNotExpandShiftJis/>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
    <w:compatSetting w:name="overrideTableStyleFontSizeAndJustification" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
    <w:compatSetting w:name="enableOpenTypeFeatures" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
    <w:compatSetting w:name="doNotFlipMirrorIndents" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
  </w:compat>
</w:settings>`;
  }

  async function extractPages() {
    /* 每页 = 一段原始文本 (视觉行用 \n 分隔) */
    const pdfjs = await window.loadPdfJs();
    const buf = await window.readFileBuffer(currentFile);
    pdfjsDoc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
    const pages = [];
    for (let i = 1; i <= pdfjsDoc.numPages; i++) {
      const page = await pdfjsDoc.getPage(i);
      const content = await page.getTextContent();
      let lastY = null;
      let line = [];
      const lines = [];
      for (const item of content.items) {
        const y = Math.round(item.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push(line.join(' '));
          line = [];
        }
        line.push(item.str);
        lastY = y;
      }
      if (line.length) lines.push(line.join(' '));
      pages.push(lines.join('\n'));
      window.setProgress('#progress', Math.round((i / pdfjsDoc.numPages) * 80), `Extracting page ${i}/${pdfjsDoc.numPages}`);
    }
    return pages;
  }

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Converting…';
    document.getElementById('result').classList.remove('active');
    try {
      const fmt = document.querySelector('input[name="format"]:checked').value;
      const pages = await extractPages();
      const baseName = currentFile.name.replace(/\.pdf$/i, '');

      if (fmt === 'txt') {
        const text = pages.join('\n\n--- Page break ---\n\n');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        window.setProgress('#progress', 100, 'Done');
        window.showResult('#result', `
          <h4>✅ Converted to plain text</h4>
          <div class="result-meta">${pages.length} page(s) · ${window.fmtSize(blob.size)}</div>
          <button class="btn btn-primary" id="dlBtn">⬇ Download .txt</button>
        `);
        document.getElementById('dlBtn').addEventListener('click', () => {
          window.downloadBlob(blob, baseName + '.txt', 'text/plain;charset=utf-8');
        });
      } else if (fmt === 'html') {
        const htmlBody = pages.map((p, i) => `<div class="page"><h3>Page ${i + 1}</h3><pre>${p.replace(/</g, '&lt;')}</pre></div>`).join('');
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${baseName}</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:780px;margin:40px auto;padding:0 20px;line-height:1.6;color:#222}
.page{margin-bottom:40px;padding-bottom:20px;border-bottom:1px solid #eee}
.page h3{color:#6366f1;margin-top:0}
pre{white-space:pre-wrap;font-family:Georgia,serif;font-size:15px;line-height:1.7}</style>
</head><body>${htmlBody}</body></html>`;
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        window.setProgress('#progress', 100, 'Done');
        window.showResult('#result', `
          <h4>✅ Converted to HTML</h4>
          <div class="result-meta">${pages.length} page(s) · ${window.fmtSize(blob.size)}</div>
          <button class="btn btn-primary" id="dlBtn">⬇ Download .html</button>
        `);
        document.getElementById('dlBtn').addEventListener('click', () => {
          window.downloadBlob(blob, baseName + '.html', 'text/html;charset=utf-8');
        });
      } else {
        // docx —— 应用规范的中文段落样式
        window.setProgress('#progress', 85, 'Building .docx…');
        const JSZip = await window.loadJSZip();

        /* 每页做段落识别后输出 */
        const pageParagraphs = pages.map(text => ({ paragraphs: splitIntoParagraphs(text) }));
        const docXml = documentXml(pageParagraphs);

        const zip = new JSZip();
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`);
        zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
        zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`);
        zip.folder('word').file('document.xml', docXml);
        zip.folder('word').file('settings.xml', settingsXml());
        const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        window.setProgress('#progress', 100, 'Done');
        window.showResult('#result', `
          <h4>✅ Converted to Word</h4>
          <div class="result-meta">${pages.length} page(s) · ${window.fmtSize(blob.size)} · 规整排版</div>
          <button class="btn btn-primary" id="dlBtn">⬇ Download .docx</button>
        `);
        document.getElementById('dlBtn').addEventListener('click', () => {
          window.downloadBlob(blob, baseName + '.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        });
      }
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Convert to Word';
    }
  });
})();
