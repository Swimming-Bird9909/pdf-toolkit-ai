/* ==========================================================================
   chat-with-pdf.js — Local Q&A over PDF content
   Strategy: extract text → split into page-anchored chunks → keyword/phrase
   matching to find relevant context → return matched excerpts as "answer".
   No external API needed. Privacy-first.
   ========================================================================== */
(function () {
  'use strict';

  let currentFile = null;
  let pdfChunks = []; // [{page, text}]
  const dz = document.getElementById('dz');
  const options = document.getElementById('options');
  const progress = document.getElementById('progress');
  const chatHistory = document.getElementById('chatHistory');
  const chatMessages = document.getElementById('chatMessages');
  const questionInput = document.getElementById('questionInput');
  const btnAsk = document.getElementById('btnAsk');

  const STOP = new Set(('a an and or the of in to for is are was were be been being it its this that these those with as at by from on i you we they he she his her their our your my me him them us do does did has have had can could may might will would shall should about which what who whom whose where when why how not no nor so if but than then there here also too very much more most some any all each every other another such only own same few both either neither').split(/\s+/));

  function tokenize(text) {
    return text.toLowerCase().match(/[a-z0-9\u4e00-\u9fff]+/g) || [];
  }

  function extractChunks() {
    return window.loadPdfJs().then(async (pdfjs) => {
      const buf = await window.readFileBuffer(currentFile);
      const doc = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
      const chunks = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
        chunks.push({ page: i, text });
        window.setProgress('#progress', Math.round((i / doc.numPages) * 90), `Reading page ${i}/${doc.numPages}`);
      }
      return chunks;
    });
  }

  function score(question, chunk) {
    const qTokens = tokenize(question).filter(t => !STOP.has(t) && t.length > 1);
    if (qTokens.length === 0) return 0;
    const cTokens = tokenize(chunk.text);
    const cSet = new Set(cTokens);
    let hits = 0;
    for (const qt of qTokens) {
      if (cSet.has(qt)) hits++;
      // also count substring matches for CJK and stems
      for (const ct of cSet) {
        if (ct !== qt && (ct.includes(qt) || qt.includes(ct)) && Math.min(ct.length, qt.length) >= 2) {
          hits += 0.5;
          break;
        }
      }
    }
    return hits / qTokens.length;
  }

  function findAnswer(question) {
    if (pdfChunks.length === 0) return null;
    const scored = pdfChunks.map(c => ({ ...c, score: score(question, c) }))
                             .filter(c => c.score > 0)
                             .sort((a, b) => b.score - a.score)
                             .slice(0, 3);
    if (scored.length === 0) {
      return {
        answer: "I couldn't find anything in this document that matches your question. Try rephrasing or asking about a different topic from the document.",
        pages: [],
      };
    }
    // Build an answer: take the top 1-2 chunks, show as quoted excerpt
    const top = scored[0];
    const sentences = top.text.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
    // Find sentence in the top chunk that best matches the question
    let bestSent = sentences[0] || top.text.slice(0, 300);
    let bestSentScore = 0;
    for (const s of sentences) {
      const sc = score(question, { text: s });
      if (sc > bestSentScore) {
        bestSentScore = sc;
        bestSent = s;
      }
    }
    const answer = bestSent.length > 500 ? bestSent.slice(0, 500) + '…' : bestSent;
    return {
      answer,
      pages: scored.map(s => s.page),
      topScore: top.score,
    };
  }

  function addMessage(role, text, pages) {
    const div = document.createElement('div');
    div.style.cssText = `padding:14px 18px;border-radius:12px;${role === 'user' ? 'background:var(--brand-soft,rgba(99,102,241,.08));border:1px solid var(--border);' : 'background:var(--bg-elev);border:1px solid var(--border);'}`;
    let html = role === 'user'
      ? `<div style="font-weight:600;font-size:13px;color:var(--text-mute);margin-bottom:6px;">You</div><div>${text.replace(/</g, '&lt;')}</div>`
      : `<div style="font-weight:600;font-size:13px;color:var(--brand);margin-bottom:6px;">🤖 Assistant</div><div style="line-height:1.6;">${text.replace(/</g, '&lt;')}</div>`;
    if (pages && pages.length) {
      html += `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;">`;
      for (const p of pages) {
        html += `<span style="display:inline-block;padding:2px 8px;background:var(--bg-soft);border:1px solid var(--border);border-radius:6px;font-size:12px;color:var(--text-soft);">📄 Page ${p}</span>`;
      }
      html += `</div>`;
    }
    div.innerHTML = html;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function askQuestion() {
    const q = questionInput.value.trim();
    if (!q || pdfChunks.length === 0) return;
    addMessage('user', q);
    questionInput.value = '';
    // Simulate "thinking" briefly
    btnAsk.disabled = true;
    btnAsk.innerHTML = '<span class="loader"></span>';
    setTimeout(() => {
      const result = findAnswer(q);
      addMessage('assistant', result.answer, result.pages);
      btnAsk.disabled = false;
      btnAsk.innerHTML = 'Ask';
    }, 250);
  }

  // Suggested questions
  document.querySelectorAll('.suggested-q').forEach(btn => {
    btn.addEventListener('click', () => {
      if (pdfChunks.length === 0) return;
      questionInput.value = btn.dataset.q;
      askQuestion();
    });
  });

  btnAsk.addEventListener('click', askQuestion);
  questionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') askQuestion();
  });

  window.initDropzone('#dz', async (files) => {
    currentFile = files[0];
    window.renderFileList('#fileList', [currentFile]);
    progress.classList.add('active');
    try {
      pdfChunks = await extractChunks();
      window.setProgress('#progress', 100, 'Indexed ' + pdfChunks.length + ' page(s)');
      options.style.display = 'block';
      chatHistory.style.display = 'block';
      addMessage('assistant', `Hi! I've read the ${pdfChunks.length}-page document. Ask me anything about it. (Tip: I'm a local keyword-based search, so specific terms work best — "what is the conclusion?", "list the key terms", etc.)`);
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed to read PDF</h4><p class="soft">${err.message || err}</p>`);
    }
  });
})();
