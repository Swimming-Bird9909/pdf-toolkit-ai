(function () {
  'use strict';

  const byId = id => document.getElementById(id);
  const dropzone = byId('dz');
  const input = dropzone.querySelector('input[type="file"]');
  const form = byId('options');
  const mode = byId('mode');
  const list = byId('fileList');
  const run = byId('btnRun');
  const reset = byId('btnReset');
  const progress = byId('progress');
  const result = byId('result');
  const runLabel = run.textContent;
  const resetLabel = reset.textContent;
  const fields = { ranges: 'rangesField', everyN: 'everyNField', single: 'singleField' };
  let file;
  let worker;
  let busy = false;

  function updateMode() {
    for (const [value, id] of Object.entries(fields)) {
      byId(id).style.display = mode.value === value ? '' : 'none';
    }
  }

  function stopWorker() {
    worker?.terminate();
    worker = undefined;
  }

  function renderProgress(percent, label) {
    progress.classList.add('active');
    progress.querySelector('.txt').textContent = label;
    progress.querySelector('.pct').textContent = Math.round(percent) + '%';
    progress.querySelector('.progress-bar').style.width = percent + '%';
  }

  function showResult(title, message) {
    const heading = document.createElement('h4');
    const detail = document.createElement('div');
    detail.className = 'result-meta';
    heading.textContent = title;
    detail.textContent = message;
    result.replaceChildren(heading, detail);
    result.classList.add('active');
  }

  function setBusy(value) {
    busy = value;
    input.disabled = value;
    form.inert = value;
    run.disabled = value || !file;
    run.textContent = value ? 'Splitting…' : runLabel;
    reset.textContent = value ? 'Cancel' : resetLabel;
  }

  function fail(message) {
    stopWorker();
    progress.classList.remove('active');
    showResult('Split failed', message);
    setBusy(false);
  }

  function prepareWorker() {
    if (worker) return;
    const next = new Worker('/js/pdf-split/worker-v1.js');
    worker = next;
    next.onerror = () => {
      if (worker !== next) return;
      if (busy) fail('The split engine could not start. Please try again.');
      else stopWorker();
    };
  }

  function selectFile(next) {
    if (!next || busy) return;
    input.value = '';
    result.classList.remove('active');
    progress.classList.remove('active');
    if (!/\.pdf$/i.test(next.name) && next.type !== 'application/pdf') {
      file = undefined;
      list.textContent = 'Please choose a PDF file.';
      setBusy(false);
      return;
    }
    file = next;
    list.textContent = `Selected: ${file.name}`;
    setBusy(false);
    try { prepareWorker(); } catch (_) { /* 点击拆分时反馈启动失败 */ }
  }

  mode.addEventListener('change', updateMode);
  input.addEventListener('change', () => selectFile(input.files[0]));
  for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
    dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.toggle('dragover', !busy && (type === 'dragenter' || type === 'dragover'));
      if (type === 'drop') selectFile(event.dataTransfer?.files[0]);
    });
  }
  updateMode();
  selectFile(input.files?.[0]);

  reset.addEventListener('click', () => {
    stopWorker();
    file = undefined;
    input.value = '';
    list.textContent = '';
    mode.value = mode.querySelector('option').value;
    for (const id of ['ranges', 'everyN', 'singlePage', 'outName']) {
      const field = byId(id);
      field.value = field.defaultValue;
    }
    updateMode();
    result.classList.remove('active');
    progress.classList.remove('active');
    setBusy(false);
  });

  run.addEventListener('click', () => {
    if (!file || busy) return;
    const settings = {
      mode: mode.value,
      ranges: byId('ranges').value,
      everyN: byId('everyN').value,
      singlePage: byId('singlePage').value,
      prefix: byId('outName').value || 'split'
    };
    setBusy(true);
    result.classList.remove('active');
    result.replaceChildren();
    renderProgress(0, 'Starting split…');
    try {
      prepareWorker();
      const activeWorker = worker;
      activeWorker.onmessage = ({ data }) => {
        if (worker !== activeWorker) return;
        if (data.error) {
          fail(data.error);
          return;
        }
        if (!data.bytes) {
          renderProgress(data.progress, data.label);
          return;
        }
        renderProgress(100, 'Done');
        showResult('Split complete', `${data.count} file(s) created from ${data.total} pages`);
        const download = document.createElement('button');
        download.type = 'button';
        download.id = 'dlBtn';
        download.className = 'btn btn-primary';
        download.textContent = '⬇ Download all (ZIP)';
        download.addEventListener('click', () => {
          const href = URL.createObjectURL(new Blob([data.bytes], { type: 'application/zip' }));
          const link = document.createElement('a');
          link.href = href;
          link.download = settings.prefix + '.zip';
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(href), 1500);
        });
        result.appendChild(download);
        stopWorker();
        setBusy(false);
      };
      activeWorker.postMessage({ file, settings });
    } catch (error) {
      fail(error.message);
    }
  });
})();
