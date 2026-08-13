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
    });
  }
  return driveTokenClient;
}

function requestDriveAccessToken() {
  return new Promise((resolve, reject) => {
    const client = ensureDriveTokenClient();
    client.callback = (resp) => {
      if (resp.error) { reject(new Error(resp.error)); return; }
      driveAccessToken = resp.access_token;
      resolve(driveAccessToken);
    };
    client.requestAccessToken({ prompt: driveAccessToken ? "" : "consent" });
  });
}

async function driveFetch(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers, { Authorization: `Bearer ${driveAccessToken}` });
  const res = await fetch(url, options);
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

async function uploadPdfToDrive(blob, filename, folderId) {
  const metadata = { name: filename, parents: [folderId], mimeType: "application/pdf" };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", blob);

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    { method: "POST", headers: { Authorization: `Bearer ${driveAccessToken}` }, body: form }
  );
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

  await requestDriveAccessToken();
  const folderId = await getOrCreateEmpresaFolder(empresaId, empresaNome, tipoKey);
  const blob = await generatePdfBlob(elementId);
  const filename = sanitizeDriveFilename(`${tipoLabel} - ${empresaNome}${cnpj ? " - " + cnpj : ""}.pdf`);
  return uploadPdfToDrive(blob, filename, folderId);
}
