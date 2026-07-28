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
  setupActionsOrc();
  updateProposalPreview();
});
