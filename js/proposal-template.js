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

function parseValorP(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatarValorP(n) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function somaItensP(itens) {
  return (itens || []).reduce((sum, item) => sum + parseValorP(item.valor), 0);
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

function renderInvestimentoItens(itens, opts) {
  if (!itens || itens.length === 0) return "";
  opts = opts || {};
  return `
    <div class="proposal-investimento-resumo">
      <h4>RESUMO DE INVESTIMENTO</h4>
      <div class="proposal-investimento-grid">
        ${itens.map((item) => `
          <div class="proposal-investimento-card">
            <div class="proposal-investimento-valor">${phP(item.valor, "[valor]")}</div>
            <div class="proposal-investimento-titulo">${escapeHtmlP(item.titulo || "Item")}</div>
            ${item.recorrencia ? `<div class="proposal-investimento-recorrencia">${escapeHtmlP(item.recorrencia)}</div>` : ""}
            ${item.descricao ? `<p class="proposal-investimento-desc">${escapeHtmlP(item.descricao)}</p>` : ""}
          </div>`).join("")}
      </div>
      ${opts.total != null ? `
      <div class="proposal-investimento-total">
        <span class="proposal-investimento-total-label">VALOR TOTAL</span>
        <span class="proposal-investimento-total-valor">R$ ${formatarValorP(opts.total)}</span>
      </div>` : ""}
    </div>`;
}

// A grade de itens some no meio de "SERVIÇOS E INVESTIMENTO" assim que
// passa desse tanto (a página já carrega a lista de serviços padrão em
// cima) — o resto vira página(s) extra "(continuação)", com o mesmo
// cabeçalho/rodapé, em vez de estourar a altura da página e cortar feio.
const ITENS_INVESTIMENTO_PAGINA_PRINCIPAL = 4;
const ITENS_INVESTIMENTO_POR_PAGINA_CONTINUACAO = 8;

function investimentoMetaHtml(investimento) {
  return `
    <div class="proposal-investimento-meta">
      <div><span class="fl">Forma de pagamento</span><span class="fv">${phP(investimento.formaPagamento, "A combinar")}</span></div>
      <div><span class="fl">Prazo para início</span><span class="fv">${phP(investimento.prazoInicio, "Após aceite")}</span></div>
      <div><span class="fl">Validade da proposta</span><span class="fv">${phP(investimento.validade, "Não informado")}</span></div>
    </div>`;
}

function renderPaginaContinuacaoInvestimento(itensDaPagina, investimento, mostrarMeta, totalGeral, pageNumber) {
  return `
    <section class="proposal-page">
      ${brandBar()}
      <h2 class="proposal-h2">SERVIÇOS E INVESTIMENTO (continuação)</h2>
      <p class="proposal-sub">Itens de investimento</p>
      ${renderInvestimentoItens(itensDaPagina, { total: mostrarMeta ? totalGeral : null })}
      ${mostrarMeta ? investimentoMetaHtml(investimento) : ""}
      ${pageFooter(pageNumber)}
    </section>`;
}

// Quando um plano de honorário foi escolhido no checklist, troca a lista
// genérica de etapas (01 a 05) pelo "o que está incluso" daquele plano
// especificamente — se mais de um plano vier marcado (não devia acontecer,
// já que o checklist trata como rádio, mas por segurança), mostra um bloco
// pra cada. Sem plano nenhum escolhido, cai no fallback de sempre.
function renderPlanoIncluso(plano) {
  const detalhes = plano.detalhes || [];
  if (detalhes.length === 0) return "";
  return `
    <div class="proposal-plano-incluso">
      <h4>O QUE ESTÁ INCLUSO NO ${escapeHtmlP((plano.nome || "").toUpperCase())}</h4>
      <ul class="proposal-plano-incluso-list">
        ${detalhes.map((d) => `<li><span class="proposal-plano-incluso-check">✓</span>${escapeHtmlP(d)}</li>`).join("")}
      </ul>
    </div>`;
}

function renderEtapasOuPlanos(planosSelecionados) {
  const planosComDetalhes = (planosSelecionados || []).filter((p) => p.detalhes && p.detalhes.length > 0);
  if (planosComDetalhes.length > 0) {
    return planosComDetalhes.map(renderPlanoIncluso).join("");
  }
  return SERVICOS_PADRAO.map((s) => `
    <div class="proposal-service-row">
      <span class="service-n">${s.n}</span>
      <span class="service-code">${s.codigo}</span>
      <div class="service-text">
        <strong>${s.titulo}</strong>
        <span>${s.desc}</span>
      </div>
    </div>`).join("");
}

function renderServicosInvestimento(investimento, servicos, planosSelecionados, pageNumber) {
  const itens = investimento.itens || [];
  const temItensMultiplos = itens.length > 0;
  const itensPaginaPrincipal = itens.slice(0, ITENS_INVESTIMENTO_PAGINA_PRINCIPAL);
  const itensRestantes = itens.slice(ITENS_INVESTIMENTO_PAGINA_PRINCIPAL);
  const cabeMetaNaPrincipal = itensRestantes.length === 0;

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

  const paginaPrincipal = `
    <section class="proposal-page">
      ${brandBar()}
      <h2 class="proposal-h2">SERVIÇOS E INVESTIMENTO</h2>
      <p class="proposal-sub">Serviços que serão prestados</p>

      <div class="proposal-columns proposal-columns-services">
        <div class="${temItensMultiplos ? "proposal-services proposal-services-full" : "proposal-services"}">
          ${renderServicosSelecionados(servicos)}
          ${renderEtapasOuPlanos(planosSelecionados)}
        </div>

        ${temItensMultiplos ? "" : `
        <div class="proposal-price-box">
          ${precoBoxHtml}
          <div class="proposal-price-divider"></div>
          <div class="proposal-price-meta">
            <div><span class="fl">Forma de pagamento</span><span class="fv">${phP(investimento.formaPagamento, "A combinar")}</span></div>
            <div><span class="fl">Prazo para início</span><span class="fv">${phP(investimento.prazoInicio, "Após aceite")}</span></div>
          </div>
          <div><span class="fl">Validade da proposta</span><span class="fv">${phP(investimento.validade, "Não informado")}</span></div>
          <p class="proposal-price-fine">Proposta válida mediante conferência das informações cadastrais e confirmação do escopo final.</p>
        </div>`}
      </div>

      ${renderInvestimentoItens(itensPaginaPrincipal, { total: cabeMetaNaPrincipal ? somaItensP(itens) : null })}
      ${temItensMultiplos && cabeMetaNaPrincipal ? investimentoMetaHtml(investimento) : ""}
      ${pageFooter(pageNumber)}
    </section>`;

  let html = paginaPrincipal;
  let pagina = pageNumber;
  for (let i = 0; i < itensRestantes.length; i += ITENS_INVESTIMENTO_POR_PAGINA_CONTINUACAO) {
    pagina += 1;
    const chunk = itensRestantes.slice(i, i + ITENS_INVESTIMENTO_POR_PAGINA_CONTINUACAO);
    const ehUltimaPagina = i + ITENS_INVESTIMENTO_POR_PAGINA_CONTINUACAO >= itensRestantes.length;
    html += renderPaginaContinuacaoInvestimento(chunk, investimento, ehUltimaPagina, somaItensP(itens), pagina);
  }

  return { html, ultimaPagina: pagina };
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

  const investimentoResult = renderServicosInvestimento(data.investimento, data.servicos, data.planosSelecionados, pagina);
  html += investimentoResult.html;
  return html;
}
