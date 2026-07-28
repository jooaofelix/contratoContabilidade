const FIELD_IDS = [
  "c_razaoSocial", "c_cnpj", "c_endereco", "c_bairro", "c_cidade", "c_estado", "c_cep",
  "c_repNome", "c_repCpf", "c_repCargo",
  "e_razaoSocial", "e_cnpj", "e_endereco", "e_responsavel", "e_crc",
  "s_contabil", "s_fiscal", "s_dp", "s_obrigacoes", "s_consultoria",
  "h_valor", "h_vencimento", "h_formaPagamento", "h_indice",
  "v_inicio", "v_prazo", "v_meses", "v_aviso",
  "f_foro", "f_local", "f_data", "f_test1Nome", "f_test1Cpf", "f_test2Nome", "f_test2Cpf",
];

const CONTRATADA_STORAGE_KEY = "contratoContabilidade.contratada";

function collectFormData() {
  const get = (id) => document.getElementById(id).value;
  const checked = (id) => document.getElementById(id).checked;

  return {
    contratante: {
      razaoSocial: get("c_razaoSocial"),
      cnpj: get("c_cnpj"),
      endereco: get("c_endereco"),
      bairro: get("c_bairro"),
      cidade: get("c_cidade"),
      estado: get("c_estado"),
      cep: get("c_cep"),
      repNome: get("c_repNome"),
      repCpf: get("c_repCpf"),
      repCargo: get("c_repCargo"),
    },
    contratada: {
      razaoSocial: get("e_razaoSocial"),
      cnpj: get("e_cnpj"),
      endereco: get("e_endereco"),
      responsavel: get("e_responsavel"),
      crc: get("e_crc"),
    },
    servicos: {
      contabil: checked("s_contabil"),
      fiscal: checked("s_fiscal"),
      dp: checked("s_dp"),
      obrigacoes: checked("s_obrigacoes"),
      consultoria: checked("s_consultoria"),
    },
    honorarios: {
      valor: get("h_valor"),
      vencimento: get("h_vencimento"),
      formaPagamento: get("h_formaPagamento"),
      indice: get("h_indice"),
    },
    vigencia: {
      inicio: get("v_inicio"),
      prazo: get("v_prazo"),
      meses: get("v_meses"),
      aviso: get("v_aviso"),
    },
    foro: {
      foro: get("f_foro"),
      local: get("f_local"),
      data: get("f_data"),
      test1Nome: get("f_test1Nome"),
      test1Cpf: get("f_test1Cpf"),
      test2Nome: get("f_test2Nome"),
      test2Cpf: get("f_test2Cpf"),
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

function setupPrazoToggle() {
  const prazoSelect = document.getElementById("v_prazo");
  const mesesWrap = document.getElementById("v_mesesWrap");
  const sync = () => {
    mesesWrap.classList.toggle("hidden", prazoSelect.value !== "determinado");
  };
  prazoSelect.addEventListener("change", sync);
  sync();
}

function setupContratadaPersistence() {
  const saved = localStorage.getItem(CONTRATADA_STORAGE_KEY);
  if (saved) {
    try {
      const data = JSON.parse(saved);
      document.getElementById("e_razaoSocial").value = data.razaoSocial || "";
      document.getElementById("e_cnpj").value = data.cnpj || "";
      document.getElementById("e_endereco").value = data.endereco || "";
      document.getElementById("e_responsavel").value = data.responsavel || "";
      document.getElementById("e_crc").value = data.crc || "";
    } catch (e) {
      // ignora dados salvos corrompidos
    }
  }

  document.getElementById("save-contratada").addEventListener("click", () => {
    const data = {
      razaoSocial: document.getElementById("e_razaoSocial").value,
      cnpj: document.getElementById("e_cnpj").value,
      endereco: document.getElementById("e_endereco").value,
      responsavel: document.getElementById("e_responsavel").value,
      crc: document.getElementById("e_crc").value,
    };
    localStorage.setItem(CONTRATADA_STORAGE_KEY, JSON.stringify(data));
    const status = document.getElementById("pdf-status");
    status.textContent = "Dados da contratada salvos neste navegador.";
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
      setIfFound("c_endereco", parsed.endereco);
      setIfFound("c_bairro", parsed.bairro);
      setIfFound("c_cidade", parsed.cidade);
      setIfFound("c_estado", parsed.estado);
      setIfFound("c_cep", parsed.cep);

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
    if (!confirm("Limpar todos os campos do formulário?")) return;
    FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") return;
      el.value = "";
    });
    document.getElementById("s_contabil").checked = true;
    document.getElementById("s_fiscal").checked = true;
    document.getElementById("s_dp").checked = true;
    document.getElementById("s_obrigacoes").checked = true;
    document.getElementById("s_consultoria").checked = false;
    document.getElementById("v_prazo").value = "indeterminado";
    document.getElementById("pdf-input").value = "";
    document.getElementById("pdf-status").textContent = "";
    setupPrazoToggle();
    updatePreview();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelToggles();
  setupPrazoToggle();
  setupLiveUpdate();
  setupPdfImport();
  setupContratadaPersistence();
  setupActions();
  updatePreview();
});
