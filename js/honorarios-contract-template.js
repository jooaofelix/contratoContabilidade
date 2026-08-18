// Modelo "Contrato de Honorários - Contabilidade" — variante com cláusulas
// numeradas (1.1, 2.1...) baseada no contrato real fechado com a M28
// Movelaria, incluindo a cláusula de extensão a empresas do mesmo grupo
// econômico. Reaproveita os helpers já definidos em contract-template.js
// (ph, paragraph, sectionBar, row, rowHtml, tableHeaderRow, numeroExtenso,
// formatDate, formatDateExtenso, monthYearExtenso, nextMonthYearExtenso,
// escapeHtml), que carrega antes deste arquivo na página.

function item(num, html) {
  return `<p class="doc-p"><strong>${escapeHtml(num)}.</strong> ${html}</p>`;
}

function buildHonorariosHClauseBody(h) {
  const descontoItem = h.temDesconto
    ? item("4.2", `
        Por liberalidade comercial, a CONTRATADA concederá desconto de R$ ${ph(h.valorDesconto, "[valor do desconto]")}
        por mês, aplicável às competências de ${ph(monthYearExtenso(h.descontoInicio), "[mês/ano]")} a
        ${ph(monthYearExtenso(h.descontoFim), "[mês/ano]")}. Durante esse período, os honorários mensais serão de
        R$ ${ph(h.valorDesconto, "[valor com desconto]")}. A partir da competência de
        ${h.descontoFim ? nextMonthYearExtenso(h.descontoFim) : '<span class="placeholder">[mês/ano]</span>'},
        os honorários retornarão automaticamente ao valor cheio.
      `)
    : "";

  return `
    ${item("4.1", `
      Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA honorários mensais no valor cheio de
      R$ ${ph(h.valorCheio, "[valor]")}.
    `)}
    ${descontoItem}
    ${item("4.3", `O vencimento dos honorários será todo dia ${ph(h.vencimentoDia, "[dia]")} de cada mês.`)}
    ${item("4.4", nl2br(h.parcelaAnualTexto) || '<span class="placeholder">[texto da parcela anual]</span>')}
    ${item("4.5", `
      Serviços extraordinários, como alterações societárias, baixas, certidões e parcelamentos, não estão
      incluídos nos honorários mensais e serão cobrados à parte, mediante orçamento prévio.
    `)}
  `;
}

function buildFidelidadeHClause(v) {
  if (!v.temFidelidade) return "";
  return `
    ${sectionBar("CLÁUSULA 6 - DA FIDELIDADE E MULTA CONTRATUAL")}
    ${item("6.1", `
      As partes ajustam um período de fidelidade contratual, compreendido entre
      ${ph(formatDateExtenso(v.inicio), "[data]")} e ${ph(formatDateExtenso(v.fim), "[data]")}.
    `)}
    ${item("6.2", `
      A rescisão unilateral e imotivada por qualquer das partes, antes do término do prazo de fidelidade,
      sujeitará a parte infratora ao pagamento de multa rescisória não compensatória, em favor da parte
      inocente, equivalente a ${v.multaPercent ? `${v.multaPercent}% (${numeroExtenso(v.multaPercent)} por cento)` : '<span class="placeholder">[%]</span>'}
      do valor das mensalidades restantes para o término do contrato.
    `)}
    ${item("6.3", `
      A base de cálculo para a referida multa será o valor do honorário mensal vigente na data da comunicação
      da rescisão.
    `)}
    ${item("6.4", `
      A multa prevista nesta cláusula não se aplicará nos casos de rescisão motivada por inadimplemento
      contratual grave da outra parte, desde que esta seja devidamente notificada para sanar a falha no prazo
      de até 5 (cinco) dias úteis e permaneça inerte.
    `)}
  `;
}

function buildGrupoEconomicoClause(grupo) {
  if (!grupo || grupo.length === 0) return "";
  const lista = grupo.map((g) => `${escapeHtml(g.nome || "[empresa]")} (CNPJ ${escapeHtml(g.cnpj || "[CNPJ]")})`).join(", ");
  return item("9.1", `
    Fica ajustado que o objeto deste contrato, nas mesmas condições de escopo e qualidade, é extensível às
    empresas do mesmo grupo econômico da CONTRATANTE, a saber: ${lista}.
  `);
}

function renderHonorariosContract(data) {
  const { contratante, contratada, h, v, grupo, foro } = data;

  const clauseNumeroGrupo = grupo && grupo.length > 0 ? item("9.2", `
      A CONTRATANTE principal, ${ph(contratante.razaoSocial, "[Razão Social]")}, permanece como única responsável
      financeira perante a CONTRATADA pelo pagamento integral e pontual dos honorários e demais encargos
      previstos neste instrumento.
    `) : "";

  return `
    <div class="doc-topline">${ph(contratada.razaoSocial, "CONTRATADA")} | CONTRATO DE HONORÁRIOS - CONTABILIDADE</div>

    <div class="doc-banner">
      <div class="doc-banner-name">${ph(contratada.razaoSocial, "[Razão Social]")}</div>
      <div class="doc-banner-title">CONTRATO DE PRESTAÇÃO DE SERVIÇOS CONTÁBEIS</div>
      <div class="doc-banner-subtitle">Cláusulas numeradas — modelo de honorários</div>
      <div class="doc-banner-honorarios">HONORÁRIOS: R$ ${ph(h.valorCheio, "[valor]")}/MÊS</div>
    </div>

    ${sectionBar("IDENTIFICAÇÃO DAS PARTES")}
    <div class="doc-table">
      ${tableHeaderRow()}
      ${row("Contratante", contratante.razaoSocial, "[Razão Social]")}
      ${row("CNPJ", contratante.cnpj, "[CNPJ]")}
      ${row("Endereço", contratante.endereco, "[Endereço completo]")}
      ${row("Representante", [contratante.repNome, contratante.repProfissao].filter(Boolean).join(" — "), "[Nome — profissão]")}
      ${row("CPF do representante", contratante.repCpf, "[CPF]")}
      ${row("Contratada", contratada.razaoSocial, "[Razão Social]")}
      ${row("CNPJ", contratada.cnpj, "[CNPJ]")}
      ${row("Endereço", contratada.endereco, "[Endereço completo]")}
    </div>

    <h3 class="doc-h3">INSTRUMENTO CONTRATUAL</h3>
    ${paragraph(`
      As partes acima qualificadas, doravante denominadas simplesmente CONTRATADA e CONTRATANTE, ajustam e
      contratam a prestação de serviços profissionais de contabilidade, segundo as cláusulas e condições
      adiante listadas.
    `)}

    ${sectionBar("CLÁUSULA 1 - DO OBJETO")}
    ${item("1.1", `
      O objeto do presente contrato consiste na prestação, pela CONTRATADA à CONTRATANTE, de serviços
      profissionais de contabilidade, compreendendo rotinas contábeis, fiscais, gestão de RH e obrigações
      acessórias ordinárias, conforme o escopo detalhado no Anexo I e as disposições da Cláusula 9.
    `)}

    ${sectionBar("CLÁUSULA 2 - DAS OBRIGAÇÕES DA CONTRATANTE")}
    ${item("2.1", `
      A CONTRATANTE obriga-se a remeter à CONTRATADA toda a documentação necessária para a escrituração,
      apuração, elaboração de declarações e cumprimento das obrigações acessórias, por meio físico ou digital,
      dentro dos prazos solicitados.
    `)}
    ${item("2.2", `
      A falta, atraso, inconsistência ou omissão de documentos e informações poderá impactar o cumprimento de
      obrigações legais, ficando a CONTRATADA isenta de responsabilidade por multas ou prejuízos decorrentes de
      tais ocorrências, desde que tenha solicitado a documentação em tempo hábil.
    `)}
    ${item("2.3", `
      O recolhimento de impostos, taxas, contribuições e demais valores devidos é de responsabilidade exclusiva
      da CONTRATANTE, ainda que as guias sejam emitidas pela CONTRATADA.
    `)}

    ${sectionBar("CLÁUSULA 3 - DAS OBRIGAÇÕES E RESPONSABILIDADES DA CONTRATADA")}
    ${item("3.1", `
      A CONTRATADA compromete-se a executar os serviços com zelo técnico, observando as normas profissionais
      aplicáveis e a legislação vigente.
    `)}
    ${item("3.2", `
      A CONTRATADA não se responsabiliza por pendências ou inconsistências de períodos anteriores ao início da
      vigência deste contrato.
    `)}
    ${item("3.3", `
      A CONTRATADA assume a responsabilidade civil por quaisquer multas, juros ou prejuízos de ordem fiscal,
      trabalhista ou previdenciária comprovadamente decorrentes de falhas técnicas, erros ou omissões de sua
      exclusiva responsabilidade na execução dos serviços, desde que a CONTRATANTE tenha fornecido toda a
      documentação e informações necessárias em tempo hábil.
    `)}

    ${sectionBar("CLÁUSULA 4 - DOS HONORÁRIOS PROFISSIONAIS")}
    ${buildHonorariosHClauseBody(h)}

    ${sectionBar("CLÁUSULA 5 - DA VIGÊNCIA E RESCISÃO")}
    ${item("5.1", `
      O presente contrato terá vigência ${diffMonths(v.inicio, v.fim) ? `de ${numComExtenso(diffMonths(v.inicio, v.fim), "meses")}` : ""},
      de ${ph(formatDate(v.inicio), "[data]")} a ${ph(formatDate(v.fim), "[data]")}.
    `)}
    ${item("5.2", `
      A parte que desejar rescindir o contrato deverá comunicar a outra, por escrito, com antecedência mínima
      de ${v.avisoPrevio ? numComExtenso(v.avisoPrevio, "dias") : '<span class="placeholder">[dias]</span>'}.
    `)}

    ${buildFidelidadeHClause(v)}

    ${sectionBar("CLÁUSULA 7 - DA CONFIDENCIALIDADE")}
    ${item("7.1", `
      As partes se comprometem, por si e por seus colaboradores, a manter o mais absoluto sigilo sobre toda e
      qualquer informação, dado, documento, know-how ou material técnico e comercial uma da outra a que tenham
      acesso em razão deste contrato ("Informações Confidenciais").
    `)}
    ${item("7.2", `
      As Informações Confidenciais somente poderão ser utilizadas para o estrito cumprimento do objeto deste
      contrato, sendo vedada sua divulgação a terceiros sem a prévia e expressa autorização da parte
      proprietária da informação.
    `)}
    ${item("7.3", `
      A obrigação de sigilo aqui prevista permanecerá em vigor mesmo após o término ou rescisão deste contrato,
      por um período de 5 (cinco) anos.
    `)}

    ${sectionBar("CLÁUSULA 8 - DOS SERVIÇOS EXTRAORDINÁRIOS")}
    ${item("8.1", `
      Serão considerados serviços extraordinários todos aqueles não compreendidos nas rotinas ordinárias de
      contabilidade mensal, os quais serão cobrados separadamente, mediante orçamento prévio.
    `)}

    ${sectionBar("CLÁUSULA 9 - DAS DISPOSIÇÕES GERAIS")}
    ${buildGrupoEconomicoClause(grupo)}
    ${clauseNumeroGrupo}

    ${sectionBar("CLÁUSULA 10 - DO FORO")}
    ${item("10.1", `
      Fica eleito o foro da comarca de ${ph(foro.foro, "[cidade/UF]")} para dirimir as questões oriundas do
      presente instrumento, com renúncia a qualquer outro.
    `)}
    ${paragraph(`E, por estarem justas e contratadas, assinam as partes o presente instrumento em 2 (duas) vias de igual teor e forma.`)}

    <h4 class="clause-title">ASSINATURAS</h4>
    <p class="doc-p">${ph(foro.local, "[Cidade/UF]")}, ${foro.data ? formatDateExtenso(foro.data) : '<span class="placeholder">[data]</span>'}.</p>

    <div class="signatures">
      <div class="sig-line">
        <div class="line"></div>
        ${ph(contratada.razaoSocial, "[Contratada]")}<br>CONTRATADA
      </div>
      <div class="sig-line">
        <div class="line"></div>
        ${ph(contratante.razaoSocial, "[Contratante]")}<br>CONTRATANTE
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

    <div class="doc-footline">${ph(contratada.endereco, "")} ${contratada.contato ? " | " + escapeHtml(contratada.contato) : ""}</div>
  `;
}
