function phF(value, placeholder) {
  const v = (value || "").toString().trim();
  return v
    ? escapeHtmlF(v)
    : `<span class="placeholder">${escapeHtmlF(placeholder || "")}</span>`;
}

function escapeHtmlF(str) {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fcSectionBar(title) {
  return `<div class="fc-row fc-section-bar"><div class="fc-cell">${escapeHtmlF(title)}</div></div>`;
}

function fcNameRow(text) {
  return `
    <div class="fc-row fc-row-name">
      <div class="fc-cell fc-cell-name">${phF(text, "[Contratante]")}</div>
      <div class="fc-cell fc-cell-blank"></div>
      <div class="fc-cell fc-cell-blank"></div>
    </div>`;
}

function fcRow(label, value) {
  return `
    <div class="fc-row">
      <div class="fc-cell fc-cell-label">${escapeHtmlF(label)}</div>
      <div class="fc-cell fc-cell-value">${phF(value)}</div>
    </div>`;
}

function fcRowSplit(label1, value1, label2, value2) {
  return `
    <div class="fc-row">
      <div class="fc-cell fc-cell-label">${escapeHtmlF(label1)}</div>
      <div class="fc-cell fc-cell-value">${phF(value1)}</div>
      <div class="fc-cell fc-cell-label fc-cell-label-2">${escapeHtmlF(label2)}</div>
      <div class="fc-cell fc-cell-value">${phF(value2)}</div>
    </div>`;
}

function fcRowLong(label, value) {
  return `
    <div class="fc-row">
      <div class="fc-cell fc-cell-label fc-cell-label-top">${escapeHtmlF(label)}</div>
      <div class="fc-cell fc-cell-value fc-cell-long">${phF(value)}</div>
    </div>`;
}

function renderFicha(data) {
  const { f } = data;

  return `
    <div class="fc-title-box">FICHA DE CADASTRO DE EMPRESA</div>

    <div class="fc-table">
      ${fcSectionBar("DADOS CONTÁBEIS")}
      ${fcNameRow(f.contratante)}
      ${fcRow("CNPJ:", f.cnpj)}
      ${fcRow("Endereço:", f.endereco)}
      ${fcRow("Bairro:", f.bairro)}
      ${fcRow("Cidade:", f.cidade)}
      ${fcRowSplit("Estado:", f.estado, "CEP:", f.cep)}
      ${fcRow("E-mail:", f.email)}
      ${fcRow("Contato Principal:", f.contatoPrincipal)}
      ${fcRow("Administração:", f.administracao)}
      ${fcRowSplit("Sócio 01:", f.socio1, "CAPITAL", f.capitalSocio1 ? f.capitalSocio1 + "%" : "")}
      ${fcRowSplit("Sócio 02:", f.socio2, "CAPITAL", f.capitalSocio2 ? f.capitalSocio2 + "%" : "")}
      ${fcRowSplit("Vigência:", f.vigencia, "PLANO:", f.plano)}
      ${fcRow("CNAE Principal:", f.cnaePrincipal)}
      ${fcRowLong("CNAE Secundário:", f.cnaeSecundario)}
      ${fcRowSplit("TRIBUTAÇÃO", f.tributacao, "VALOR CAPITAL", f.valorCapital)}

      ${fcSectionBar("DEPARTAMENTO PESSOAL (DP)")}
      ${fcRowSplit("Pró-labore:", f.proLabore, "Funcionários:", f.funcionarios)}

      ${fcSectionBar("FISCAL")}
      ${fcRow("Emissão de nota pelo escritório:", f.emissaoNota)}
      ${fcRowSplit("Situação:", f.situacao, "Anexo Simples:", f.anexoSimples)}
      ${fcRowSplit("Insc. Estadual:", f.inscEstadual, "Insc. Municipal:", f.inscMunicipal)}
    </div>
  `;
}
