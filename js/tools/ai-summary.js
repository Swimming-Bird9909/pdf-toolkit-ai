/* ==========================================================================
   ai-summary.js — Extractive summary with TF-IDF + MMR diversity,
   then rendered as a structured TL;DR / Key Points / Section breakdown.
   No upload: pdf.js extracts text locally; summary built fully in browser.
   Optional OpenAI key polishes the result for higher quality.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Stop words: English + Chinese (CJK functions words + pronouns) ---- */
  const STOP = new Set([
    'the','a','an','and','or','but','if','then','else','of','in','on','at','to','for','from','by','with','as','is','are','was','were','be','been','being','have','has','had','do','does','did','this','that','these','those','it','its','they','them','their','we','us','our','you','your','i','my','me','he','she','him','her','his','hers','not','no','so','very','too','can','will','just','than','which','what','who','whom','when','where','why','how','all','any','some','more','most','other','such','only','same','also','into','over','after','before','about','because','while','here','there','one','two','three','each','every','few','many','much','own','said','say','says','make','makes','made','get','got','take','took','use','used','using','find','found','see','seen','know','known','like','liked','new','old','first','last','long','great','small','large','big','high','low','right','left','up','down','out','off','well','good','bad','best','better','really','actually','above','below','under','through','between','among','against','again','still','now','then','once','ever','never','always','often','sometimes','maybe','perhaps','almost','quite','rather','enough','may','might','must','shall','upon','within','without','across','around','beyond','besides','despite','except','instead','toward','towards',
    // Chinese single-char function words (eliminate as tags/bigrams)
    '的','了','和','是','在','也','都','就','与','或','而','及','以','被','把','使','让','请','更','最','很','太','再','又','已','会','能','应','这','那','它','他','她','你','我','人','有','上','下','来','去','到','时','年','月','日','比','并','要','一','个','些','却','才','就','所','只','则','即','由','至','并','且','并','非','没','着','过','啊','呢','吗','吧','啦','哦','嗯','呀','哇','哈','嘿',
    // Multi-char Chinese function phrases
    '已经','正在','可以','应该','需要','这些','那些','我们','你们','他们','自己','一个','一些','这种','那种','什么','怎么','为何','为什么','这样','那样','因为','所以','但是','不过','然而','虽然','即使','如果','的话','只是','还有','此外','另外','接着','于是','从而','因此','只有','甚至','比如','例如','一般','一样','一直','一定','一起','只能','既然','主要','就是','还是','不是','不会','就是','甚至','不会','属于','以及','来自','成为','成为','进行','具有','通过','使用','因此','对于','关于','之间','进行','这是','这是','更多','没有','不用','不可以','还有','此时','此时','此时','如此','如今','今后','之后','之前','之间','之一','大部分','大多数','一部分','一些人','一定程度','很大程度上','与此','此时','其中','对此','以此','以此为','也就是说'
  ]);

  let currentFile = null;
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');

  document.getElementById('options').innerHTML = `
    <div class="grid grid-2">
      <div class="field">
        <label>Summary length</label>
        <select id="len">
          <option value="short">Short (4-5 key points + TL;DR)</option>
          <option value="medium" selected>Medium (5-7 key points + TL;DR)</option>
          <option value="long">Long (8-10 key points + sections)</option>
          <option value="bullets">Bullet points (6 key points)</option>
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
      // PDF.js often inserts single ASCII spaces between adjacent characters during layout:
      //   "提 前" / "前 1" / "1 周" etc. Collapse ALL whitespace between CJK and digit sequences.
      let cleaned = fullText;
      // Run CJK/digit space-collapse repeatedly until stable.
      for (let pass = 0; pass < 8; pass++) {
        const before = cleaned;
        cleaned = cleaned
          .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')  // CJK + space + CJK
          .replace(/([\u4e00-\u9fff])\s+(\d)/g, '$1$2')                // CJK + space + digit
          .replace(/(\d)\s+([\u4e00-\u9fff])/g, '$1$2');               // digit + space + CJK
        if (cleaned === before) break;
      }
      cleaned = cleaned
        .replace(/\b([A-Z])\s+(?=[A-Z]\b)/g, '$1')                    // collapse "D E E P" → "DEEP"
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (!cleaned || cleaned.length < 80) {
        window.showResult('#result', `
          <h4 style="color:var(--warning)">⚠️ Not enough text found</h4>
          <p class="soft">This PDF seems empty or scanned. Try our <a href="ocr.html">OCR tool</a> first to extract text, then come back.</p>
        `);
        return;
      }

      const len = document.getElementById('len').value;
      const focus = document.getElementById('focus').value;
      let structured = buildExtractiveSummary(cleaned, len, focus);
      window.setProgress('#progress', 80, 'Generating summary…');

      const apiKey = document.getElementById('apiKey').value.trim();
      if (apiKey) {
        try {
          // Send current structured result + raw text for LLM to polish into structured form
          const flat = structuredToPlainText(structured);
          const refined = await llmPolish(flat, cleaned, len, focus, apiKey);
          if (refined) structured = refined;
          window.setProgress('#progress', 100, 'Done (AI-enhanced)');
        } catch (e) {
          console.warn('LLM polish failed, using local summary', e);
          window.setProgress('#progress', 100, 'Done (local fallback)');
        }
      } else {
        window.setProgress('#progress', 100, 'Done');
      }

      const wordCount = cleaned.length; // CJK-aware char count
      const wordCountDisplay = cleaned.split(/\s+/).filter(Boolean).length;
      window.showResult('#result', `
        <h4>✅ Summary ready</h4>
        <div class="result-meta">${wordCountDisplay.toLocaleString()} words · ${doc.numPages} page(s) → ${wordCountDisplay > 0 ? Math.round((wordCount * 0.1) / Math.max(wordCountDisplay, 1) * 100) : 0}% length</div>
        ${buildSummaryHTML(structured, len)}
        <div class="actions" style="margin-top:16px;">
          <button class="btn btn-primary" id="dlBtn">⬇ Download .txt</button>
          <button class="btn btn-ghost" id="dlMdBtn">⬇ Markdown</button>
          <button class="btn btn-ghost" id="cpBtn">📋 Copy</button>
        </div>
      `);
      const plain = structuredToPlainText(structured);
      const markdown = structuredToMarkdown(structured);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(new Blob([plain], { type: 'text/plain' }), currentFile.name.replace(/\.pdf$/i, '') + '_summary.txt', 'text/plain');
      });
      document.getElementById('dlMdBtn').addEventListener('click', () => {
        window.downloadBlob(new Blob([markdown], { type: 'text/markdown' }), currentFile.name.replace(/\.pdf$/i, '') + '_summary.md', 'text/markdown');
      });
      document.getElementById('cpBtn').addEventListener('click', async () => {
        await navigator.clipboard.writeText(plain);
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

  /* ===================================================================
     TOKENIZATION
     =================================================================== */
  function tokenize(s) {
    const out = [];
    // English words (lowercase)
    const en = s.toLowerCase().match(/[a-z][a-z0-9'-]+/g) || [];
    en.forEach(w => { if (w.length >= 2 && !STOP.has(w)) out.push(w); });
    // CJK characters individually
    const cjkChars = s.match(/[\u4e00-\u9fff]/g) || [];
    cjkChars.forEach(c => { if (!STOP.has(c)) out.push(c); });
    // CJK bigrams (helps capture phrases)
    const cjkStr = cjkChars.join('');
    for (let i = 0; i < cjkStr.length - 1; i++) {
      const bg = cjkStr.substr(i, 2);
      if (!STOP.has(bg)) out.push(bg);
    }
    return out;
  }

  /* ===================================================================
     SPLIT SENTENCES (handles CJK + English punctuation)
     =================================================================== */
  function splitSentences(text) {
    // Normalize whitespace inside text first
    let t = text.replace(/\s+/g, ' ').trim();
    // Split on FULL-WIDTH CJK terminators ALWAYS (these are unambiguous)
    // Also split on English .!? when followed by whitespace/quote/EOF
    const parts = [];
    let buf = '';
    for (let i = 0; i < t.length; i++) {
      buf += t[i];
      const c = t[i];
      const next = t[i + 1];
      let split = false;
      if (c === '。' || c === '！' || c === '？' || c === ';' || c === '；') {
        split = true; // CJK terminator always splits
      } else if ((c === '.' || c === '!' || c === '?') && (!next || /[\s"'`)\]]/.test(next) || /[一-鿿]/.test(next))) {
        split = true; // English terminator followed by whitespace or CJK char
      } else if (c === '\n' && next === '\n') {
        split = true; // paragraph break
      } else if (c === '）' && next === undefined) {
        split = true;
      }
      if (split) {
        const sentence = buf.replace(/\s+/g, ' ').trim();
        if (sentence.length >= 8) parts.push(sentence);
        buf = '';
      }
    }
    if (buf.trim().length >= 8) {
      const sentence = buf.replace(/\s+/g, ' ').trim();
      if (sentence.length >= 8) parts.push(sentence);
    }

    // For very long paragraphs (>250 chars) with no terminators, try splitting
    // on list-style markers like `提前X周` or `(X)` to break jams.
    const refined = [];
    for (const s of parts) {
      if (s.length <= 250) { refined.push(s); continue; }
      // Try splitting on （X） patterns
      const subParts = s.split(/(?=[（(]\s*[一二三四五六七八九十0-9]+\s*[)）])/);
      for (const sp of subParts) {
        const trimmed = sp.trim();
        if (trimmed.length >= 12) refined.push(trimmed);
      }
    }
    return refined.length ? refined : parts;
  }

  function splitParagraphs(text) {
    return text.split(/\n\s*\n+/).map(p => p.trim()).filter(p => p.length >= 25);
  }

  function getParaTitle(p, idx) {
    // Chinese chapter/section style: 一、 / （一） / 第X章
    let m = p.match(/^[ \t　]*第?\s*[一二三四五六七八九十百千0-9]+\s*[、章.]\s*([^。\n]{3,30}?)[。\n，,]?(?=\s|$)/);
    if (m) return stripHeadingGarbage(m[1].trim()).slice(0, 22);
    m = p.match(/^[ \t　]*[（(]\s*[一二三四五六七八九十0-9]+\s*[)）]\s*([^。\n]{3,30})/);
    if (m) return stripHeadingGarbage(m[1].trim()).slice(0, 22);
    m = p.match(/^[ \t　]*[一二三四五六七八九十]+\s*[、.]\s*([^。\n]{3,30})/);
    if (m) return stripHeadingGarbage(m[1].trim()).slice(0, 22);
    // Otherwise use first words of paragraph (max 18 chars)
    const first = p.replace(/^[ \t　]+/, '').split(/[。！？!?]/)[0];
    let trimmed = first.replace(/\s+/g, ' ').trim()
      .replace(/[\s\d.,、:：()（）]+$/, '')            // strip trailing punctuation/numbers
      .replace(/\s+(Step|Phase|Part|Chapter|Section|第[\u4e00-\u9fff]+[章节]?|部分)\s*\d*\s*$/i, '');
    if (trimmed.length > 22) trimmed = trimmed.slice(0, 20) + '…';
    return trimmed || ('Section ' + (idx + 1));
  }

  function stripHeadingGarbage(s) {
    // Strip trailing connector words like 核心逻辑 / 内容 / 概述
    s = s.replace(/\s*(核心逻辑|核心|概述|内容|详解|详情|方法|技巧)$/, '').trim();
    // Strip trailing numbers and bullet markers
    s = s.replace(/[\s\d.,、:：()（）]+$/, '').trim();
    return s;
  }

  /* ===================================================================
     CORE: Extractive summary with TF-IDF + MMR diversity
     Returns: { tldr, keyPoints, sections, tags, stats }
     =================================================================== */
  function buildExtractiveSummary(text, len, focus) {
    const paragraphs = splitParagraphs(text);
    const N = paragraphs.length;
    if (N === 0) {
      return { tldr: text.slice(0, 200), keyPoints: [], sections: [], tags: [], stats: {} };
    }

    // Flatten sentences with their paragraph index
    const sentences = [];
    const sentParaIdx = [];
    paragraphs.forEach((p, pi) => {
      const sents = splitSentences(p);
      sents.forEach(s => {
        const t = s.trim();
        if (t.length >= 15) {
          sentences.push(t);
          sentParaIdx.push(pi);
        }
      });
    });

    if (sentences.length <= 1) {
      return {
        tldr: sentences[0] || text.slice(0, 200),
        keyPoints: [],
        sections: paragraphs.slice(0, 3).map((p, i) => ({ title: getParaTitle(p, i), text: p.slice(0, 120) })),
        tags: [],
        stats: { sentences: sentences.length }
      };
    }

    // Compute TF per sentence and DF across paragraphs
    const docFreq = {};
    const sentTokens = sentences.map(s => {
      const tokens = tokenize(s);
      const tf = {};
      tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      tokens.forEach(t => { docFreq[t] = (docFreq[t] || 0) + 1; });
      return { tokens, tf };
    });

    // Score sentences (TF-IDF normalized by sqrt(len))
    const HEADING_RE = /^\s*(?:[（(]\s*[一二三四五六七八九十0-9]+\s*[)）]|[一二三四五六七八九十0-9]+\s*[、章.]|第\s*[一二三四五六七八九十0-9]+\s*[、章节]|Step\s*\d+|Chapter\s+\d+)/;
    const scored = sentences.map((s, i) => {
      const { tokens, tf } = sentTokens[i];
      const paraIdx = sentParaIdx[i];
      const isParaFirst = i === 0 || sentParaIdx[i - 1] !== paraIdx;
      const isParaLast = i === sentences.length - 1 || sentParaIdx[i + 1] !== paraIdx;

      let score = 0;
      if (tokens.length > 0) {
        for (const t of Object.keys(tf)) {
          const idf = Math.log(1 + N / (docFreq[t] || 1));
          score += tf[t] * idf;
        }
        score = score / Math.sqrt(tokens.length); // length normalize
      }
      if (score === 0) score = 0.001;

      // Position boosts
      if (isParaFirst) score += 0.35;
      if (isParaLast) score += 0.12;
      if (paraIdx === 0) score += 0.30;            // intro paragraph
      if (paraIdx === N - 1) score += 0.18;        // conclusion paragraph
      if (sentParaIdx[0] === paraIdx && i === 0) score += 0.20; // absolute first sentence

      // Length sweet-spot: 50-160 chars is best for summaries
      const L = s.length;
      if (L < 30) score *= 0.5;
      else if (L > 220) score *= 0.55;
      else if (L > 160) score *= 0.85;
      else if (L >= 50 && L <= 140) score *= 1.2;

      // Penalize headings / enumerations (not great as sentence-level key points)
      if (HEADING_RE.test(s)) score *= 0.55;
      if (/^\s*[一二三四五六七八九十0-9]+[、.)]\s*/.test(s) && L < 80) score *= 0.7;
      if (/^[\s\d.,、:：()（）一二三四五六七八九十]+$/.test(s)) score = 0;

      // Penalize commas-stuffed sentences (looks like a list)
      const commaCount = (s.match(/[，,,]/g) || []).length;
      if (commaCount >= 4) score *= 0.78;

      // Focus bias
      if (focus === 'action' && /(?:应该|必须|需要|接下来|下一步|行动|建议|务必|must|should|need|will\s+(?:not\s+)?(?:be|do|have)|todo|action item)/i.test(s)) {
        score += 0.6;
      }
      if (focus === 'keypoints' && /(?:核心|关键|要点|重要|主要|本质|actually|importantly|essentially|key\s+point|crucial|major)/i.test(s)) {
        score += 0.55;
      }

      return { i, s, score, tokens, tf, paraIdx, isParaFirst, isParaLast };
    });

    // Sort by score desc
    scored.sort((a, b) => b.score - a.score);

    // 1. TL;DR — find best sentence that is narrative + medium-length (40-140 chars sweet spot)
    let tldr = null;
    let bestTLDRScore = -Infinity;
    const TOP_THRESHOLD = scored[0].score * 0.5;
    for (const c of scored) {
      if (c.score < TOP_THRESHOLD) break;
      const L = c.s.length;
      const lengthFit = L >= 40 && L <= 130 ? 1.0 : (L <= 180 ? 0.6 : 0.2);
      const headingPenalty = HEADING_RE.test(c.s) ? 0.4 : 1;
      const enumPenalty = /^\s*[一二三四五六七八九十0-9]+[、.)]\s*/.test(c.s) ? 0.5 : 1;
      // Detect list-density: count repeated temporal/action patterns that suggest a procedural list
      const listMarkers = (c.s.match(/(?:提前\d|Step\s*\d|第\s*[一二三四五六七八九十0-9]+\s*[章节]|阶段\s*\d|Part\s*\d|Phase\s*\d|\d+周|\d+天)/g) || []).length;
      const listDensityPenalty = listMarkers >= 3 ? 0.35 : (listMarkers >= 2 ? 0.7 : 1);
      // Bonus for first sentence of intro paragraph that is plain narrative
      const introBonus = (c.paraIdx === 0 && c.isParaFirst && isNarrativeIntro(c)) ? 1.4 : 1.0;
      const scoreBoost = c.score * lengthFit * headingPenalty * enumPenalty * listDensityPenalty * introBonus;
      if (scoreBoost > bestTLDRScore) {
        bestTLDRScore = scoreBoost;
        tldr = c;
      }
    }
    if (!tldr) tldr = scored[0];
    function isNarrativeIntro(c) {
      // Plain text intro - not a numbered list or heading line
      return !/^[\s\d.,、:：()（）一二三四五六七八九十]/.test(c.s) && c.tokens.length >= 6 && (c.s.match(/[。！？!?]/) || c.s.length >= 40);
    }

    // 2. KEY POINTS — MMR diversity (avoid redundant or same paragraph)
    const kpCount = { short: 4, medium: 6, long: 8, bullets: 6 }[len] || 6;
    const lambda = 0.7;
    const picked = [tldr];
    const pickedSet = new Set([tldr.i]);
    const usedPara = new Set([tldr.paraIdx]);

    let safety = 0;
    while (picked.length < kpCount + 1 && picked.length < scored.length && safety++ < 200) {
      let best = null;
      let bestScore = -Infinity;
      for (const c of scored) {
        if (pickedSet.has(c.i)) continue;
        // Diversity penalty: Jaccard against already-picked
        let maxSim = 0;
        for (const p of picked) {
          const setA = new Set(c.tokens);
          const setB = new Set(p.tokens);
          let inter = 0;
          for (const t of setA) if (setB.has(t)) inter++;
          const union = setA.size + setB.size - inter;
          const sim = union > 0 ? inter / union : 0;
          if (sim > maxSim) maxSim = sim;
        }
        const paraPenalty = usedPara.has(c.paraIdx) ? 0.4 : 0;
        const final = lambda * c.score - (1 - lambda) * maxSim * 2.5 - paraPenalty;
        if (final > bestScore) {
          bestScore = final;
          best = c;
        }
      }
      if (!best) break;
      picked.push(best);
      pickedSet.add(best.i);
      usedPara.add(best.paraIdx);
    }

    // 3. SECTIONS — best sentence per paragraph for first few paragraphs
    const sections = [];
    const seenParaInSections = new Set();
    const maxSections = len === 'long' ? 5 : 3;
    for (const c of scored) {
      if (sections.length >= maxSections) break;
      if (seenParaInSections.has(c.paraIdx)) continue;
      if (pickedSet.has(c.i)) continue;
      const titleSrc = paragraphs[c.paraIdx];
      sections.push({
        title: getParaTitle(titleSrc, c.paraIdx),
        text: trimSentence(c.s, 180),
        paraIdx: c.paraIdx
      });
      seenParaInSections.add(c.paraIdx);
    }

    // 4. TAGS — top TF-IDF keywords; filter to non-stop, length>=2, not in tags already
    const tagScore = {};
    scored.forEach(c => {
      if (!pickedSet.has(c.i)) return; // only count picked sentences' terms
      Object.entries(c.tf).forEach(([t, count]) => {
        if (t.length < 2) return;
        // Skip pure-number or pure-punctuation
        if (/^[\d.,、:：()（）\-_/]+$/.test(t)) return;
        const idf = Math.log(1 + N / (docFreq[t] || 1));
        if (idf < 0.15) return; // skip very common terms
        if (count < 1) return;
        tagScore[t] = (tagScore[t] || 0) + count * idf * c.score;
      });
    });
    // Prefer terms that contain at least one CJK character or are reasonable English words (>=3 chars)
    const tags = Object.entries(tagScore)
      .filter(([t]) => {
        const hasCjk = /[\u4e00-\u9fff]/.test(t);
        const isEnglish = /^[a-z'-]+$/.test(t);
        if (hasCjk && t.length >= 2) return true;
        if (isEnglish && t.length >= 4) return true;
        return false;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([t]) => t);

    return {
      tldr: trimSentence(tldr.s, 150),
      keyPoints: picked.slice(1).map(p => trimSentence(p.s, 100)),
      sections: sections,
      tags: tags,
      stats: {
        sentences: sentences.length,
        paragraphs: N,
        compression: Math.round((1 - picked.length / Math.max(sentences.length, 1)) * 100)
      }
    };
  }

  function trimSentence(s, max) {
    if (s.length <= max) return s;
    // Trim to last sentence boundary before max
    const trunc = s.slice(0, max);
    const lastStop = Math.max(
      trunc.lastIndexOf('。'), trunc.lastIndexOf('.'),
      trunc.lastIndexOf('!'), trunc.lastIndexOf('?'),
      trunc.lastIndexOf('！'), trunc.lastIndexOf('？')
    );
    if (lastStop > 40) return trunc.slice(0, lastStop + 1);
    return trunc.replace(/[,，:：;\s]+$/, '') + '…';
  }

  /* ===================================================================
     LLM POLISH (optional OpenAI key)
     =================================================================== */
  async function llmPolish(flatText, fullText, len, focus, apiKey) {
    const maxInput = 6000;
    const truncated = fullText.length > maxInput ? fullText.slice(0, maxInput) + '…' : fullText;
    const formatHint = {
      short: 'TL;DR (1 sentence) + 4 bullet key points',
      medium: 'TL;DR (1-2 sentences) + 5-6 bullet key points + 2-3 short section summaries',
      long: 'TL;DR + 7-10 bullets + up to 5 short section summaries',
      bullets: 'TL;DR + 6-8 bullet points'
    }[len] || 'TL;DR + 5 key points';

    const prompt = `You are a concise document summarizer. Output ONLY valid JSON in this exact schema (no prose before/after, no markdown fences):
{
  "tldr": "one or two sentence essence of the document",
  "keyPoints": ["bullet 1", "bullet 2", ...],
  "sections": [{"title": "section name", "text": "one-line summary"}, ...]
}

Requirements:
- Maximum compression: ${formatHint}.
- Focus: ${focus} — prioritize ${focus === 'action' ? 'actionable items, recommendations, next steps' : focus === 'keypoints' ? 'key facts, conclusions, takeaways' : 'the document\'s main ideas'}.
- Each key point must be self-contained and information-dense; rewrite long sentences into tight phrases (under 22 words each).
- Avoid filler: "this article", "as mentioned", "in conclusion".
- Use the same language as the document (Chinese→Chinese, English→English).
- Keep tldr under 220 characters, key points under 180 characters each, section text under 120 characters.

Document:
${truncated}

Local draft (improve accuracy and conciseness, don't just copy):
${flatText}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });
    if (!res.ok) throw new Error('API ' + res.status);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    try {
      const parsed = JSON.parse(content);
      return sanitizeStructured(parsed, len);
    } catch (e) {
      console.warn('Failed to parse LLM JSON', e);
      return null;
    }
  }

  function sanitizeStructured(obj, len) {
    if (!obj || typeof obj !== 'object') return null;
    const tldr = typeof obj.tldr === 'string' ? trimSentence(obj.tldr.trim(), 220) : '';
    const keyPoints = Array.isArray(obj.keyPoints)
      ? obj.keyPoints.filter(x => typeof x === 'string' && x.trim().length > 5)
        .map(x => trimSentence(x.trim(), 200))
      : [];
    const sections = Array.isArray(obj.sections)
      ? obj.sections
        .filter(s => s && typeof s === 'object' && typeof s.title === 'string' && typeof s.text === 'string')
        .slice(0, 5)
        .map(s => ({ title: s.title.trim().slice(0, 30), text: trimSentence(s.text.trim(), 140) }))
      : [];
    if (!tldr && !keyPoints.length && !sections.length) return null;
    return { tldr: tldr || '(no summary)', keyPoints, sections, tags: [], stats: {} };
  }

  /* ===================================================================
     RENDERING — build structured HTML for the result panel
     =================================================================== */
  function buildSummaryHTML(s, len) {
    const tldrHtml = s.tldr
      ? `<div class="summary-tldr">
           <div class="summary-tldr-label">💡 TL;DR</div>
           <div class="summary-tldr-text">${escapeHtml(s.tldr)}</div>
         </div>`
      : '';

    const points = s.keyPoints || [];
    const pointsHtml = points.length
      ? `<div class="summary-section">
           <div class="summary-section-head">
             <span class="summary-section-icon">🔑</span>
             <span class="summary-section-title">Key points</span>
             <span class="summary-section-count">${points.length}</span>
           </div>
           <ul class="summary-points">
             ${points.map((p, i) => `<li><span class="summary-bullet-num">${i + 1}</span><span>${escapeHtml(p)}</span></li>`).join('')}
           </ul>
         </div>`
      : '';

    const sections = s.sections || [];
    const sectionsHtml = sections.length
      ? `<div class="summary-section">
           <div class="summary-section-head">
             <span class="summary-section-icon">📑</span>
             <span class="summary-section-title">Section-by-section</span>
             <span class="summary-section-count">${sections.length}</span>
           </div>
           <div class="summary-sections">
             ${sections.map(sec => `
               <div class="summary-subsection">
                 <div class="summary-subsection-title">${escapeHtml(sec.title)}</div>
                 <div class="summary-subsection-text">${escapeHtml(sec.text)}</div>
               </div>
             `).join('')}
           </div>
         </div>`
      : '';

    const tags = (s.tags || []).filter(t => t && t.length >= 2);
    const tagsHtml = tags.length
      ? `<div class="summary-tags-row">
           <span class="summary-tags-label">🏷️ Topics</span>
           <div class="summary-tags">
             ${tags.map(t => `<span class="summary-tag">${escapeHtml(t)}</span>`).join('')}
           </div>
         </div>`
      : '';

    const statsHtml = s.stats ? `
      <div class="summary-stats">
        <div class="summary-stat"><span class="summary-stat-num">${s.stats.sentences || '—'}</span><span class="summary-stat-lbl">sentences analyzed</span></div>
        <div class="summary-stat"><span class="summary-stat-num">${s.stats.paragraphs || '—'}</span><span class="summary-stat-lbl">paragraphs</span></div>
        <div class="summary-stat"><span class="summary-stat-num">${(s.stats.compression || 0)}%</span><span class="summary-stat-lbl">compression</span></div>
      </div>` : '';

    return `
      ${tldrHtml}
      ${statsHtml}
      ${pointsHtml}
      ${sectionsHtml}
      ${tagsHtml}
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function structuredToPlainText(s) {
    const lines = [];
    if (s.tldr) {
      lines.push('TL;DR');
      lines.push(s.tldr);
      lines.push('');
    }
    if (s.keyPoints && s.keyPoints.length) {
      lines.push('KEY POINTS');
      s.keyPoints.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
      lines.push('');
    }
    if (s.sections && s.sections.length) {
      lines.push('SECTION BREAKDOWN');
      s.sections.forEach(sec => {
        lines.push(`▸ ${sec.title}`);
        lines.push(`  ${sec.text}`);
      });
      lines.push('');
    }
    if (s.tags && s.tags.length) {
      lines.push('TOPICS');
      lines.push(s.tags.join(' · '));
    }
    return lines.join('\n').trim() + '\n';
  }

  function structuredToMarkdown(s) {
    const lines = [];
    if (s.tldr) {
      lines.push(`> **TL;DR** — ${s.tldr}`, '');
    }
    if (s.keyPoints && s.keyPoints.length) {
      lines.push('## 🔑 Key Points', '');
      s.keyPoints.forEach(p => lines.push(`- ${p}`));
      lines.push('');
    }
    if (s.sections && s.sections.length) {
      lines.push('## 📑 Section Breakdown', '');
      s.sections.forEach(sec => {
        lines.push(`### ${sec.title}`);
        lines.push(sec.text, '');
      });
    }
    if (s.tags && s.tags.length) {
      lines.push('---', '');
      lines.push('**Topics:** ' + s.tags.map(t => `\`${t}\``).join(' · '));
    }
    return lines.join('\n').trim() + '\n';
  }
})();
