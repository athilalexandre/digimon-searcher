// Script da Landing Page – Consome a API local em http://localhost:3000

const API_BASE = 'http://localhost:3000';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const levelFilter = document.getElementById('levelFilter');
const cardsContainer = document.getElementById('cardsContainer');
const alertArea = document.getElementById('alertArea');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

let currentPage = 1;
let currentLimit = 8;

function showAlert(message, type = 'info') {
  alertArea.innerHTML = `
    <div class="alert alert-${type}" role="alert">${message}</div>
  `;
}

function clearAlert() {
  alertArea.innerHTML = '';
}

function createCard(d) {
  const camposBadges = (d.campos || [])
    .map((c) => `<span class="badge badge-digimon me-1 mb-1">${c}</span>`) 
    .join('');

  return `
  <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
    <div class="card h-100">
      <img src="${d.imagem}" class="card-img-top p-3" alt="Imagem de ${d.nome}" height="220" />
      <div class="card-body">
        <h5 class="card-title">${d.nome}</h5>
        <p class="card-text mb-1"><strong>Tipo:</strong> ${d.tipo}</p>
        <p class="card-text mb-1"><strong>Atributo:</strong> ${d.atributo}</p>
        <p class="card-text mb-1"><strong>Nível:</strong> ${d.nivel}</p>
        <div class="mt-2"><strong>Campos:</strong><div class="mt-1">${camposBadges}</div></div>
      </div>
    </div>
  </div>`;
}

function renderList(resultados = [], pagina = 1, total = 0, limite = currentLimit) {
  if (!Array.isArray(resultados) || resultados.length === 0) {
    cardsContainer.innerHTML = '';
    showAlert('Nenhum resultado para exibir. Tente ajustar a busca ou filtros.');
    pageInfo.textContent = '';
    return;
  }

  clearAlert();
  cardsContainer.innerHTML = resultados.map(createCard).join('');
  const totalPages = Math.ceil(total / limite);
  pageInfo.textContent = `Página ${pagina} de ${totalPages}`;
  prevPageBtn.disabled = pagina <= 1;
  nextPageBtn.disabled = pagina >= totalPages;
}

async function fetchPage(page = 1) {
  try {
    const res = await fetch(`${API_BASE}/digimons?page=${page}&limit=${currentLimit}`);
    if (!res.ok) throw new Error('Falha ao carregar lista de Digimons.');
    const data = await res.json();
    currentPage = data.pagina;
    renderList(data.resultados, data.pagina, data.total, data.limite);
  } catch (err) {
    showAlert(err.message || 'Erro ao comunicar com a API.', 'danger');
  }
}

async function fetchByName(name) {
  const trimmed = (name || '').trim();
  if (trimmed.length === 0) {
    showAlert('Digite um nome para buscar.');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/digimons/${encodeURIComponent(trimmed)}`);
    if (res.status === 404) {
      showAlert('Não encontramos esse Digimon. Verifique o nome e tente novamente.');
      cardsContainer.innerHTML = '';
      pageInfo.textContent = '';
      return;
    }
    if (!res.ok) throw new Error('Falha ao buscar Digimon.');
    const data = await res.json();
    renderList([data], 1, 1, 1);
  } catch (err) {
    showAlert(err.message || 'Erro ao comunicar com a API.', 'danger');
  }
}

async function fetchByLevel(level) {
  const trimmed = (level || '').trim();
  if (trimmed.length === 0) {
    // sem filtro, volta para paginação geral
    fetchPage(1);
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/digimons/nivel/${encodeURIComponent(trimmed)}`);
    if (res.status === 404) {
      showAlert('Nenhum Digimon encontrado para o nível selecionado.');
      cardsContainer.innerHTML = '';
      pageInfo.textContent = '';
      return;
    }
    if (!res.ok) throw new Error('Falha ao filtrar por nível.');
    const data = await res.json();
    renderList(data.resultados, 1, data.total, data.total);
  } catch (err) {
    showAlert(err.message || 'Erro ao comunicar com a API.', 'danger');
  }
}

// Eventos
searchBtn.addEventListener('click', () => {
  fetchByName(searchInput.value);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    fetchByName(searchInput.value);
  }
});

levelFilter.addEventListener('change', () => {
  fetchByLevel(levelFilter.value);
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) fetchPage(currentPage - 1);
});

nextPageBtn.addEventListener('click', () => {
  fetchPage(currentPage + 1);
});

// Carrega a primeira página ao abrir
fetchPage(1);


