const path = require('path');
const log = require('../_utils/log');
const digimons = require(path.resolve(__dirname, '../../backend/data/digimons.json'));

function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // remove não alfanum
    .trim();
}

function distance(a, b) {
  const m = a.length; const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    // req.query pode vir vazio em Vercel Node 20; usa parsing manual
    const { rest = [] } = req.query || {};
    let parts = Array.isArray(rest) ? rest : [rest];
    // Vercel pode fornecer "rest" como string única "nivel/Ultimate"
    if (parts.length === 1 && typeof parts[0] === 'string' && parts[0].includes('/')) {
      parts = parts[0].split('/').filter(Boolean);
    }

    // /nivel/:nivel
    if (parts[0] === 'nivel') {
      const nivelParam = normalizar(parts[1] || '');
      if (!nivelParam) return send404(res, 'Nível inválido.');
      const filtrados = digimons.filter((d) => {
        const niveis = Array.isArray(d.niveis) && d.niveis.length > 0 ? d.niveis : [d.nivel].filter(Boolean);
        return niveis.some((n) => normalizar(n) === nivelParam);
      });
      if (filtrados.length === 0) {
        log.warn('level filter empty', { nivel: parts[1] });
        return send404(res, 'Nenhum Digimon encontrado para o nível informado.');
      }
      const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
      const limit = Math.max(parseInt(url.searchParams.get('limit') || '8', 10), 1);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const resultados = filtrados.slice(startIndex, endIndex);
      log.info('level filter', { nivel: parts[1], page, limit, total: filtrados.length, returned: resultados.length });
      return sendJSON(res, { pagina: page, limite: limit, total: filtrados.length, resultados });
    }

    // /tipo/:tipo
    if (parts[0] === 'tipo') {
      const tipoParam = normalizar(parts[1] || '');
      if (!tipoParam) return send404(res, 'Tipo inválido.');
      const filtrados = digimons.filter((d) => {
        const tipos = Array.isArray(d.tipos) && d.tipos.length > 0 ? d.tipos : [d.tipo].filter(Boolean);
        return tipos.some((t) => normalizar(t) === tipoParam);
      });
      if (filtrados.length === 0) {
        log.warn('type filter empty', { tipo: parts[1] });
        return send404(res, 'Nenhum Digimon encontrado para o tipo informado.');
      }
      const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
      const limit = Math.max(parseInt(url.searchParams.get('limit') || '8', 10), 1);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const resultados = filtrados.slice(startIndex, endIndex);
      log.info('type filter', { tipo: parts[1], page, limit, total: filtrados.length, returned: resultados.length });
      return sendJSON(res, { pagina: page, limite: limit, total: filtrados.length, resultados });
    }

    // /:nome
    const nomeRaw = decodeURIComponent(parts[0] || '');
    const nomeParam = normalizar(nomeRaw);
    let encontrado = digimons.find((d) => normalizar(d.nome) === nomeParam);
    if (!encontrado) {
      encontrado = digimons.find((d) => normalizar(d.nome).includes(nomeParam));
    }
    if (!encontrado && /\(.*\)/.test(nomeRaw)) {
      const base = nomeRaw.replace(/\s*\(.+?\)\s*/g, '').trim();
      const baseNorm = normalizar(base);
      encontrado = digimons.find((d) => normalizar(d.nome) === baseNorm) ||
        digimons.find((d) => normalizar(d.nome).includes(baseNorm));
    }
    if (!encontrado) {
      // fuzzy: aceita distância <= 3 (mais permissivo para nomes com hífen/espaços)
      let best = null; let bestScore = Infinity;
      for (const d of digimons) {
        const dn = normalizar(d.nome);
        const dist = distance(dn, nomeParam);
        if (dist < bestScore) { best = d; bestScore = dist; }
      }
      if (best && bestScore <= 3) encontrado = best;
    }
    if (!encontrado) {
      log.warn('digimon not found', { nome: nomeRaw, parts });
      return send404(res, 'Digimon não encontrado.');
    }
    log.info('digimon details', { nome: encontrado.nome });
    return sendJSON(res, encontrado);
  } catch (e) {
    log.error('details route failed', { message: e.message, stack: e.stack });
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ erro: 'Erro interno do servidor', detalhes: e.message }));
  }
};

function send404(res, msg) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ erro: msg }));
}

function sendJSON(res, data) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}


