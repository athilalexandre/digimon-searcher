# Digimon Searcher

Projeto full-stack com API (backend) em Node.js/Express e Landing Page (frontend) em HTML/CSS/JS para exibir informações de Digimons do jogo Digimon Story: Cyber Sleuth.

## Estrutura do projeto

```
/backend
  app.js
  routes/
  data/digimons.json
  README.md

/frontend
  index.html
  style.css
  script.js
```

## Requisitos
- Node.js 18+

## Como rodar a API (Backend)
1. Abra um terminal na raiz do projeto e execute:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
2. A API iniciará em `http://localhost:3000`.

### Endpoints principais
- `GET /digimons?page=<num>&limit=<num>` – Lista paginada
- `GET /digimons/:nome` – Busca por nome (case-insensitive e tolerante a acentos)
- `GET /digimons/nivel/:nivel` – Filtra por nível
- `GET /digimons/tipo/:tipo` – Filtra por tipo

## Como usar o Frontend
1. Com a API rodando em `http://localhost:3000`, abra o arquivo `frontend/index.html` no navegador.
2. Utilize o campo de busca para procurar por nome e o seletor para filtrar por nível.

## Observações
- CORS está habilitado no backend para permitir o consumo pelo frontend
- Mensagens e documentação em português
- Design inspirado nas cores e estilo da franquia Digimon