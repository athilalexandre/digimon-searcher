const path = require('path');
const digimons = require(path.join(process.cwd(), 'backend', 'data', 'digimons.json'));

function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

module.exports = (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const nome = normalizar(url.searchParams.get('nome') || '');
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
    const limit = Math.max(parseInt(url.searchParams.get('limit') || '8', 10), 1);

    const filtrados = digimons.filter((d) => normalizar(d.nome).includes(nome));
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const resultados = filtrados.slice(startIndex, endIndex);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ pagina: page, limite: limit, total: filtrados.length, resultados }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ erro: 'Erro interno do servidor', detalhes: e.message }));
  }
};


