const path = require('path');
const digimons = require(path.join(process.cwd(), 'backend', 'data', 'digimons.json'));

function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

module.exports = async (req, res) => {
  try {
    const { rest = [] } = req.query || {};
    const parts = Array.isArray(rest) ? rest : [rest];

    // /nivel/:nivel
    if (parts[0] === 'nivel') {
      const nivelParam = normalizar(parts[1] || '');
      const filtrados = digimons.filter((d) => {
        const niveis = Array.isArray(d.niveis) && d.niveis.length > 0 ? d.niveis : [d.nivel].filter(Boolean);
        return niveis.some((n) => normalizar(n) === nivelParam);
      });
      if (filtrados.length === 0) return send404(res, 'Nenhum Digimon encontrado para o nível informado.');
      return sendJSON(res, { total: filtrados.length, resultados: filtrados });
    }

    // /tipo/:tipo
    if (parts[0] === 'tipo') {
      const tipoParam = normalizar(parts[1] || '');
      const filtrados = digimons.filter((d) => {
        const tipos = Array.isArray(d.tipos) && d.tipos.length > 0 ? d.tipos : [d.tipo].filter(Boolean);
        return tipos.some((t) => normalizar(t) === tipoParam);
      });
      if (filtrados.length === 0) return send404(res, 'Nenhum Digimon encontrado para o tipo informado.');
      return sendJSON(res, { total: filtrados.length, resultados: filtrados });
    }

    // /:nome
    const nomeParam = normalizar(decodeURIComponent(parts[0] || ''));
    const encontrado = digimons.find((d) => normalizar(d.nome) === nomeParam);
    if (!encontrado) return send404(res, 'Digimon não encontrado.');
    return sendJSON(res, encontrado);
  } catch (e) {
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


