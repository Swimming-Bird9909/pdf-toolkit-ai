(function () {
  'use strict';

  const input = document.querySelector('#dz input[type="file"]');
  const btn = document.getElementById('btnRun');
  const btnReset = document.getElementById('btnReset');
  const outName = document.getElementById('outName');
  const fileList = document.getElementById('fileList');
  const progress = document.getElementById('progress');
  const result = document.getElementById('result');
  const idleLabel = btn.textContent;
  let files = [];
  let worker;
  let busy = false;

  function stopWorker() {
    worker?.terminate();
    worker = undefined;
  }

  function showResult(title, message) {
    const heading = document.createElement('h4');
    heading.textContent = title;
    const detail = document.createElement('div');
    detail.className = 'result-meta';
    detail.textContent = message;
    result.replaceChildren(heading, detail);
    result.classList.add('active');
  }

  function setBusy(value) {
    busy = value;
    input.disabled = value;
    outName.disabled = value;
    btn.disabled = value || files.length === 0;
    btn.textContent = value ? 'Merging…' : idleLabel;
    fileList.inert = value;
  }

  function fail(message) {
    stopWorker();
    progress.classList.remove('active');
    showResult('Merge failed', message);
    setBusy(false);
  }

  function prepareWorker() {
    if (worker) return;
    const next = new Worker('/js/pdf-merge/worker-v1.js');
    worker = next;
    next.onerror = () => {
      if (worker !== next) return;
      if (busy) fail('The merge engine could not start. Please try again.');
      else stopWorker();
    };
  }

  function renderList() {
    fileList.replaceChildren();
    files.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      row.draggable = true;
      row.innerHTML = '<span style="cursor:grab;">⠿</span><span class="name"></span><span class="size"></span><button type="button" class="x">×</button>';
      row.querySelector('.name').textContent = file.name;
      row.querySelector('.size').textContent = window.fmtSize(file.size);
      const remove = row.querySelector('.x');
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.addEventListener('click', () => {
        files.splice(index, 1);
        renderList();
      });
      row.addEventListener('dragstart', event => event.dataTransfer.setData('text/plain', String(index)));
      row.addEventListener('dragover', event => event.preventDefault());
      row.addEventListener('drop', event => {
        event.preventDefault();
        const from = Number.parseInt(event.dataTransfer.getData('text/plain'), 10);
        if (!files[from] || from === index) return;
        files.splice(index, 0, files.splice(from, 1)[0]);
        renderList();
      });
      fileList.appendChild(row);
    });
    btn.disabled = busy || files.length === 0;
  }

  window.initDropzone('#dz', incoming => {
    if (busy) return;
    files.push(...Array.from(incoming).filter(file => /\.pdf$/i.test(file.name)));
    input.value = '';
    renderList();
    if (files.length) {
      try { prepareWorker(); } catch (_) { /* 点击处理时显示错误并允许重试 */ }
    }
  });

  btnReset.addEventListener('click', () => {
    stopWorker();
    files = [];
    input.value = '';
    outName.value = outName.defaultValue;
    result.classList.remove('active');
    progress.classList.remove('active');
    setBusy(false);
    renderList();
  });

  btn.addEventListener('click', () => {
    if (busy || !files.length) return;
    const filename = outName.value || outName.defaultValue;
    setBusy(true);
    result.classList.remove('active');
    window.setProgress('#progress', 0, 'Starting merge…');
    try {
      prepareWorker();
      worker.onmessage = ({ data }) => {
        if (data.error) {
          fail(data.error);
          return;
        }
        if (!data.bytes) {
          window.setProgress('#progress', data.progress, data.label);
          return;
        }

        window.setProgress('#progress', 100, 'Done');
        showResult(`Merged ${files.length} file(s)`, `${window.fmtSize(data.bytes.byteLength)} · ${data.pages} pages`);
        const download = document.createElement('button');
        download.type = 'button';
        download.id = 'dlBtn';
        download.className = 'btn btn-primary';
        download.textContent = `⬇ Download ${filename}`;
        download.addEventListener('click', () => window.downloadBlob(data.bytes, filename, 'application/pdf'));
        result.appendChild(download);
        stopWorker();
        setBusy(false);
      };
      worker.postMessage(files);
    } catch (error) {
      fail(error.message);
    }
  });
})();
