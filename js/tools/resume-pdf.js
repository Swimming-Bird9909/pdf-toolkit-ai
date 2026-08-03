/* ==========================================================================
   resume-pdf.js — Generate ATS-friendly PDF resume from form data
   ========================================================================== */
(function () {
  'use strict';

  const form = document.getElementById('resumeForm');
  const btnReset = document.getElementById('btnReset');
  const expBody = document.getElementById('expBody');
  const eduBody = document.getElementById('eduBody');
  const addExp = document.getElementById('addExp');
  const addEdu = document.getElementById('addEdu');

  function wrapText(text, font, size, maxWidth) {
    const words = text.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const trial = cur ? cur + ' ' + w : w;
      if (font.widthOfTextAtSize(trial, size) > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = trial;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function bulletWrap(text, font, size, maxWidth) {
    // Split by bullet markers or newlines
    const parts = text.split(/[\n•·]+/).map(s => s.trim()).filter(Boolean);
    const allLines = [];
    for (const p of parts) {
      const lines = wrapText(p, font, size, maxWidth);
      for (const l of lines) allLines.push('• ' + l);
    }
    return allLines.length ? allLines : (text ? ['• ' + text] : []);
  }

  addExp.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'exp-entry';
    div.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;';
    div.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <input type="text" name="expTitle[]" placeholder="Job title" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
      <input type="text" name="expCompany[]" placeholder="Company" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
      <input type="text" name="expStart[]" placeholder="Start" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
      <input type="text" name="expEnd[]" placeholder="End" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
    </div>
    <textarea name="expDesc[]" rows="3" placeholder="Key achievements (use bullet points or new lines)" style="width:100%;padding:8px;margin-top:10px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);"></textarea>
    <button type="button" class="btn-row-del" style="background:transparent;border:none;color:var(--danger);cursor:pointer;margin-top:6px;">Remove</button>`;
    expBody.appendChild(div);
  });

  addEdu.addEventListener('click', () => {
    const div = document.createElement('div');
    div.className = 'edu-entry';
    div.style.cssText = 'border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:12px;';
    div.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <input type="text" name="eduDegree[]" placeholder="Degree" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
      <input type="text" name="eduSchool[]" placeholder="School" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
      <input type="text" name="eduStart[]" placeholder="Start year" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
      <input type="text" name="eduEnd[]" placeholder="End year" style="padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" />
    </div>
    <button type="button" class="btn-row-del" style="background:transparent;border:none;color:var(--danger);cursor:pointer;margin-top:6px;">Remove</button>`;
    eduBody.appendChild(div);
  });

  expBody.addEventListener('click', e => {
    if (e.target.classList.contains('btn-row-del')) e.target.closest('.exp-entry').remove();
  });
  eduBody.addEventListener('click', e => {
    if (e.target.classList.contains('btn-row-del')) e.target.closest('.edu-entry').remove();
  });

  btnReset.addEventListener('click', () => location.reload());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnGen = document.getElementById('btnGenerate');
    btnGen.disabled = true;
    btnGen.innerHTML = '<span class="loader"></span> Generating…';
    document.getElementById('result').classList.remove('active');
    try {
      const { PDFDocument, StandardFonts, rgb } = await window.loadPdfLib();
      const doc = await PDFDocument.create();
      const page = doc.addPage([595.28, 841.89]); // A4
      const fontReg = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);
      const ink = rgb(0.06, 0.09, 0.16);
      const soft = rgb(0.4, 0.4, 0.5);
      const brand = rgb(0.39, 0.4, 0.95);
      const margin = 50;
      const maxW = 595.28 - margin * 2;
      let y = 800;

      const ensureSpace = (h) => { if (y - h < 60) { /* single page resume */ } };
      const drawText = (text, opts = {}) => {
        const { size = 10, bold = false, italic = false, color = ink, x: tx = margin, y: ty = y, lineH = size * 1.4 } = opts;
        page.drawText(text, { x: tx, y: ty, size, font: bold ? fontBold : (italic ? fontItalic : fontReg), color });
        y = ty - lineH;
      };
      const sectionHeader = (text) => {
        if (y < 100) return;
        y -= 6;
        page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: margin + maxW, y: y + 6 }, thickness: 1.0, color: ink });
        drawText(text.toUpperCase(), { bold: true, size: 11, color: brand, y: y + 4, lineH: 16 });
        y -= 4;
      };

      // Name
      drawText((form.name.value || 'Your Name').toUpperCase(), { bold: true, size: 22, y, lineH: 26 });
      // Title
      if (form.title.value) {
        drawText(form.title.value, { italic: true, size: 12, color: soft, y, lineH: 16 });
      }
      // Contact line
      const contactBits = [];
      if (form.email.value) contactBits.push(form.email.value);
      if (form.phone.value) contactBits.push(form.phone.value);
      if (form.location.value) contactBits.push(form.location.value);
      if (form.website.value) contactBits.push(form.website.value);
      if (contactBits.length) {
        drawText(contactBits.join('  ·  '), { size: 9, color: soft, y, lineH: 14 });
      }
      y -= 6;

      // Summary
      if (form.summary.value) {
        sectionHeader('Summary');
        const lines = wrapText(form.summary.value, fontReg, 10, maxW);
        for (const l of lines) drawText(l, { size: 10, y, lineH: 13 });
        y -= 4;
      }

      // Experience
      const expTitles = form.querySelectorAll('input[name="expTitle[]"]');
      const expCompanies = form.querySelectorAll('input[name="expCompany[]"]');
      const expStarts = form.querySelectorAll('input[name="expStart[]"]');
      const expEnds = form.querySelectorAll('input[name="expEnd[]"]');
      const expDescs = form.querySelectorAll('textarea[name="expDesc[]"]');
      const hasExp = Array.from(expTitles).some(t => t.value.trim());
      if (hasExp) {
        sectionHeader('Experience');
        for (let i = 0; i < expTitles.length; i++) {
          if (!expTitles[i].value.trim()) continue;
          // Title line: Job Title at Company | Date range
          const dateRange = [expStarts[i].value, expEnds[i].value].filter(Boolean).join(' — ');
          const dateStr = dateRange ? '   |   ' + dateRange : '';
          drawText(expTitles[i].value + (expCompanies[i].value ? ' — ' + expCompanies[i].value : ''), { bold: true, size: 11, y, lineH: 14 });
          // Right-align date on same line
          if (dateStr) {
            const titleW = fontBold.widthOfTextAtSize(expTitles[i].value + (expCompanies[i].value ? ' — ' + expCompanies[i].value : ''), 11);
            page.drawText(dateStr.trim(), { x: margin + titleW + 8, y: y + 1, size: 9, font: fontItalic, color: soft });
          }
          // Bullets
          if (expDescs[i].value) {
            const bullets = bulletWrap(expDescs[i].value, fontReg, 10, maxW - 14);
            for (const b of bullets) drawText(b, { size: 10, y, lineH: 13 });
          }
          y -= 4;
        }
      }

      // Education
      const eduDegrees = form.querySelectorAll('input[name="eduDegree[]"]');
      const eduSchools = form.querySelectorAll('input[name="eduSchool[]"]');
      const eduStarts = form.querySelectorAll('input[name="eduStart[]"]');
      const eduEnds = form.querySelectorAll('input[name="eduEnd[]"]');
      const hasEdu = Array.from(eduDegrees).some(t => t.value.trim());
      if (hasEdu) {
        sectionHeader('Education');
        for (let i = 0; i < eduDegrees.length; i++) {
          if (!eduDegrees[i].value.trim()) continue;
          const dateRange = [eduStarts[i].value, eduEnds[i].value].filter(Boolean).join(' — ');
          drawText(eduDegrees[i].value + (eduSchools[i].value ? ' — ' + eduSchools[i].value : ''), { bold: true, size: 11, y, lineH: 14 });
          if (dateRange) {
            const titleW = fontBold.widthOfTextAtSize(eduDegrees[i].value + (eduSchools[i].value ? ' — ' + eduSchools[i].value : ''), 11);
            page.drawText(dateRange, { x: margin + titleW + 8, y: y + 1, size: 9, font: fontItalic, color: soft });
          }
          y -= 4;
        }
      }

      // Skills
      if (form.skills.value) {
        sectionHeader('Skills');
        const skillsText = form.skills.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean).join('  ·  ');
        const lines = wrapText(skillsText, fontReg, 10, maxW);
        for (const l of lines) drawText(l, { size: 10, y, lineH: 13 });
      }

      // Footer
      page.drawText('Generated by PDF Toolkit AI', { x: margin, y: 30, size: 8, color: rgb(0.7, 0.7, 0.8) });

      const bytes = await doc.save();
      const baseName = (form.name.value || 'resume').toLowerCase().replace(/\s+/g, '_');
      window.showResult('#result', `
        <h4>✅ Resume generated</h4>
        <div class="result-meta">${window.fmtSize(bytes.byteLength)} · ATS-friendly single-column layout</div>
        <button class="btn btn-primary" id="dlBtn">⬇ Download PDF</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(bytes, baseName + '_resume.pdf', 'application/pdf');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      const btnGen = document.getElementById('btnGenerate');
      btnGen.disabled = false;
      btnGen.innerHTML = 'Generate Resume PDF';
    }
  });
})();
