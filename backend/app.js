// Aplicação Express para servir informações de Digimons do jogo
// Digimon Story: Cyber Sleuth
//
// Tecnologias: Node.js + Express
// Recursos: CORS, paginação, filtros por nome/tipo/nível, middleware de erros

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Carrega dados locais do arquivo JSON
const digimonsDataPath = path.join(__dirname, 'data', 'digimons.json');
// require faz cache em memória — ótimo para dataset estático
const digimons = require(digimonsDataPath);

// Cria app
const app = express();

// Middlewares globais
app.use(cors()); // Habilita CORS para permitir acesso do frontend
app.use(express.json()); // Trata JSON no corpo das requisições
app.use(morgan('dev')); // Log amigável em desenvolvimento

// Função utilitária para normalizar strings (case-insensitive e sem acentos)
function normalizar(texto) {
  if (typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // remove acentos
    .toLowerCase()
    .trim();
}

// Injeta utilitários e dados em locals para uso nas rotas
app.locals.digimons = digimons;
app.locals.normalizar = normalizar;

// Rotas
const digimonsRouter = require('./routes/digimons');
app.use('/digimons', digimonsRouter);

// Rota raiz com pequena documentação
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API de Digimons – Digimon Story: Cyber Sleuth',
    versao: '1.0.0',
    rotas: {
      listar: 'GET /digimons?page=1&limit=20',
      buscarPorNome: 'GET /digimons/:nome',
      filtrarPorNivel: 'GET /digimons/nivel/:nivel',
      filtrarPorTipo: 'GET /digimons/tipo/:tipo'
    },
    observacao: 'As buscas por nome são case-insensitive e tolerantes a acentos.'
  });
});

// 404 – Rota não encontrada
app.use((req, res, next) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    detalhes: 'Verifique o caminho e o método HTTP.'
  });
});

// Middleware central de tratamento de erros
// Garante respostas consistentes e em português
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err); // Útil para depuração no servidor
  const status = err.status || 500;
  res.status(status).json({
    erro: 'Ocorreu um erro ao processar sua solicitação.',
    detalhes: err.message || 'Erro interno do servidor.'
  });
});

// Inicializa servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

module.exports = app;

