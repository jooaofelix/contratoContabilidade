// Modelo de Contrato de Parceria Comercial / Indicação de Clientes — usado
// pra formalizar parceiros/mentorados (ex: Money Brokers Brasil) que indicam
// clientes pra AEA em troca de comissão. Reaproveita os helpers (ph, clause,
// paragraph, sectionBar, row, numeroExtenso etc.) já definidos em
// contract-template.js, que carrega antes deste arquivo na página.

function buildRemuneracaoClauseBody(r) {
  const percentualNum = r.percentual || "";
  const percentualExtenso = percentualNum ? `${percentualNum}% (${numeroExtenso(percentualNum)} por cento)` : '<span class="placeholder">[%]</span>';

  return `
    ${paragraph(`
      Pelos serviços de intermediação, prospecção, indicação e/ou fechamento de clientes, o(a) MENTORADO(A) fará
      jus à remuneração correspondente a ${percentualExtenso} sobre o valor do honorário efetivamente contratado
      com o cliente e devidamente recebido pela CONTRATANTE.
    `)}
    ${paragraph(`
      Parágrafo primeiro. Para os fins deste contrato, entende-se como honorário o valor total ajustado entre a
      CONTRATANTE e o cliente para a prestação dos serviços.
    `)}
    ${paragraph(`
      Parágrafo segundo. Na hipótese de o(a) MENTORADO(A) conseguir negociar com o cliente valor superior ao
      inicialmente previsto ou sugerido pela CONTRATANTE, a remuneração prevista no caput desta cláusula também
      incidirá sobre o valor excedente efetivamente agregado à contratação.
    `)}
    ${paragraph(`
      Parágrafo terceiro. Assim, sempre que houver contratação em valor superior ao parâmetro inicialmente
      estabelecido pela CONTRATANTE, o(a) MENTORADO(A) fará jus ao percentual de ${percentualExtenso} sobre o
      valor total final efetivamente fechado com o cliente, inclusive sobre a diferença obtida a maior em razão
      de sua negociação.
    `)}
    ${paragraph(`
      Parágrafo quarto. A remuneração somente será devida após a efetiva assinatura do contrato com o cliente,
      ou aceite formal equivalente, e desde que haja o respectivo recebimento dos valores pela CONTRATANTE, não
      sendo devida qualquer quantia em caso de inadimplência, cancelamento, rescisão ou desistência por parte do
      cliente.
    `)}
    ${paragraph(`
      Parágrafo quinto. A título meramente exemplificativo, caso o honorário inicialmente previsto pela
      CONTRATANTE seja de R$ 2.000,00 (dois mil reais) e o(a) MENTORADO(A) consiga concluir a contratação pelo
      valor de R$ 2.500,00 (dois mil e quinhentos reais), a remuneração será calculada à razão de
      ${percentualExtenso} sobre R$ 2.500,00 (dois mil e quinhentos reais).
    `)}
  `;
}

function renderParceriaContract(data) {
  const { contratante, mentorado: m, remuneracao: r, pagamento: p, foro } = data;

  const qualificacaoExtra = [
    m.nacionalidade, m.estadoCivil, m.profissao,
  ].filter(Boolean).join(", ");

  return `
    <div class="doc-topline">${ph(contratante.razaoSocial, "CONTRATANTE")} | CONTRATO DE PARCERIA COMERCIAL / INDICAÇÃO DE CLIENTES</div>

    <div class="doc-banner">
      <div class="doc-banner-name">${ph(contratante.razaoSocial, "[Razão Social]")}</div>
      <div class="doc-banner-title">CONTRATO DE PARCERIA COMERCIAL / INDICAÇÃO DE CLIENTES</div>
      <div class="doc-banner-subtitle">Prospecção, indicação e intermediação de clientes</div>
      <div class="doc-banner-honorarios">COMISSÃO: ${r.percentual ? `${r.percentual}% SOBRE O HONORÁRIO CONTRATADO` : "[%] SOBRE O HONORÁRIO CONTRATADO"}</div>
    </div>

    ${sectionBar("QUADRO DE IDENTIFICAÇÃO - CONTRATANTE")}
    <div class="doc-table">
      ${tableHeaderRow()}
      ${row("Contratante", contratante.razaoSocial, "[Razão Social]")}
      ${row("CNPJ", contratante.cnpj, "[CNPJ]")}
      ${row("Endereço", contratante.endereco, "[Endereço completo]")}
      ${row("Representante Legal", contratante.responsavel, "[Nome]")}
    </div>

    ${sectionBar("QUADRO DE IDENTIFICAÇÃO - MENTORADO(A)")}
    <div class="doc-table">
      ${tableHeaderRow()}
      ${row("Mentorado(a)", m.nome, "[Nome completo]")}
      ${qualificacaoExtra ? row("Qualificação", qualificacaoExtra, "") : row("Qualificação", "", "[nacionalidade, estado civil, profissão]")}
      ${row("RG", m.rg, "[RG]")}
      ${row("CPF", m.cpf, "[CPF]")}
      ${row("Endereço", m.endereco, "[Endereço completo]")}
      ${row("E-mail / Telefone", [m.email, m.telefone].filter(Boolean).join(" / "), "[e-mail / telefone]")}
    </div>

    <h3 class="doc-h3">INSTRUMENTO CONTRATUAL</h3>

    <h4 class="clause-title">PREÂMBULO</h4>
    ${paragraph(`
      Pelo presente instrumento particular, de um lado, ${ph(contratante.razaoSocial, "[Razão Social]")}, pessoa
      jurídica de direito privado, inscrita no CNPJ sob nº ${ph(contratante.cnpj, "[CNPJ]")}, com sede em
      ${ph(contratante.endereco, "[endereço]")}, neste ato representada na forma de seu contrato social, doravante
      denominada simplesmente CONTRATANTE; e, de outro lado, ${ph(m.nome, "[Nome do(a) Mentorado(a)]")}
      ${qualificacaoExtra ? ", " + escapeHtml(qualificacaoExtra) : ""}, portador(a) do RG nº ${ph(m.rg, "[RG]")} e
      CPF nº ${ph(m.cpf, "[CPF]")}, residente e domiciliado(a) em ${ph(m.endereco, "[endereço completo]")},
      doravante denominado(a) simplesmente MENTORADO(A); têm entre si justo e contratado o presente CONTRATO DE
      PARCERIA COMERCIAL / INDICAÇÃO DE CLIENTES, que se regerá pelas cláusulas e condições abaixo.
    `)}

    ${clause("1", "DO OBJETO", `
      ${paragraph(`
        O presente contrato tem por objeto a parceria entre as partes para fins de prospecção, indicação,
        intermediação e/ou fechamento de clientes pelo(a) MENTORADO(A), em favor da CONTRATANTE, relativamente
        aos serviços prestados por esta.
      `)}
    `)}

    ${clause("2", "DA NATUREZA DA RELAÇÃO", `
      ${paragraph(`
        O presente instrumento possui natureza estritamente civil e comercial, não gerando, em hipótese alguma,
        vínculo empregatício, societário, previdenciário, associativo, de representação comercial exclusiva ou de
        qualquer outra natureza entre as partes, sendo o(a) MENTORADO(A) pessoa autônoma e independente no
        desempenho de suas atividades.
      `)}
      ${paragraph(`
        Parágrafo primeiro. O(a) MENTORADO(A) atuará com autonomia, sem subordinação jurídica, técnica ou
        econômica, inexistindo controle de jornada, obrigação de exclusividade ou qualquer dos requisitos
        caracterizadores da relação de emprego.
      `)}
      ${paragraph(`
        Parágrafo segundo. A indicação ou prospecção realizada pelo(a) MENTORADO(A) não obriga a CONTRATANTE à
        aceitação do cliente, permanecendo assegurado à CONTRATANTE o direito de, a seu exclusivo critério e com
        total autonomia comercial e técnica, admitir, recusar ou deixar de contratar qualquer cliente, sem
        necessidade de justificativa.
      `)}
    `)}

    ${clause("3", "DAS OBRIGAÇÕES DO(A) MENTORADO(A)", `
      ${paragraph(`Constituem obrigações do(a) MENTORADO(A):`)}
      ${paragraph(`
        I – indicar, prospectar e/ou intermediar potenciais clientes para a CONTRATANTE;<br>
        II – atuar com boa-fé, transparência e zelo na apresentação dos serviços;<br>
        III – não assumir obrigações em nome da CONTRATANTE sem autorização prévia e expressa;<br>
        IV – prestar informações verdadeiras e completas sobre os clientes indicados;<br>
        V – preservar a imagem, o nome e a reputação comercial da CONTRATANTE;<br>
        VI – respeitar integralmente os valores, condições comerciais e diretrizes previamente aprovadas pela
        CONTRATANTE.
      `)}
    `)}

    ${clause("4", "DAS OBRIGAÇÕES DA CONTRATANTE", `
      ${paragraph(`Constituem obrigações da CONTRATANTE:`)}
      ${paragraph(`
        I – analisar a viabilidade da contratação dos clientes apresentados;<br>
        II – fornecer, quando necessário, informações básicas sobre os serviços ofertados;<br>
        III – efetuar o pagamento da remuneração ao(à) MENTORADO(A), na forma e condições previstas neste
        contrato;<br>
        IV – manter o(a) MENTORADO(A) informado(a), sempre que necessário, acerca da efetivação ou não das
        contratações decorrentes de sua intermediação.
      `)}
    `)}

    ${clause("5", "DA REMUNERAÇÃO", buildRemuneracaoClauseBody(r))}

    ${clause("6", "DA FORMA DE PAGAMENTO", `
      ${paragraph(`
        O pagamento da remuneração prevista neste contrato será realizado pela CONTRATANTE ao(à) MENTORADO(A) no
        prazo de ${p.prazoDias ? numComExtenso(p.prazoDias, "dias") : '<span class="placeholder">[dias]</span>'}
        contados do efetivo recebimento dos valores pagos pelo cliente, por meio de
        ${ph(p.forma, "[pix / transferência bancária / outro meio]")}, na conta indicada pelo(a) MENTORADO(A).
      `)}
      ${paragraph(`
        Parágrafo único. Não haverá pagamento antecipado de comissão, sendo condição indispensável para sua
        exigibilidade o recebimento do valor correspondente pela CONTRATANTE.
      `)}
    `)}

    ${clause("7", "DA NÃO EXCLUSIVIDADE", `
      ${paragraph(`
        O presente contrato é firmado sem caráter de exclusividade, podendo ambas as partes manter relações
        comerciais com terceiros, desde que não haja conflito de interesses ou prejuízo à execução do objeto
        deste instrumento.
      `)}
    `)}

    ${clause("8", "DA CONFIDENCIALIDADE", `
      ${paragraph(`
        O(a) MENTORADO(A) se compromete a manter absoluto sigilo sobre todas as informações comerciais,
        estratégicas, financeiras, operacionais e cadastrais a que tiver acesso em razão deste contrato, não
        podendo utilizá-las para finalidade diversa da aqui ajustada, nem revelá-las a terceiros, salvo mediante
        autorização prévia e expressa da CONTRATANTE ou por determinação legal.
      `)}
      ${paragraph(`
        Parágrafo único. A obrigação de confidencialidade subsistirá mesmo após o término deste contrato, por
        prazo indeterminado.
      `)}
    `)}

    ${clause("9", "DO PRAZO E DA RESCISÃO", `
      ${paragraph(`O presente contrato vigorará por prazo indeterminado, iniciando-se na data de sua assinatura.`)}
      ${paragraph(`
        Parágrafo primeiro. O presente contrato poderá ser rescindido por qualquer das partes, a qualquer tempo,
        mediante comunicação por escrito com antecedência mínima de 30 (trinta) dias.
      `)}
      ${paragraph(`
        Parágrafo segundo. O descumprimento de qualquer cláusula contratual autorizará a parte inocente a
        rescindir imediatamente o presente instrumento, sem prejuízo da apuração de eventuais perdas e danos.
      `)}
      ${paragraph(`
        Parágrafo terceiro. Em caso de rescisão, serão devidas apenas as remunerações relativas aos contratos
        efetivamente fechados, recebidos e já constituídos até a data do término da relação, observadas as
        condições previstas neste instrumento.
      `)}
    `)}

    ${clause("10", "DA BOA-FÉ E DA CONDUTA", `
      ${paragraph(`
        As partes se obrigam a atuar com lealdade, ética, boa-fé e cooperação mútua, abstendo-se de qualquer
        conduta que possa prejudicar a imagem, a reputação, os interesses comerciais ou a credibilidade da outra
        parte.
      `)}
    `)}

    ${clause("11", "DAS DISPOSIÇÕES GERAIS", `
      ${paragraph(`
        Qualquer tolerância de uma parte para com a outra quanto ao descumprimento de qualquer obrigação
        prevista neste contrato não implicará novação, perdão ou renúncia de direito, constituindo mera
        liberalidade.
      `)}
      ${paragraph(`
        Parágrafo único. Qualquer alteração das condições deste contrato somente terá validade se realizada por
        escrito e assinada por ambas as partes.
      `)}
    `)}

    ${clause("12", "DO FORO", `
      ${paragraph(`
        Fica eleito o foro da comarca de ${ph(foro.foro, "[cidade/UF]")}, com renúncia expressa de qualquer
        outro, por mais privilegiado que seja, para dirimir quaisquer dúvidas ou controvérsias oriundas deste
        contrato.
      `)}
      ${paragraph(`
        E, por estarem assim justas e contratadas, firmam o presente instrumento em 2 (duas) vias de igual teor
        e forma, juntamente com 2 (duas) testemunhas.
      `)}
    `)}

    <h4 class="clause-title">ASSINATURAS</h4>
    <p class="doc-p">${ph(foro.local, "[Cidade/UF]")}, ${foro.data ? formatDateExtenso(foro.data) : '<span class="placeholder">[data]</span>'}.</p>

    <div class="signatures">
      <div class="sig-line">
        <div class="line"></div>
        ${ph(contratante.razaoSocial, "[Contratante]")}<br>CONTRATANTE
      </div>
      <div class="sig-line">
        <div class="line"></div>
        ${ph(m.nome, "[Mentorado(a)]")}<br>MENTORADO(A)
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

    <div class="doc-footline">${ph(contratante.endereco, "")} ${contratante.contato ? " | " + escapeHtml(contratante.contato) : ""}</div>
  `;
}
