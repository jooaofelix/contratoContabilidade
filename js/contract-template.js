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

function nl2br(str) {
  return escapeHtml(str || "").replace(/\n/g, "<br>");
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

// recebe valor de <input type="month"> no formato YYYY-MM
function monthYearExtenso(monthValue) {
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-");
  return `${MESES[parseInt(month, 10) - 1]} de ${year}`;
}

function nextMonthYearExtenso(monthValue) {
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-").map(Number);
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return `${MESES[next.m - 1]} de ${next.y}`;
}

const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const DEZ_A_DEZENOVE = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function numeroExtenso(n) {
  n = parseInt(n, 10);
  if (isNaN(n)) return "";
  if (n === 0) return UNIDADES[0];
  if (n === 100) return "cem";
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DEZ_A_DEZENOVE[n - 10];
  if (n < 100) {
    const dez = Math.floor(n / 10);
    const un = n % 10;
    return un === 0 ? DEZENAS[dez] : `${DEZENAS[dez]} e ${UNIDADES[un]}`;
  }
  if (n < 1000) {
    const cent = Math.floor(n / 100);
    const resto = n % 100;
    return resto === 0 ? CENTENAS[cent] : `${CENTENAS[cent]} e ${numeroExtenso(resto)}`;
  }
  return n.toString();
}

function numComExtenso(n, unidade) {
  if (n === null || n === undefined || n === "") return "";
  const extenso = numeroExtenso(n);
  return unidade ? `${n} (${extenso}) ${unidade}` : `${n} (${extenso})`;
}

function diffMonths(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso);
  const end = new Date(endIso);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() >= start.getDate()) months += 1;
  return months > 0 ? months : null;
}

// -- helpers de tabela, no mesmo padrão visual do modelo AEA --

function sectionBar(title) {
  return `<div class="doc-section-bar">${escapeHtml(title)}</div>`;
}

function tableHeaderRow() {
  return `
    <div class="doc-row doc-row-head">
      <div class="doc-cell doc-cell-head">Campo</div>
      <div class="doc-cell doc-cell-head">Informação</div>
    </div>`;
}

function row(label, value, placeholder) {
  return `
    <div class="doc-row">
      <div class="doc-cell doc-cell-label">${escapeHtml(label)}</div>
      <div class="doc-cell doc-cell-value">${ph(value, placeholder || "—")}</div>
    </div>`;
}

function rowHtml(label, html) {
  return `
    <div class="doc-row">
      <div class="doc-cell doc-cell-label">${escapeHtml(label)}</div>
      <div class="doc-cell doc-cell-value">${html}</div>
    </div>`;
}

function clause(number, title, html) {
  return `
    <h4 class="clause-title">CLÁUSULA ${number} - ${escapeHtml(title)}</h4>
    ${html}
  `;
}

function paragraph(html) {
  return `<p class="doc-p">${html}</p>`;
}

function buildHonorariosSummary(h) {
  if (h.temDesconto && h.valorDesconto && h.descontoFim) {
    return `HONORÁRIOS: R$ ${escapeHtml(h.valorDesconto)}/MÊS ATÉ ${monthYearExtenso(h.descontoFim).toUpperCase()} | R$ ${escapeHtml(h.valorCheio || "—")}/MÊS A PARTIR DE ${nextMonthYearExtenso(h.descontoFim).toUpperCase()}`;
  }
  return `HONORÁRIOS: R$ ${ph(h.valorCheio, "[valor]")}/MÊS`;
}

function buildValorContratadoParagraph(h) {
  if (h.temDesconto && h.valorDesconto) {
    return paragraph(`
      Valor cheio: R$ ${ph(h.valorCheio, "[valor cheio]")} mensais. Desconto temporário de
      R$ ${ph(h.valorDesconto, "[valor]")} mensais, aplicável às competências de
      ${ph(monthYearExtenso(h.descontoInicio), "[mês/ano]")} a ${ph(monthYearExtenso(h.descontoFim), "[mês/ano]")},
      resultando em R$ ${ph(h.valorDesconto, "[valor]")} mensais nesse período. A partir da competência de
      ${h.descontoFim ? nextMonthYearExtenso(h.descontoFim) : '<span class="placeholder">[mês/ano]</span>'},
      os honorários retornarão ao valor cheio de R$ ${ph(h.valorCheio, "[valor cheio]")} mensais.
    `);
  }
  return paragraph(`R$ ${ph(h.valorCheio, "[valor]")} mensais.`);
}

function buildHonorariosClauseBody(h) {
  const descontoParagraph = h.temDesconto
    ? paragraph(`
        Por liberalidade comercial, a CONTRATADA concederá desconto temporário, aplicável às competências de
        ${ph(monthYearExtenso(h.descontoInicio), "[mês/ano]")} a ${ph(monthYearExtenso(h.descontoFim), "[mês/ano]")}.
        Durante esse período, os honorários mensais serão de R$ ${ph(h.valorDesconto, "[valor com desconto]")}.
        A partir da competência de ${h.descontoFim ? nextMonthYearExtenso(h.descontoFim) : '<span class="placeholder">[mês/ano]</span>'},
        os honorários retornarão automaticamente ao valor cheio de R$ ${ph(h.valorCheio, "[valor cheio]")} mensais, sem necessidade de aditivo.
      `)
    : "";

  return `
    ${paragraph(`
      Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA honorários mensais no valor de
      R$ ${ph(h.valorCheio, "[valor]")}, referentes ao escopo descrito no Anexo 1 deste contrato.
    `)}
    ${descontoParagraph}
    ${paragraph(`
      O vencimento dos honorários será todo dia ${ph(h.vencimentoDia, "[dia]")} de cada mês.
    `)}
    ${h.sistemasTerceiros
      ? paragraph(`Os sistemas ${escapeHtml(h.sistemasTerceiros)} serão contratados e pagos diretamente pela CONTRATANTE às respectivas operadoras, não compondo o valor mensal pago à CONTRATADA.`)
      : ""}
    ${paragraph(`
      Eventuais taxas, emolumentos, autenticações, despesas de cartório, custos de certificado digital, regularizações,
      parcelamentos, alterações societárias, baixas, abertura de filiais, processos administrativos e serviços
      extraordinários não estão incluídos nos honorários mensais e serão cobrados à parte quando solicitados ou necessários.
    `)}
    ${paragraph(`
      Além dos honorários mensais, poderá ser cobrada parcela adicional anual equivalente ao valor do honorário mensal
      vigente no respectivo período, quando aplicável, para atendimento de acréscimo de serviços próprios do encerramento
      do exercício, declarações anuais e obrigações acessórias anuais.
    `)}
  `;
}

function buildFidelidadeClause(v) {
  if (!v.temFidelidade) return "";
  return clause("6", "DA FIDELIDADE CONTRATUAL", `
    ${paragraph(`
      A CONTRATANTE reconhece e aceita que este contrato possui vigência mínima obrigatória, compreendida entre
      ${ph(formatDateExtenso(v.inicio), "[data]")} e ${ph(formatDateExtenso(v.fim), "[data]")}, período em que se compromete
      a manter os serviços contábeis com a CONTRATADA.
    `)}
    ${paragraph(`
      Durante o período de fidelidade, a rescisão unilateral e imotivada por parte da CONTRATANTE, antes do término do
      prazo mínimo, sujeitará a CONTRATANTE ao pagamento de multa rescisória proporcional ao período remanescente,
      equivalente a ${v.multaPercent ? `${v.multaPercent}% (${numeroExtenso(v.multaPercent)} por cento)` : '<span class="placeholder">[%]</span>'}
      do valor dos honorários mensais multiplicado pelos meses restantes até o término do prazo contratado.
    `)}
    ${paragraph(`
      A fidelidade não se aplicará nos casos de rescisão motivada por inadimplemento contratual grave da CONTRATADA,
      desde que devidamente notificada e não sanada no prazo de até 10 (dez) dias úteis.
    `)}
  `);
}

function renderContract(data) {
  const { contratante, contratada, objeto, honorarios: h, vigencia: v, foro } = data;

  const meses = diffMonths(v.inicio, v.fim);
  const numeroClausulaExtraordinarios = v.temFidelidade ? "7" : "6";
  const numeroClausulaForo = v.temFidelidade ? "8" : "7";

  return `
    <div class="doc-topline">${ph(contratada.razaoSocial, "CONTRATADA")} | CONTRATO DE PRESTAÇÃO DE SERVIÇOS CONTÁBEIS</div>

    <div class="doc-banner">
      <div class="doc-banner-name">${ph(contratada.razaoSocial, "[Razão Social da Contratada]")}</div>
      <div class="doc-banner-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS CONTÁBEIS</div>
      <div class="doc-banner-subtitle">Documento formal - empresa única</div>
      <div class="doc-banner-honorarios">${buildHonorariosSummary(h)}</div>
    </div>

    ${sectionBar("QUADRO DE IDENTIFICAÇÃO - CONTRATANTE")}
    <div class="doc-table">
      ${tableHeaderRow()}
      ${row("Contratante", contratante.razaoSocial, "[Razão Social]")}
      ${row("CNPJ", contratante.cnpj, "[CNPJ]")}
      ${row("Endereço", contratante.endereco, "[Endereço completo]")}
      ${row("Representante Legal", contratante.repNome, "[Nome]")}
      ${row("CPF", contratante.repCpf, "[CPF]")}
    </div>

    ${sectionBar("QUADRO DE IDENTIFICAÇÃO - CONTRATADA")}
    <div class="doc-table">
      ${tableHeaderRow()}
      ${row("Contratada", contratada.razaoSocial, "[Razão Social]")}
      ${row("CNPJ", contratada.cnpj, "[CNPJ]")}
      ${row("Endereço", contratada.endereco, "[Endereço completo]")}
      ${row("E-mail / Telefone", contratada.contato, "[e-mail / telefone]")}
      ${row("Responsável Técnico", contratada.responsavel, "[Nome do Contador]")}
      ${row("CRC", contratada.crc, "[CRC]")}
      ${rowHtml("Objeto", ph(objeto.objeto, "[resumo do objeto]"))}
      ${rowHtml("Valor contratado", buildValorContratadoParagraph(h).replace(/^<p class="doc-p">|<\/p>$/g, ""))}
      ${row("Vigência", v.inicio && v.fim ? `De ${formatDateExtenso(v.inicio)} a ${formatDateExtenso(v.fim)}` : "", "[data início] a [data término]")}
    </div>

    <h3 class="doc-h3">INSTRUMENTO CONTRATUAL</h3>

    <h4 class="clause-title">PREÂMBULO</h4>
    ${paragraph(`
      Pelo presente instrumento particular, as partes acima devidamente qualificadas, doravante denominadas
      simplesmente CONTRATADA e CONTRATANTE, na melhor forma de direito, ajustam e contratam a prestação de
      serviços profissionais de contabilidade, segundo as cláusulas e condições adiante listadas.
    `)}

    ${clause("1", "DO OBJETO", `
      ${paragraph(`
        O objeto do presente contrato consiste na prestação, pela CONTRATADA à CONTRATANTE, de
        ${ph(objeto.objeto, "[descrição dos serviços]")}, conforme o escopo contratado, o regime tributário
        aplicável e os documentos fornecidos pela CONTRATANTE, nos termos do Anexo 1 deste instrumento.
      `)}
    `)}

    ${clause("2", "DAS OBRIGAÇÕES DA CONTRATANTE", `
      ${paragraph(`
        A CONTRATANTE obriga-se a remeter à CONTRATADA toda a documentação necessária para a escrituração,
        apuração, elaboração de declarações e cumprimento das obrigações acessórias, por meio físico ou digital,
        dentro dos prazos solicitados.
      `)}
      ${paragraph(`
        Os serviços limitam-se aos documentos, informações e declarações idôneos, em bom estado de conservação,
        sem rasuras, preenchidos corretamente e apresentados em tempo hábil.
      `)}
      ${paragraph(`
        A falta, atraso, inconsistência ou omissão de documentos e informações poderá impactar o cumprimento de
        obrigações legais, ficando a CONTRATADA isenta de responsabilidade por multas, penalidades, notificações ou
        prejuízos decorrentes de tais ocorrências.
      `)}
      ${paragraph(`
        O recolhimento de impostos, taxas, contribuições, encargos e demais valores devidos pela CONTRATANTE é de
        responsabilidade exclusiva da CONTRATANTE, ainda que as guias sejam emitidas ou encaminhadas pela CONTRATADA.
      `)}
    `)}

    ${clause("3", "DAS OBRIGAÇÕES DA CONTRATADA", `
      ${paragraph(`
        A CONTRATADA compromete-se a executar os serviços contábeis contratados com zelo técnico, observando as
        normas profissionais aplicáveis, a legislação vigente e os prazos possíveis conforme o recebimento tempestivo
        das informações.
      `)}
      ${paragraph(`
        A CONTRATADA compromete-se a manter sigilo sobre informações, documentos, dados financeiros, fiscais e
        empresariais da CONTRATANTE, utilizando-os apenas para execução dos serviços contratados, em conformidade
        com a Lei Geral de Proteção de Dados - LGPD.
      `)}
      ${paragraph(`
        A CONTRATADA não se responsabiliza por obrigações vencidas, pendências anteriores ao início dos serviços ou
        inconsistências provenientes de períodos sob responsabilidade de terceiros ou de contabilidade anterior.
      `)}
    `)}

    ${clause("4", "DOS HONORÁRIOS PROFISSIONAIS", buildHonorariosClauseBody(h))}

    ${clause("5", "DA VIGÊNCIA E RESCISÃO", `
      ${paragraph(`
        O presente contrato terá vigência ${meses ? `determinada de ${numComExtenso(meses, "meses")}` : "determinada"},
        iniciando-se em ${ph(formatDate(v.inicio), "[data]")} e encerrando-se em ${ph(formatDate(v.fim), "[data]")}.
      `)}
      ${paragraph(`
        A parte que desejar rescindir o contrato deverá comunicar a outra, por escrito, com antecedência mínima de
        ${v.avisoPrevio ? numComExtenso(v.avisoPrevio, "dias") : '<span class="placeholder">[dias]</span>'}, período no
        qual todas as cláusulas permanecerão em vigor, inclusive quanto ao pagamento dos honorários proporcionais e
        eventuais valores pendentes.
      `)}
      ${paragraph(`
        Em caso de rescisão, a CONTRATANTE deverá retirar seus documentos e providenciar a transferência de
        responsabilidade técnica, quando aplicável, dentro do prazo de ${ph(v.avisoPrevio, "[dias]")} dias.
      `)}
    `)}

    ${buildFidelidadeClause(v)}

    ${clause(numeroClausulaExtraordinarios, "DOS SERVIÇOS EXTRAORDINÁRIOS", `
      ${paragraph(`
        Serão considerados serviços extraordinários todos aqueles não compreendidos nas rotinas ordinárias de
        contabilidade mensal, tais como alteração contratual, baixa ou abertura de empresa, certidões, parcelamentos,
        regularizações, retificações, processos administrativos, elaboração de contratos, cadastros especiais,
        certificado digital, consultorias específicas e demais serviços não previstos expressamente neste contrato.
      `)}
      ${paragraph(`
        Os serviços extraordinários serão previamente informados e cobrados separadamente, mediante orçamento ou
        tabela vigente da CONTRATADA.
      `)}
    `)}

    ${clause(numeroClausulaForo, "DO FORO", `
      ${paragraph(`
        Fica eleito o foro da comarca de ${ph(foro.foro, "[cidade/comarca]")} para dirimir as questões oriundas do
        presente instrumento, renunciando as partes a qualquer outro, por mais privilegiado que seja.
      `)}
      ${paragraph(`
        Assim, por estarem justas e contratadas, assinam as partes o presente instrumento em 2 (duas) vias de igual
        teor e forma, juntamente com as testemunhas abaixo.
      `)}
    `)}

    <h4 class="clause-title">ASSINATURAS</h4>
    <p class="doc-p">${ph(foro.local, "[Cidade/UF]")}, ${foro.data ? formatDateExtenso(foro.data) : '<span class="placeholder">[data]</span>'}.</p>

    <div class="signatures">
      <div class="sig-line">
        <div class="line"></div>
        ${ph(contratada.razaoSocial, "[Contratada]")}<br>CONTRATADA
      </div>
      <div class="sig-line">
        <div class="line"></div>
        ${ph(contratante.repNome, "[Representante]")}<br>Representante legal da CONTRATANTE
      </div>
    </div>

    <div class="witnesses">
      <div class="sig-line">
        <div class="line"></div>
        Testemunha 1<br>Nome: ${ph(foro.test1Nome, "________")} &nbsp; CPF: ${ph(foro.test1Cpf, "________")}
      </div>
      <div class="sig-line">
        <div class="line"></div>
        Testemunha 2<br>Nome: ${ph(foro.test2Nome, "________")} &nbsp; CPF: ${ph(foro.test2Cpf, "________")}
      </div>
    </div>

    <h3 class="doc-h3 doc-h3-anexo">ANEXO 1 - SERVIÇOS PROFISSIONAIS DE CONTABILIDADE</h3>
    <div class="doc-h4-sub">RESUMO DO ESCOPO</div>
    <div class="doc-table">
      ${tableHeaderRow()}
      ${rowHtml("Parte fiscal", nl2br(objeto.fiscal) || '<span class="placeholder">—</span>')}
      ${rowHtml("Parte contábil", nl2br(objeto.contabil) || '<span class="placeholder">—</span>')}
      ${rowHtml("Gestão de RH", nl2br(objeto.rh) || '<span class="placeholder">—</span>')}
      ${rowHtml("Consultiva", nl2br(objeto.consultiva) || '<span class="placeholder">—</span>')}
      ${rowHtml("Obrigações acessórias", nl2br(objeto.obrigacoes) || '<span class="placeholder">—</span>')}
      ${rowHtml("Atendimento", nl2br(objeto.atendimento) || '<span class="placeholder">—</span>')}
      ${rowHtml("Não incluídos", nl2br(objeto.naoIncluidos) || '<span class="placeholder">—</span>')}
    </div>

    <div class="doc-footline">${ph(contratada.endereco, "")} ${contratada.contato ? " | " + escapeHtml(contratada.contato) : ""}</div>
  `;
}
