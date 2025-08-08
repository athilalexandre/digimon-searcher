/*
  Bootstrap de inicialização da API
  - Verifica dataset local (backend/data/digimons.json)
  - Se estiver ausente ou muito pequeno, executa:
      1) sync (baixa todos os Digimons/fields da DAPI)
      2) images (baixa imagens e atualiza caminhos locais)
  - Em seguida, inicia o servidor (app.js)

  Variáveis de ambiente:
    FORCE_SYNC=true  -> força a sincronização completa
*/

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const DATA_PATH = path.join(__dirname, '..', 'data', 'digimons.json');

function runNode(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptPath} saiu com código ${code}`));
    });
    child.on('error', reject);
  });
}

function datasetStats() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(raw);
    const count = Array.isArray(data) ? data.length : 0;
    return { exists: true, count };
  } catch (e) {
    return { exists: false, count: 0 };
  }
}

async function ensureDataset() {
  const force = String(process.env.FORCE_SYNC || '').toLowerCase() === 'true';
  const { exists, count } = datasetStats();
  const needsSync = force || !exists || count < 500; // limiar para considerar dataset completo

  if (!needsSync) {
    console.log(`[bootstrap] Dataset OK (${count} itens). Pulando sincronização.`);
    return;
  }

  console.log('[bootstrap] Iniciando sincronização completa com a DAPI...');
  await runNode(path.join(__dirname, 'sync.js'));

  console.log('[bootstrap] Baixando imagens e atualizando caminhos locais...');
  await runNode(path.join(__dirname, 'download_images.js'));
}

async function start() {
  try {
    await ensureDataset();
  } catch (e) {
    console.error('[bootstrap] Erro durante preparação de dados:', e.message);
  }
  // Após preparar dados, inicia servidor
  require('..' + path.sep + 'app.js');
}

start();


