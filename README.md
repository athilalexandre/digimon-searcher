# Digimon Searcher

Uma solução full‑stack moderna para consulta de Digimons com dados da DAPI e enriquecimento opcional pelo Wikimon, oferecendo busca rápida, filtros, paginação e visual de detalhes em modal responsivo.

## Índice
- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Instalação e Execução](#instalação-e-execução)
- [API (Endpoints)](#api-endpoints)
- [Frontend](#frontend)
- [Sincronização de Dados](#sincronização-de-dados)
- [Licença](#licença)

## Visão Geral
O projeto é composto por:
- Backend em Node.js + Express, com CORS, paginação, filtros e middleware de erros.
- Dataset local em `JSON` com imagens, categorias (fields), tipos, atributos e níveis.
- Scripts de sincronização com a DAPI e enriquecimento com o Wikimon.
- Frontend estático (HTML/CSS/JS + Bootstrap) consumindo a API e exibindo detalhes em modal.

## Funcionalidades
Para usuários:
- Busca por nome (parcial, case-insensitive, tolerante a acentos)
- Filtro por nível e listagem com paginação
- Detalhes do Digimon em modal com imagem, descrição e técnicas
- Exibição de categorias (fields) com ícones

Para manutenção:
- Sync automático no primeiro start ou sob demanda
- Download local de imagens (opcional) e enriquecimento a partir do Wikimon

## Arquitetura
```
/backend
  app.js               # servidor Express
  scripts/             # sync, bootstrap, enriquecimento, download de imagens
  routes/digimons.js   # rotas da API
  data/digimons.json   # dataset local
  public/              # imagens locais (opcional)

/frontend
  index.html
  style.css
  script.js
```

## Instalação e Execução
Pré‑requisito: Node.js 18+

Backend:
```bash
cd backend
npm install
npm start    # inicia com bootstrap (sincroniza se necessário) e sobe a API em http://localhost:3000
```

Frontend:
```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

## API (Endpoints)
- `GET /digimons?page=<num>&limit=<num>`: lista paginada
- `GET /digimons/:nome`: por nome (case-insensitive, tolerante a acentos)
- `GET /digimons/nivel/:nivel`: por nível
- `GET /digimons/tipo/:tipo`: por tipo
- `GET /digimons/busca?nome=&nivel=&tipo=&atributo=&campo=&page=&limit=`: busca flexível

## Frontend
- Busca por nome e filtro por nível
- Cards responsivos; clique abre modal com:
  - imagem (Wikimon/DAPI/local)
  - descrição no idioma do navegador (pt/en/ja com fallback)
  - técnicas (quando disponíveis)

## Sincronização de Dados
- `npm start` (backend) executa um bootstrap que valida o dataset e sincroniza quando necessário.
- Comandos úteis:
```bash
npm run sync           # baixa todos os Digimons da DAPI
npm run images         # baixa imagens localmente e atualiza caminhos para /static
npm run enrich:wikimon # enriquece com imagem/descrição/técnicas do Wikimon
```

## Licença
CC BY‑NC‑SA 4.0 – Projeto educacional, sem afiliação oficial com Bandai. Fontes: DAPI (digi-api.com) e Wikimon (wikimon.net).