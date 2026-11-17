importScripts('../pdf-merge/pdf-lib-1.17.1.min.js', './jszip-3.10.1.min.js');

self.onmessage = async ({ data: {file, settings} }) => {
  try {
    const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    const total = source.getPageCount();
    const groups = computeGroups(total, settings);
    const zip = new JSZip();
    for (const [index, group] of groups.entries()) {
      self.postMessage({ progress: 5 + index / groups.length * 85, label: `Group ${index + 1}/${groups.length}…` });
      const part = await PDFLib.PDFDocument.create();
      const pages = await part.copyPages(source, group.pages.map(page => page - 1));
      for (const page of pages) part.addPage(page);
      zip.file(`${settings.prefix}_${group.label}.pdf`, await part.save());
    }
    self.postMessage({ progress: 95, label: 'Preparing download…' });
    const bytes = await zip.generateAsync({type:'uint8array'});
    self.postMessage({bytes, count:groups.length, total}, [bytes.buffer]);
  } catch (error) {
    self.postMessage({error: error.message || String(error)});
  }
};

function computeGroups(total, {mode, ranges, everyN, singlePage}) {
  if (mode === 'ranges') {
    const txt = ranges;
    const groups = [];
    txt.split(/[,;\s]+/).forEach(token => {
      if (!token) return;
      const [a, b] = token.split('-').map(x => parseInt(x, 10));
      if (!a) return;
      const start = a, end = b || a;
      const arr = [];
      for (let i = start; i <= Math.min(end, total); i++) arr.push(i);
      if (arr.length) groups.push({ label: arr.length === 1 ? `p${arr[0]}` : `p${arr[0]}-${arr[arr.length-1]}`, pages: arr });
    });
    return groups.length ? groups : [{ label: 'all', pages: Array.from({length: total}, (_,i)=>i+1) }];
  }
  if (mode === 'everyN') {
    const n = Math.max(1, parseInt(everyN, 10) || 1);
    const groups = [];
    for (let i = 0; i < total; i += n) {
      const arr = []; for (let j = i; j < Math.min(i + n, total); j++) arr.push(j + 1);
      groups.push({ label: `p${arr[0]}-${arr[arr.length-1]}`, pages: arr });
    }
    return groups;
  }
  const p = Math.max(1, Math.min(total, parseInt(singlePage, 10) || 1));
  return [{ label: `p${p}`, pages: [p] }];
}
