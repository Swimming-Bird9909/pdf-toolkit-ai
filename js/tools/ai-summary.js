/* ==========================================================================
   ai-summary.js — Local extractive summary + optional LLM (BYOK) polish.
   No upload: we extract text via pdf.js, then build a frequency-based summary
   entirely in the browser. If user provides an OpenAI/Anthropic key, we
   optionally polish the summary server-side (still not stored).
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="grid grid-2">
      <div class="field">
        <label>Summary length</label>
        <select id="len">
          <option value="short">Short (3-5 sentences)</option>
          <option value="medium" selected>Medium (1 paragraph)</option>
          <option value="long">Long (3 paragraphs)</option>
          <option value="bullets">Bullet points (5-7)</option>
        </select>
      </div>
      <div class="field">
        <label>Focus</label>
        <select id="focus">
          <option value="general" selected>General</option>
          <option value="keypoints">Key points only</option>
          <option value="action">Action items only</option>
        </select>
      </div>
      <div class="field" style="grid-column:1/-1;">
        <label>Optional: OpenAI API key (for higher-quality summary). Leave empty for local-only.</label>
        <input type="password" id="apiKey" placeholder="sk-... (optional, stored only in your browser)" />
      </div>
    </div>
  `;

  window.initDropzone('#dz', (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    btn.disabled = false;
  });

  btnReset.addEventListener('click', () => location.reload());
  btn.innerHTML = '🤖 Summarize';

  btn.addEventListener('click', async () => {
    if (!currentFile) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Reading…';
    document.getElementById('result').classList.remove('active');
    try {
      const pdfjs = await window.loadPdfJs();
      const buf = await window.readFileBuffer(currentFile);
      const doc = await pdfjs.getDocument({ data: buf }).promise;

      let fullText = '';
      for (let p = 1; p <= doc.numPages; p++) {
        window.setProgress('#progress', (p / doc.numPages) * 50, `Reading page ${p}/${doc.numPages}…`);
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        fullText += tc.items.map(i => i.str).join(' ') + '\n\n';
      }
      const cleaned = fullText.replace(/\s+/g, ' ').trim();
      if (!cleaned || cleaned.length < 50) {
        window.showResult('#result', `
          <h4 style="color:var(--warning)">⚠️ No extractable text found</h4>
          <p class="soft">This PDF looks scanned. Try our <a href="ocr.html">OCR tool</a> first to extract text, then come back.</p>
        `);
        return;
      }

      const len = document.getElementById('len').value;
      const focus = document.getElementById('focus').value;
      let summary = localExtractiveSummary(cleaned, len, focus);
      window.setProgress('#progress', 80, 'Generating summary…');

      const apiKey = document.getElementById('apiKey').value.trim();
      if (apiKey) {
        try {
          summary = await llmPolish(summary, cleaned, len, focus, apiKey);
          window.setProgress('#progress', 100, 'Done (AI-enhanced)');
        } catch (e) {
          console.warn('LLM polish failed, using local summary', e);
          window.setProgress('#progress', 100, 'Done (local fallback)');
        }
      } else {
        window.setProgress('#progress', 100, 'Done');
      }

      const wordCount = cleaned.split(/\s+/).length;
      window.showResult('#result', `
        <h4>✅ Summary ready</h4>
        <div class="result-meta">${wordCount.toLocaleString()} words → ${summary.split(/\\s+/).length} words · ${doc.numPages} page(s)</div>
        <div style="margin-top:14px;padding:18px;background:var(--bg-soft);border-radius:10px;font-size:15px;line-height:1.7;">
          ${formatSummary(summary, len)}
        </div>
        <div class="actions" style="margin-top:16px;">
          <button class="btn btn-primary" id="dlBtn">⬇ Download .txt</button>
          <button class="btn btn-ghost" id="cpBtn">📋 Copy</button>
        </div>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(new Blob([summary], { type: 'text/plain' }), currentFile.name.replace(/\.pdf$/i, '') + '_summary.txt', 'text/plain');
      });
      document.getElementById('cpBtn').addEventListener('click', async () => {
        await navigator.clipboard.writeText(summary);
        document.getElementById('cpBtn').textContent = '✅ Copied!';
        setTimeout(() => document.getElementById('cpBtn').textContent = '📋 Copy', 1500);
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🤖 Summarize';
    }
  });

  /* ----- Local extractive summary (TextRank-lite) ----- */
  function localExtractiveSummary(text, len, focus) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= 3) return sentences.join(' ');

    // word frequency
    const stop = new Set('the a an and or but if then else of in on at to for from by with as is are was were be been being have has had do does did this that these those it its they them their we us our you your i my me'.split(' '));
    const freq = {};
    text.toLowerCase().split(/\W+/).forEach(w => {
      if (w.length < 3 || stop.has(w) || /^\d+$/.test(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });

    const scored = sentences.map((s, i) => {
      const words = s.toLowerCase().split(/\W+/);
      let score = words.reduce((a, w) => a + (freq[w] || 0), 0) / Math.max(words.length, 1);
      // bias: earlier sentences + position weighting
      score += (1 - i / sentences.length) * 0.3;
      // focus bias
      if (focus === 'action') score += /should|must|need|will|action|todo|next step/i.test(s) ? 0.6 : 0;
      if (focus === 'keypoints') score += /important|key|main|critical|essential|notably/i.test(s) ? 0.5 : 0;
      return { i, s: s.trim(), score };
    }).sort((a, b) => b.score - a.score);

    const count = { short: 4, medium: 7, long: 14, bullets: 6 }[len] || 7;
    const picked = scored.slice(0, count).sort((a, b) => a.i - b.i).map(x => x.s);

    if (len === 'bullets') return picked.map(p => '• ' + p.trim()).join('\n');
    return picked.join(' ');
  }

  async function llmPolish(localSum, fullText, len, focus, apiKey) {
    const maxInput = 6000;
    const truncated = fullText.length > maxInput ? fullText.slice(0, maxInput) + '…' : fullText;
    const prompt = `Summarize the following document into ${len === 'bullets' ? '5-7 bullet points' : (len === 'long' ? 'three concise paragraphs' : len === 'short' ? '3-5 sentences' : 'one concise paragraph')}.
Focus: ${focus}.
Output only the summary, no preamble.

Document:
${truncated}

Local draft (improve on it):
${localSum}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });
    if (!res.ok) throw new Error('API ' + res.status);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || localSum;
  }

  function formatSummary(s, len) {
    if (len === 'bullets') return s.split('\n').map(l => `<div>${escapeHtml(l)}</div>`).join('');
    return escapeHtml(s).replace(/\n\n/g, '<br/><br/>');
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
})();