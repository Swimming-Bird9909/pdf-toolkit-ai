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

  function paragraphsToDocxXml(paragraphs) {
    let body = '';
    for (const p of paragraphs) {
      const lines = p.split('\n');
      const runs = lines.map(line => {
        const text = escapeXml(line || ' ');
        return `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
      });
      body += runs.join('');
    }
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;
  }

  async function extractText() {
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
      const pages = await extractText();
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
        // docx
        window.setProgress('#progress', 85, 'Building .docx…');
        const JSZip = await window.loadJSZip();
        const docXml = paragraphsToDocxXml(pages);
        const zip = new JSZip();
        zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
        zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
        zip.folder('word').file('document.xml', docXml);
        const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        window.setProgress('#progress', 100, 'Done');
        window.showResult('#result', `
          <h4>✅ Converted to Word</h4>
          <div class="result-meta">${pages.length} page(s) · ${window.fmtSize(blob.size)}</div>
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
