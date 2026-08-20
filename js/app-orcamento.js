const FIELD_IDS_ORC = [
  "q_nomeResponsavel", "q_empresa", "q_cnpj", "q_responsavel", "q_telefone", "q_email", "q_dataProposta", "q_validade",
  "d_notasMes", "d_funcionarios", "d_faturamento", "d_regime", "d_segmento", "d_observacoes",
  "i_valorCheio", "i_temDesconto", "i_valorFinal", "i_formaPagamento", "i_prazoInicio",
];

function getOrc(id) { return document.getElementById(id).value; }
function checkedOrc(id) { return document.getElementById(id).checked; }

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
    investimento: {
      valorCheio: getOrc("i_valorCheio"),
      temDesconto: checkedOrc("i_temDesconto"),
      valorFinal: getOrc("i_valorFinal"),
      formaPagamento: getOrc("i_formaPagamento"),
      prazoInicio: getOrc("i_prazoInicio"),
      validade: getOrc("q_validade"),
    },
  };
}

function updateProposalPreview() {
  const data = collectProposalData();
  document.getElementById("proposal-preview").innerHTML = renderProposal(data);
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

function setupActionsOrc() {
  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
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
    setupDescontoToggle();
    updateProposalPreview();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelTogglesOrc();
  setupDescontoToggle();
  setupLiveUpdateOrc();
  setupEmpresasOrcamento();
  setupActionsOrc();
  updateProposalPreview();
});
