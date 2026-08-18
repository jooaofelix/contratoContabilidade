const FIELD_IDS_PARCERIA = [
  "pc_nome", "pc_nacionalidade", "pc_estadoCivil", "pc_profissao", "pc_rg", "pc_cpf",
  "pc_endereco", "pc_email", "pc_telefone",
  "pc_percentual", "pc_prazoDias", "pc_forma",
  "pc_foroCidade", "pc_local", "pc_data", "pc_test1Nome", "pc_test1Cpf", "pc_test2Nome", "pc_test2Cpf",
];

function getPc(id) { return document.getElementById(id).value; }

function collectParceriaData() {
  return {
    contratante: CONTRATADA_FIXA,
    mentorado: {
      nome: getPc("pc_nome"),
      nacionalidade: getPc("pc_nacionalidade"),
      estadoCivil: getPc("pc_estadoCivil"),
      profissao: getPc("pc_profissao"),
      rg: getPc("pc_rg"),
      cpf: getPc("pc_cpf"),
      endereco: getPc("pc_endereco"),
      email: getPc("pc_email"),
      telefone: getPc("pc_telefone"),
    },
    remuneracao: {
      percentual: getPc("pc_percentual"),
    },
    pagamento: {
      prazoDias: getPc("pc_prazoDias"),
      forma: getPc("pc_forma"),
    },
    foro: {
      foro: getPc("pc_foroCidade"),
      local: getPc("pc_local"),
      data: getPc("pc_data"),
      test1Nome: getPc("pc_test1Nome"),
      test1Cpf: getPc("pc_test1Cpf"),
      test2Nome: getPc("pc_test2Nome"),
      test2Cpf: getPc("pc_test2Cpf"),
    },
  };
}

function updateParceriaPreview() {
  const data = collectParceriaData();
  document.getElementById("parceria-preview").innerHTML = renderParceriaContract(data);
}

function setupLiveUpdateParceria() {
  FIELD_IDS_PARCERIA.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updateParceriaPreview);
    el.addEventListener("change", updateParceriaPreview);
  });
}

function renderContratanteFixaParceria() {
  document.getElementById("pc-fixed-razaoSocial").textContent = CONTRATADA_FIXA.razaoSocial;
  document.getElementById("pc-fixed-cnpj").textContent = "CNPJ: " + CONTRATADA_FIXA.cnpj;
  document.getElementById("pc-fixed-endereco").textContent = CONTRATADA_FIXA.endereco;
  document.getElementById("pc-fixed-contato").textContent = CONTRATADA_FIXA.contato;
  document.getElementById("pc-fixed-responsavel").textContent = `${CONTRATADA_FIXA.responsavel} — CRC ${CONTRATADA_FIXA.crc}`;
}

async function setupContatosParceria() {
  const select = document.getElementById("pc-contato-select");
  const search = document.getElementById("pc-contato-search");

  try {
    await initContatoPicker(search, select, "— Selecione um contato —");
  } catch (err) {
    console.error(err);
  }

  select.addEventListener("change", async () => {
    if (!select.value) return;
    try {
      const contato = await getContato(select.value);
      if (!contato) return;
      document.getElementById("pc_nome").value = contato.nome || "";
      document.getElementById("pc_email").value = contato.email || "";
      document.getElementById("pc_telefone").value = contato.telefone || "";
      updateParceriaPreview();
    } catch (err) {
      console.error(err);
    }
  });
}

function setupActionsParceria() {
  document.getElementById("pc-btn-print").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("pc-btn-word").addEventListener("click", () => {
    const nome = getPc("pc_nome") || "Contrato de Parceria";
    exportElementAsWord("parceria-preview", `Contrato de Parceria - ${nome}`);
  });

  document.getElementById("pc-btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos do contrato de parceria?")) return;
    FIELD_IDS_PARCERIA.forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("pc_percentual").value = "10";
    document.getElementById("pc-contato-select").value = "";
    document.getElementById("pc-docx-input").value = "";
    document.getElementById("pc-docx-status").textContent = "";
    updateParceriaPreview();
  });
}

function setupDocxImportParceria() {
  const input = document.getElementById("pc-docx-input");
  const status = document.getElementById("pc-docx-status");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo o Word...";
    status.className = "pdf-status";

    try {
      const text = await extractTextFromDocx(file);
      const parsed = parseMentoradoFromDocxText(text);

      let foundCount = 0;
      const setIfFound = (id, value) => {
        if (value) {
          document.getElementById(id).value = value;
          foundCount++;
        }
      };

      setIfFound("pc_nome", parsed.nome);
      setIfFound("pc_nacionalidade", parsed.nacionalidade);
      setIfFound("pc_estadoCivil", parsed.estadoCivil);
      setIfFound("pc_rg", parsed.rg);
      setIfFound("pc_cpf", parsed.cpf);
      setIfFound("pc_endereco", parsed.endereco);
      setIfFound("pc_email", parsed.email);
      setIfFound("pc_telefone", parsed.telefone);

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente a partir do Word. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não consegui reconhecer os dados neste arquivo. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updateParceriaPreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o arquivo Word. Confira se é um .docx válido.";
      status.className = "pdf-status error";
    }
  });
}

function setupModeToggleContrato() {
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.modeTab;
      document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll("[data-mode]").forEach((el) => el.classList.toggle("hidden", el.dataset.mode !== mode));
      const titulos = {
        parceria: "Gerador de Contrato de Parceria Comercial / Indicação de Clientes",
        honorarios: "Gerador de Contrato de Honorários - Contabilidade",
      };
      document.getElementById("app-title").textContent = titulos[mode] || "Gerador de Contrato de Prestação de Serviços Contábeis";
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupModeToggleContrato();
  renderContratanteFixaParceria();
  document.getElementById("pc_percentual").value = "10";
  setupLiveUpdateParceria();
  setupContatosParceria();
  setupActionsParceria();
  setupDocxImportParceria();
  updateParceriaPreview();
});
