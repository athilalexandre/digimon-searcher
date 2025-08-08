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
const detailsTemplate = document.getElementById('detailsTemplate');

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
  const tipos = Array.isArray(d.tipos) && d.tipos.length ? d.tipos : (d.tipo ? [d.tipo] : []);
  const atributos = Array.isArray(d.atributos) && d.atributos.length ? d.atributos : (d.atributo ? [d.atributo] : []);
  const niveis = Array.isArray(d.niveis) && d.niveis.length ? d.niveis : (d.nivel ? [d.nivel] : []);

  const camposDetalhes = Array.isArray(d.camposDetalhes) && d.camposDetalhes.length ? d.camposDetalhes : (d.campos || []).map((nome) => ({ nome, imagem: null }));
  const camposBadges = camposDetalhes
    .map((c) => c.imagem
      ? `<span class="me-1 mb-1 d-inline-flex align-items-center"><img src="${c.imagem}" alt="${c.nome}" title="${c.nome}" style="height:20px;width:20px;object-fit:contain;margin-right:6px;"/><span class="badge badge-digimon">${c.nome}</span></span>`
      : `<span class="badge badge-digimon me-1 mb-1">${c.nome}</span>`
    )
    .join('');

  const imgSrc = Array.isArray(d.imagens) && d.imagens.length ? d.imagens[0] : d.imagem;

  return `
  <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
    <div class="card h-100 digimon-card" data-nome="${d.nome}">
      <img src="${imgSrc}" class="card-img-top p-3" alt="Imagem de ${d.nome}" height="220" />
      <div class="card-body">
        <h5 class="card-title">${d.nome}</h5>
        <p class="card-text mb-1"><strong>Tipos:</strong> ${tipos.join(', ') || '—'}</p>
        <p class="card-text mb-1"><strong>Atributos:</strong> ${atributos.join(', ') || '—'}</p>
        <p class="card-text mb-1"><strong>Níveis:</strong> ${niveis.join(', ') || '—'}</p>
        <div class="mt-2"><strong>Campos:</strong><div class="mt-1">${camposBadges || '—'}</div></div>
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
  // Vincula clique aos cards para abrir detalhes
  document.querySelectorAll('.digimon-card').forEach((el) => {
    el.addEventListener('click', () => openDetails(el.getAttribute('data-nome')));
  });
  const totalPages = Math.ceil(total / limite);
  pageInfo.textContent = `Página ${pagina} de ${totalPages}`;
  prevPageBtn.disabled = pagina <= 1;
  nextPageBtn.disabled = pagina >= totalPages;
}

async function openDetails(nome) {
  try {
    const res = await fetch(`${API_BASE}/digimons/${encodeURIComponent(nome)}`);
    if (!res.ok) throw new Error('Falha ao carregar detalhes.');
    const d = await res.json();

    // Modal
    const tpl = detailsTemplate.content.cloneNode(true);
    document.body.appendChild(tpl);
    const modalEl = document.getElementById('digimonModal');
    document.getElementById('digimonModalLabel').textContent = d.nome;
    document.getElementById('digimonModalImg').src = (Array.isArray(d.imagens) && d.imagens[0]) || d.imagem || '';
    document.getElementById('digimonModalDesc').textContent = d.descricao || 'Descrição não disponível em português no momento.';

    const techs = Array.isArray(d.ataques) ? d.ataques : [];
    const techsHtml = techs.slice(0, 10)
      .map((t) => `<div class="mb-2"><strong>${t.nome}:</strong> ${t.descricao}</div>`)
      .join('');
    document.getElementById('digimonModalTechs').innerHTML = techsHtml || '<span class="text-secondary">Sem técnicas registradas.</span>';

    // Usa Bootstrap JS se presente; fallback simples
    try {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
      modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    } catch {
      modalEl.style.display = 'block';
    }
  } catch (err) {
    showAlert(err.message || 'Erro ao carregar detalhes.', 'danger');
  }
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
    // Usa busca flexível (parcial, case-insensitive, tolerante a acentos)
    const res = await fetch(`${API_BASE}/digimons/busca?nome=${encodeURIComponent(trimmed)}&page=1&limit=${currentLimit}`);
    if (!res.ok) throw new Error('Falha ao buscar Digimon.');
    const data = await res.json();
    if (!data.resultados || data.resultados.length === 0) {
      showAlert('Não encontramos esse Digimon. Tente outro nome ou ajuste os filtros.');
      cardsContainer.innerHTML = '';
      pageInfo.textContent = '';
      return;
    }
    renderList(data.resultados, data.pagina, data.total, data.limite);
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


