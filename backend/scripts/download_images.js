/*
  Baixa imagens de Digimons e Fields para servir localmente.
  - Lê backend/data/digimons.json
  - Cria backend/public/digimon e backend/public/fields
  - Baixa imagens remotas e salva com nomes seguros
  - Atualiza o JSON para apontar para /static/digimon/... e /static/fields/...

  Uso:
    node scripts/download_images.js
*/

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'digimons.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DIGIMON_DIR = path.join(PUBLIC_DIR, 'digimon');
const FIELDS_DIR = path.join(PUBLIC_DIR, 'fields');

function safeName(name) {
  return String(name)
    .replace(/[^a-z0-9_\-\.]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

async function downloadTo(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar ${url}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.promises.mkdir(path.dirname(dest), { recursive: true });
  await fs.promises.writeFile(dest, buffer);
  return dest;
}

async function main() {
  const raw = await fs.promises.readFile(DATA_PATH, 'utf8');
  const digis = JSON.parse(raw);

  await fs.promises.mkdir(DIGIMON_DIR, { recursive: true });
  await fs.promises.mkdir(FIELDS_DIR, { recursive: true });

  // Map para cachear downloads de fields repetidos
  const fieldImageMap = new Map();

  for (const d of digis) {
    // Imagem do Digimon
    const primary = Array.isArray(d.imagens) && d.imagens.length ? d.imagens[0] : d.imagem;
    if (primary) {
      try {
        const ext = path.extname(new URL(primary).pathname) || '.png';
        const filename = safeName(`${d.nome}${ext}`);
        const localPath = path.join(DIGIMON_DIR, filename);
        const localUrl = `/static/digimon/${filename}`;
        if (!fs.existsSync(localPath)) {
          await downloadTo(primary, localPath);
        }
        // atualiza caminhos no objeto
        d.imagem = localUrl;
        d.imagens = [localUrl];
      } catch (e) {
        console.warn('Falha ao baixar imagem do digimon', d.nome, e.message);
      }
    }

    // Imagens dos fields
    if (Array.isArray(d.camposDetalhes)) {
      for (const f of d.camposDetalhes) {
        if (f && f.imagem) {
          try {
            let localUrl = fieldImageMap.get(f.imagem);
            if (!localUrl) {
              const extF = path.extname(new URL(f.imagem).pathname) || '.png';
              const filenameF = safeName(`${f.nome}${extF}`);
              const localPathF = path.join(FIELDS_DIR, filenameF);
              localUrl = `/static/fields/${filenameF}`;
              if (!fs.existsSync(localPathF)) {
                await downloadTo(f.imagem, localPathF);
              }
              fieldImageMap.set(f.imagem, localUrl);
            }
            f.imagem = localUrl;
          } catch (e) {
            console.warn('Falha ao baixar imagem do field', f && f.nome, e.message);
          }
        }
      }
    }
  }

  await fs.promises.writeFile(DATA_PATH, JSON.stringify(digis, null, 2), 'utf8');
  console.log('Imagens baixadas e JSON atualizado:', DATA_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


