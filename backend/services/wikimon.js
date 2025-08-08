const cheerio = require('cheerio');

function buildWikimonUrlFromName(name) {
  const slug = String(name).replace(/\s+/g, '_');
  return encodeURI(`https://wikimon.net/${slug}`);
}

function absolutize(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `https://wikimon.net${url}`;
}

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'digimon-searcher/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractFirstParagraph($) {
  const ps = $('.mw-parser-output > p');
  for (let i = 0; i < ps.length; i += 1) {
    const text = $(ps[i]).text().trim();
    if (text && text.length > 60) return text;
  }
  return '';
}

function extractMainImage($) {
  // Preferir o src direto de uma imagem entregue pelo wiki (/images/)
  const imgSrc = $('.mw-parser-output img[src*="/images/"]').first().attr('src')
    || $('img[src*="/images/"]').first().attr('src');
  if (imgSrc) return absolutize(imgSrc);

  // Fallback: algum link direto para /images/
  const hrefDirect = $('a[href*="/images/"]').first().attr('href');
  if (hrefDirect) return absolutize(hrefDirect);

  // Último recurso: link da âncora de imagem (normalmente /File:... – pode não ser a imagem final)
  const fileHref = $('a.image').first().attr('href');
  return absolutize(fileHref);
}

function extractAttackTechniques($) {
  const ataques = [];

  // 1) Tabelas com cabeçalhos (Name/Description | Special Move/Description)
  $('table.wikitable').each((_, tbl) => {
    const headers = $(tbl)
      .find('th')
      .map((i, th) => $(th).text().trim().toLowerCase())
      .get();
    const hasDesc = headers.some((h) => h.includes('description') || h.includes('effect'));
    const hasName = headers.some((h) => h.includes('name') || h.includes('special'));
    if (hasDesc && hasName) {
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
            if (nome) ataques.push({ nome, descricao });
          }
        });
    }
  });

  if (ataques.length) return ataques;

  // 2) Listas após título "Attack Techniques"/"Attacks"/"Special Move"
  const heading = $('h2, h3')
    .filter((i, el) => /attack|special move|technique/i.test($(el).text()))
    .first();
  if (heading && heading.length) {
    const next = heading.nextAll('ul, ol').first();
    if (next && next.length) {
      next.find('li').each((i, li) => {
        const text = $(li).text().replace(/\s+/g, ' ').trim();
        if (text) ataques.push({ nome: text, descricao: '' });
      });
    }
  }

  return ataques;
}

async function fetchWikimonDetails(name) {
  const url = buildWikimonUrlFromName(name);
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const descricao = extractFirstParagraph($);
  const imagemUrl = extractMainImage($);
  const ataques = extractAttackTechniques($);
  return { url, descricao, imagemUrl, ataques };
}

module.exports = { fetchWikimonDetails };


