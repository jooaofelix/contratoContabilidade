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

// A marca e o rodapé agora aparecem uma vez por FOLHA FÍSICA (não mais uma
// vez por seção lógica) — quem decide quantas/quais seções cabem em cada
// folha é o empacotador em app-orcamento.js, depois de medir a altura real
// de cada bloco no navegador. Ver montarBlocosProposta() mais abaixo.
function brandBar() {
  return `
    <div class="proposal-brand">
      ${logoMark()}
      <div class="proposal-brand-text"><strong>AEA</strong><span>CONTABILIDADE CONSULTIVA</span></div>
      <div class="proposal-brand-tag">PROPOSTA COMERCIAL</div>
    </div>`;
}

function pageFooter() {
  return `<div class="proposal-footer">AEA Contabilidade Consultiva</div>`;
}

// --- Blocos de conteúdo (cada um é uma unidade indivisível de paginação) --

function renderCapaBloco(cliente) {
  return `
    <div class="proposal-capa-bloco">
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
    </div>`;
}

function renderDadosClienteBloco(cliente, diagnostico) {
  return `
    <div>
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
    </div>`;
}

// Bloco extra de "Dados do Cliente", um por empresa do mesmo grupo
// econômico/dono adicionada na proposta — mesma estrutura do bloco
// principal, só que sem o diagnóstico (esse é único por proposta).
function renderDadosClienteExtraBloco(empresa, indice) {
  return `
    <div>
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
    </div>`;
}

// --- Ícones simples (SVG embutido, sem depender de biblioteca externa) ----

function svgIconP(paths, viewBox) {
  return `<svg viewBox="${viewBox || "0 0 24 24"}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

const ICONES_SERVICO_P = {
  contabil: svgIconP('<rect x="3" y="11" width="4" height="10" rx="1"></rect><rect x="10" y="6" width="4" height="15" rx="1"></rect><rect x="17" y="2" width="4" height="19" rx="1"></rect>'),
  fiscal: svgIconP('<rect x="4" y="2.5" width="16" height="19" rx="2"></rect><line x1="7.5" y1="8" x2="16.5" y2="8"></line><line x1="7.5" y1="12" x2="16.5" y2="12"></line><line x1="7.5" y1="16" x2="13" y2="16"></line>'),
  pessoal: svgIconP('<circle cx="9" cy="8" r="3.2"></circle><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path><circle cx="18" cy="9" r="2.4"></circle><path d="M15.3 14.2c2.7.5 4.5 2.4 4.7 5.3"></path>'),
  financeiro: svgIconP('<polyline points="3 16 9 10 13 14 21 5"></polyline><polyline points="15 5 21 5 21 11"></polyline>'),
  digital: svgIconP('<rect x="3" y="4" width="18" height="12.5" rx="2"></rect><line x1="8" y1="20.5" x2="16" y2="20.5"></line><line x1="12" y1="16.5" x2="12" y2="20.5"></line>'),
  notas: svgIconP('<path d="M6 2.5h12v18l-3-2-3 2-3-2-3 2v-18z"></path><line x1="9" y1="8" x2="15" y2="8"></line><line x1="9" y1="11.5" x2="15" y2="11.5"></line>'),
  plano: svgIconP('<rect x="3.5" y="2.5" width="17" height="19" rx="2"></rect><path d="M8 8h8M8 12h8M8 16h5"></path>'),
  generico: svgIconP('<rect x="4" y="3" width="16" height="18" rx="2"></rect><polyline points="8 12.5 11 15.5 16 9"></polyline>'),
  calculadora: svgIconP('<rect x="5" y="2" width="14" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><circle cx="8.3" cy="10.5" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="12" cy="10.5" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="15.7" cy="10.5" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="8.3" cy="14" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="12" cy="14" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="8.3" cy="17.5" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="12" cy="17.5" r="0.9" fill="currentColor" stroke="none"></circle><line x1="15.7" y1="12.7" x2="15.7" y2="18.3"></line>'),
};

function iconeServicoP(titulo) {
  const t = (titulo || "").toLowerCase();
  if (t.includes("plano")) return ICONES_SERVICO_P.plano;
  if (t.includes("contáb") || t.includes("contab")) return ICONES_SERVICO_P.contabil;
  if (t.includes("fiscal")) return ICONES_SERVICO_P.fiscal;
  if (t.includes("pessoal") || t.includes("folha")) return ICONES_SERVICO_P.pessoal;
  if (t.includes("financeiro") || t.includes("bpo")) return ICONES_SERVICO_P.financeiro;
  if (t.includes("digital")) return ICONES_SERVICO_P.digital;
  if (t.includes("nota")) return ICONES_SERVICO_P.notas;
  return ICONES_SERVICO_P.generico;
}

// Agrupa os itens precificados do checklist num formato pronto pra exibição:
// quando exatamente 1 plano de Honorário está marcado (independente de ele
// próprio ter valor digitado) e há pelo menos 1 serviço de Escritório com
// valor, o plano vira um card "grupo" (título + descrição, sem preço
// próprio na linha do cabeçalho) com os serviços de Escritório aninhados
// como sub-itens, cada um com seu valor — exatamente o padrão pedido:
// "posso escolher o que vou incluir em cada plano". planosSelecionados vem
// do checklist (todo plano marcado, com ou sem valor) — é a fonte da
// verdade de "qual plano está selecionado", já que um plano sem valor
// próprio não aparece em `itens` (que só lista o que tem preço). Fora desse
// caso (nenhum plano marcado, ou plano marcado sem nenhum serviço de
// Escritório junto) cada item vira um card avulso normal, com
// título/descrição à esquerda e valor à direita — é o que acontece, por
// exemplo, quando só o Plano Digital é marcado sozinho, com valor próprio.
function agruparItensInvestimento(itens, planosSelecionados) {
  planosSelecionados = planosSelecionados || [];
  const planosComValor = itens.filter((i) => i.categoria === "Honorário");
  const escritorio = itens.filter((i) => i.categoria === "Escritório");
  const outros = itens.filter((i) => i.categoria !== "Honorário" && i.categoria !== "Escritório");

  if (planosSelecionados.length !== 1 || escritorio.length === 0) {
    return { grupos: [], soltos: [...planosComValor, ...escritorio, ...outros] };
  }

  const plano = planosSelecionados[0];
  const itemPlano = planosComValor.find((i) => i.titulo === plano.nome && i.valor);
  const subItens = itemPlano ? [{ titulo: itemPlano.titulo, valor: itemPlano.valor }, ...escritorio] : escritorio;

  return {
    grupos: [{ titulo: plano.nome, descricao: plano.descricao, subItens }],
    soltos: outros,
  };
}

// Serviço marcado sem valor preenchido é um item legitimamente sem preço
// próprio (incluso de graça ou cobrado só pelo "valor cheio" geral) — não é
// um campo obrigatório faltando, então em vez do placeholder cinza padrão
// (usado nos campos que ainda precisam ser preenchidos) mostra "Incluso".
function valorOuInclusoP(valor) {
  const v = (valor || "").toString().trim();
  return v ? `R$ ${escapeHtmlP(v)}` : `<span class="proposal-item-incluso">Incluso</span>`;
}

function renderItemCardSolto(item) {
  return `
    <div class="proposal-item-card">
      <div class="proposal-item-icon">${iconeServicoP(item.titulo)}</div>
      <div class="proposal-item-headtext">
        <div class="proposal-item-titulo">${escapeHtmlP(item.titulo || "Item")}</div>
        ${item.descricao ? `<div class="proposal-item-desc">${escapeHtmlP(item.descricao)}</div>` : ""}
      </div>
      <div class="proposal-item-valor-solo">${valorOuInclusoP(item.valor)}</div>
    </div>`;
}

function renderItemGrupo(grupo) {
  return `
    <div class="proposal-item-card proposal-item-grupo">
      <div class="proposal-item-grupo-header">
        <div class="proposal-item-icon">${iconeServicoP(grupo.titulo)}</div>
        <div class="proposal-item-headtext">
          <div class="proposal-item-titulo">${escapeHtmlP(grupo.titulo)}</div>
          ${grupo.descricao ? `<div class="proposal-item-desc">${escapeHtmlP(grupo.descricao)}</div>` : ""}
        </div>
      </div>
      <div class="proposal-item-subitens">
        ${grupo.subItens.map((s) => `
          <div class="proposal-subitem">
            <span class="proposal-subitem-label">${escapeHtmlP(s.titulo)}</span>
            <span class="proposal-subitem-valor">${valorOuInclusoP(s.valor)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}

function renderBlocoInvestimento(bloco) {
  return bloco.tipo === "grupo" ? renderItemGrupo(bloco.dado) : renderItemCardSolto(bloco.dado);
}

function renderValorTotalBar(total) {
  return `
    <div class="proposal-valor-total-bar">
      <div class="proposal-valor-total-icon">${ICONES_SERVICO_P.calculadora}</div>
      <div class="proposal-valor-total-text">
        <div class="proposal-valor-total-label">VALOR TOTAL</div>
        <div class="proposal-valor-total-sub">Soma de todos os serviços incluídos nesta proposta.</div>
      </div>
      <div class="proposal-valor-total-valor">R$ ${formatarValorP(total)}</div>
    </div>`;
}

function investimentoMetaHtml(investimento) {
  return `
    <div class="proposal-investimento-meta">
      <div><span class="fl">Forma de pagamento</span><span class="fv">${phP(investimento.formaPagamento, "A combinar")}</span></div>
      <div><span class="fl">Prazo para início</span><span class="fv">${phP(investimento.prazoInicio, "Após aceite")}</span></div>
      <div><span class="fl">Validade da proposta</span><span class="fv">${phP(investimento.validade, "Não informado")}</span></div>
    </div>`;
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

// Bloco de abertura de "Serviços e Investimento": título + (o que está
// incluso no plano, ou a lista padrão de etapas) + a caixa de preço único
// ao lado, quando a proposta não usa múltiplos itens de investimento.
function renderServicosIntroBloco(investimento, planosSelecionados, temItensMultiplos) {
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
    <div>
      <h2 class="proposal-h2">SERVIÇOS E INVESTIMENTO</h2>
      <p class="proposal-sub">Serviços que serão prestados</p>

      <div class="proposal-columns proposal-columns-services">
        <div class="${temItensMultiplos ? "proposal-services proposal-services-full" : "proposal-services"}">
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
    </div>`;
}

// Cabeçalho "SERVIÇOS INCLUÍDOS NESTA PROPOSTA" + o primeiro card — sempre
// juntos no mesmo bloco, pra nunca deixar o título sozinho numa folha
// separada do primeiro item que ele apresenta.
function renderResumoInvestimentoHeaderBloco(primeiroBlocoHtml) {
  return `
    <div class="proposal-investimento-resumo">
      <h4>SERVIÇOS INCLUÍDOS NESTA PROPOSTA</h4>
      <p class="proposal-investimento-resumo-sub">Solução contábil completa, com valor detalhado de cada serviço incluído.</p>
      <div class="proposal-itens-lista">${primeiroBlocoHtml}</div>
    </div>`;
}

function renderItemBlocoAvulso(blocoHtml) {
  return `<div class="proposal-itens-lista">${blocoHtml}</div>`;
}

function renderValorTotalBloco(investimento, total) {
  return `
    <div>
      ${renderValorTotalBar(total)}
      ${investimentoMetaHtml(investimento)}
    </div>`;
}

// Decompõe a proposta inteira numa lista plana de blocos (cada um uma
// unidade indivisível) — quem decide quais blocos caem em qual folha física
// é montarPreviewPaginado(), em app-orcamento.js, depois de medir a altura
// real de cada um no navegador (só assim dá pra aproveitar o espaço da
// folha sem cortar texto/tabela no meio, sem depender de heurísticas fixas
// de quantos itens "normalmente" cabem por página).
function montarBlocosProposta(data) {
  const grupo = data.grupo || [];
  const itens = data.investimento.itens || [];
  const temItensMultiplos = itens.length > 0;
  const blocos = [];

  blocos.push({ html: renderCapaBloco(data.cliente) });
  blocos.push({ html: renderDadosClienteBloco(data.cliente, data.diagnostico) });
  grupo.forEach((empresa, i) => {
    blocos.push({ html: renderDadosClienteExtraBloco(empresa, i + 2) });
  });

  blocos.push({ html: renderServicosIntroBloco(data.investimento, data.planosSelecionados, temItensMultiplos) });

  if (temItensMultiplos) {
    const { grupos, soltos } = agruparItensInvestimento(itens, data.planosSelecionados);
    const itensDecompostos = [
      ...grupos.map((g) => ({ tipo: "grupo", dado: g })),
      ...soltos.map((s) => ({ tipo: "solto", dado: s })),
    ];
    itensDecompostos.forEach((bloco, i) => {
      const html = renderBlocoInvestimento(bloco);
      blocos.push({
        html: i === 0 ? renderResumoInvestimentoHeaderBloco(html) : renderItemBlocoAvulso(html),
      });
    });
    blocos.push({ html: renderValorTotalBloco(data.investimento, somaItensP(itens)) });
  }

  return blocos;
}
