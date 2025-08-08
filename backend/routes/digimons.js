const express = require('express');

const router = express.Router();

// GET /digimons → retorna todos com paginação
router.get('/', (req, res) => {
  const { digimons } = req.app.locals;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const resultados = digimons.slice(startIndex, endIndex);

  res.json({
    pagina: page,
    limite: limit,
    total: digimons.length,
    resultados
  });
});

// GET /digimons/nivel/:nivel → por nível (case-insensitive e tolerante a acentos)
router.get('/nivel/:nivel', (req, res) => {
  const { digimons, normalizar } = req.app.locals;
  const nivelParam = normalizar(req.params.nivel);

  const filtrados = digimons.filter((d) => {
    const niveis = Array.isArray(d.niveis) && d.niveis.length > 0 ? d.niveis : [d.nivel].filter(Boolean);
    return niveis.some((n) => normalizar(n) === nivelParam);
  });

  if (filtrados.length === 0) {
    return res.status(404).json({
      erro: 'Nenhum Digimon encontrado para o nível informado.',
      nivel: req.params.nivel
    });
  }

  res.json({ total: filtrados.length, resultados: filtrados });
});

// GET /digimons/tipo/:tipo → por tipo (case-insensitive e tolerante a acentos)
router.get('/tipo/:tipo', (req, res) => {
  const { digimons, normalizar } = req.app.locals;
  const tipoParam = normalizar(req.params.tipo);

  const filtrados = digimons.filter((d) => {
    const tipos = Array.isArray(d.tipos) && d.tipos.length > 0 ? d.tipos : [d.tipo].filter(Boolean);
    return tipos.some((t) => normalizar(t) === tipoParam);
  });

  if (filtrados.length === 0) {
    return res.status(404).json({
      erro: 'Nenhum Digimon encontrado para o tipo informado.',
      tipo: req.params.tipo
    });
  }

  res.json({ total: filtrados.length, resultados: filtrados });
});

// GET /digimons/:nome → por nome (case-insensitive e tolerante a acentos)
router.get('/:nome', (req, res) => {
  const { digimons, normalizar } = req.app.locals;
  const nomeParam = normalizar(req.params.nome);

  const encontrado = digimons.find((d) => normalizar(d.nome) === nomeParam);

  if (!encontrado) {
    return res.status(404).json({
      erro: 'Digimon não encontrado.',
      nome: req.params.nome
    });
  }

  res.json(encontrado);
});

module.exports = router;


