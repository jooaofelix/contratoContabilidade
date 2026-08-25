function phP(value, placeholder) {
  const v = (value || "").toString().trim();
  return v
    ? escapeHtmlP(v)
    : `<span class="placeholder">${escapeHtmlP(placeholder)}</span>`;
}

function escapeHtmlP(str) {
  return str
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDateBr(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

const SOBRE_AEA_ITENS = [
  { n: 1, titulo: "Atendimento consultivo" },
  { n: 2, titulo: "Organização e conformidade" },
  { n: 3, titulo: "Suporte estratégico" },
  { n: 4, titulo: "Relacionamento próximo" },
];

const SERVICOS_PADRAO = [
  { n: "01", codigo: "AI", titulo: "Análise inicial", desc: "Levantamento das informações e diagnóstico contábil e fiscal da empresa." },
  { n: "02", codigo: "EC", titulo: "Enquadramento contábil", desc: "Definição do melhor regime tributário e estrutura contábil adequada ao negócio." },
  { n: "03", codigo: "EA", titulo: "Estruturação do atendimento", desc: "Organização dos processos, cadastros e rotinas para início das operações." },
  { n: "04", codigo: "EX", titulo: "Execução dos serviços", desc: "Realização das obrigações contábeis, fiscais e trabalhistas com qualidade e segurança." },
  { n: "05", codigo: "SA", titulo: "Suporte e acompanhamento", desc: "Atendimento consultivo contínuo e acompanhamento dos indicadores do negócio." },
];

function logoMark() {
  return `<img src="assets/aea-logo.svg" alt="" class="logo-mark">`;
}

function brandBar() {
  return `
    <div class="proposal-brand">
      ${logoMark()}
      <div class="proposal-brand-text"><strong>AEA</strong><span>CONTABILIDADE CONSULTIVA</span></div>
      <div class="proposal-brand-tag">PROPOSTA COMERCIAL</div>
    </div>`;
}

function pageFooter(n) {
  return `<div class="proposal-footer">Página ${n} | AEA Contabilidade Consultiva</div>`;
}

function renderCapa(cliente) {
  return `
    <section class="proposal-page proposal-page-dark">
      ${brandBar()}
      <div class="proposal-capa">
        <div class="proposal-capa-left">
          <div class="proposal-hello">OLÁ ${phP(cliente.nomeResponsavel, "[Nome]").toString().toUpperCase()}</div>
          <div class="proposal-title">PROPOSTA COMERCIAL</div>
          <p class="proposal-lead">
            Contabilidade consultiva para empresas que querem crescer com organização, segurança fiscal e proximidade no atendimento.
          </p>
        </div>
        <div class="proposal-capa-right">
          <h3>Sobre a AEA</h3>
          <p>
            A AEA Contabilidade Consultiva transforma a contabilidade em informação estratégica para tomada de decisão.
            Unimos tecnologia, experiência e acompanhamento próximo para apoiar a rotina e o crescimento do negócio.
          </p>
          <div class="proposal-cards">
            ${SOBRE_AEA_ITENS.map((i) => `
              <div class="proposal-card">
                <span class="proposal-card-n">${i.n}</span>
                <span class="proposal-card-t">${escapeHtmlP(i.titulo)}</span>
              </div>`).join("")}
          </div>
        </div>
      </div>
      ${pageFooter(1)}
    </section>`;
}

function renderDadosCliente(cliente, diagnostico, pageNumber) {
  return `
    <section class="proposal-page">
      ${brandBar()}
      <h2 class="proposal-h2">DADOS DO CLIENTE</h2>
      <p class="proposal-sub">Informações recebidas para composição da proposta comercial.</p>

      <div class="proposal-columns">
        <div class="proposal-box">
          <h4>1. DADOS DO CLIENTE</h4>
          <div class="proposal-fieldgrid">
            <div><span class="fl">Cliente</span><span class="fv">${phP(cliente.empresa, "[Empresa]")}</span></div>
            <div><span class="fl">Empresa</span><span class="fv">${phP(cliente.empresa, "[Empresa]")}</span></div>
            <div><span class="fl">CPF/CNPJ</span><span class="fv fv-lg">${phP(cliente.cnpj, "[CNPJ]")}</span></div>
            <div><span class="fl">Responsável</span><span class="fv fv-lg">${phP(cliente.responsavel, "[Responsável]")}</span></div>
            <div><span class="fl">Telefone</span><span class="fv fv-lg">${phP(cliente.telefone, "[Telefone]")}</span></div>
            <div><span class="fl">E-mail</span><span class="fv">${phP(cliente.email, "[E-mail]")}</span></div>
            <div><span class="fl">Data da proposta</span><span class="fv fv-lg">${phP(formatDateBr(cliente.dataProposta), "[data]")}</span></div>
            <div><span class="fl">Validade</span><span class="fv fv-lg">${phP(cliente.validade, "Não informado")}</span></div>
          </div>
        </div>

        <div class="proposal-box">
          <h4>2. O QUE FOI ENVIADO</h4>
          <ul class="proposal-list">
            <li><span class="li-n">1</span><span class="li-l">Quantidade de notas por mês</span><span class="li-v">${phP(diagnostico.notasMes, "0")}</span></li>
            <li><span class="li-n">2</span><span class="li-l">Quantidade de funcionários</span><span class="li-v">${phP(diagnostico.funcionarios, "0")}</span></li>
            <li><span class="li-n">3</span><span class="li-l">Faturamento mensal</span><span class="li-v">${diagnostico.faturamento ? "R$ " + escapeHtmlP(diagnostico.faturamento) : '<span class="placeholder">R$ 0,00</span>'}</span></li>
            <li><span class="li-n">4</span><span class="li-l">Regime tributário</span><span class="li-v li-strong">${phP(diagnostico.regime, "—")}</span></li>
            <li><span class="li-n">5</span><span class="li-l">Segmento da empresa</span><span class="li-v">${phP(diagnostico.segmento, "—")}</span></li>
            <li><span class="li-n">6</span><span class="li-l">Observações adicionais</span><span class="li-v">${phP(diagnostico.observacoes, "—")}</span></li>
          </ul>
        </div>
      </div>
      ${pageFooter(pageNumber)}
    </section>`;
}

// Página extra de "Dados do Cliente", uma por empresa do mesmo grupo
// econômico/dono adicionada na proposta — mesma estrutura da página
// principal, só que sem o bloco de diagnóstico (esse é único por proposta).
function renderDadosClienteExtra(empresa, indice, pageNumber) {
  return `
    <section class="proposal-page">
      ${brandBar()}
      <h2 class="proposal-h2">DADOS DO CLIENTE — EMPRESA ${indice}</h2>
      <p class="proposal-sub">Empresa adicional do mesmo grupo econômico/responsável, incluída nesta proposta.</p>

      <div class="proposal-box">
        <h4>DADOS DA EMPRESA</h4>
        <div class="proposal-fieldgrid">
          <div><span class="fl">Empresa</span><span class="fv">${phP(empresa.nome, "[Empresa]")}</span></div>
          <div><span class="fl">CPF/CNPJ</span><span class="fv fv-lg">${phP(empresa.cnpj, "[CNPJ]")}</span></div>
          <div><span class="fl">Responsável</span><span class="fv fv-lg">${phP(empresa.responsavel, "[Responsável]")}</span></div>
          <div><span class="fl">Telefone</span><span class="fv fv-lg">${phP(empresa.telefone, "[Telefone]")}</span></div>
          <div><span class="fl">E-mail</span><span class="fv">${phP(empresa.email, "[E-mail]")}</span></div>
        </div>
      </div>
      ${pageFooter(pageNumber)}
    </section>`;
}

function renderServicosSelecionados(servicos) {
  if (!servicos || servicos.length === 0) return "";
  return `
    <div class="proposal-servicos-extra">
      <h4>SERVIÇOS INCLUÍDOS NESTA PROPOSTA</h4>
      <ul class="proposal-servicos-extra-list">
        ${servicos.map((s) => `<li>${escapeHtmlP(s)}</li>`).join("")}
      </ul>
    </div>`;
}

function renderServicosInvestimento(investimento, servicos, pageNumber) {
  const temDesconto = investimento.temDesconto && investimento.valorFinal;
  const desconto = temDesconto
    ? (parseFloat((investimento.valorCheio || "0").replace(/\./g, "").replace(",", ".")) -
       parseFloat((investimento.valorFinal || "0").replace(/\./g, "").replace(",", "."))).toFixed(2).replace(".", ",")
    : null;

  const precoBoxHtml = temDesconto
    ? `
      <div class="proposal-price-label">VALOR FINAL COM DESCONTO</div>
      <div class="proposal-discount-badge">DESCONTO APLICADO</div>
      <div class="proposal-price-old">R$ ${escapeHtmlP(investimento.valorCheio)}</div>
      <div class="proposal-price">R$ ${escapeHtmlP(investimento.valorFinal)}</div>
      <p class="proposal-price-note">De R$ ${escapeHtmlP(investimento.valorCheio)} por R$ ${escapeHtmlP(investimento.valorFinal)} — desconto comercial de R$ ${desconto} aplicado.</p>
    `
    : `
      <div class="proposal-price-label">VALOR DO INVESTIMENTO</div>
      <div class="proposal-price">${investimento.valorCheio ? "R$ " + escapeHtmlP(investimento.valorCheio) : '<span class="placeholder">[valor]</span>'}</div>
    `;

  return `
    <section class="proposal-page">
      ${brandBar()}
      <h2 class="proposal-h2">SERVIÇOS E INVESTIMENTO</h2>
      <p class="proposal-sub">Serviços que serão prestados</p>

      <div class="proposal-columns proposal-columns-services">
        <div class="proposal-services">
          ${renderServicosSelecionados(servicos)}
          ${SERVICOS_PADRAO.map((s) => `
            <div class="proposal-service-row">
              <span class="service-n">${s.n}</span>
              <span class="service-code">${s.codigo}</span>
              <div class="service-text">
                <strong>${s.titulo}</strong>
                <span>${s.desc}</span>
              </div>
            </div>`).join("")}
        </div>

        <div class="proposal-price-box">
          ${precoBoxHtml}
          <div class="proposal-price-divider"></div>
          <div class="proposal-price-meta">
            <div><span class="fl">Forma de pagamento</span><span class="fv">${phP(investimento.formaPagamento, "A combinar")}</span></div>
            <div><span class="fl">Prazo para início</span><span class="fv">${phP(investimento.prazoInicio, "Após aceite")}</span></div>
          </div>
          <div><span class="fl">Validade da proposta</span><span class="fv">${phP(investimento.validade, "Não informado")}</span></div>
          <p class="proposal-price-fine">Proposta válida mediante conferência das informações cadastrais e confirmação do escopo final.</p>
        </div>
      </div>
      ${pageFooter(pageNumber)}
    </section>`;
}

function renderProposal(data) {
  const grupo = data.grupo || [];
  let pagina = 1;

  let html = renderCapa(data.cliente);
  pagina += 1;
  html += renderDadosCliente(data.cliente, data.diagnostico, pagina);
  pagina += 1;

  grupo.forEach((empresa, i) => {
    html += renderDadosClienteExtra(empresa, i + 2, pagina);
    pagina += 1;
  });

  html += renderServicosInvestimento(data.investimento, data.servicos, pagina);
  return html;
}
