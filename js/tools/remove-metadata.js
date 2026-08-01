/* ==========================================================================
   remove-metadata.js — Strip all metadata (Title, Author, Subject, Keywords,
   Creator, Producer, CreationDate, ModDate, plus XMP/Info dictionary).
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="field">
      <label>What to strip</label>
      <div style="display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--bg-soft);border-radius:8px;">
        <label style="display:flex;gap:8px;font-size:14px;"><input type="checkbox" id="info" checked /> Document info (Title, Author, Subject, Keywords)</label>
        <label style="display:flex;gap:8px;font-size:14px;"><input type="checkbox" id="xmp" checked /> XMP metadata stream</label>
        <label style="display:flex;gap:8px;font-size:14px;"><input type="checkbox" id="dates" checked /> Creation & modification dates</label>
        <label style="display:flex;gap:8px;font-size:14px;"><input type="checkbox" id="creator" checked /> Creator & Producer application</label>
        <label style="display:flex;gap:8px;font-size:14px;"><input type="checkbox" id="pageMeta" checked /> Per-page metadata (PieceInfo, last modified)</label>
      </div>
    </div>
    <div class="field">
      <label>Output filename</label>
      <input type="text" id="outName" value="cleaned.pdf" />
    </div>
  `;

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '🧹 Remove metadata';

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Cleaning…';
    document.getElementById('result').classList.remove('active');
    try {
      const { PDFDocument } = await window.loadPdfLib();
      const buf = await window.readFileBuffer(currentFile);
      const doc = await PDFDocument.load(buf, { updateMetadata: false });

      // Capture before
      const before = {
        title: doc.getTitle(),
        author: doc.getAuthor(),
        subject: doc.getSubject(),
        keywords: doc.getKeywords(),
        creator: doc.getCreator(),
        producer: doc.getProducer(),
        creation: doc.getCreationDate(),
        mod: doc.getModificationDate(),
      };

      const opts = {
        info: document.getElementById('info').checked,
        xmp: document.getElementById('xmp').checked,
        dates: document.getElementById('dates').checked,
        creator: document.getElementById('creator').checked,
        pageMeta: document.getElementById('pageMeta').checked,
      };

      if (opts.info) {
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
      }
      if (opts.creator) {
        doc.setCreator('');
        doc.setProducer('');
      }
      if (opts.dates) {
        doc.setCreationDate(new Date(0));
        doc.setModificationDate(new Date(0));
      }
      if (opts.xmp) {
        try {
          const catalog = doc.catalog;
          if (catalog.has('Metadata')) catalog.delete('Metadata');
        } catch (e) { /* XMP absent */ }
      }
      if (opts.pageMeta) {
        doc.getPages().forEach(p => {
          try {
            const node = p.node;
            if (node.has('PieceInfo')) node.delete('PieceInfo');
            if (node.has('LastModified')) node.delete('LastModified');
          } catch (e) {}
        });
      }

      const bytes = await doc.save({ useObjectStreams: false });
      const filename = document.getElementById('outName').value || 'cleaned.pdf';

      window.setProgress('#progress', 100, 'Done');
      const rows = Object.entries(before).map(([k, v]) => `<tr><td>${k}</td><td>${v ? escapeHtml(String(v).slice(0, 60)) : '<span class="muted">—</span>'}</td><td style="color:var(--success);font-weight:600;">✓ removed</td></tr>`).join('');
      window.showResult('#result', `
        <h4>✅ Metadata stripped</h4>
        <div class="result-meta">${window.fmtSize(buf.byteLength)} → ${window.fmtSize(bytes.byteLength)}</div>
        <table style="width:100%;margin-top:14px;font-size:13px;border-collapse:collapse;">
          <thead><tr style="text-align:left;color:var(--text-mute);"><th>Field</th><th>Before</th><th>After</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="btn btn-primary mt-3" id="dlBtn">⬇ Download ${filename}</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(bytes, filename, 'application/pdf');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🧹 Remove metadata';
    }
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
})();