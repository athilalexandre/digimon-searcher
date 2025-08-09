function ts() {
  return new Date().toISOString();
}

function safe(obj) {
  try { return JSON.stringify(obj); } catch { return String(obj); }
}

exports.info = (msg, meta) => console.log(`[INFO ${ts()}] ${msg}${meta ? ' ' + safe(meta) : ''}`);
exports.warn = (msg, meta) => console.warn(`[WARN ${ts()}] ${msg}${meta ? ' ' + safe(meta) : ''}`);
exports.error = (msg, meta) => console.error(`[ERROR ${ts()}] ${msg}${meta ? ' ' + safe(meta) : ''}`);
exports.debug = (msg, meta) => console.log(`[DEBUG ${ts()}] ${msg}${meta ? ' ' + safe(meta) : ''}`);


