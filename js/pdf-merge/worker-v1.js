/* global PDFLib */
importScripts('./pdf-lib-1.17.1.min.js');

self.onmessage = async ({ data: files }) => {
  try {
    const merged = await PDFLib.PDFDocument.create();
    for (const [index, file] of files.entries()) {
      self.postMessage({ progress: 5 + (index / files.length) * 85, label: `Adding file ${index + 1}/${files.length}…` });
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const pages = await merged.copyPages(source, source.getPageIndices());
      for (const page of pages) merged.addPage(page);
    }

    self.postMessage({ progress: 95, label: 'Preparing download…' });
    const bytes = await merged.save();
    self.postMessage({ bytes, pages: merged.getPageCount() }, [bytes.buffer]);
  } catch (error) {
    self.postMessage({ error: error.message || String(error) });
  }
};
