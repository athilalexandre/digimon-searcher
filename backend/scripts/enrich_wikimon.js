/*
  Enriquecimento com Wikimon (https://wikimon.net)
  - Para cada Digimon no JSON local, tenta:
    • Encontrar a página do Wikimon pelo nome (slug simples com _)
    • Extrair: imagem principal (JPG/PNG), descrição (primeiro parágrafo),
      técnicas de ataque (tabela com nome/descrição)
    • Sobrescreve as imagens do Digimon para apontar para a imagem do Wikimon
    • Guarda metadados em d.wiki { url, imagemUrl }

  Observações:
  - Processo best-effort. Alguns nomes possuem variações e podem não existir
    exatamente com o mesmo título no Wikimon.
*/

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const DATA_PATH = path.join(__dirname, '..', 'data', 'digimons.json');

function buildWikimonUrlFromName(name) {
  const slug = String(name).replace(/\s+/g, '_');
  return encodeURI(`https://wikimon.net/${slug}`);
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'digimon-searcher/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function absolutize(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://wikimon.net${url}`;
}

function extractFirstParagraph($) {
  // Primeiro parágrafo longo na área de conteúdo
  const ps = $('.mw-parser-output > p');
  for (let i = 0; i < ps.length; i += 1) {
    const text = $(ps[i]).text().trim();
    if (text && text.length > 60) return text;
  }
  return '';
}

function extractMainImage($) {
  // Pega a primeira imagem do conteúdo principal
  let href = $('a.image').first().attr('href');
  if (!href) {
    // fallback: qualquer link para /images/
    href = $('a[href*="/images/"]').first().attr('href');
  }
  return absolutize(href);
}

function extractAttackTechniques($) {
  // Procura por uma tabela que contenha cabeçalhos Name/Description (varia por idioma)
  const tables = $('table.wikitable');
  const ataques = [];
  tables.each((_, tbl) => {
    const headers = $(tbl).find('th').map((i, th) => $(th).text().trim().toLowerCase()).get();
    const hasDescription = headers.some((h) => h.includes('description'));
    const hasName = headers.some((h) => h.includes('name'));
    if (hasDescription && hasName) {
      $(tbl)
        .find('tr')
        .slice(1)
        .each((i, tr) => {
          const tds = $(tr).find('td');
          if (tds.length >= 2) {
            const nome = $(tds[0]).text().replace(/\s+/g, ' ').trim();
            const descricao = $(tds[tds.length - 1])
              .text()
              .replace(/\s+/g, ' ')
              .trim();
            if (nome && descricao) ataques.push({ nome, descricao });
          }
        });
    }
  });
  return ataques;
}

async function enrichOne(d) {
  const url = buildWikimonUrlFromName(d.nome);
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const descricao = extractFirstParagraph($);
    const imagemUrl = extractMainImage($);
    const ataques = extractAttackTechniques($);

    if (imagemUrl) {
      d.imagens = [imagemUrl];
      d.imagem = imagemUrl;
    }
    if (descricao) {
      d.descricao = descricao; // Em inglês (origem Wikimon). UI permanece PT-BR.
    }
    if (ataques.length) {
      d.ataques = ataques;
    }
    d.wiki = { url, imagemUrl };
  } catch (e) {
    // Silencia erros por item; continua com dados existentes
    d.wiki = { url, erro: e.message };
  }
  return d;
}

async function main() {
  const raw = await fs.promises.readFile(DATA_PATH, 'utf8');
  const digis = JSON.parse(raw);

  // Processa com baixa concorrência para respeitar o site
  const concurrency = 3;
  const queue = [...digis.keys()];
  const promises = new Array(concurrency).fill(0).map(async () => {
    while (queue.length) {
      const idx = queue.shift();
      const d = digis[idx];
      await enrichOne(d);
    }
  });
  await Promise.all(promises);

  await fs.promises.writeFile(DATA_PATH, JSON.stringify(digis, null, 2), 'utf8');
  console.log('Enriquecimento Wikimon concluído.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


