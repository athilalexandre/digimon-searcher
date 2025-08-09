// Script da Landing Page – Consome a API local em http://localhost:3000

const API_BASE = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:3000'
  : '/api';
const USER_LANG = (window.USER_LANG || 'en').slice(0, 2);
// Wrapper de fetch com logs avançados
async function apiFetch(url, options) {
  try {
    console.groupCollapsed('[api][request]');
    console.log('url:', url);
    if (options) console.log('options:', options);
    console.groupEnd();
    const start = performance.now();
    const res = await fetch(url, options);
    const dur = Math.round(performance.now() - start);
    console.groupCollapsed('[api][response]');
    console.log('url:', res.url);
    console.log('status:', res.status, res.statusText);
    console.log('durationMs:', dur);
    console.groupEnd();
    return res;
  } catch (err) {
    console.error('[api][error]', { url, message: err?.message, stack: err?.stack });
    throw err;
  }
}

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
let currentLimit = 4; // Home padrão
// Converte URL de thumbnail do Wikimon para a imagem original (sem /thumb/)
function wikimonThumbToOriginal(url) {
  try {
    if (!url || typeof url !== 'string') return url;
    if (!url.includes('/thumb/')) return url;
    const u = new URL(url);
    const parts = u.pathname.split('/');
    const idx = parts.indexOf('thumb');
    if (idx === -1) return url;
    // formato: /images/thumb/<a>/<b>/<filename>/<size>-<filename>
    const a = parts[idx + 1];
    const b = parts[idx + 2];
    const filename = parts[idx + 3];
    const originalPath = ['/images', a, b, filename].join('/');
    u.pathname = originalPath;
    return u.toString();
  } catch (_e) {
    return url;
  }
}
let currentMode = 'list'; // 'list' | 'search' | 'level'
let currentQuery = { name: '', level: '' };
let currentTotal = 0;

function showAlert(message, type = 'info') {
  alertArea.innerHTML = `
    <div class="alert alert-${type}" role="alert">${message}</div>
  `;
}

function clearAlert() {
  alertArea.innerHTML = '';
}

function createCard(d, minimal = false) {
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

  if (minimal) {
    const nivelTxt = niveis[0] || d.nivel || '';
    return `
    <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
      <div class="card h-100 digimon-card" data-nome="${d.nome}" data-img="${imgSrc}">
        <img src="${imgSrc}" class="card-img-top p-3" alt="Imagem de ${d.nome}" height="220" />
        <div class="card-body">
          <h5 class="card-title">${d.nome} ${nivelTxt ? `(${nivelTxt})` : ''}</h5>
        </div>
      </div>
    </div>`;
  }

  return `
  <div class="col-12 col-sm-6 col-lg-4 col-xl-3">
    <div class="card h-100 digimon-card" data-nome="${d.nome}" data-img="${imgSrc}">
      <img src="${imgSrc}" class="card-img-top p-3" alt="Imagem de ${d.nome}" height="220" />
      <div class="card-body">
        <h5 class="card-title">${d.nome}</h5>
        <p class="card-text mb-1"><strong>Tipo:</strong> ${tipos.join(', ') || '—'}</p>
        <p class="card-text mb-1"><strong>Atributo:</strong> ${atributos.join(', ') || '—'}</p>
        <p class="card-text mb-1"><strong>Nível:</strong> ${niveis.join(', ') || '—'}</p>
        <div class="mt-2"><strong>Categoria:</strong><div class="mt-1">${camposBadges || '—'}</div></div>
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
  const minimal = currentMode === 'search';
  cardsContainer.innerHTML = resultados.map((d) => createCard(d, minimal)).join('');
  // Vincula clique aos cards para abrir detalhes
  document.querySelectorAll('.digimon-card').forEach((el) => {
    el.addEventListener('click', () => openDetails(el.getAttribute('data-nome'), el.getAttribute('data-img')));
  });
  const totalPages = Math.ceil(total / limite);
  pageInfo.textContent = `Página ${pagina} de ${totalPages}`;
  prevPageBtn.disabled = pagina <= 1;
  nextPageBtn.disabled = pagina >= totalPages;
}

async function openDetails(nome, cardImgSrc) {
  try {
    const res = await apiFetch(`${API_BASE}/digimons/${encodeURIComponent(nome)}`);
    if (!res.ok) throw new Error('Falha ao carregar detalhes.');
    const d = await res.json();
    console.log('[modal] loaded digimon details', { nome: d.nome, imagens: d.imagens?.length || 0 });

    // Modal
    const tpl = detailsTemplate.content.cloneNode(true);
    document.body.appendChild(tpl);
    const modalEl = document.getElementById('digimonModal');
    document.getElementById('digimonModalLabel').textContent = d.nome;
    // Usa a mesma imagem vista no card
    const fallbackImg = cardImgSrc || (Array.isArray(d.imagens) && d.imagens[0]) || d.imagem || '';
    document.getElementById('digimonModalImg').src = fallbackImg;
    // Preenche meta e fields
    const tiposMeta = Array.isArray(d.tipos) && d.tipos.length ? d.tipos : (d.tipo ? [d.tipo] : []);
    const atributosMeta = Array.isArray(d.atributos) && d.atributos.length ? d.atributos : (d.atributo ? [d.atributo] : []);
    const niveisMeta = Array.isArray(d.niveis) && d.niveis.length ? d.niveis : (d.nivel ? [d.nivel] : []);
    const fieldsMeta = Array.isArray(d.camposDetalhes) ? d.camposDetalhes : (d.campos || []).map((nome) => ({ nome, imagem: null }));
    const fieldsHtml = (fieldsMeta || [])
      .map((c) => {
        if (c.imagem) {
          const full = wikimonThumbToOriginal(c.imagem);
          return `<a href="${full}" target="_blank" rel="noopener" class="me-2 d-inline-flex align-items-center mb-2"><img src="${c.imagem}" alt="${c.nome}" title="Abrir ${c.nome}" style="height:22px;width:22px;object-fit:contain;margin-right:6px;"/><span class="badge badge-digimon">${c.nome}</span></a>`;
        }
        return `<span class=\"badge badge-digimon me-2 mb-2\">${c.nome}</span>`;
      })
      .join('') || '<span class="text-secondary">—</span>';
    document.getElementById('metaTipo').textContent = (tiposMeta || []).join(', ') || '—';
    document.getElementById('metaAtributo').textContent = (atributosMeta || []).join(', ') || '—';
    document.getElementById('metaNivel').textContent = (niveisMeta || []).join(', ') || '—';
    document.getElementById('digimonModalFields').innerHTML = fieldsHtml;
    // Seleciona descrição pela língua do usuário se estiver disponível (da DAPI)
    let desc = '';
    if (Array.isArray(d.descricoes) && d.descricoes.length) {
      // Tentativas: pt -> en -> jap -> primeira
      const prefer = USER_LANG === 'pt' ? ['pt', 'en', 'jap'] : USER_LANG === 'ja' ? ['jap', 'en', 'pt'] : ['en', 'pt', 'jap'];
      for (const lang of prefer) {
        const found = d.descricoes.find((x) => (x.language || '').toLowerCase().startsWith(lang));
        if (found && found.description) { desc = found.description; break; }
      }
      if (!desc) desc = d.descricoes[0].description || '';
    }
    console.log('[modal] initial description selected length', desc?.length || 0);
    // Fallback: tentar Wikimon sob demanda
    if (!desc) {
      try {
        const tryFetch = async (nome) => {
          const wk = await apiFetch(`${API_BASE}/digimons/${encodeURIComponent(nome)}/detalhes-wikimon`);
          if (!wk.ok) return null;
          return wk.json();
        };
        let wj = await tryFetch(d.nome);
        if (!wj && d.nome.includes('(')) {
          const base = d.nome.replace(/\s*\(.+?\)\s*/g, '').trim();
          wj = await tryFetch(base);
        }
        if (wj) {
          desc = wj.descricao || '';
          if (Array.isArray(wj.ataques) && wj.ataques.length) {
            const techsHtml2 = wj.ataques.slice(0, 10).map((t) => `<div class=\"mb-2\"><strong>${t.nome}:</strong> ${t.descricao}</div>`).join('');
            document.getElementById('digimonModalTechs').innerHTML = techsHtml2;
          }
        }
      } catch {}
    }
    document.getElementById('digimonModalDesc').textContent = desc || 'Descrição não disponível para o seu idioma.';
    // Botão de tradução simples (pt/en/ja) usando Web Translate API quando disponível
    const descEl = document.getElementById('digimonModalDesc');
    const toolbar = document.createElement('div');
    toolbar.className = 'mb-3';
    toolbar.innerHTML = `
      <div class="d-flex gap-2">
        <button id="translate-pt" class="btn btn-sm btn-outline-info">PT-BR</button>
        <button id="translate-en" class="btn btn-sm btn-outline-info">EN</button>
        <button id="translate-ja" class="btn btn-sm btn-outline-info">JP</button>
      </div>
    `;
    descEl.parentNode.insertBefore(toolbar, descEl);

    async function translateTo(lang) {
      try {
        // 1) Se a DAPI já trouxe a descrição no idioma pedido, usa-a diretamente
        let originalText = descEl.textContent || '';
        if (Array.isArray(d.descricoes)) {
          const found = d.descricoes.find((x) => (x.language || '').toLowerCase().startsWith(lang));
          if (found && found.description) {
            descEl.textContent = found.description;
            console.log('[translate] using DAPI description for', lang);
            return;
          }
        }
        if (!originalText) return;

        // 2) Tradução via LibreTranslate (instância pública)
        const targetMap = { 'pt': 'pt', 'en': 'en', 'jap': 'ja' };
        const target = targetMap[lang] || 'en';
        // Mostra estado de carregamento
        const previous = descEl.textContent;
        descEl.textContent = 'Traduzindo...';
        console.log('[translate] requesting translate to', target);
        const resp = await fetch('https://libretranslate.de/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: previous, source: 'auto', target, format: 'text' })
        });
        if (resp.ok) {
          const dataT = await resp.json();
          if (dataT && dataT.translatedText) {
            descEl.textContent = dataT.translatedText;
            console.log('[translate] translated');
            return;
          }
        }
        // Fallback se API indisponível
        console.warn('[translate] translate API failed, restoring original');
        descEl.textContent = previous;
      } catch (_) {
        console.error('[translate] error', _);
        // Em caso de erro, mantém o texto original
      }
    }
    document.getElementById('translate-pt').addEventListener('click', () => translateTo('pt'));
    document.getElementById('translate-en').addEventListener('click', () => translateTo('en'));
    document.getElementById('translate-ja').addEventListener('click', () => translateTo('jap'));

    const techs = Array.isArray(d.tecnicas) && d.tecnicas.length ? d.tecnicas : (Array.isArray(d.ataques) ? d.ataques : []);
    const techsHtml = techs.slice(0, 10)
      .map((t) => `<div class="mb-2"><strong>${t.nome}:</strong> ${t.descricao || t.translation || t.traducao || ''}</div>`)
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
    console.error('[modal] error opening details', err);
    showAlert(err.message || 'Erro ao carregar detalhes.', 'danger');
  }
}

async function fetchPage(page = 1) {
  try {
    const res = await apiFetch(`${API_BASE}/digimons?page=${page}&limit=${currentLimit}`);
    if (!res.ok) throw new Error('Falha ao carregar lista de Digimons.');
    const data = await res.json();
    currentMode = 'list';
    currentPage = data.pagina;
    currentTotal = data.total;
    renderList(data.resultados, data.pagina, data.total, data.limite);
  } catch (err) {
    showAlert(err.message || 'Erro ao comunicar com a API.', 'danger');
  }
}

async function fetchSearchPage(page = 1) {
  const name = currentQuery.name;
  const url = `${API_BASE}/digimons/busca?nome=${encodeURIComponent(name)}&page=${page}&limit=8`;
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Falha ao buscar Digimon.');
  const data = await res.json();
  currentMode = 'search';
  currentPage = data.pagina;
  currentTotal = data.total;
  renderList(data.resultados, data.pagina, data.total, data.limite);
}

async function fetchByName(name) {
  const trimmed = (name || '').trim();
  if (trimmed.length === 0) {
    showAlert('Digite um nome para buscar.');
    return;
  }
  try {
    currentQuery.name = trimmed;
    const res = await apiFetch(`${API_BASE}/digimons/busca?nome=${encodeURIComponent(trimmed)}&page=1&limit=8`);
    if (!res.ok) throw new Error('Falha ao buscar Digimon.');
    const data = await res.json();
    if (!data.resultados || data.resultados.length === 0) {
      showAlert('Não encontramos esse Digimon. Tente outro nome ou ajuste os filtros.');
      cardsContainer.innerHTML = '';
      pageInfo.textContent = '';
      return;
    }
    currentMode = 'search';
    currentPage = data.pagina;
    currentTotal = data.total;
    renderList(data.resultados, data.pagina, data.total, data.limite);
  } catch (err) {
    showAlert(err.message || 'Erro ao comunicar com a API.', 'danger');
  }
}

async function fetchByLevel(level, page = 1) {
  const trimmed = (level || '').trim();
  if (trimmed.length === 0) {
    fetchPage(1);
    return;
  }
  try {
    const res = await apiFetch(`${API_BASE}/digimons/nivel/${encodeURIComponent(trimmed)}?page=${page}&limit=8`);
    if (res.status === 404) {
      showAlert('Nenhum Digimon encontrado para o nível selecionado.');
      cardsContainer.innerHTML = '';
      pageInfo.textContent = '';
      return;
    }
    if (!res.ok) throw new Error('Falha ao filtrar por nível.');
    const data = await res.json();
    currentMode = 'level';
    currentQuery.level = trimmed;
    currentPage = data.pagina || page || 1;
    currentTotal = data.total;
    renderList(data.resultados, currentPage, data.total, 8);
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
  if (currentPage <= 1) return;
  if (currentMode === 'list') fetchPage(currentPage - 1);
  else if (currentMode === 'search') fetchSearchPage(currentPage - 1);
  else if (currentMode === 'level') fetchByLevel(currentQuery.level, currentPage - 1);
});

nextPageBtn.addEventListener('click', () => {
  if (currentMode === 'list') fetchPage(currentPage + 1);
  else if (currentMode === 'search') fetchSearchPage(currentPage + 1);
  else if (currentMode === 'level') fetchByLevel(currentQuery.level, currentPage + 1);
});

// Carrega a primeira página ao abrir
fetchPage(1);


