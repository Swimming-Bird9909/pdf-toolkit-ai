/* ==========================================================================
   invoice-pdf.js — Generate PDF invoice from form data using pdf-lib
   ========================================================================== */
(function () {
  'use strict';

  const form = document.getElementById('invoiceForm');
  const btnReset = document.getElementById('btnReset');
  const itemsBody = document.getElementById('itemsBody');
  const addItem = document.getElementById('addItem');
  const subTotalEl = document.getElementById('subTotal');
  const discountAmtEl = document.getElementById('discountAmt');
  const taxAmtEl = document.getElementById('taxAmt');
  const grandTotalEl = document.getElementById('grandTotal');

  // Currencies
  const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CNY: '¥', JPY: '¥' };

  function getCurrency() {
    const sel = form.currency.value;
    const code = sel.split(' ')[0];
    return { code, symbol: CURRENCY_SYMBOLS[code] || '$' };
  }

  function recalc() {
    const lines = itemsBody.querySelectorAll('tr');
    let sub = 0;
    lines.forEach(tr => {
      const qty = parseFloat(tr.querySelector('input[name="qty[]"]').value) || 0;
      const price = parseFloat(tr.querySelector('input[name="price[]"]').value) || 0;
      const amt = qty * price;
      tr.querySelector('.lineAmount').textContent = amt.toFixed(2);
      sub += amt;
    });
    const disc = parseFloat(form.discount.value) || 0;
    const taxRate = parseFloat(form.taxRate.value) || 0;
    const tax = (sub - disc) * (taxRate / 100);
    const total = sub - disc + tax;
    subTotalEl.textContent = sub.toFixed(2);
    discountAmtEl.textContent = (disc > 0 ? '-' : '') + disc.toFixed(2);
    taxAmtEl.textContent = tax.toFixed(2);
    grandTotalEl.textContent = total.toFixed(2);
  }

  itemsBody.addEventListener('input', recalc);
  form.addEventListener('input', recalc);

  itemsBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-row-del')) {
      const tr = e.target.closest('tr');
      if (itemsBody.querySelectorAll('tr').length > 1) tr.remove();
      recalc();
    }
  });

  addItem.addEventListener('click', () => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="text" name="desc[]" placeholder="Service or product" required style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);" /></td>
<td><input type="number" name="qty[]" min="0" step="0.01" value="1" required style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);text-align:right;" /></td>
<td><input type="number" name="price[]" min="0" step="0.01" value="0" required style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--text);text-align:right;" /></td>
<td class="lineAmount" style="text-align:right;padding:8px;font-weight:600;">0.00</td>
<td><button type="button" class="btn-row-del" style="background:transparent;border:none;color:var(--danger);cursor:pointer;font-size:18px;">×</button></td>`;
    itemsBody.appendChild(tr);
    recalc();
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
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
      const { symbol } = getCurrency();
      const money = (n) => symbol + n.toFixed(2);

      const x = 50;
      let y = 800;
      const drawText = (text, opts = {}) => {
        const { size = 11, bold = false, color = rgb(0.06, 0.09, 0.16), x: tx = x, y: ty = y } = opts;
        page.drawText(text, { x: tx, y: ty, size, font: bold ? fontBold : font, color });
      };

      // Title
      drawText('INVOICE', { size: 28, bold: true, color: rgb(0.39, 0.4, 0.95), y: y - 10 });
      y -= 50;

      // Invoice meta (right side)
      const metaX = 400;
      drawText('Invoice #: ' + (form.invoiceNo.value || ''), { x: metaX, y: y + 30, bold: true, size: 10 });
      drawText('Date: ' + (form.date.value || ''), { x: metaX, y: y + 15, size: 10 });
      if (form.dueDate.value) drawText('Due: ' + form.dueDate.value, { x: metaX, y: y, size: 10 });

      // From
      drawText('From:', { bold: true, size: 11, y: y - 10 });
      drawText(form.fromName.value, { y: y - 25, bold: true, size: 10 });
      if (form.fromEmail.value) drawText(form.fromEmail.value, { y: y - 40, size: 9, color: rgb(0.4, 0.4, 0.5) });
      if (form.fromAddress.value) {
        const addrLines = form.fromAddress.value.split('\n');
        addrLines.forEach((line, i) => drawText(line, { y: y - 55 - i * 12, size: 9, color: rgb(0.4, 0.4, 0.5) }));
      }

      // To
      let toY = y - 90;
      drawText('Bill To:', { bold: true, size: 11, y: toY });
      drawText(form.toName.value, { y: toY - 15, bold: true, size: 10 });
      if (form.toEmail.value) drawText(form.toEmail.value, { y: toY - 30, size: 9, color: rgb(0.4, 0.4, 0.5) });
      if (form.toAddress.value) {
        const addrLines = form.toAddress.value.split('\n');
        addrLines.forEach((line, i) => drawText(line, { y: toY - 45 - i * 12, size: 9, color: rgb(0.4, 0.4, 0.5) }));
      }

      y = toY - 90;

      // Items table
      const tableX = 50;
      const descW = 280, qtyW = 60, priceW = 80, amountW = 80;
      const colQty = tableX + descW;
      const colPrice = colQty + qtyW;
      const colAmount = colPrice + priceW;

      // Header bg
      page.drawRectangle({ x: tableX - 4, y: y - 4, width: 500, height: 22, color: rgb(0.94, 0.95, 0.98) });
      drawText('Description', { x: tableX, y: y + 3, bold: true, size: 10 });
      drawText('Qty', { x: colQty, y: y + 3, bold: true, size: 10 });
      drawText('Unit price', { x: colPrice, y: y + 3, bold: true, size: 10 });
      drawText('Amount', { x: colAmount, y: y + 3, bold: true, size: 10 });
      y -= 22;

      const descs = form.querySelectorAll('input[name="desc[]"]');
      const qtys = form.querySelectorAll('input[name="qty[]"]');
      const prices = form.querySelectorAll('input[name="price[]"]');
      let sub = 0;
      for (let i = 0; i < descs.length; i++) {
        const desc = descs[i].value || '';
        const qty = parseFloat(qtys[i].value) || 0;
        const price = parseFloat(prices[i].value) || 0;
        const amt = qty * price;
        sub += amt;
        // Truncate long descriptions
        const descText = desc.length > 50 ? desc.slice(0, 47) + '...' : desc;
        drawText(descText, { x: tableX, y: y, size: 9 });
        drawText(qty.toString(), { x: colQty, y: y, size: 9 });
        drawText(money(price), { x: colPrice, y: y, size: 9 });
        drawText(money(amt), { x: colAmount, y: y, size: 9, bold: true });
        y -= 18;
        // Light separator
        page.drawLine({ start: { x: tableX, y: y + 8 }, end: { x: tableX + 492, y: y + 8 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.92) });
      }

      y -= 10;
      const disc = parseFloat(form.discount.value) || 0;
      const taxRate = parseFloat(form.taxRate.value) || 0;
      const tax = (sub - disc) * (taxRate / 100);
      const total = sub - disc + tax;

      // Totals (right-aligned)
      const totalsX = 380;
      drawText('Subtotal:', { x: totalsX, y: y, size: 10, color: rgb(0.4, 0.4, 0.5) });
      drawText(money(sub), { x: colAmount, y: y, size: 10 });
      y -= 16;
      if (disc > 0) {
        drawText('Discount:', { x: totalsX, y: y, size: 10, color: rgb(0.4, 0.4, 0.5) });
        drawText('-' + money(disc), { x: colAmount, y: y, size: 10 });
        y -= 16;
      }
      if (taxRate > 0) {
        drawText('Tax (' + taxRate + '%):', { x: totalsX, y: y, size: 10, color: rgb(0.4, 0.4, 0.5) });
        drawText(money(tax), { x: colAmount, y: y, size: 10 });
        y -= 16;
      }
      // Total bar
      y -= 4;
      page.drawRectangle({ x: totalsX - 4, y: y - 4, width: 116, height: 22, color: rgb(0.39, 0.4, 0.95) });
      drawText('TOTAL:', { x: totalsX, y: y + 3, size: 11, bold: true, color: rgb(1, 1, 1) });
      drawText(money(total), { x: colAmount, y: y + 3, size: 12, bold: true, color: rgb(1, 1, 1) });
      y -= 30;

      // Notes
      if (form.notes.value) {
        y -= 10;
        drawText('Notes:', { y: y, bold: true, size: 10 });
        y -= 14;
        const noteLines = form.notes.value.split('\n');
        for (const line of noteLines) {
          if (y < 60) break;
          const wrapped = line.match(/.{1,90}/g) || [line];
          for (const wl of wrapped) {
            if (y < 60) break;
            drawText(wl, { y: y, size: 9, color: rgb(0.4, 0.4, 0.5) });
            y -= 12;
          }
        }
      }

      // Footer
      drawText('Generated by PDF Toolkit AI · wezzik.com', { x: 50, y: 30, size: 8, color: rgb(0.6, 0.6, 0.7) });

      const bytes = await doc.save();
      window.showResult('#result', `
        <h4>✅ Invoice generated</h4>
        <div class="result-meta">${money(total)} · ${window.fmtSize(bytes.byteLength)}</div>
        <button class="btn btn-primary" id="dlBtn">⬇ Download PDF</button>
      `);
      document.getElementById('dlBtn').addEventListener('click', () => {
        window.downloadBlob(bytes, 'invoice_' + (form.invoiceNo.value || 'new') + '.pdf', 'application/pdf');
      });
    } catch (err) {
      console.error(err);
      window.showResult('#result', `<h4 style="color:var(--danger)">❌ Failed</h4><p class="soft">${err.message || err}</p>`);
    } finally {
      const btnGen = document.getElementById('btnGenerate');
      btnGen.disabled = false;
      btnGen.innerHTML = 'Generate Invoice PDF';
    }
  });

  // Initial calc
  recalc();
})();
