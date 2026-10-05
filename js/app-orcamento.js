const FIELD_IDS_ORC = [
  "q_nomeResponsavel", "q_empresa", "q_cnpj", "q_responsavel", "q_telefone", "q_email", "q_dataProposta", "q_validade",
  "d_notasMes", "d_funcionarios", "d_faturamento", "d_regime", "d_segmento", "d_observacoes",
  "i_valorCheio", "i_temDesconto", "i_valorFinal", "i_formaPagamento", "i_prazoInicio",
];

function getOrc(id) { return document.getElementById(id).value; }
function checkedOrc(id) { return document.getElementById(id).checked; }
function setOrc(id, value) { document.getElementById(id).value = value || ""; }
function setCheckedOrc(id, value) { document.getElementById(id).checked = !!value; }

// --- Serviços incluídos (mesmo catálogo usado em Vendas) -----------------

let produtosCacheOrc = [];

// Serviços agrupados em 3 blocos pra ficar claro na hora de montar a
// proposta: Honorário (o plano mensal — só faz sentido escolher um, então
// funciona como rádio), Escritório (serviços de rotina vendidos à parte) e
// Adicional (o resto do catálogo, avulso).
const CATEGORIAS_SERVICOS_ORC = [
  { categoria: "Honorário", titulo: "💼 Honorário (escolha um plano)" },
  { categoria: "Escritório", titulo: "🏢 Escritório" },
  { categoria: "Adicional", titulo: "➕ Serviços adicionais" },
];

// Monta o HTML do checklist de serviços (marca + valor, agrupado por
// categoria) — reutilizado tanto pro checklist principal (empresa
// contratante) quanto pro checklist de cada empresa adicional do Grupo
// Econômico (ver addGrupoRowOrc), já que cada uma pode ter seu próprio
// plano/serviços incluídos.
function montarServicosChecklistHtml(checkedNomes, valoresAntigos) {
  if (produtosCacheOrc.length === 0) {
    return `<p class="fixed-note">Nenhum serviço cadastrado ainda (cadastre em Vendas → Início de Proposta).</p>`;
  }

  const porCategoria = {};
  produtosCacheOrc.forEach((p) => {
    const cat = categoriaDoProduto(p);
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(p);
  });

  return CATEGORIAS_SERVICOS_ORC
    .filter((c) => porCategoria[c.categoria] && porCategoria[c.categoria].length > 0)
    .map((c) => `
      <div class="orc-servicos-grupo">
        <div class="orc-servicos-grupo-titulo">${c.titulo}</div>
        ${porCategoria[c.categoria].map((p) => `
          <label class="checkbox orc-servico-linha">
            <input type="checkbox" class="orc-servico-check" data-categoria="${c.categoria}" value="${escapeHtmlP(p.nome)}" ${checkedNomes.has(p.nome) ? "checked" : ""}>
            <span class="orc-servico-nome">${escapeHtmlP(p.nome)}</span>
            <input type="text" class="orc-servico-valor" value="${valoresAntigos[p.nome] || ""}" placeholder="R$">
          </label>
        `).join("")}
      </div>
    `).join("");
}

// Liga os eventos de um checklist de serviços já no DOM (marcar/digitar
// valor atualiza a pré-visualização; dentro de Honorário só um plano marcado
// por vez). Reutilizado pelo checklist principal e pelos do Grupo Econômico.
function wireServicosChecklistOrc(wrap) {
  wrap.querySelectorAll(".orc-servico-check").forEach((c) => {
    c.addEventListener("change", () => {
      if (c.checked && c.dataset.categoria === "Honorário") {
        wrap.querySelectorAll('.orc-servico-check[data-categoria="Honorário"]').forEach((outro) => {
          if (outro !== c) outro.checked = false;
        });
      }
      updateProposalPreview();
    });
  });
  wrap.querySelectorAll(".orc-servico-valor").forEach((v) => {
    v.addEventListener("input", updateProposalPreview);
  });
}

function populateServicosChecklistOrc() {
  const wrap = document.getElementById("orc-servicos-checklist");
  const checkedNomes = new Set(
    Array.from(wrap.querySelectorAll(".orc-servico-check:checked")).map((c) => c.value)
  );
  const valoresAntigos = {};
  Array.from(wrap.querySelectorAll(".orc-servico-linha")).forEach((linha) => {
    const nome = linha.querySelector(".orc-servico-check").value;
    const valor = linha.querySelector(".orc-servico-valor").value;
    if (valor) valoresAntigos[nome] = valor;
  });

  wrap.innerHTML = montarServicosChecklistHtml(checkedNomes, valoresAntigos);
  wireServicosChecklistOrc(wrap);
}

function collectServicosSelecionadosOrc() {
  return Array.from(document.querySelectorAll("#orc-servicos-checklist .orc-servico-check:checked")).map((c) => c.value);
}

// Todo serviço marcado num checklist (principal ou de uma empresa do Grupo
// Econômico) vira uma linha em "Escopo e Investimento" no PDF — com valor
// (se foi preenchido o campo "R$" ao lado) ou sem valor ("Incluso", pra
// serviços incluídos sem cobrança destacada). É essa lista que entra na
// soma do Valor Total.
function collectValoresServicosDoWrapOrc(wrap) {
  if (!wrap) return [];
  return Array.from(wrap.querySelectorAll(".orc-servico-linha"))
    .map((linha) => {
      const check = linha.querySelector(".orc-servico-check");
      if (!check.checked) return null;
      const valorInput = linha.querySelector(".orc-servico-valor");
      const produto = produtosCacheOrc.find((p) => p.nome === check.value);
      return {
        titulo: check.value,
        valor: valorInput.value.trim(),
        recorrencia: produto && tipoDoProduto(produto) === "Recorrente" ? "Mensal" : "Única vez",
        descricao: descricaoDoProduto(produto),
        categoria: categoriaDoProduto(produto),
      };
    })
    .filter(Boolean);
}

function collectValoresServicosOrc() {
  return collectValoresServicosDoWrapOrc(document.getElementById("orc-servicos-checklist"));
}

// Plano(s) de honorário marcado(s) num checklist — usado pra trocar a lista
// genérica de etapas (01 a 05) pelo "o que está incluso" do plano escolhido.
function collectPlanosSelecionadosDoWrapOrc(wrap) {
  if (!wrap) return [];
  const nomesMarcados = Array.from(wrap.querySelectorAll('.orc-servico-check[data-categoria="Honorário"]:checked')).map((c) => c.value);
  return nomesMarcados
    .map((nome) => produtosCacheOrc.find((p) => p.nome === nome))
    .filter(Boolean)
    .map((p) => ({ nome: p.nome, detalhes: detalhesDoProduto(p), descricao: descricaoDoProduto(p) }));
}

function collectPlanosSelecionadosOrc() {
  return collectPlanosSelecionadosDoWrapOrc(document.getElementById("orc-servicos-checklist"));
}

// --- Grupo Econômico (mais de uma empresa na mesma proposta) -------------

let grupoCountOrc = 0;

function addGrupoRowOrc(empresa) {
  empresa = empresa || {};
  const id = grupoCountOrc++;
  const wrap = document.createElement("div");
  wrap.className = "alteracao-row";
  wrap.dataset.grupoRow = id;
  wrap.innerHTML = `
    <button type="button" class="alteracao-remove" data-remove-grupo-orc="${id}">Remover ✕</button>
    <label>Razão social
      <input type="text" class="orc-grupo-nome" placeholder="Razão social">
    </label>
    <label>CNPJ
      <input type="text" class="orc-grupo-cnpj" placeholder="00.000.000/0000-00">
    </label>
    <label>Responsável
      <input type="text" class="orc-grupo-responsavel" placeholder="Nome completo">
    </label>
    <div class="row">
      <label>Telefone
        <input type="text" class="orc-grupo-telefone">
      </label>
      <label>E-mail
        <input type="text" class="orc-grupo-email">
      </label>
    </div>
    <p class="fixed-note">Serviços incluídos para esta empresa</p>
    <div class="orc-grupo-servicos"></div>
  `;
  document.getElementById("orc-grupo-list").appendChild(wrap);
  wrap.querySelector(".orc-grupo-nome").value = empresa.nome || "";
  wrap.querySelector(".orc-grupo-cnpj").value = empresa.cnpj || "";
  wrap.querySelector(".orc-grupo-responsavel").value = empresa.responsavel || "";
  wrap.querySelector(".orc-grupo-telefone").value = empresa.telefone || "";
  wrap.querySelector(".orc-grupo-email").value = empresa.email || "";

  const servicosWrap = wrap.querySelector(".orc-grupo-servicos");
  servicosWrap.innerHTML = montarServicosChecklistHtml(new Set(), {});
  wireServicosChecklistOrc(servicosWrap);

  wrap.querySelectorAll(".orc-grupo-nome, .orc-grupo-cnpj, .orc-grupo-responsavel, .orc-grupo-telefone, .orc-grupo-email").forEach((el) => {
    el.addEventListener("input", updateProposalPreview);
  });
  wrap.querySelector("[data-remove-grupo-orc]").addEventListener("click", () => {
    wrap.remove();
    updateProposalPreview();
  });
}

function collectGrupoOrc() {
  return Array.from(document.querySelectorAll("#orc-grupo-list .alteracao-row"))
    .map((row) => {
      const servicosWrap = row.querySelector(".orc-grupo-servicos");
      return {
        nome: row.querySelector(".orc-grupo-nome").value,
        cnpj: row.querySelector(".orc-grupo-cnpj").value,
        responsavel: row.querySelector(".orc-grupo-responsavel").value,
        telefone: row.querySelector(".orc-grupo-telefone").value,
        email: row.querySelector(".orc-grupo-email").value,
        itens: collectValoresServicosDoWrapOrc(servicosWrap),
        planosSelecionados: collectPlanosSelecionadosDoWrapOrc(servicosWrap),
      };
    })
    .filter((g) => g.nome || g.cnpj);
}

// --- Itens de investimento (múltiplos, opcional) --------------------------

let itensInvestimentoCountOrc = 0;

function addItemInvestimentoRowOrc(item) {
  item = item || {};
  const id = itensInvestimentoCountOrc++;
  const wrap = document.createElement("div");
  wrap.className = "alteracao-row";
  wrap.dataset.itemRow = id;
  wrap.innerHTML = `
    <button type="button" class="alteracao-remove" data-remove-item-investimento="${id}">Remover ✕</button>
    <label>Título
      <input type="text" class="orc-item-titulo" placeholder="ex: Abertura de Empresas">
    </label>
    <div class="row">
      <label>Valor
        <input type="text" class="orc-item-valor" placeholder="ex: R$ 1.200 ou A definir">
      </label>
      <label>Recorrência
        <select class="orc-item-recorrencia">
          <option value="Única vez">Única vez</option>
          <option value="Mensal">Mensal</option>
          <option value="Anual">Anual</option>
          <option value="A definir">A definir</option>
        </select>
      </label>
    </div>
    <label>Descrição (opcional)
      <input type="text" class="orc-item-descricao" placeholder="ex: Cobrado uma única vez na aprovação">
    </label>
  `;
  document.getElementById("orc-itens-investimento-list").appendChild(wrap);
  wrap.querySelector(".orc-item-titulo").value = item.titulo || "";
  wrap.querySelector(".orc-item-valor").value = item.valor || "";
  wrap.querySelector(".orc-item-recorrencia").value = item.recorrencia || "Única vez";
  wrap.querySelector(".orc-item-descricao").value = item.descricao || "";

  wrap.querySelectorAll("input, select").forEach((el) => el.addEventListener("input", updateProposalPreview));
  wrap.querySelectorAll("select").forEach((el) => el.addEventListener("change", updateProposalPreview));
  wrap.querySelector("[data-remove-item-investimento]").addEventListener("click", () => {
    wrap.remove();
    updateProposalPreview();
  });
}

function collectItensInvestimentoOrc() {
  return Array.from(document.querySelectorAll("#orc-itens-investimento-list .alteracao-row"))
    .map((row) => ({
      titulo: row.querySelector(".orc-item-titulo").value,
      valor: row.querySelector(".orc-item-valor").value,
      recorrencia: row.querySelector(".orc-item-recorrencia").value,
      descricao: row.querySelector(".orc-item-descricao").value,
    }))
    .filter((i) => i.titulo || i.valor);
}

function collectProposalData() {
  return {
    cliente: {
      nomeResponsavel: getOrc("q_nomeResponsavel"),
      empresa: getOrc("q_empresa"),
      cnpj: getOrc("q_cnpj"),
      responsavel: getOrc("q_responsavel"),
      telefone: getOrc("q_telefone"),
      email: getOrc("q_email"),
      dataProposta: getOrc("q_dataProposta"),
      validade: getOrc("q_validade"),
    },
    diagnostico: {
      notasMes: getOrc("d_notasMes"),
      funcionarios: getOrc("d_funcionarios"),
      faturamento: getOrc("d_faturamento"),
      regime: getOrc("d_regime"),
      segmento: getOrc("d_segmento"),
      observacoes: getOrc("d_observacoes"),
    },
    servicos: collectServicosSelecionadosOrc(),
    planosSelecionados: collectPlanosSelecionadosOrc(),
    grupo: collectGrupoOrc(),
    investimento: {
      valorCheio: getOrc("i_valorCheio"),
      temDesconto: checkedOrc("i_temDesconto"),
      valorFinal: getOrc("i_valorFinal"),
      formaPagamento: getOrc("i_formaPagamento"),
      prazoInicio: getOrc("i_prazoInicio"),
      validade: getOrc("q_validade"),
      itens: [...collectValoresServicosOrc(), ...collectItensInvestimentoOrc()],
    },
  };
}

// --- Paginação por medição real no navegador -----------------------------
//
// Antes disso, quem decidia onde cada seção da proposta terminava era o
// próprio motor de impressão do Chrome (CSS page-break-*) — só que ele não
// tem como saber, sem renderizar de verdade, quanto de cada bloco cabe
// numa folha A4, e às vezes simplesmente não estica um fundo colorido até
// o fim físico da folha (bug observado e reproduzido isoladamente). Aqui
// cada bloco da proposta (ver montarBlocosProposta em proposal-template.js)
// é renderizado escondido, medido de verdade (getBoundingClientRect) e só
// depois agrupado em folhas — o resultado é pré-paginado: cada
// .proposal-page final já sabe que cabe inteira numa folha A4, então vira
// sua própria página impressa sem depender de heurística nenhuma do
// navegador. A mesma função gera tanto a pré-visualização na tela quanto o
// que sai no Imprimir/Exportar PDF — os dois são sempre idênticos.

// 277mm (folha A4 menos os 10mm de margem de cada lado do @page) a 96dpi.
// Cada .proposal-page vira sua própria página no PDF exportado via canvas
// (ver btn-print em setupActionsOrc), uma de cada vez — não depende mais da
// fragmentação de impressão do navegador pra decidir onde cortar, então o
// valor aqui pode usar o espaço físico da folha inteiro.
const PAGINA_ALTURA_UTIL_PX = 1047;
// Padding vertical de .proposal-page (20px em cima + 20px embaixo).
const PAGINA_PADDING_VERTICAL_PX = 40;
// Precisa bater com o gap: 12px da regra .proposal-page no CSS — é o
// espaço entre marca/blocos/rodapé dentro de cada folha.
const BLOCO_GAP_PX = 12;

function medirBlocosOrc(blocosHtml) {
  const medidorDoc = document.createElement("div");
  medidorDoc.className = "proposal-doc";
  medidorDoc.style.cssText = "position:absolute; visibility:hidden; left:-9999px; top:0; width:718px;";

  const medidorPagina = document.createElement("div");
  medidorPagina.className = "proposal-page";
  medidorDoc.appendChild(medidorPagina);

  const wrappers = blocosHtml.map((html) => {
    const w = document.createElement("div");
    w.innerHTML = html;
    medidorPagina.appendChild(w);
    return w;
  });
  const brandWrapper = document.createElement("div");
  brandWrapper.innerHTML = brandBar();
  medidorPagina.appendChild(brandWrapper);
  const footerWrapper = document.createElement("div");
  footerWrapper.innerHTML = pageFooter();
  medidorPagina.appendChild(footerWrapper);

  document.body.appendChild(medidorDoc);
  const alturas = wrappers.map((w) => w.getBoundingClientRect().height);
  const alturaBrand = brandWrapper.getBoundingClientRect().height;
  const alturaFooter = footerWrapper.getBoundingClientRect().height;
  document.body.removeChild(medidorDoc);

  return { alturas, alturaBrand, alturaFooter };
}

// Empacota os blocos em folhas por altura real: acumula um bloco por vez
// na folha atual enquanto couber no orçamento de altura útil; quando o
// próximo bloco não cabe mais, fecha a folha e começa uma nova. Cada bloco
// é indivisível (nunca é cortado ao meio entre duas folhas).
function paginarBlocosOrc(blocos) {
  if (blocos.length === 0) return [];
  const { alturas, alturaBrand, alturaFooter } = medirBlocosOrc(blocos.map((b) => b.html));
  const orcamentoUtil = PAGINA_ALTURA_UTIL_PX - PAGINA_PADDING_VERTICAL_PX - alturaBrand - alturaFooter - BLOCO_GAP_PX * 2;

  const paginas = [];
  let paginaAtual = [];
  let alturaAtual = 0;

  blocos.forEach((bloco, i) => {
    const alturaBloco = alturas[i];
    const gap = paginaAtual.length > 0 ? BLOCO_GAP_PX : 0;
    if (paginaAtual.length > 0 && alturaAtual + gap + alturaBloco > orcamentoUtil) {
      paginas.push(paginaAtual);
      paginaAtual = [];
      alturaAtual = 0;
    }
    paginaAtual.push(bloco);
    alturaAtual += (paginaAtual.length > 1 ? BLOCO_GAP_PX : 0) + alturaBloco;
  });
  if (paginaAtual.length > 0) paginas.push(paginaAtual);
  return paginas;
}

function montarPreviewPaginadoOrc(data) {
  const blocos = montarBlocosProposta(data);
  const paginas = paginarBlocosOrc(blocos);
  return paginas
    .map((paginaBlocos) => `
      <section class="proposal-page" data-pdf-page>
        ${brandBar()}
        ${paginaBlocos.map((b) => `<div class="proposal-bloco">${b.html}</div>`).join("")}
        ${pageFooter()}
      </section>`)
    .join("");
}

function updateProposalPreview() {
  const data = collectProposalData();
  document.getElementById("proposal-preview").innerHTML = montarPreviewPaginadoOrc(data);
}

function setupLiveUpdateOrc() {
  FIELD_IDS_ORC.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updateProposalPreview);
    el.addEventListener("change", updateProposalPreview);
  });
}

function setupPanelTogglesOrc() {
  document.querySelectorAll(".panel-toggle").forEach((h2) => {
    h2.addEventListener("click", () => {
      const body = document.getElementById(h2.dataset.target);
      body.classList.toggle("collapsed");
    });
  });
}

function setupDescontoToggle() {
  const checkbox = document.getElementById("i_temDesconto");
  const wrap = document.getElementById("i_valorFinalWrap");
  const sync = () => wrap.classList.toggle("hidden", !checkbox.checked);
  checkbox.addEventListener("change", () => { sync(); updateProposalPreview(); });
  sync();
}

async function setupEmpresasOrcamento() {
  const select = document.getElementById("empresa-select");
  const search = document.getElementById("empresa-search");
  const status = document.getElementById("empresa-status");

  let picker = { refresh: async () => {} };
  status.textContent = "Carregando empresas...";
  status.className = "pdf-status";
  try {
    picker = await initEmpresaPicker(search, select, "— Selecione uma empresa —");
    status.textContent = "";
  } catch (err) {
    console.error(err);
    status.textContent = "Não foi possível conectar ao banco de empresas.";
    status.className = "pdf-status error";
  }

  select.addEventListener("change", async () => {
    if (!select.value) return;
    status.textContent = "Carregando...";
    status.className = "pdf-status";
    try {
      const empresa = await getEmpresa(select.value);
      if (!empresa) return;
      const responsavel = empresa.administracao || empresa.socio1 || "";
      document.getElementById("q_empresa").value = empresa.contratante || "";
      document.getElementById("q_cnpj").value = empresa.cnpj || "";
      document.getElementById("q_responsavel").value = responsavel;
      document.getElementById("q_nomeResponsavel").value = responsavel.split(" ")[0] || "";
      document.getElementById("q_email").value = empresa.email || "";
      updateProposalPreview();
      updateDriveFolderLink(document.getElementById("empresa-drive-link"), empresa.driveFolders && empresa.driveFolders.orcamento);
      status.textContent = "Dados do cliente carregados. Confira telefone e nome de saudação.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao carregar a empresa.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("empresa-drive").addEventListener("click", async () => {
    if (!driveConfigured()) {
      status.textContent = "A integração com o Google Drive ainda não foi configurada.";
      status.className = "pdf-status error";
      return;
    }
    const nome = getOrc("q_empresa");
    const cnpj = getOrc("q_cnpj");
    if (!nome) {
      status.textContent = "Preencha ao menos o nome da Empresa/Cliente antes de salvar no Drive.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando proposta no Drive...";
    status.className = "pdf-status";
    try {
      const data = { contratante: nome, cnpj, administracao: getOrc("q_responsavel"), email: getOrc("q_email") };
      const record = await upsertEmpresa(data, select.value || null);
      await picker.refresh();
      select.value = record.id;
      const result = await saveDocumentToDrive({ elementId: "proposal-preview", empresaId: record.id, empresaNome: nome, cnpj, tipoLabel: "Orçamento", tipoKey: "orcamento" });
      updateDriveFolderLink(document.getElementById("empresa-drive-link"), result.folderId);
      status.textContent = "Proposta salva no Drive.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar no Drive: " + err.message;
      status.className = "pdf-status error";
    }
  });
}

// --- Orçamentos Salvos (reabrir um orçamento já feito) -------------------

let orcamentoEditId = null;

// Marca no checklist de serviços (principal ou de uma empresa do Grupo
// Econômico — mesmo wrap que populateServicosChecklistOrc/addGrupoRowOrc
// usam) os itens salvos que vieram do checklist (têm categoria) — os itens
// manuais (sem categoria) não são daqui, são de
// collectItensInvestimentoOrc/addItemInvestimentoRowOrc.
function aplicarItensAoChecklistOrc(wrap, itens) {
  if (!wrap) return;
  const porTitulo = {};
  (itens || []).forEach((i) => { if (i.categoria) porTitulo[i.titulo] = i.valor; });
  wrap.querySelectorAll(".orc-servico-check").forEach((check) => {
    if (!Object.prototype.hasOwnProperty.call(porTitulo, check.value)) return;
    check.checked = true;
    const linha = check.closest(".orc-servico-linha");
    const valorInput = linha && linha.querySelector(".orc-servico-valor");
    if (valorInput) valorInput.value = porTitulo[check.value] || "";
  });
}

// Preenche o formulário inteiro de volta a partir de um orçamento salvo
// (ver collectProposalData, que é o espelho exato disso) — checklist
// principal, grupo econômico (cada um com seu próprio checklist) e itens
// de investimento manuais inclusos.
function applyOrcamentoToForm(data) {
  const cliente = data.cliente || {};
  setOrc("q_nomeResponsavel", cliente.nomeResponsavel);
  setOrc("q_empresa", cliente.empresa);
  setOrc("q_cnpj", cliente.cnpj);
  setOrc("q_responsavel", cliente.responsavel);
  setOrc("q_telefone", cliente.telefone);
  setOrc("q_email", cliente.email);
  setOrc("q_dataProposta", cliente.dataProposta);
  setOrc("q_validade", cliente.validade);

  const diagnostico = data.diagnostico || {};
  setOrc("d_notasMes", diagnostico.notasMes);
  setOrc("d_funcionarios", diagnostico.funcionarios);
  setOrc("d_faturamento", diagnostico.faturamento);
  setOrc("d_regime", diagnostico.regime);
  setOrc("d_segmento", diagnostico.segmento);
  setOrc("d_observacoes", diagnostico.observacoes);

  const investimento = data.investimento || {};
  setOrc("i_valorCheio", investimento.valorCheio);
  setCheckedOrc("i_temDesconto", investimento.temDesconto);
  setOrc("i_valorFinal", investimento.valorFinal);
  setOrc("i_formaPagamento", investimento.formaPagamento || "A combinar");
  setOrc("i_prazoInicio", investimento.prazoInicio || "Após aceite");

  document.querySelectorAll("#orc-servicos-checklist .orc-servico-check").forEach((c) => { c.checked = false; });
  document.querySelectorAll("#orc-servicos-checklist .orc-servico-valor").forEach((v) => { v.value = ""; });
  aplicarItensAoChecklistOrc(document.getElementById("orc-servicos-checklist"), investimento.itens);

  document.getElementById("orc-grupo-list").innerHTML = "";
  (data.grupo || []).forEach((empresa) => {
    addGrupoRowOrc(empresa);
    const row = document.getElementById("orc-grupo-list").lastElementChild;
    aplicarItensAoChecklistOrc(row.querySelector(".orc-grupo-servicos"), empresa.itens);
  });

  document.getElementById("orc-itens-investimento-list").innerHTML = "";
  (investimento.itens || []).filter((i) => !i.categoria).forEach((item) => addItemInvestimentoRowOrc(item));

  setupDescontoToggle();
  updateProposalPreview();
}

async function setupOrcamentoPicker() {
  const select = document.getElementById("orcamento-select");
  const search = document.getElementById("orcamento-search");
  const status = document.getElementById("orcamento-picker-status");

  let picker = { refresh: async () => {} };
  status.textContent = "Carregando orçamentos salvos...";
  status.className = "pdf-status";
  try {
    picker = await initOrcamentoPicker(search, select, "— Selecione um orçamento —");
    status.textContent = "";
  } catch (err) {
    console.error(err);
    status.textContent = "Não foi possível conectar ao banco de orçamentos.";
    status.className = "pdf-status error";
  }

  select.addEventListener("change", async () => {
    if (!select.value) return;
    status.textContent = "Carregando orçamento...";
    status.className = "pdf-status";
    try {
      const data = await getOrcamentoById(select.value);
      if (!data) return;
      orcamentoEditId = select.value;
      applyOrcamentoToForm(data);
      status.textContent = "Orçamento carregado. Alterações agora salvam por cima deste registro.";
      status.className = "pdf-status ok";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao carregar o orçamento.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("btn-salvar-orcamento").addEventListener("click", async () => {
    const nome = getOrc("q_empresa").trim();
    if (!nome) {
      status.textContent = "Preencha ao menos o nome da Empresa/Cliente antes de salvar o orçamento.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando orçamento...";
    status.className = "pdf-status";
    try {
      const data = collectProposalData();
      const record = await upsertOrcamentoRegistro(data, orcamentoEditId);
      orcamentoEditId = record.id;
      await picker.refresh();
      select.value = record.id;
      status.textContent = "Orçamento salvo. Já dá pra gerar um Contrato a partir dele na tela de Contrato.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar o orçamento: " + (err && err.message ? err.message : "erro desconhecido.");
      status.className = "pdf-status error";
    }
  });
}

// A geração de PDF em si (captura cada .proposal-page separadamente em
// canvas e monta o PDF manualmente, página por página) é compartilhada —
// ver montarPdfPorPaginas em drive-upload.js — porque o mesmo mecanismo
// agora também serve pro Contrato (ver app.js) e pro "Salvar no Drive" de
// qualquer documento paginado assim.
async function montarPdfOrc() {
  const pageEls = Array.from(document.querySelectorAll("#proposal-preview .proposal-page"));
  return montarPdfPorPaginas(pageEls);
}

async function gerarPdfOrc(empresa) {
  const pdf = await montarPdfOrc();
  pdf.save(`Proposta - ${empresa || "AEA"}.pdf`);
}

// Abre o PDF (já paginado igual à pré-visualização, sem corte) numa aba nova
// e aciona o diálogo de impressão do navegador ali — em vez de reativar o
// window.print() na tela ao vivo, que tem o bug de quebra espúria que
// montarPdfOrc/montarPdfPorPaginas evitam. Assim dá pra mandar direto pra
// impressora sem precisar baixar o arquivo e abrir de novo manualmente.
async function imprimirDiretoOrc() {
  const pdf = await montarPdfOrc();
  const url = pdf.output("bloburl");
  const janela = window.open(url, "_blank");
  if (!janela) {
    throw new Error("O navegador bloqueou a aba de impressão. Permita pop-ups pra este site e tente de novo.");
  }
  setTimeout(() => {
    try {
      janela.print();
    } catch (err) {
      console.error(err);
    }
  }, 600);
}

function setupActionsOrc() {
  document.getElementById("btn-imprimir").addEventListener("click", async () => {
    const btn = document.getElementById("btn-imprimir");
    const textoOriginal = btn.textContent;
    btn.textContent = "Preparando...";
    btn.disabled = true;
    try {
      await imprimirDiretoOrc();
    } catch (err) {
      console.error(err);
      alert("Não foi possível abrir a impressão: " + (err && err.message ? err.message : "erro desconhecido."));
    } finally {
      btn.textContent = textoOriginal;
      btn.disabled = false;
    }
  });

  document.getElementById("btn-print").addEventListener("click", async () => {
    const btn = document.getElementById("btn-print");
    const empresa = (getOrc("q_empresa") || "Proposta").trim();
    const textoOriginal = btn.textContent;
    btn.textContent = "Gerando PDF...";
    btn.disabled = true;
    try {
      await gerarPdfOrc(empresa);
    } catch (err) {
      console.error(err);
      alert("Não foi possível gerar o PDF: " + (err && err.message ? err.message : "erro desconhecido."));
    } finally {
      btn.textContent = textoOriginal;
      btn.disabled = false;
    }
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos da proposta?")) return;
    FIELD_IDS_ORC.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") return;
      el.value = "";
    });
    document.getElementById("i_temDesconto").checked = false;
    document.getElementById("i_formaPagamento").value = "A combinar";
    document.getElementById("i_prazoInicio").value = "Após aceite";
    document.getElementById("d_regime").value = "Simples Nacional";
    document.getElementById("orc-grupo-list").innerHTML = "";
    document.getElementById("orc-itens-investimento-list").innerHTML = "";
    document.querySelectorAll(".orc-servico-check").forEach((c) => { c.checked = false; });
    document.querySelectorAll(".orc-servico-valor").forEach((v) => { v.value = ""; });
    orcamentoEditId = null;
    document.getElementById("orcamento-select").value = "";
    setupDescontoToggle();
    updateProposalPreview();
  });
}

function setupGrupoEconomicoOrc() {
  document.getElementById("orc-add-grupo").addEventListener("click", () => {
    addGrupoRowOrc();
    updateProposalPreview();
  });
}

function setupItensInvestimentoOrc() {
  document.getElementById("orc-add-item-investimento").addEventListener("click", () => {
    addItemInvestimentoRowOrc();
    updateProposalPreview();
  });
}

async function setupServicosOrc() {
  try {
    produtosCacheOrc = await getProdutos();
  } catch (err) {
    console.error(err);
    produtosCacheOrc = [];
  }
  populateServicosChecklistOrc();
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelTogglesOrc();
  setupDescontoToggle();
  setupLiveUpdateOrc();
  setupEmpresasOrcamento();
  setupOrcamentoPicker();
  setupServicosOrc();
  setupGrupoEconomicoOrc();
  setupItensInvestimentoOrc();
  setupActionsOrc();
  updateProposalPreview();
});
