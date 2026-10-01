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

function somaSubItensP(subItens) {
  return (subItens || []).reduce((sum, item) => sum + parseValorP(item.valor), 0);
}

function formatDateBr(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

// Deixa só a primeira letra minúscula — usado pra encaixar um "detalhe" de
// produto (frase que começa maiúscula, pensada pra lista com marcador) numa
// frase corrida tipo "O Plano Completo inclui: sistema financeiro... •
// enquadramento...".
function lowerFirstP(str) {
  const s = (str || "").toString();
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

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

// Cabeçalho (saudação + título + texto de abertura) e o quadro "Sobre a
// AEA" sempre juntos no mesmo bloco — pra nunca deixar o título sozinho
// numa folha separada do quadro que vem logo abaixo dele.
function renderHeroBloco(cliente) {
  return `
    <div>
      <div class="proposal-hero">
        <div class="proposal-hero-hello">OLÁ, ${phP(cliente.nomeResponsavel, "[Nome]")}</div>
        <h1 class="proposal-hero-title">PROPOSTA COMERCIAL</h1>
        <p class="proposal-hero-lead">Contabilidade consultiva para empresas que querem crescer com organização, segurança fiscal e proximidade no atendimento.</p>
      </div>
      <div class="proposal-sobre-aea">
        <h3>Sobre a AEA</h3>
        <p>Transformamos a contabilidade em informação estratégica para tomada de decisão. Unimos tecnologia, experiência e acompanhamento próximo para apoiar a rotina e o crescimento do negócio.</p>
      </div>
    </div>`;
}

function renderDadosClienteBloco(cliente, diagnostico) {
  return `
    <div>
      <h2 class="proposal-h2">DADOS DO CLIENTE</h2>
      <p class="proposal-sub">Informações recebidas para composição da proposta comercial.</p>
      <div class="proposal-box">
        <div class="proposal-fieldgrid proposal-fieldgrid-3">
          <div><span class="fl">Cliente / Empresa</span><span class="fv fv-lg">${phP(cliente.empresa, "[Empresa]")}</span></div>
          <div><span class="fl">Responsável</span><span class="fv fv-lg">${phP(cliente.responsavel, "[Responsável]")}</span></div>
          <div><span class="fl">CPF/CNPJ</span><span class="fv fv-lg">${phP(cliente.cnpj, "[CNPJ]")}</span></div>
          <div><span class="fl">Regime tributário</span><span class="fv fv-lg">${phP(diagnostico.regime, "—")}</span></div>
          <div><span class="fl">Segmento</span><span class="fv fv-lg">${phP(diagnostico.segmento, "—")}</span></div>
          <div><span class="fl">Data da proposta</span><span class="fv fv-lg">${phP(formatDateBr(cliente.dataProposta), "[data]")}</span></div>
        </div>
      </div>
    </div>`;
}

function telefoneEmailCombinadoP(telefone, email) {
  const partes = [telefone, email].map((v) => (v || "").toString().trim()).filter(Boolean);
  return partes.length ? escapeHtmlP(partes.join(" — ")) : "A combinar";
}

// Bloco extra de "Dados do Cliente", um por empresa do mesmo grupo
// econômico/dono adicionada na proposta — mesma ideia do bloco principal,
// num quadro só, identificado pelo nome da empresa (não por número de
// sequência).
function renderDadosClienteExtraBloco(empresa) {
  return `
    <div>
      <h2 class="proposal-h2">EMPRESA ADICIONAL — ${escapeHtmlP((empresa.nome || "[Empresa]").toUpperCase())}</h2>
      <p class="proposal-sub">Empresa adicional do mesmo grupo econômico/responsável, incluída nesta proposta.</p>
      <div class="proposal-box">
        <div class="proposal-fieldgrid proposal-fieldgrid-3">
          <div><span class="fl">CNPJ</span><span class="fv fv-lg">${phP(empresa.cnpj, "[CNPJ]")}</span></div>
          <div><span class="fl">Responsável</span><span class="fv fv-lg">${phP(empresa.responsavel, "[Responsável]")}</span></div>
          <div><span class="fl">Telefone / E-mail</span><span class="fv fv-lg">${telefoneEmailCombinadoP(empresa.telefone, empresa.email)}</span></div>
        </div>
      </div>
    </div>`;
}

// Agrupa os itens precificados do checklist num formato pronto pra exibição:
// quando exatamente 1 plano de Honorário está marcado (independente de ele
// próprio ter valor digitado) e há pelo menos 1 serviço de Escritório com
// valor, o plano vira um grupo (título + descrição, valor = soma dos
// serviços de Escritório) com os serviços de Escritório aninhados como
// sub-itens — exatamente o padrão pedido: "posso escolher o que vou incluir
// em cada plano". planosSelecionados vem do checklist (todo plano marcado,
// com ou sem valor) — é a fonte da verdade de "qual plano está
// selecionado", já que um plano sem valor próprio não aparece em `itens`
// (que só lista o que tem preço). Fora desse caso (nenhum plano marcado, ou
// plano marcado sem nenhum serviço de Escritório junto) cada item vira uma
// linha avulsa normal, com título/descrição à esquerda e valor à direita —
// é o que acontece, por exemplo, quando só o Plano Digital é marcado
// sozinho, com valor próprio.
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
  return v ? `R$ ${formatarValorP(parseValorP(v))}` : `<span class="proposal-item-incluso">Incluso</span>`;
}

// --- "ESCOPO E INVESTIMENTO" (página de abertura, resumo) -----------------

// `empresa` só é passado quando o item pertence a uma empresa ADICIONAL do
// Grupo Econômico (não a contratante principal) — é o que diferencia, por
// exemplo, um item avulso da contratante ("Abertura de Empresa") de um
// marcado no checklist próprio de uma empresa do grupo ("Plano Digital —
// VAROGLASS"), que precisa deixar claro a quem se refere.
function renderEscopoItemLinha(item, empresa) {
  const titulo = empresa ? `${item.titulo || "Item"} — ${empresa}` : (item.titulo || "Item");
  return `
    <div class="proposal-escopo-item">
      <div class="proposal-escopo-item-texto">
        <div class="proposal-escopo-item-titulo">${escapeHtmlP(titulo)}</div>
        ${item.descricao ? `<div class="proposal-escopo-item-desc">${escapeHtmlP(item.descricao)}</div>` : ""}
      </div>
      <div class="proposal-escopo-item-valor">${valorOuInclusoP(item.valor)}</div>
    </div>`;
}

// Um grupo (plano + serviços de Escritório) vira UMA linha de resumo aqui —
// título + empresa, descrição do plano, e o valor somado dos sub-itens (o
// detalhamento item a item fica pra seção "DETALHAMENTO DOS SERVIÇOS").
function renderEscopoGrupoLinha(grupo, empresa) {
  const total = somaSubItensP(grupo.subItens);
  return `
    <div class="proposal-escopo-item">
      <div class="proposal-escopo-item-texto">
        <div class="proposal-escopo-item-titulo">${escapeHtmlP((grupo.titulo || "").toUpperCase())} — ${escapeHtmlP(empresa || "")}</div>
        ${grupo.descricao ? `<div class="proposal-escopo-item-desc">${escapeHtmlP(grupo.descricao)}</div>` : ""}
      </div>
      <div class="proposal-escopo-item-valor">R$ ${formatarValorP(total)}</div>
    </div>`;
}

// Cabeçalho "ESCOPO E INVESTIMENTO" + a primeira linha — sempre juntos no
// mesmo bloco, pra nunca deixar o título sozinho numa folha separada do
// primeiro item que ele apresenta.
function renderEscopoIntroBloco(primeiraLinhaHtml) {
  return `
    <div>
      <h2 class="proposal-h2">ESCOPO E INVESTIMENTO</h2>
      <p class="proposal-sub">Serviços que serão prestados</p>
      <div class="proposal-escopo-lista">${primeiraLinhaHtml}</div>
    </div>`;
}

function renderEscopoLinhaBlocoAvulso(linhaHtml) {
  return `<div class="proposal-escopo-lista">${linhaHtml}</div>`;
}

// "O Plano Completo inclui: item • item • item." — mesma lista de detalhes
// do produto que antes virava um checklist com marcadores redondos, agora
// como frase corrida (a lista com marcador fica pro escopo mais detalhado
// não existir mais nessa página).
function renderInclusoNotasHtml(planosSelecionados) {
  const planosComDetalhes = (planosSelecionados || []).filter((p) => p.detalhes && p.detalhes.length > 0);
  return planosComDetalhes
    .map((p) => {
      const itens = p.detalhes.map((d) => escapeHtmlP(lowerFirstP(d))).join(" • ");
      return `<p class="proposal-inclui-nota">O ${escapeHtmlP(p.nome)} inclui: ${itens}.</p>`;
    })
    .join("");
}

function renderEscopoFechamentoBloco(planosSelecionados, total) {
  return `
    <div>
      ${renderInclusoNotasHtml(planosSelecionados)}
      <p class="proposal-total-linha">VALOR TOTAL MENSAL: R$ ${formatarValorP(total)}</p>
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

function investimentoMetaHtml(investimento) {
  return `
    <div class="proposal-investimento-meta">
      <div><span class="fl">Forma de pagamento</span><span class="fv">${phP(investimento.formaPagamento, "A combinar")}</span></div>
      <div><span class="fl">Prazo para início</span><span class="fv">${phP(investimento.prazoInicio, "Após aceite")}</span></div>
      <div><span class="fl">Validade da proposta</span><span class="fv">${phP(investimento.validade, "Não informado")}</span></div>
    </div>`;
}

// Proposta sem itens de investimento/checklist precificado nenhum: mostra a
// lista de etapas (ou "o que está incluso" do plano, se algum foi marcado
// sem valor) e um valor único de investimento, sem a lista/tabela de
// escopo detalhado (não tem o que detalhar).
function renderEscopoSemItensBloco(investimento, planosSelecionados) {
  const temDesconto = investimento.temDesconto && investimento.valorFinal;
  const linhaValor = temDesconto
    ? `<p class="proposal-total-linha">VALOR DO INVESTIMENTO: <span class="proposal-total-linha-riscado">R$ ${formatarValorP(parseValorP(investimento.valorCheio))}</span> R$ ${formatarValorP(parseValorP(investimento.valorFinal))}</p>`
    : `<p class="proposal-total-linha">VALOR DO INVESTIMENTO: ${investimento.valorCheio ? "R$ " + formatarValorP(parseValorP(investimento.valorCheio)) : '<span class="placeholder">[valor]</span>'}</p>`;
  return `
    <div>
      <h2 class="proposal-h2">ESCOPO E INVESTIMENTO</h2>
      <p class="proposal-sub">Serviços que serão prestados</p>
      <div class="proposal-escopo-etapas">${renderEtapasOuPlanos(planosSelecionados)}</div>
      ${linhaValor}
      ${investimentoMetaHtml(investimento)}
    </div>`;
}

// --- "DETALHAMENTO DOS SERVIÇOS" (página de fechamento) -------------------

function renderTabelaGrupoHtml(grupo) {
  const total = somaSubItensP(grupo.subItens);
  return `
    <table class="proposal-tabela">
      <thead><tr><th>SERVIÇO</th><th class="num">VALOR</th></tr></thead>
      <tbody>
        ${grupo.subItens.map((s) => `<tr><td>${escapeHtmlP(s.titulo)}</td><td class="num">${valorOuInclusoP(s.valor)}</td></tr>`).join("")}
        <tr class="is-subtotal"><td>Subtotal — ${escapeHtmlP(grupo.empresa || "")}</td><td class="num">R$ ${formatarValorP(total)}</td></tr>
      </tbody>
    </table>`;
}

function renderDetalhamentoSoltoLinha(item, empresa) {
  const titulo = empresa ? `${item.titulo || ""} — ${empresa}` : (item.titulo || "");
  return `
    <div class="proposal-detalhamento-solto">
      <span>${escapeHtmlP(titulo.toUpperCase())}</span>
      <span>${valorOuInclusoP(item.valor)}</span>
    </div>`;
}

// Decompõe grupos/soltos de UMA empresa (mesma decomposição do ESCOPO) numa
// lista plana de itens de detalhamento: cada grupo vira uma tabela (com o
// subtítulo "Composição de ... — empresa" junto), cada solto vira uma linha
// simples. Usado por empresa — a lista final (todas as empresas da
// proposta) é montada em montarBlocosProposta.
function montarItensDetalhamentoDaEmpresa(grupos, soltos, empresa, sufixoSoltos) {
  const itens = [];
  grupos.forEach((g) => {
    const subTxt = `Composição do ${g.titulo} — ${empresa || ""}`;
    itens.push({ sub: `<p class="proposal-sub">${escapeHtmlP(subTxt)}</p>`, html: renderTabelaGrupoHtml(Object.assign({ empresa }, g)) });
  });
  soltos.forEach((s) => {
    itens.push({ sub: "", html: renderDetalhamentoSoltoLinha(s, sufixoSoltos) });
  });
  return itens;
}

// Cabeçalho "DETALHAMENTO DOS SERVIÇOS" + o primeiro item (tabela ou linha)
// — sempre juntos, mesmo motivo dos outros cabeçalhos desse arquivo.
function renderDetalhamentoHeaderBloco(primeiroItem) {
  return `
    <div>
      <h2 class="proposal-h2">DETALHAMENTO DOS SERVIÇOS</h2>
      ${primeiroItem.sub}
      ${primeiroItem.html}
    </div>`;
}

function renderDetalhamentoItemBlocoAvulso(item) {
  return item.sub ? `<div>${item.sub}${item.html}</div>` : item.html;
}

function renderValorTotalMensalBloco(investimento, total, subtitulo) {
  return `
    <div>
      <div class="proposal-valor-total-bar">
        <div class="proposal-valor-total-text">
          <div class="proposal-valor-total-label">VALOR TOTAL MENSAL</div>
          <div class="proposal-valor-total-sub">${escapeHtmlP(subtitulo)}</div>
        </div>
        <div class="proposal-valor-total-valor">R$ ${formatarValorP(total)}</div>
      </div>
      ${investimentoMetaHtml(investimento)}
      <p class="proposal-agradecimento">A AEA Contabilidade Consultiva agradece a oportunidade e permanece à disposição para o início da parceria.</p>
    </div>`;
}

// Decompõe a proposta inteira numa lista plana de blocos (cada um uma
// unidade indivisível) — quem decide quais blocos caem em qual folha física
// é montarPreviewPaginado(), em app-orcamento.js, depois de medir a altura
// real de cada um no navegador (só assim dá pra aproveitar o espaço da
// folha sem cortar texto/tabela no meio, sem depender de heurísticas fixas
// de quantos itens "normalmente" cabem por página).
function montarBlocosProposta(data) {
  const grupoEmpresas = data.grupo || [];
  const blocos = [];

  // Cada empresa da proposta (a contratante + as adicionais do Grupo
  // Econômico) pode ter seu próprio plano/serviços incluídos — os itens da
  // contratante vêm do checklist principal + itens de investimento manuais
  // (sempre atribuídos a ela); os da empresa adicional vêm do checklist
  // próprio dela (ver addGrupoRowOrc/collectGrupoOrc em app-orcamento.js).
  const empresasComServicos = [
    { nome: data.cliente.empresa, itens: data.investimento.itens || [], planosSelecionados: data.planosSelecionados || [] },
    ...grupoEmpresas.map((e) => ({ nome: e.nome, itens: e.itens || [], planosSelecionados: e.planosSelecionados || [] })),
  ];
  const todosItens = empresasComServicos.reduce((acc, e) => acc.concat(e.itens), []);
  const temItensMultiplos = todosItens.length > 0;

  blocos.push({ html: renderHeroBloco(data.cliente) });
  blocos.push({ html: renderDadosClienteBloco(data.cliente, data.diagnostico) });
  grupoEmpresas.forEach((empresa) => {
    blocos.push({ html: renderDadosClienteExtraBloco(empresa) });
  });

  if (temItensMultiplos) {
    const linhasEscopo = [];
    const itensDetalhamento = [];
    empresasComServicos.forEach((empresa, idx) => {
      if (empresa.itens.length === 0) return;
      // Um grupo (plano + Escritório) sempre mostra a empresa no título,
      // mesmo o da contratante ("PLANO COMPLETO — VG2") — já um item avulso
      // só mostra quando é de uma empresa ADICIONAL do grupo econômico
      // (idx > 0): um item avulso da própria contratante não precisa repetir
      // o nome dela.
      const sufixoSoltos = idx === 0 ? null : empresa.nome;
      const { grupos, soltos } = agruparItensInvestimento(empresa.itens, empresa.planosSelecionados);
      grupos.forEach((g) => linhasEscopo.push({ tipo: "grupo", dado: g, empresa: empresa.nome }));
      soltos.forEach((s) => linhasEscopo.push({ tipo: "solto", dado: s, empresa: sufixoSoltos }));
      itensDetalhamento.push(...montarItensDetalhamentoDaEmpresa(grupos, soltos, empresa.nome, sufixoSoltos));
    });

    linhasEscopo.forEach((linha, i) => {
      const html = linha.tipo === "grupo"
        ? renderEscopoGrupoLinha(linha.dado, linha.empresa)
        : renderEscopoItemLinha(linha.dado, linha.empresa);
      blocos.push({ html: i === 0 ? renderEscopoIntroBloco(html) : renderEscopoLinhaBlocoAvulso(html) });
    });
    const todosPlanosSelecionados = empresasComServicos.reduce((acc, e) => acc.concat(e.planosSelecionados), []);
    blocos.push({ html: renderEscopoFechamentoBloco(todosPlanosSelecionados, somaItensP(todosItens)) });

    itensDetalhamento.forEach((item, i) => {
      blocos.push({ html: i === 0 ? renderDetalhamentoHeaderBloco(item) : renderDetalhamentoItemBlocoAvulso(item) });
    });

    const nomesEmpresas = empresasComServicos.map((e) => e.nome).filter(Boolean).join(" + ");
    blocos.push({ html: renderValorTotalMensalBloco(data.investimento, somaItensP(todosItens), nomesEmpresas) });
  } else {
    blocos.push({ html: renderEscopoSemItensBloco(data.investimento, data.planosSelecionados) });
  }

  return blocos;
}
