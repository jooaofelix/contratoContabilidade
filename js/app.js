const FIELD_IDS = [
  "c_razaoSocial", "c_cnpj", "c_endereco", "c_repNome", "c_repCpf",
  "o_objeto", "o_fiscal", "o_contabil", "o_rh", "o_consultiva", "o_obrigacoes", "o_atendimento", "o_naoIncluidos",
  "h_valorCheio", "h_temDesconto", "h_valorDesconto", "h_descontoInicio", "h_descontoFim", "h_vencimentoDia", "h_sistemasTerceiros",
  "v_inicio", "v_fim", "v_avisoPrevio", "f_temFidelidade", "f_multaPercent",
  "foro_cidade", "a_local", "a_data", "a_test1Nome", "a_test1Cpf", "a_test2Nome", "a_test2Cpf",
];

// A CONTRATADA é sempre a AEA Contabilidade Consultiva — fixo, não editável.
const CONTRATADA_FIXA = {
  razaoSocial: "AEA CONTABILIDADE CONSULTIVA LTDA",
  cnpj: "65.132.309/0001-80",
  endereco: "Rua Jurema Vieira Medrado, nº 88, Sala 305, Parque Residencial Aquarius, São José dos Campos/SP, CEP 12.246-180",
  contato: "andreandrade@aeacontabil.com.br | (12) 3921-9902",
  responsavel: "ANDRÉ ANDRADE",
  crc: "1SP223916",
};

const ESCOPO_STORAGE_KEY = "contratoContabilidade.escopoPadrao";

const ESCOPO_DEFAULTS = {
  o_fiscal: "Apuração ordinária de tributos do Simples Nacional, emissão e controle de guias e envio de obrigações acessórias fiscais aplicáveis.",
  o_contabil: "Classificação e escrituração contábil, conciliações, balancetes e demonstrações contábeis quando aplicáveis, conforme documentos recebidos.",
  o_rh: "Gestão de rotinas de RH conforme documentos e informações recebidos em tempo hábil.",
  o_consultiva: "Acompanhamento estratégico e personalizado com o contador responsável, voltado a orientações ordinárias de gestão, dentro do escopo contratado.",
  o_obrigacoes: "Entrega das declarações e obrigações acessórias mensais e anuais inerentes ao escopo contábil contratado, conforme legislação vigente.",
  o_atendimento: "Orientações ordinárias sobre rotinas contábeis, fiscais, trabalhistas e envio de documentos dentro do escopo contratado.",
  o_naoIncluidos: "Serviços societários, alterações contratuais, abertura ou encerramento de empresas, regularizações, parcelamentos, certidões, certificado digital, consultorias específicas e demais serviços extraordinários.",
};

function get(id) { return document.getElementById(id).value; }
function checked(id) { return document.getElementById(id).checked; }

function collectFormData() {
  return {
    contratante: {
      razaoSocial: get("c_razaoSocial"),
      cnpj: get("c_cnpj"),
      endereco: get("c_endereco"),
      repNome: get("c_repNome"),
      repCpf: get("c_repCpf"),
    },
    contratada: CONTRATADA_FIXA,
    objeto: {
      objeto: get("o_objeto"),
      fiscal: get("o_fiscal"),
      contabil: get("o_contabil"),
      rh: get("o_rh"),
      consultiva: get("o_consultiva"),
      obrigacoes: get("o_obrigacoes"),
      atendimento: get("o_atendimento"),
      naoIncluidos: get("o_naoIncluidos"),
    },
    honorarios: {
      valorCheio: get("h_valorCheio"),
      temDesconto: checked("h_temDesconto"),
      valorDesconto: get("h_valorDesconto"),
      descontoInicio: get("h_descontoInicio"),
      descontoFim: get("h_descontoFim"),
      vencimentoDia: get("h_vencimentoDia"),
      sistemasTerceiros: get("h_sistemasTerceiros"),
    },
    vigencia: {
      inicio: get("v_inicio"),
      fim: get("v_fim"),
      avisoPrevio: get("v_avisoPrevio"),
      temFidelidade: checked("f_temFidelidade"),
      multaPercent: get("f_multaPercent"),
    },
    foro: {
      foro: get("foro_cidade"),
      local: get("a_local"),
      data: get("a_data"),
      test1Nome: get("a_test1Nome"),
      test1Cpf: get("a_test1Cpf"),
      test2Nome: get("a_test2Nome"),
      test2Cpf: get("a_test2Cpf"),
    },
  };
}

function updatePreview() {
  const data = collectFormData();
  document.getElementById("contract-preview").innerHTML = renderContract(data);
}

function setupLiveUpdate() {
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });
}

function setupPanelToggles() {
  document.querySelectorAll(".panel-toggle").forEach((h2) => {
    h2.addEventListener("click", () => {
      const body = document.getElementById(h2.dataset.target);
      body.classList.toggle("collapsed");
    });
  });
}

function setupConditionalFields() {
  const descontoCheckbox = document.getElementById("h_temDesconto");
  const descontoWrap = document.getElementById("h_descontoWrap");
  const syncDesconto = () => descontoWrap.classList.toggle("hidden", !descontoCheckbox.checked);
  descontoCheckbox.addEventListener("change", () => { syncDesconto(); updatePreview(); });
  syncDesconto();

  const fidelidadeCheckbox = document.getElementById("f_temFidelidade");
  const multaWrap = document.getElementById("f_multaWrap");
  const syncFidelidade = () => multaWrap.classList.toggle("hidden", !fidelidadeCheckbox.checked);
  fidelidadeCheckbox.addEventListener("change", () => { syncFidelidade(); updatePreview(); });
  syncFidelidade();
}

function setupEscopoDefaults() {
  const saved = localStorage.getItem(ESCOPO_STORAGE_KEY);
  let defaults = ESCOPO_DEFAULTS;
  if (saved) {
    try { defaults = JSON.parse(saved); } catch (e) { /* ignora dados corrompidos */ }
  }
  Object.keys(defaults).forEach((id) => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = defaults[id];
  });
}

function renderContratadaFixa() {
  document.getElementById("fixed-razaoSocial").textContent = CONTRATADA_FIXA.razaoSocial;
  document.getElementById("fixed-cnpj").textContent = "CNPJ: " + CONTRATADA_FIXA.cnpj;
  document.getElementById("fixed-endereco").textContent = CONTRATADA_FIXA.endereco;
  document.getElementById("fixed-contato").textContent = CONTRATADA_FIXA.contato;
  document.getElementById("fixed-responsavel").textContent = `${CONTRATADA_FIXA.responsavel} — CRC ${CONTRATADA_FIXA.crc}`;
}

function setupEscopoPersistence() {
  document.getElementById("save-escopo").addEventListener("click", () => {
    const escopo = {};
    Object.keys(ESCOPO_DEFAULTS).forEach((id) => { escopo[id] = document.getElementById(id).value; });
    localStorage.setItem(ESCOPO_STORAGE_KEY, JSON.stringify(escopo));

    const status = document.getElementById("pdf-status");
    status.textContent = "Escopo padrão salvo neste navegador.";
    status.className = "pdf-status ok";
  });
}

function setupPdfImport() {
  const input = document.getElementById("pdf-input");
  const status = document.getElementById("pdf-status");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo PDF...";
    status.className = "pdf-status";

    try {
      const text = await extractTextFromPdf(file);
      const parsed = parseCnpjCardText(text);

      let foundCount = 0;
      const setIfFound = (id, value) => {
        if (value) {
          document.getElementById(id).value = value;
          foundCount++;
        }
      };

      setIfFound("c_razaoSocial", parsed.razaoSocial);
      setIfFound("c_cnpj", parsed.cnpj);

      const enderecoPartes = [parsed.endereco, parsed.bairro, [parsed.cidade, parsed.estado].filter(Boolean).join("/"), parsed.cep ? "CEP " + parsed.cep : ""]
        .filter(Boolean)
        .join(", ");
      if (enderecoPartes) {
        document.getElementById("c_endereco").value = enderecoPartes;
        foundCount++;
      }

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não foi possível reconhecer os dados neste PDF. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updatePreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o PDF. Preencha manualmente.";
      status.className = "pdf-status error";
    }
  });
}

function setupActions() {
  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos do contratante e das condições do contrato?")) return;
    FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") return;
      el.value = "";
    });
    document.getElementById("h_temDesconto").checked = false;
    document.getElementById("f_temFidelidade").checked = true;
    document.getElementById("f_multaPercent").value = "30";
    document.getElementById("v_avisoPrevio").value = "30";
    document.getElementById("pdf-input").value = "";
    document.getElementById("pdf-status").textContent = "";
    setupEscopoDefaults();
    setupConditionalFields();
    updatePreview();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderContratadaFixa();
  setupPanelToggles();
  setupConditionalFields();
  setupEscopoPersistence();
  setupEscopoDefaults();
  setupLiveUpdate();
  setupPdfImport();
  setupActions();
  updatePreview();
});
