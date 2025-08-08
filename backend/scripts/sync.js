/*
  Script de sincronização com a DAPI (https://digi-api.com/)
  - Baixa todos os Digimons
  - Mapeia níveis, tipos, atributos, campos (com imagens) e imagens do Digimon
  - Gera backend/data/digimons.json no formato esperado pela API local

  Requisitos: Node 18+ (usa fetch nativo)
*/

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://digi-api.com/api/v1';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'digimons.json');

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${url} – HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchAllDigimonIds() {
  // Descobre total de páginas e coleta todos os ids com paginação
  const pageSize = 100; // maior página para reduzir chamadas
  const first = await fetchJson(`${API_BASE}/digimon?page=1&pageSize=${pageSize}`);
  const totalPages = first.pageable.totalPages || 1;
  const ids = first.content.map((d) => d.id);

  const pagePromises = [];
  for (let p = 2; p <= totalPages; p += 1) {
    pagePromises.push(
      fetchJson(`${API_BASE}/digimon?page=${p}&pageSize=${pageSize}`).then((j) =>
        j.content.map((d) => d.id)
      )
    );
  }

  const pages = await Promise.all(pagePromises);
  for (const arr of pages) {
    ids.push(...arr);
  }
  return ids;
}

function mapDetailToLocal(detail) {
  const imagens = Array.isArray(detail.images)
    ? detail.images.map((img) => img.href).filter(Boolean)
    : [];

  const niveis = Array.isArray(detail.levels)
    ? detail.levels.map((l) => l.level).filter(Boolean)
    : [];

  const tipos = Array.isArray(detail.types)
    ? detail.types.map((t) => t.type).filter(Boolean)
    : [];

  const atributos = Array.isArray(detail.attributes)
    ? detail.attributes.map((a) => a.attribute).filter(Boolean)
    : [];

  const camposDetalhes = Array.isArray(detail.fields)
    ? detail.fields
        .map((f) => ({ nome: f.field, imagem: f.image }))
        .filter((f) => f.nome)
    : [];

  const campos = camposDetalhes.map((f) => f.nome);

  return {
    id: detail.id,
    nome: detail.name,
    tipo: tipos[0] || null,
    tipos,
    atributo: atributos[0] || null,
    atributos,
    campos,
    camposDetalhes,
    nivel: niveis[0] || null,
    niveis,
    imagem: imagens[0] || null,
    imagens,
    fonte: 'digi-api.com'
  };
}

async function fetchDetail(id) {
  const url = `${API_BASE}/digimon/${id}`;
  const j = await fetchJson(url);
  return mapDetailToLocal(j);
}

async function withConcurrency(items, worker, concurrency = 10) {
  const results = new Array(items.length);
  let index = 0;
  async function next() {
    const current = index;
    index += 1;
    if (current >= items.length) return;
    try {
      results[current] = await worker(items[current], current);
    } catch (err) {
      // Em caso de falha em um item, registra erro e segue
      console.error('Falha ao processar item', items[current], err.message);
      results[current] = null;
    }
    return next();
  }
  const starters = [];
  for (let i = 0; i < concurrency; i += 1) starters.push(next());
  await Promise.all(starters);
  return results.filter(Boolean);
}

async function main() {
  console.log('Coletando lista de IDs...');
  const ids = await fetchAllDigimonIds();
  console.log(`Total de Digimons: ${ids.length}`);

  console.log('Baixando detalhes com concorrência 10...');
  const detalhes = await withConcurrency(ids, (id) => fetchDetail(id), 10);
  console.log('Normalização concluída. Salvando arquivo...');

  // Ordena por nome para facilitar leitura/diffs
  detalhes.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(detalhes, null, 2), 'utf8');
  console.log(`Arquivo salvo em ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Erro na sincronização:', err);
  process.exit(1);
});


