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
  return `
    <svg class="logo-mark" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#1673c7"/>
      <path d="M20 3a17 17 0 1 0 12 5" fill="none" stroke="#7fd0ff" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
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

function renderDadosCliente(cliente, diagnostico) {
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
      ${pageFooter(2)}
    </section>`;
}

function renderServicosInvestimento(investimento) {
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
      ${pageFooter(3)}
    </section>`;
}

function renderProposal(data) {
  return (
    renderCapa(data.cliente) +
    renderDadosCliente(data.cliente, data.diagnostico) +
    renderServicosInvestimento(data.investimento)
  );
}
