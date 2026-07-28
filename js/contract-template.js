function ph(value, placeholder) {
  const v = (value || "").toString().trim();
  return v
    ? escapeHtml(v)
    : `<span class="placeholder">${escapeHtml(placeholder)}</span>`;
}

function escapeHtml(str) {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDateExtenso(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${parseInt(day, 10)} de ${MESES[parseInt(month, 10) - 1]} de ${year}`;
}

function buildServicosList(s) {
  const items = [];
  if (s.contabil) items.push("Escrituração contábil, com elaboração dos livros e demonstrações exigidos por lei");
  if (s.fiscal) items.push("Escrituração fiscal e apuração dos tributos devidos");
  if (s.dp) items.push("Departamento pessoal, incluindo folha de pagamento e obrigações trabalhistas");
  if (s.obrigacoes) items.push("Cumprimento das obrigações acessórias perante os órgãos federais, estaduais e municipais (SPED, DCTF, EFD, entre outras)");
  if (s.consultoria) items.push("Consultoria contábil e tributária");
  return items;
}

// -- helpers de tabela, no mesmo padrão visual da Ficha de Cadastro --

function sectionBar(title) {
  return `<div class="doc-section-bar">${escapeHtml(title)}</div>`;
}

function nameRow(text, placeholder) {
  return `<div class="doc-row doc-row-name"><div class="doc-cell doc-cell-name">${ph(text, placeholder)}</div></div>`;
}

function row(label, value, placeholder) {
  return `
    <div class="doc-row">
      <div class="doc-cell doc-cell-label">${escapeHtml(label)}</div>
      <div class="doc-cell doc-cell-value">${ph(value, placeholder || "—")}</div>
    </div>`;
}

function rowSplit(label1, value1, ph1, label2, value2, ph2) {
  return `
    <div class="doc-row doc-row-split">
      <div class="doc-cell doc-cell-label">${escapeHtml(label1)}</div>
      <div class="doc-cell doc-cell-value">${ph(value1, ph1 || "—")}</div>
      <div class="doc-cell doc-cell-label">${escapeHtml(label2)}</div>
      <div class="doc-cell doc-cell-value">${ph(value2, ph2 || "—")}</div>
    </div>`;
}

function rowLong(label, html) {
  return `
    <div class="doc-row">
      <div class="doc-cell doc-cell-label doc-cell-label-top">${escapeHtml(label)}</div>
      <div class="doc-cell doc-cell-value doc-cell-long">${html}</div>
    </div>`;
}

function renderContract(data) {
  const { contratante, contratada, servicos, honorarios, vigencia, foro } = data;

  const servicosItems = buildServicosList(servicos);
  const servicosHtml = servicosItems.length
    ? servicosItems.join("; ") + "."
    : '<span class="placeholder">Nenhum serviço selecionado.</span>';

  const prazoTexto =
    vigencia.prazo === "determinado"
      ? `Determinado — ${ph(vigencia.meses, "___")} meses`
      : "Indeterminado";

  const obrigacoesContratada = `A CONTRATADA se obriga a executar os serviços descritos acima com zelo, diligência e observância das normas técnicas e legais aplicáveis à profissão contábil, mantendo sigilo sobre as informações da CONTRATANTE.`;

  const obrigacoesContratante = `A CONTRATANTE se obriga a fornecer, em tempo hábil, todos os documentos e informações necessários à correta execução dos serviços contratados, respondendo pela veracidade e integridade desses dados.`;

  const rescisaoTexto = `Qualquer das partes poderá rescindir o presente contrato mediante aviso prévio por escrito de ${ph(vigencia.aviso, "[dias]")} dias, ficando ressalvado o pagamento dos serviços já prestados até a data da rescisão.`;

  const foroTexto = `Fica eleito o foro da comarca de ${ph(foro.foro, "[cidade/comarca]")} para dirimir quaisquer dúvidas ou controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.`;

  return `
    <div class="doc-title-box">CONTRATO DE PRESTAÇÃO DE SERVIÇOS CONTÁBEIS</div>

    <div class="doc-table">
      ${sectionBar("CONTRATANTE")}
      ${nameRow(contratante.razaoSocial, "[Razão Social da Contratante]")}
      ${row("CNPJ:", contratante.cnpj, "[CNPJ]")}
      ${row("Endereço:", contratante.endereco, "[Endereço]")}
      ${row("Bairro:", contratante.bairro, "[Bairro]")}
      ${rowSplit("Cidade:", contratante.cidade, "[Cidade]", "Estado:", contratante.estado, "UF")}
      ${row("CEP:", contratante.cep, "[CEP]")}
      ${row("Representante Legal:", contratante.repNome, "[Nome]")}
      ${rowSplit("CPF:", contratante.repCpf, "[CPF]", "Cargo:", contratante.repCargo, "[Cargo]")}

      ${sectionBar("CONTRATADA")}
      ${nameRow(contratada.razaoSocial, "[Razão Social do Escritório Contábil]")}
      ${row("CNPJ:", contratada.cnpj, "[CNPJ]")}
      ${row("Endereço:", contratada.endereco, "[Endereço]")}
      ${rowSplit("Responsável Técnico:", contratada.responsavel, "[Nome do Contador]", "CRC:", contratada.crc, "[CRC]")}

      ${sectionBar("OBJETO DO CONTRATO")}
      ${rowLong("Serviços Contratados:", servicosHtml)}

      ${sectionBar("CONDIÇÕES COMERCIAIS")}
      ${rowSplit("Honorários Mensais:", honorarios.valor ? "R$ " + honorarios.valor : "", "[valor]", "Vencimento:", honorarios.vencimento ? "dia " + honorarios.vencimento : "", "[dia]")}
      ${row("Forma de Pagamento:", honorarios.formaPagamento, "[forma de pagamento]")}
      ${row("Índice de Reajuste Anual:", honorarios.indice, "[índice]")}

      ${sectionBar("VIGÊNCIA E RESCISÃO")}
      ${rowSplit("Início:", formatDate(vigencia.inicio), "[data]", "Prazo:", prazoTexto, "")}
      ${rowLong("Rescisão:", rescisaoTexto)}

      ${sectionBar("CLÁUSULAS GERAIS")}
      ${rowLong("Obrigações da Contratada:", obrigacoesContratada)}
      ${rowLong("Obrigações da Contratante:", obrigacoesContratante)}
      ${rowLong("Foro:", foroTexto)}
    </div>

    <p class="doc-closing">
      E por estarem assim justas e contratadas, as partes assinam o presente instrumento em duas vias de igual teor e forma, na presença das testemunhas abaixo.
    </p>

    <p class="doc-closing">${ph(foro.local, "[Cidade]")}, ${foro.data ? formatDateExtenso(foro.data) : '<span class="placeholder">[data]</span>'}.</p>

    <div class="signatures">
      <div class="sig-line">
        <div class="line"></div>
        ${ph(contratante.razaoSocial, "[Contratante]")} — CONTRATANTE
      </div>
      <div class="sig-line">
        <div class="line"></div>
        ${ph(contratada.razaoSocial, "[Contratada]")} — CONTRATADA
      </div>
    </div>

    <div class="witnesses">
      <div class="sig-line">
        <div class="line"></div>
        Testemunha: ${ph(foro.test1Nome, "[nome]")} — CPF ${ph(foro.test1Cpf, "[CPF]")}
      </div>
      <div class="sig-line">
        <div class="line"></div>
        Testemunha: ${ph(foro.test2Nome, "[nome]")} — CPF ${ph(foro.test2Cpf, "[CPF]")}
      </div>
    </div>
  `;
}
