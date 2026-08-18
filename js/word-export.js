// Exporta o conteúdo já renderizado na tela como um arquivo que o Word abre
// direto (HTML com os namespaces do Office, salvo com extensão .doc — truque
// clássico e confiável, sem precisar montar um .docx de verdade por baixo).

function sanitizeWordFilename(name) {
  return (name || "documento").replace(/[\\/:*?"<>|]/g, "-").trim();
}

function exportElementAsWord(elementId, filename) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${sanitizeWordFilename(filename)}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111827; }
        .doc-topline, .doc-footline { text-align: center; font-size: 9pt; font-weight: bold; color: #1b3a5c; }
        .doc-banner { background: #1b3a5c; color: #fff; padding: 16px; text-align: center; }
        .doc-banner-name { font-size: 16pt; font-weight: bold; }
        .doc-banner-title { font-size: 13pt; font-weight: bold; margin-top: 6px; }
        .doc-section-bar { color: #1b3a5c; font-weight: bold; margin: 16px 0 6px; border-bottom: 2px solid #1b3a5c; }
        .doc-h3, .doc-h4-sub, .clause-title { color: #1b3a5c; font-weight: bold; margin-top: 14px; }
        .doc-p { text-align: justify; margin: 0 0 8px; }
        .doc-row { border-bottom: 1px solid #d1d5db; padding: 4px 0; }
        .doc-cell-label { font-weight: bold; }
        .placeholder { color: #9ca3af; }
        .signatures, .witnesses { margin-top: 30px; }
        .sig-line { text-align: center; margin-bottom: 24px; }
        .sig-line .line { border-top: 1px solid #111827; width: 260px; margin: 0 auto 4px; }
      </style>
    </head>
    <body>${el.innerHTML}</body>
    </html>
  `;

  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeWordFilename(filename)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
