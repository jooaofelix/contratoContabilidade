// Envia a Ficha Cadastral por e-mail (PDF + Word anexados) via API do
// Gmail, usando a mesma conta Google já autorizada pro Drive/Planilha.
// Escopo próprio (gmail.send) — pede autorização na hora que o botão de
// e-mail é clicado, como uma ação separada e deliberada.

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";

let gmailTokenClient = null;
let gmailAccessToken = null;

function gmailConfigured() {
  return !!(typeof DRIVE_CONFIG !== "undefined" && DRIVE_CONFIG.clientId);
}

function ensureGmailTokenClient() {
  if (!gmailTokenClient) {
    gmailTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CONFIG.clientId,
      scope: GMAIL_SCOPE,
      callback: () => {},
      error_callback: () => {},
    });
  }
  return gmailTokenClient;
}

function requestGmailAccessToken() {
  return new Promise((resolve, reject) => {
    const client = ensureGmailTokenClient();
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(
        "Tempo esgotado aguardando a autorização do Google. Verifique se o navegador bloqueou um pop-up " +
        "e permita pop-ups para este site."
      ));
    }, 45000);

    client.callback = (resp) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (resp.error) { reject(new Error(resp.error)); return; }
      gmailAccessToken = resp.access_token;
      resolve(gmailAccessToken);
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

async function ensureGmailAccessToken() {
  if (gmailAccessToken) return gmailAccessToken;
  return requestGmailAccessToken();
}

function handleGmailAuthExpired() {
  gmailAccessToken = null;
}

async function gmailFetch(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers, {
    Authorization: `Bearer ${gmailAccessToken}`,
    "Content-Type": "application/json",
  });
  const res = await fetch(url, options);
  if (res.status === 401) {
    handleGmailAuthExpired();
    throw new Error("Sessão do Gmail expirou. Clique de novo para autorizar.");
  }
  if (!res.ok) throw new Error(`Gmail API ${res.status}: ${await res.text()}`);
  return res;
}

function escapeHtmlEmail(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Lê um Blob como base64 puro (sem o prefixo "data:...;base64,") — jeito
// mais simples e seguro pra binário grande, sem precisar montar a string
// byte a byte.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1] || "");
    reader.onerror = () => reject(new Error("Não foi possível ler o anexo."));
    reader.readAsDataURL(blob);
  });
}

function base64UrlEncodeText(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeMimeSubject(subject) {
  return `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
}

function wrapBase64Lines(base64) {
  return base64.replace(/(.{76})/g, "$1\r\n");
}

function buildEmailFichaHtml({ empresaNome, cnpj }) {
  const dataHoje = new Date().toLocaleDateString("pt-BR");
  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #101a35 0%, #16294f 100%); padding: 28px 24px; text-align: center;">
      <div style="color: #ffffff; font-size: 20px; font-weight: 800;">AEA CONTABILIDADE CONSULTIVA</div>
      <div style="color: #57b8ff; font-size: 13px; font-weight: 700; margin-top: 8px; letter-spacing: 0.06em;">NOVA FICHA CADASTRADA</div>
    </div>
    <div style="padding: 24px; background: #ffffff;">
      <p style="font-size: 14px; color: #111827; line-height: 1.5; margin: 0 0 16px;">
        Uma nova ficha cadastral foi criada no sistema interno. Os arquivos em <strong>PDF</strong> e <strong>Word</strong> estão anexados a este e-mail.
      </p>
      <div style="background: #eef2f7; border-radius: 8px; padding: 18px 20px;">
        <div style="font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Empresa</div>
        <div style="font-size: 16px; color: #101a35; font-weight: 800; margin: 2px 0 14px;">${escapeHtmlEmail(empresaNome || "—")}</div>
        <div style="font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">CNPJ</div>
        <div style="font-size: 14px; color: #101a35; font-weight: 700; margin: 2px 0 14px;">${escapeHtmlEmail(cnpj || "—")}</div>
        <div style="font-size: 11px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">Data do cadastro</div>
        <div style="font-size: 14px; color: #101a35; font-weight: 700; margin: 2px 0 0;">${dataHoje}</div>
      </div>
      <p style="font-size: 12px; color: #9ca3af; margin: 20px 0 0;">E-mail automático gerado pelo sistema interno da AEA Contabilidade Consultiva.</p>
    </div>
  </div>`;
}

// Monta a mensagem RFC 2822 (multipart/mixed) com o corpo em HTML e os
// anexos em base64 — formato que a API do Gmail espera no campo "raw"
// (esse texto composto é, por sua vez, codificado em base64url inteiro).
async function buildRawEmail({ destinatarios, assunto, corpoHtml, anexos }) {
  const boundary = "AEA_FICHA_" + Date.now();
  const linhas = [];
  linhas.push(`To: ${destinatarios.join(", ")}`);
  linhas.push(`Subject: ${encodeMimeSubject(assunto)}`);
  linhas.push("MIME-Version: 1.0");
  linhas.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  linhas.push("");
  linhas.push(`--${boundary}`);
  linhas.push('Content-Type: text/html; charset="UTF-8"');
  linhas.push("Content-Transfer-Encoding: base64");
  linhas.push("");
  linhas.push(wrapBase64Lines(btoa(unescape(encodeURIComponent(corpoHtml)))));

  for (const anexo of anexos) {
    const base64 = await blobToBase64(anexo.blob);
    linhas.push(`--${boundary}`);
    linhas.push(`Content-Type: ${anexo.mimeType}; name="${anexo.filename}"`);
    linhas.push(`Content-Disposition: attachment; filename="${anexo.filename}"`);
    linhas.push("Content-Transfer-Encoding: base64");
    linhas.push("");
    linhas.push(wrapBase64Lines(base64));
  }

  linhas.push(`--${boundary}--`);
  return linhas.join("\r\n");
}

function parseDestinatarios(texto) {
  return (texto || "")
    .split(/[,;\n]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

// Gera o PDF e o Word da ficha em tela (elementId) e envia por e-mail pros
// destinatários informados, com o assunto "Nova ficha cadastrada".
async function sendFichaPorEmail({ destinatariosTexto, empresaNome, cnpj, elementId }) {
  if (!gmailConfigured()) throw new Error("Integração de e-mail ainda não foi configurada.");

  const destinatarios = parseDestinatarios(destinatariosTexto);
  if (destinatarios.length === 0) throw new Error("Informe ao menos um e-mail de destino.");
  if (!empresaNome) throw new Error("Preencha ao menos o Contratante antes de enviar por e-mail.");

  await ensureGmailAccessToken();

  const nomeArquivo = sanitizeWordFilename(`Ficha Cadastral - ${empresaNome}${cnpj ? " - " + cnpj : ""}`);
  const [pdfBlob, wordResult] = await Promise.all([
    generatePdfBlob(elementId),
    Promise.resolve(buildWordBlob(elementId, nomeArquivo)),
  ]);

  const raw = await buildRawEmail({
    destinatarios,
    assunto: "Nova ficha cadastrada",
    corpoHtml: buildEmailFichaHtml({ empresaNome, cnpj }),
    anexos: [
      { blob: pdfBlob, mimeType: "application/pdf", filename: `${nomeArquivo}.pdf` },
      { blob: wordResult.blob, mimeType: "application/msword", filename: wordResult.filename },
    ],
  });

  await gmailFetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: base64UrlEncodeText(raw) }),
  });

  return { destinatarios };
}
