# Backend – API Digimon Searcher

API em Node.js + Express que serve informações dos Digimons do jogo Digimon Story: Cyber Sleuth a partir de um arquivo JSON local.

## Requisitos
- Node.js 18+

## Instalação
```bash
cd backend
npm install
```

## Execução
- Desenvolvimento com recarregamento:
```bash
npm run dev
```
- Produção:
```bash
npm start
```

A API rodará por padrão em `http://localhost:3000`.

## Endpoints
- `GET /` – Informações básicas e documentação da API
- `GET /digimons?page=<num>&limit=<num>` – Lista paginada de Digimons
- `GET /digimons/:nome` – Busca por nome (case-insensitive e tolerante a acentos)
- `GET /digimons/nivel/:nivel` – Filtro por nível
- `GET /digimons/tipo/:tipo` – Filtro por tipo

## Estrutura dos dados
Cada Digimon possui:
- `id` (número único)
- `nome` (string)
- `tipo` (string)
- `atributo` (string)
- `campos` (array de strings)
- `nivel` (string)
- `imagem` (URL)

## Observações
- CORS habilitado para permitir acesso do frontend
- Middleware de erros com mensagens em português
- Paginação padrão: `page=1`, `limit=20`
