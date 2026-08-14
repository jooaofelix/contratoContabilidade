// Geração de PDF real (html2pdf) e upload automático para o Google Drive,
// numa subpasta por cliente criada uma vez e lembrada em empresa.driveFolderId.

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

let driveTokenClient = null;
let driveAccessToken = null;

function driveConfigured() {
  return !!(
    typeof DRIVE_CONFIG !== "undefined" &&
    DRIVE_CONFIG.clientId &&
    DRIVE_CONFIG.folders &&
    Object.values(DRIVE_CONFIG.folders).some(Boolean)
  );
}

function ensureDriveTokenClient() {
  if (!driveTokenClient) {
    driveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CONFIG.clientId,
      scope: DRIVE_SCOPE,
      callback: () => {}, // sobrescrito a cada chamada de requestDriveAccessToken
      error_callback: () => {}, // idem
    });
  }
  return driveTokenClient;
}

// Pede o token de acesso ao Drive. Tem timeout e captura o error_callback do
// GIS porque, se o navegador bloquear o pop-up de autorização (comum no
// Safari quando a chamada não acontece bem na sequência do clique do
// usuário), nem callback nem erro disparam sozinhos — e sem isso a promise
// ficava pendurada pra sempre, travando quem chamou.
function requestDriveAccessToken() {
  return new Promise((resolve, reject) => {
    const client = ensureDriveTokenClient();
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(
        "Tempo esgotado aguardando a autorização do Google. Verifique se o navegador bloqueou um pop-up " +
        "(no Safari costuma aparecer um aviso na barra de endereço) e permita pop-ups para este site."
      ));
    }, 45000);

    client.callback = (resp) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (resp.error) { reject(new Error(resp.error)); return; }
      driveAccessToken = resp.access_token;
      resolve(driveAccessToken);
    };

    client.error_callback = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(new Error(
        "Não foi possível abrir a janela de autorização do Google (" + (err && err.type ? err.type : "erro desconhecido") + "). " +
        "Verifique se pop-ups estão bloqueados para este site."
      ));
    };

    client.requestAccessToken({ prompt: "consent" });
  });
}

// Só pede autorização de verdade quando ainda não temos um token válido.
// Chamar requestAccessToken() de novo a cada arquivo (mesmo com prompt: "")
// ainda tenta abrir uma janela por baixo dos panos, e o Safari bloqueia isso
// quando não é uma resposta direta e imediata a um clique — foi o que travou
// a geração em lote depois do primeiro arquivo. Um token só, reaproveitado
// pra tudo, resolve.
async function ensureDriveAccessToken() {
  if (driveAccessToken) return driveAccessToken;
  return requestDriveAccessToken();
}

// Se o Drive responder 401, o token expirou/foi revogado: limpa o cache pra
// forçar um novo pedido de autorização na próxima tentativa (o usuário vai
// precisar clicar de novo, já que isso exige um clique fresco).
function handleDriveAuthExpired() {
  driveAccessToken = null;
}

async function driveFetch(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers, { Authorization: `Bearer ${driveAccessToken}` });
  const res = await fetch(url, options);
  if (res.status === 401) {
    handleDriveAuthExpired();
    throw new Error("Sessão do Drive expirou. Clique em salvar/gerar de novo para autorizar novamente.");
  }
  if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
  return res;
}

async function findDriveFolderByName(name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const q = encodeURIComponent(
    `name = '${safeName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await res.json();
  return data.files && data.files[0] ? data.files[0].id : null;
}

async function findDriveFileByName(name, parentId) {
  const safeName = name.replace(/'/g, "\\'");
  const q = encodeURIComponent(`name = '${safeName}' and '${parentId}' in parents and trashed = false`);
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await res.json();
  return data.files && data.files[0] ? data.files[0].id : null;
}

async function createDriveFolder(name, parentId) {
  const res = await driveFetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  const data = await res.json();
  return data.id;
}

async function getOrCreateEmpresaFolder(empresaId, empresaNome, tipoKey) {
  const rootFolderId = DRIVE_CONFIG.folders[tipoKey];
  if (!rootFolderId) throw new Error(`Pasta do Drive não configurada para "${tipoKey}".`);

  const empresa = await getEmpresa(empresaId);
  const existing = empresa && empresa.driveFolders && empresa.driveFolders[tipoKey];
  if (existing) return existing;

  let folderId = await findDriveFolderByName(empresaNome, rootFolderId);
  if (!folderId) folderId = await createDriveFolder(empresaNome, rootFolderId);

  await setEmpresaDriveFolder(empresaId, tipoKey, folderId);
  return folderId;
}

async function generatePdfBlob(elementId) {
  const el = document.getElementById(elementId);
  return html2pdf().from(el).set({
    margin: 0,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  }).outputPdf("blob");
}

// Se já existe um arquivo com esse nome nessa pasta, atualiza o conteúdo dele
// (PATCH) em vez de criar outro — assim cada empresa fica sempre com um único
// PDF por tipo de documento, atualizado por cima do anterior.
async function uploadPdfToDrive(blob, filename, folderId) {
  const existingFileId = await findDriveFileByName(filename, folderId);

  const metadata = { name: filename, mimeType: "application/pdf" };
  if (!existingFileId) metadata.parents = [folderId];

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,webViewLink`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink";
  const method = existingFileId ? "PATCH" : "POST";

  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${driveAccessToken}` }, body: form });
  if (res.status === 401) {
    handleDriveAuthExpired();
    throw new Error("Sessão do Drive expirou. Clique em salvar/gerar de novo para autorizar novamente.");
  }
  if (!res.ok) throw new Error(`Falha no upload (${res.status}): ${await res.text()}`);
  return res.json();
}

function sanitizeDriveFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}

// Orquestra: pede acesso, garante a subpasta do cliente, gera o PDF a partir
// do preview já renderizado na tela e sobe pro Drive.
async function saveDocumentToDrive({ elementId, empresaId, empresaNome, cnpj, tipoLabel, tipoKey }) {
  if (!driveConfigured()) throw new Error("Integração com o Drive ainda não foi configurada.");
  if (!empresaId || !empresaNome) throw new Error("Salve a empresa antes de enviar para o Drive.");

  await ensureDriveAccessToken();
  const folderId = await getOrCreateEmpresaFolder(empresaId, empresaNome, tipoKey);
  const blob = await generatePdfBlob(elementId);
  const filename = sanitizeDriveFilename(`${tipoLabel} - ${empresaNome}${cnpj ? " - " + cnpj : ""}.pdf`);
  return uploadPdfToDrive(blob, filename, folderId);
}
