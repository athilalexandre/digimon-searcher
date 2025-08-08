const express = require('express');
const { fetchWikimonDetails } = require('../services/wikimon');
const logger = require('../utils/logger');

const router = express.Router();

// GET /digimons/busca?nome=&nivel=&tipo=&atributo=&campo=&page=&limit=
// Busca flexível por múltiplos critérios (case-insensitive e tolerante a acentos)
router.get('/busca', (req, res) => {
  const { digimons, normalizar } = req.app.locals;
  const {
    nome = '', nivel = '', tipo = '', atributo = '', campo = '',
    page = '1', limit = '20'
  } = req.query;

  const nomeN = normalizar(String(nome));
  const nivelN = normalizar(String(nivel));
  const tipoN = normalizar(String(tipo));
  const atributoN = normalizar(String(atributo));
  const campoN = normalizar(String(campo));

  const filtrados = digimons.filter((d) => {
    const nomeOk = nomeN
      ? normalizar(d.nome).includes(nomeN)
      : true;

    const niveis = Array.isArray(d.niveis) && d.niveis.length > 0 ? d.niveis : [d.nivel].filter(Boolean);
    const nivelOk = nivelN
      ? niveis.some((n) => normalizar(n) === nivelN)
      : true;

    const tipos = Array.isArray(d.tipos) && d.tipos.length > 0 ? d.tipos : [d.tipo].filter(Boolean);
    const tipoOk = tipoN
      ? tipos.some((t) => normalizar(t) === tipoN)
      : true;

    const atributos = Array.isArray(d.atributos) && d.atributos.length > 0 ? d.atributos : [d.atributo].filter(Boolean);
    const atributoOk = atributoN
      ? atributos.some((a) => normalizar(a) === atributoN)
      : true;

    const categoriasLista = Array.isArray(d.campos) && d.campos.length > 0 ? d.campos : [];
    const camposOk = campoN
      ? categoriasLista.some((c) => normalizar(c) === campoN)
      : true;

    return nomeOk && nivelOk && tipoOk && atributoOk && camposOk;
  });

  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.max(parseInt(limit, 10) || 20, 1);
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const resultados = filtrados.slice(startIndex, endIndex);

  return res.json({
    pagina: pageNum,
    limite: limitNum,
    total: filtrados.length,
    resultados
  });
});

// GET /digimons → retorna todos com paginação
router.get('/', (req, res) => {
  const { digimons } = req.app.locals;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit, 10) || 20, 1);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // embaralha ordem na home para não ficar alfabética
  const shuffled = [...digimons].sort(() => Math.random() - 0.5);
  const resultados = shuffled.slice(startIndex, endIndex);
  logger.debug('List digimons', { page, limit, total: digimons.length, startIndex, endIndex, returned: resultados.length });

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
    logger.warn('No digimon for level', { nivel: req.params.nivel });
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
    logger.warn('No digimon for type', { tipo: req.params.tipo });
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
    logger.warn('Digimon not found', { nome: req.params.nome });
    return res.status(404).json({
      erro: 'Digimon não encontrado.',
      nome: req.params.nome
    });
  }

  res.json(encontrado);
});

module.exports = router;

// GET /digimons/:nome/detalhes-wikimon → enriquece sob demanda
router.get('/:nome/detalhes-wikimon', async (req, res, next) => {
  try {
    const { normalizar, digimons } = req.app.locals;
    const nomeParam = normalizar(req.params.nome);
    const encontrado = digimons.find((d) => normalizar(d.nome) === nomeParam);
    if (!encontrado) {
      logger.warn('Wikimon details request for unknown digimon', { nome: req.params.nome });
      return res.status(404).json({ erro: 'Digimon não encontrado.' });
    }
    const detalhes = await fetchWikimonDetails(encontrado.nome);
    logger.info('Fetched wikimon details', { nome: encontrado.nome, temImagem: !!detalhes.imagemUrl, ataques: detalhes.ataques?.length || 0 });
    return res.json(detalhes);
  } catch (e) {
    logger.error('Erro ao buscar detalhes no Wikimon', { message: e.message, stack: e.stack });
    return next(e);
  }
});


