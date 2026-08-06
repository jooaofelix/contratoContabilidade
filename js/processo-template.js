function phP2(value, placeholder) {
  const v = (value || "").toString().trim();
  return v
    ? escapeHtmlP2(v)
    : `<span class="placeholder">${escapeHtmlP2(placeholder || "")}</span>`;
}

function escapeHtmlP2(str) {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pSectionBar(title) {
  return `<div class="fc-row fc-section-bar"><div class="fc-cell">${escapeHtmlP2(title)}</div></div>`;
}

function pNameRow(text) {
  return `
    <div class="fc-row fc-row-name">
      <div class="fc-cell fc-cell-name">${phP2(text, "[Contratante]")}</div>
      <div class="fc-cell fc-cell-blank"></div>
      <div class="fc-cell fc-cell-blank"></div>
    </div>`;
}

function pRow(label, value) {
  return `
    <div class="fc-row">
      <div class="fc-cell fc-cell-label">${escapeHtmlP2(label)}</div>
      <div class="fc-cell fc-cell-value">${phP2(value)}</div>
    </div>`;
}

function pRowSplit(label1, value1, label2, value2) {
  return `
    <div class="fc-row">
      <div class="fc-cell fc-cell-label">${escapeHtmlP2(label1)}</div>
      <div class="fc-cell fc-cell-value">${phP2(value1)}</div>
      <div class="fc-cell fc-cell-label fc-cell-label-2">${escapeHtmlP2(label2)}</div>
      <div class="fc-cell fc-cell-value">${phP2(value2)}</div>
    </div>`;
}

function pRowLong(label, value) {
  return `
    <div class="fc-row">
      <div class="fc-cell fc-cell-label fc-cell-label-top">${escapeHtmlP2(label)}</div>
      <div class="fc-cell fc-cell-value fc-cell-long fc-desc-box">${value}</div>
    </div>`;
}

function pAltRow(campo, de, para) {
  return `
    <div class="fc-row fc-alt-table">
      <div class="fc-cell fc-cell-label">${phP2(campo, "[Campo]")}</div>
      <div class="fc-cell fc-cell-value">${phP2(de, "—")}</div>
      <div class="fc-cell fc-alt-arrow">→</div>
      <div class="fc-cell fc-cell-value">${phP2(para, "—")}</div>
    </div>`;
}

function formatDateBr2(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function buildDescricaoAlteracoes(alteracoes) {
  const validas = alteracoes.filter((a) => a.campo && (a.de || a.para));
  if (validas.length === 0) {
    return '<span class="placeholder">Nenhuma alteração informada.</span>';
  }
  return validas
    .map((a) => `${escapeHtmlP2(a.campo)}: ${escapeHtmlP2(a.de || "—")} → ${escapeHtmlP2(a.para || "—")}`)
    .join("\n");
}

function renderProcesso(data) {
  const { f, p, alteracoes } = data;

  const validAlteracoes = alteracoes.filter((a) => a.campo || a.de || a.para);
  const alteracoesRows = validAlteracoes.length
    ? validAlteracoes.map((a) => pAltRow(a.campo, a.de, a.para)).join("")
    : `<div class="fc-row"><div class="fc-cell fc-cell-value"><span class="placeholder">Nenhuma alteração adicionada.</span></div></div>`;

  return `
    <div class="fc-title-box">FICHA DE PROCESSO</div>

    <div class="fc-table">
      ${pSectionBar("DADOS DA EMPRESA (ATUAL)")}
      ${pNameRow(f.contratante)}
      ${pRow("CNPJ:", f.cnpj)}
      ${pRow("Endereço:", f.endereco)}

      ${pSectionBar("DO PROCESSO")}
      ${pRowSplit("Tipo:", p.tipo, "Data:", formatDateBr2(p.data))}
      ${pRow("Protocolo/Nº:", p.protocolo)}

      ${pSectionBar("ALTERAÇÕES SOLICITADAS")}
      ${alteracoesRows}

      ${pSectionBar("DESCRIÇÃO DAS ALTERAÇÕES")}
      ${pRowLong("Resumo:", buildDescricaoAlteracoes(alteracoes))}

      ${pSectionBar("OBSERVAÇÕES")}
      ${pRowLong("Observações:", p.observacoes ? escapeHtmlP2(p.observacoes).replace(/\n/g, "<br>") : '<span class="placeholder">—</span>')}
    </div>
  `;
}
