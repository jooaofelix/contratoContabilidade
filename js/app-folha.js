// AEA Folha — Central de Importação e Atualização Inteligente. As três ações
// principais (Importar Novos Funcionários / Atualizar Cadastros com Arquivos
// / Criar Folha a partir de Documento Anterior) usam o mesmo mecanismo de
// leitura (folha-import-parser.js), identificação e comparação
// (folha-reconciliation.js) — ver wireAcaoImportacaoFolha, chamada duas
// vezes com ids de DOM diferentes, em vez de duplicar o fluxo inteiro.

function escapeHtmlFolha(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatarValorFolhaExibicao(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return escapeHtmlFolha(v);
}

const FOLHA_STATUS_LABEL = {
  NOVO: { texto: "Novo funcionário", classe: "folha-badge-novo" },
  EXISTENTE: { texto: "Funcionário existente", classe: "folha-badge-existente" },
  POSSIVEL_DUPLICIDADE: { texto: "Possível duplicidade", classe: "folha-badge-duplicidade" },
  DADOS_INSUFICIENTES: { texto: "Dados insuficientes", classe: "folha-badge-insuficiente" },
};

const FOLHA_ACAO_LABEL = {
  complementar: "Preencher campo vazio",
  divergencia: "Divergência identificada",
  sem_alteracao: "Sem alteração",
};

function ativarModoFolha(mode) {
  const tab = document.querySelector(`.mode-tab[data-mode-tab="${mode}"]`);
  if (!tab) return;
  document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t === tab));
  document.querySelectorAll("[data-mode]").forEach((el) => el.classList.toggle("hidden", el.dataset.mode !== mode));
}

function setupModoToggleFolha() {
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => ativarModoFolha(tab.dataset.modeTab));
  });
}

// --- Núcleo compartilhado: processar arquivos → reconciliar → renderizar ----

async function processarArquivosFolha(files, empresaId) {
  const avisosGerais = [];
  const funcionariosExtraidos = [];
  const apontamentosExtraidos = [];
  const importacoesDesteEnvio = [];

  for (const file of files) {
    const hash = await hashArquivo(file);
    const existente = await getImportacaoPorHash(empresaId, hash);
    if (existente) {
      avisosGerais.push(`"${file.name}" já havia sido importado antes (${new Date(existente.dataImportacaoMs).toLocaleString("pt-BR")}) — ignorado para não duplicar.`);
      continue;
    }

    const parsed = await parseDocumentoFolha(file);
    // "concluida" aqui marca que o ARQUIVO já foi lido/extraído (é isso que
    // protege contra reimportação duplicada, item 10) — a aprovação de cada
    // funcionário/apontamento individual fica registrada nas próprias
    // coleções de destino, não no status deste registro de auditoria.
    const importacao = await registrarImportacao({
      empresaId,
      arquivoNome: file.name,
      arquivoHash: hash,
      tipoDetectado: parsed.tipoDetectado,
      competenciaDetectada: parsed.competenciaDetectada,
      status: "concluida",
      resumoExtraido: { funcionarios: parsed.funcionarios.length, apontamentos: parsed.apontamentos.length },
      avisos: parsed.avisos,
    });

    importacoesDesteEnvio.push(importacao);
    parsed.avisos.forEach((a) => avisosGerais.push(`"${file.name}": ${a}`));
    parsed.funcionarios.forEach((f) => funcionariosExtraidos.push(Object.assign({}, f, { _importacaoId: importacao.id, _documentoNome: file.name, _competenciaDocumento: parsed.competenciaDetectada })));
    parsed.apontamentos.forEach((a) => apontamentosExtraidos.push(Object.assign({}, a, { _importacaoId: importacao.id, _documentoNome: file.name })));
  }

  const [cadastrados, rubricas] = await Promise.all([getFuncionarios(empresaId), getRubricas(empresaId)]);

  const itensFuncionario = reconciliarFuncionarios(funcionariosExtraidos, cadastrados).map((item, i) => Object.assign({}, item, {
    _importacaoId: funcionariosExtraidos[i]._importacaoId,
    _documentoNome: funcionariosExtraidos[i]._documentoNome,
    _competenciaDocumento: funcionariosExtraidos[i]._competenciaDocumento,
  }));

  const itensApontamento = reconciliarApontamentos(apontamentosExtraidos, rubricas, []).map((item, i) => Object.assign({}, item, {
    _importacaoId: apontamentosExtraidos[i]._importacaoId,
    _documentoNome: apontamentosExtraidos[i]._documentoNome,
  }));

  return { avisosGerais, itensFuncionario, itensApontamento, importacoesDesteEnvio, cadastrados };
}

// --- Renderização da tela de comparação (item 8) -----------------------------

function renderResumoCards(container, itensFuncionario) {
  const contagem = { NOVO: 0, EXISTENTE: 0, POSSIVEL_DUPLICIDADE: 0, DADOS_INSUFICIENTES: 0 };
  itensFuncionario.forEach((i) => { contagem[i.status] = (contagem[i.status] || 0) + 1; });

  container.innerHTML = Object.keys(contagem).map((status) => `
    <div class="folha-resumo-card">
      <div class="num">${contagem[status]}</div>
      <div class="label">${FOLHA_STATUS_LABEL[status].texto}</div>
    </div>`).join("");
}

function renderCampoLinha(item, campo, idx) {
  const idBase = `campo-${item._uid}-${idx}`;
  if (campo.acaoSugerida === "complementar") {
    return `
      <tr>
        <td>${escapeHtmlFolha(campo.label)}</td>
        <td>${formatarValorFolhaExibicao(campo.valorAtual)}</td>
        <td>${formatarValorFolhaExibicao(campo.valorArquivo)}</td>
        <td><span class="folha-badge folha-badge-complementar">Preencher</span></td>
        <td><label class="checkbox"><input type="checkbox" class="folha-campo-aplicar" data-campo="${campo.campo}" id="${idBase}" checked> Aplicar</label></td>
      </tr>`;
  }
  if (campo.acaoSugerida === "divergencia") {
    return `
      <tr>
        <td>${escapeHtmlFolha(campo.label)}</td>
        <td>${formatarValorFolhaExibicao(campo.valorAtual)}</td>
        <td class="folha-valor-divergente">${formatarValorFolhaExibicao(campo.valorArquivo)}</td>
        <td><span class="folha-badge folha-badge-divergencia">Divergência</span></td>
        <td>
          <select class="folha-acao-select folha-campo-divergencia" data-campo="${campo.campo}">
            <option value="manter" selected>Manter valor cadastrado</option>
            <option value="atualizar">Atualizar para o valor do arquivo</option>
            ${campo.campo === "salario" ? '<option value="vigencia">Registrar alteração com data de vigência</option>' : ""}
            <option value="ignorar">Ignorar sugestão</option>
          </select>
          ${campo.campo === "salario" ? `<input type="date" class="folha-campo-vigencia hidden" data-campo="${campo.campo}" value="${campo.vigenciaSugerida || ""}">` : ""}
        </td>
      </tr>`;
  }
  return "";
}

function renderGrupoFuncionario(item, uid) {
  item._uid = uid;
  const label = FOLHA_STATUS_LABEL[item.status];
  const nome = item.extraido.nome || "(sem nome)";
  const checkboxDesabilitado = item.conflito;

  let corpoExtra = "";
  if (item.status === "EXISTENTE" && item.campos.length > 0) {
    corpoExtra = `
      <table class="folha-tabela">
        <thead><tr><th>Campo</th><th>Valor atual</th><th>Valor no arquivo</th><th>Ação sugerida</th><th>Decisão</th></tr></thead>
        <tbody>${item.campos.map((c, idx) => renderCampoLinha(item, c, idx)).join("")}</tbody>
      </table>`;
  } else if (item.status === "POSSIVEL_DUPLICIDADE") {
    corpoExtra = `
      <div class="panel-body">
        <p class="fixed-note">Encontramos um funcionário já cadastrado com o mesmo nome, mas sem CPF ou matrícula batendo — confira antes de decidir.</p>
        <select class="folha-duplicidade-resolucao">
          <option value="">— decidir —</option>
          <option value="mesmo">É o mesmo funcionário já cadastrado</option>
          <option value="novo">É um funcionário diferente (cadastrar como novo)</option>
        </select>
      </div>`;
  } else if (item.status === "DADOS_INSUFICIENTES") {
    corpoExtra = `<div class="panel-body"><p class="fixed-note">Faltam dados suficientes (nome completo ou CPF válido) para identificar este registro com segurança — complete manualmente na Ficha Cadastral.</p></div>`;
  }

  return `
    <div class="folha-grupo" data-uid="${uid}" data-status="${item.status}">
      <div class="folha-grupo-header">
        <label class="checkbox">
          <input type="checkbox" class="folha-grupo-checkbox" ${checkboxDesabilitado ? "disabled" : "checked"}>
        </label>
        <span class="nome">${escapeHtmlFolha(nome)}</span>
        <span class="folha-badge ${label.classe}">${label.texto}</span>
        <span class="fixed-note">${escapeHtmlFolha(item._documentoNome || "")}</span>
        ${checkboxDesabilitado ? '<button type="button" class="btn-secondary folha-aplicar-individual">Aplicar este registro</button>' : ""}
      </div>
      ${corpoExtra}
    </div>`;
}

function renderTabelaApontamentos(itensApontamento) {
  if (itensApontamento.length === 0) return "";
  const statusLabel = {
    RUBRICA_RECONHECIDA: { texto: "Reconhecida", classe: "folha-badge-existente" },
    RUBRICA_DESCONHECIDA: { texto: "Desconhecida — precisa mapear", classe: "folha-badge-divergencia" },
    RUBRICA_NAO_CONFIRMADA: { texto: "Incidências não confirmadas", classe: "folha-badge-duplicidade" },
    JA_LANCADO: { texto: "Já lançado nesta competência", classe: "folha-badge-sem-alteracao" },
  };
  return `
    <section class="panel">
      <h2>🧾 Rubricas e apontamentos identificados</h2>
      <div class="panel-body">
        <p class="fixed-note">Informativo — nenhuma incidência tributária é presumida pelo código ou pela descrição. Rubricas desconhecidas ou não confirmadas precisam ser mapeadas/configuradas antes de entrar em qualquer cálculo.</p>
        <table class="folha-tabela">
          <thead><tr><th>Código</th><th>Descrição</th><th>Referência</th><th>Valor</th><th>Status</th><th>Documento</th></tr></thead>
          <tbody>
            ${itensApontamento.map((i) => `
              <tr>
                <td>${escapeHtmlFolha(i.extraido.rubricaCodigo)}</td>
                <td>${escapeHtmlFolha(i.extraido.rubricaDescricao)}</td>
                <td>${formatarValorFolhaExibicao(i.extraido.referencia)}</td>
                <td>${formatarValorFolhaExibicao(i.extraido.valor)}</td>
                <td><span class="folha-badge ${statusLabel[i.status].classe}">${statusLabel[i.status].texto}</span></td>
                <td>${escapeHtmlFolha(i._documentoNome)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
}

function renderResultadoImportacaoFolha(container, resultado) {
  const avisosHtml = resultado.avisosGerais.length
    ? `<div class="folha-avisos"><strong>Avisos</strong><ul>${resultado.avisosGerais.map((a) => `<li>${escapeHtmlFolha(a)}</li>`).join("")}</ul></div>`
    : "";

  if (resultado.itensFuncionario.length === 0 && resultado.itensApontamento.length === 0) {
    container.innerHTML = avisosHtml + `<p class="empresas-empty">Nenhum funcionário ou rubrica reconhecida nos arquivos enviados.</p>`;
    return;
  }

  const resumoId = "resumo-" + Date.now();
  container.innerHTML = `
    ${avisosHtml}
    <div class="folha-resumo-cards" id="${resumoId}"></div>
    <div class="folha-acoes-lote">
      <button type="button" class="btn-secondary folha-marcar-todos">Selecionar todos elegíveis</button>
      <button type="button" class="btn-primary folha-aprovar-selecionados">Aprovar selecionados</button>
    </div>
    <div class="folha-grupos-wrap"></div>
    ${renderTabelaApontamentos(resultado.itensApontamento)}
  `;

  renderResumoCards(container.querySelector(`#${resumoId}`), resultado.itensFuncionario);

  const gruposWrap = container.querySelector(".folha-grupos-wrap");
  gruposWrap.innerHTML = resultado.itensFuncionario.map((item, i) => renderGrupoFuncionario(item, i)).join("");

  container.querySelector(".folha-marcar-todos").addEventListener("click", () => {
    gruposWrap.querySelectorAll(".folha-grupo-checkbox:not(:disabled)").forEach((cb) => { cb.checked = true; });
  });

  gruposWrap.querySelectorAll(".folha-campo-divergencia").forEach((select) => {
    select.addEventListener("change", () => {
      const vigenciaInput = select.parentElement.querySelector(".folha-campo-vigencia");
      if (vigenciaInput) vigenciaInput.classList.toggle("hidden", select.value !== "vigencia");
    });
  });

  gruposWrap.querySelectorAll(".folha-aplicar-individual").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const grupoEl = btn.closest(".folha-grupo");
      const item = resultado.itensFuncionario[Number(grupoEl.dataset.uid)];
      btn.disabled = true;
      btn.textContent = "Aplicando...";
      try {
        await aplicarItemFuncionarioFolha(item, grupoEl, resultado);
        grupoEl.style.opacity = "0.55";
        btn.textContent = "Aplicado ✓";
      } catch (err) {
        console.error(err);
        alert("Erro ao aplicar: " + err.message);
        btn.disabled = false;
        btn.textContent = "Aplicar este registro";
      }
    });
  });

  container.querySelector(".folha-aprovar-selecionados").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    const textoOriginal = btn.textContent;
    const checkboxesMarcados = Array.from(gruposWrap.querySelectorAll(".folha-grupo-checkbox:checked:not(:disabled)"));
    let aplicados = 0;
    for (const cb of checkboxesMarcados) {
      const grupoEl = cb.closest(".folha-grupo");
      const item = resultado.itensFuncionario[Number(grupoEl.dataset.uid)];
      btn.textContent = `Aplicando ${aplicados + 1}/${checkboxesMarcados.length}...`;
      try {
        await aplicarItemFuncionarioFolha(item, grupoEl, resultado);
        grupoEl.style.opacity = "0.55";
        aplicados++;
      } catch (err) {
        console.error(err);
      }
    }
    btn.textContent = textoOriginal;
    btn.disabled = false;
    alert(`${aplicados} registro(s) aplicado(s).`);
  });
}

// --- Aplicar um item (criação/atualização de funcionário) --------------------

async function aplicarCampoFuncionarioFolha(funcionarioId, campo, empresaId, documentoNome, vigencia) {
  if (campo.campo === "salario") {
    await registrarAlteracaoSalarial(funcionarioId, {
      salarioAnterior: campo.valorAtual,
      salarioNovo: campo.valorArquivo,
      dataVigencia: vigencia || null,
      usuario: (typeof userEmail !== "undefined" && userEmail) || "sistema",
      documentoOrigem: documentoNome,
    });
    return;
  }
  const mapaCampo = { cargo: "cargo", admissao: "dataAdmissao", matricula: "matricula" };
  const patch = { empresaId };
  patch[mapaCampo[campo.campo]] = campo.valorArquivo;
  await upsertFuncionario(patch, funcionarioId);
}

async function aplicarItemFuncionarioFolha(item, grupoEl, resultado) {
  const empresaId = resultado.empresaId;

  if (item.status === "DADOS_INSUFICIENTES") return;

  if (item.status === "POSSIVEL_DUPLICIDADE") {
    const resolucao = grupoEl.querySelector(".folha-duplicidade-resolucao").value;
    if (!resolucao) throw new Error("Escolha uma resolução para a duplicidade antes de aplicar.");
    if (resolucao === "novo") {
      await upsertFuncionario({
        empresaId, nome: item.extraido.nome, cpf: item.extraido.cpf, matricula: item.extraido.matricula,
        cargo: item.extraido.cargo, salarioBase: item.extraido.salario, dataAdmissao: item.extraido.admissao,
        ativo: true, origemCadastro: { tipo: "importacao", importacaoId: item._importacaoId, documentoNome: item._documentoNome },
      });
      return;
    }
    // "mesmo" — recalcula os campos contra o cadastrado encontrado e aplica como EXISTENTE.
    const cadastrado = resultado.cadastrados.find((c) => c.id === item.funcionarioExistenteId);
    const campos = [
      compararCampo("Cargo", "cargo", cadastrado.cargo, item.extraido.cargo),
      compararCampo("Salário-base", "salario", cadastrado.salarioBase, item.extraido.salario),
      compararCampo("Data de admissão", "admissao", cadastrado.dataAdmissao, item.extraido.admissao),
      compararCampo("Matrícula", "matricula", cadastrado.matricula, item.extraido.matricula),
    ].filter(Boolean).filter((c) => c.acaoSugerida === "complementar");
    for (const campo of campos) {
      await aplicarCampoFuncionarioFolha(item.funcionarioExistenteId, campo, empresaId, item._documentoNome);
    }
    return;
  }

  if (item.status === "NOVO") {
    await upsertFuncionario({
      empresaId, nome: item.extraido.nome, cpf: item.extraido.cpf, matricula: item.extraido.matricula,
      cargo: item.extraido.cargo, salarioBase: item.extraido.salario, dataAdmissao: item.extraido.admissao,
      ativo: true, origemCadastro: { tipo: "importacao", importacaoId: item._importacaoId, documentoNome: item._documentoNome },
    });
    return;
  }

  // EXISTENTE — aplica cada campo conforme a decisão marcada na tela.
  const linhasComplementar = grupoEl.querySelectorAll(".folha-campo-aplicar:checked");
  for (const checkbox of linhasComplementar) {
    const campo = item.campos.find((c) => c.campo === checkbox.dataset.campo && c.acaoSugerida === "complementar");
    if (campo) await aplicarCampoFuncionarioFolha(item.funcionarioExistenteId, campo, empresaId, item._documentoNome);
  }

  const selectsDivergencia = grupoEl.querySelectorAll(".folha-campo-divergencia");
  for (const select of selectsDivergencia) {
    const escolha = select.value;
    if (escolha === "manter" || escolha === "ignorar") continue;
    const campo = item.campos.find((c) => c.campo === select.dataset.campo && c.acaoSugerida === "divergencia");
    if (!campo) continue;
    const vigenciaInput = select.parentElement.querySelector(".folha-campo-vigencia");
    const vigencia = escolha === "vigencia" ? (vigenciaInput ? vigenciaInput.value : null) : null;
    await aplicarCampoFuncionarioFolha(item.funcionarioExistenteId, campo, empresaId, item._documentoNome, vigencia);
  }
}

// --- Wiring de uma ação (Importar / Atualizar) — mesmo motor, ids diferentes -

function wireAcaoImportacaoFolha({ empresaSelectId, inputId, botaoId, statusId, resultadoId }) {
  const select = document.getElementById(empresaSelectId);
  const input = document.getElementById(inputId);
  const status = document.getElementById(statusId);
  const resultadoEl = document.getElementById(resultadoId);

  document.getElementById(botaoId).addEventListener("click", async () => {
    const empresaId = select.value;
    if (!empresaId) { status.textContent = "Selecione uma empresa primeiro."; status.className = "pdf-status error"; return; }
    if (!input.files || input.files.length === 0) { status.textContent = "Selecione ao menos um arquivo."; status.className = "pdf-status error"; return; }

    status.textContent = `Processando ${input.files.length} arquivo(s)...`;
    status.className = "pdf-status";
    try {
      const resultado = await processarArquivosFolha(Array.from(input.files), empresaId);
      resultado.empresaId = empresaId;
      renderResultadoImportacaoFolha(resultadoEl, resultado);
      status.textContent = `Concluído: ${resultado.itensFuncionario.length} funcionário(s) e ${resultado.itensApontamento.length} rubrica(s)/apontamento(s) identificados. Confira antes de aprovar.`;
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao processar: " + err.message;
      status.className = "pdf-status error";
    }
  });
}

// --- Rollover (Criar Folha a partir de Documento Anterior) ------------------

async function popularCompetenciasRollover(empresaId) {
  const select = document.getElementById("folha-rollover-origem");
  const competencias = await getCompetencias(empresaId);
  select.innerHTML = competencias.length
    ? competencias.map((c) => `<option value="${c.id}">${c.competencia} (${c.status})</option>`).join("")
    : `<option value="">— nenhuma competência cadastrada ainda —</option>`;

  const destinoInput = document.getElementById("folha-rollover-destino");
  if (competencias.length > 0) destinoInput.value = proximaCompetencia(competencias[0].competencia);
}

function renderPreviewRollover(container, preparo, funcionariosPorId) {
  const nomesNovos = preparo.novosFuncionarios.map((id) => (funcionariosPorId[id] || {}).nome || id);
  const nomesAusentes = preparo.funcionariosAusentes.map((id) => (funcionariosPorId[id] || {}).nome || id);

  container.innerHTML = `
    <div class="folha-rollover-colunas">
      <div class="folha-rollover-coluna">
        <h3>Serão aproveitados</h3>
        <p class="fixed-note">${preparo.funcionariosAtivos.length} funcionário(s) ativo(s), com salários vigentes.</p>
        <p class="fixed-note">${preparo.apontamentosRecorrentes.length} rubrica(s) fixa/recorrente copiada(s) automaticamente.</p>
      </div>
      <div class="folha-rollover-coluna">
        <h3>Só referência histórica (não repetidas)</h3>
        <p class="fixed-note">${preparo.referenciaHistorica.length} lançamento(s) variável/calculado do mês anterior — aguardando novo apontamento.</p>
      </div>
      <div class="folha-rollover-coluna">
        <h3>Novos funcionários detectados</h3>
        <ul>${nomesNovos.length ? nomesNovos.map((n) => `<li>${escapeHtmlFolha(n)}</li>`).join("") : "<li>Nenhum</li>"}</ul>
      </div>
      <div class="folha-rollover-coluna">
        <h3>Ausentes em relação à anterior</h3>
        <p class="fixed-note">Não é desligamento automático — só conferência.</p>
        <ul>${nomesAusentes.length ? nomesAusentes.map((n) => `<li>${escapeHtmlFolha(n)}</li>`).join("") : "<li>Nenhum</li>"}</ul>
      </div>
    </div>
    <div class="folha-acoes-lote">
      <button type="button" class="btn-primary" id="folha-rollover-confirmar">Confirmar e criar a competência ${escapeHtmlFolha(preparo.novaCompetenciaChave)}</button>
    </div>`;

  container.querySelector("#folha-rollover-confirmar").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    btn.disabled = true;
    btn.textContent = "Criando...";
    try {
      const resultado = await confirmarRolloverCompetencia(preparo);
      container.innerHTML = `<p class="pdf-status ok">Competência ${resultado.competencia.competencia} criada, com ${resultado.apontamentosGravados} apontamento(s) recorrente(s) já lançado(s).</p>`;
    } catch (err) {
      console.error(err);
      alert("Erro ao confirmar: " + err.message);
      btn.disabled = false;
      btn.textContent = "Tentar novamente";
    }
  });
}

function setupRolloverFolha() {
  document.getElementById("folha-rollover-preparar").addEventListener("click", async () => {
    const empresaId = document.getElementById("folha-empresa-select-rollover").value;
    const origemId = document.getElementById("folha-rollover-origem").value;
    const destino = document.getElementById("folha-rollover-destino").value;
    const status = document.getElementById("folha-rollover-status");

    if (!empresaId) { status.textContent = "Selecione uma empresa."; status.className = "pdf-status error"; return; }
    if (!origemId) { status.textContent = "Selecione a competência de origem."; status.className = "pdf-status error"; return; }
    if (!destino) { status.textContent = "Informe a nova competência."; status.className = "pdf-status error"; return; }

    status.textContent = "Montando prévia...";
    status.className = "pdf-status";
    try {
      const preparo = await prepararRolloverCompetencia(empresaId, origemId, destino);
      const funcionarios = await getFuncionarios(empresaId);
      const funcionariosPorId = {};
      funcionarios.forEach((f) => { funcionariosPorId[f.id] = f; });
      renderPreviewRollover(document.getElementById("folha-rollover-resultado"), preparo, funcionariosPorId);
      status.textContent = "Prévia pronta — confira antes de confirmar.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro: " + err.message;
      status.className = "pdf-status error";
    }
  });
}

// --- Histórico e pendências ---------------------------------------------------

async function renderHistoricoFolha(empresaId) {
  const container = document.getElementById("folha-historico-resultado");
  const [importacoes, rubricas, competencias] = await Promise.all([getImportacoes(empresaId), getRubricas(empresaId), getCompetencias(empresaId)]);
  const pendentes = rubricas.filter((r) => !r.incidencias || !r.incidencias.confirmado);

  container.innerHTML = `
    <section class="panel">
      <h2>⏳ Pendências antes do cálculo</h2>
      <div class="panel-body">
        ${pendentes.length === 0 ? '<p class="fixed-note">Nenhuma rubrica pendente de confirmação.</p>' : pendentes.map((r) => `
          <div class="folha-pendencia-item">
            <span>${escapeHtmlFolha(r.codigo)} — ${escapeHtmlFolha(r.descricao)}</span>
            <span class="folha-badge folha-badge-divergencia">Incidências não confirmadas</span>
          </div>`).join("")}
      </div>
    </section>
    <section class="panel">
      <h2>🔒 Competências</h2>
      <div class="panel-body">
        <p class="fixed-note">Fechar uma competência grava um retrato (snapshot) congelado dela. Depois de fechada, qualquer alteração exige uma revisão explícita — nunca uma edição silenciosa.</p>
        ${competencias.length === 0 ? '<p class="fixed-note">Nenhuma competência cadastrada ainda.</p>' : competencias.map((c) => `
          <div class="folha-pendencia-item" data-competencia-id="${c.id}">
            <span>${escapeHtmlFolha(c.competencia)} — ${c.status === "fechada" ? "fechada" : "aberta"}</span>
            ${c.status === "fechada"
              ? '<span class="folha-badge folha-badge-sem-alteracao">Fechada</span>'
              : `<button type="button" class="btn-secondary folha-fechar-competencia" data-id="${c.id}">Fechar competência</button>`}
          </div>`).join("")}
      </div>
    </section>
    <section class="panel">
      <h2>🕘 Importações</h2>
      <div class="panel-body">
        <table class="folha-tabela">
          <thead><tr><th>Arquivo</th><th>Data</th><th>Competência detectada</th><th>Funcionários</th><th>Rubricas</th><th>Status</th></tr></thead>
          <tbody>
            ${importacoes.map((i) => `
              <tr>
                <td>${escapeHtmlFolha(i.arquivoNome)}</td>
                <td>${new Date(i.dataImportacaoMs).toLocaleString("pt-BR")}</td>
                <td>${escapeHtmlFolha(i.competenciaDetectada || "—")}</td>
                <td>${(i.resumoExtraido && i.resumoExtraido.funcionarios) || 0}</td>
                <td>${(i.resumoExtraido && i.resumoExtraido.apontamentos) || 0}</td>
                <td>${escapeHtmlFolha(i.status)}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>`;

  container.querySelectorAll(".folha-fechar-competencia").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const competenciaId = btn.dataset.id;
      btn.disabled = true;
      btn.textContent = "Fechando...";
      try {
        const [funcionarios, apontamentos] = await Promise.all([getFuncionarios(empresaId), getApontamentos(competenciaId)]);
        await fecharCompetencia(competenciaId, {
          funcionarios: funcionarios.filter((f) => f.ativo !== false),
          apontamentos,
          fechadaPor: (typeof userEmail !== "undefined" && userEmail) || "sistema",
        });
        await renderHistoricoFolha(empresaId);
      } catch (err) {
        console.error(err);
        alert("Erro ao fechar competência: " + err.message);
        btn.disabled = false;
        btn.textContent = "Fechar competência";
      }
    });
  });
}

function setupHistoricoFolha() {
  document.getElementById("folha-empresa-select-historico").addEventListener("change", (ev) => {
    if (ev.target.value) renderHistoricoFolha(ev.target.value);
  });
}

// --- Inicialização -------------------------------------------------------------

document.addEventListener("DOMContentLoaded", async () => {
  setupModoToggleFolha();

  await Promise.all([
    initEmpresaPicker(document.getElementById("folha-empresa-search-importar"), document.getElementById("folha-empresa-select-importar"), "— Selecione uma empresa —"),
    initEmpresaPicker(document.getElementById("folha-empresa-search-atualizar"), document.getElementById("folha-empresa-select-atualizar"), "— Selecione uma empresa —"),
    initEmpresaPicker(document.getElementById("folha-empresa-search-rollover"), document.getElementById("folha-empresa-select-rollover"), "— Selecione uma empresa —"),
    initEmpresaPicker(document.getElementById("folha-empresa-search-historico"), document.getElementById("folha-empresa-select-historico"), "— Selecione uma empresa —"),
  ]);

  wireAcaoImportacaoFolha({
    empresaSelectId: "folha-empresa-select-importar",
    inputId: "folha-import-input",
    botaoId: "folha-import-processar",
    statusId: "folha-import-status",
    resultadoId: "folha-import-resultado",
  });

  wireAcaoImportacaoFolha({
    empresaSelectId: "folha-empresa-select-atualizar",
    inputId: "folha-atualizar-input",
    botaoId: "folha-atualizar-processar",
    statusId: "folha-atualizar-status",
    resultadoId: "folha-atualizar-resultado",
  });

  document.getElementById("folha-empresa-select-rollover").addEventListener("change", (ev) => {
    if (ev.target.value) popularCompetenciasRollover(ev.target.value);
  });
  setupRolloverFolha();
  setupHistoricoFolha();
});
