const isEnabled = () => {
  return process.env.DS_DEBUG === '1' || process.env.DEBUG === '1' || process.env.NODE_ENV === 'development';
};

function ts() {
  return new Date().toISOString();
}

function format(level, message, meta) {
  const base = `[${ts()}] [${level}] ${message}`;
  if (!meta) return base;
  try {
    return `${base} | ${typeof meta === 'string' ? meta : JSON.stringify(meta)}`;
  } catch (_) {
    return base;
  }
}

module.exports = {
  info(message, meta) {
    if (!isEnabled()) return;
    console.log(format('INFO', message, meta));
  },
  warn(message, meta) {
    if (!isEnabled()) return;
    console.warn(format('WARN', message, meta));
  },
  error(message, meta) {
    console.error(format('ERROR', message, meta));
  },
  debug(message, meta) {
    if (!isEnabled()) return;
    console.debug(format('DEBUG', message, meta));
  },
};


