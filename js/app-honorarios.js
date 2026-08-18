const FIELD_IDS_HONORARIOS = [
  "ch_razaoSocial", "ch_cnpj", "ch_endereco", "ch_repNome", "ch_repProfissao", "ch_repCpf",
  "ch_valorCheio", "ch_temDesconto", "ch_valorDesconto", "ch_descontoInicio", "ch_descontoFim",
  "ch_vencimentoDia", "ch_parcelaAnualTexto",
  "ch_vigenciaInicio", "ch_vigenciaFim", "ch_avisoPrevio", "ch_temFidelidade", "ch_multaPercent",
  "ch_foroCidade", "ch_local", "ch_data", "ch_test1Nome", "ch_test1Cpf", "ch_test2Nome", "ch_test2Cpf",
];

const PARCELA_ANUAL_DEFAULT = "Além dos honorários mensais, será devida uma parcela adicional anual, com vencimento junto à mensalidade de dezembro de cada ano, no valor equivalente ao honorário mensal vigente, para remunerar o acréscimo de serviços decorrentes do encerramento do exercício fiscal. Esta parcela cobre especificamente a elaboração e entrega das seguintes obrigações: Balanço Patrimonial Anual, Demonstração de Resultado do Exercício (DRE), Declaração de Informações Socioeconômicas e Fiscais (DEFIS) e demais declarações anuais aplicáveis ao regime tributário das empresas atendidas.";

let grupoCount = 0;

function getCh(id) { return document.getElementById(id).value; }
function checkedCh(id) { return document.getElementById(id).checked; }

function addGrupoRow(nome, cnpj) {
  const id = grupoCount++;
  const wrap = document.createElement("div");
  wrap.className = "alteracao-row";
  wrap.dataset.id = id;
  wrap.innerHTML = `
    <button type="button" class="alteracao-remove" data-remove-grupo="${id}">Remover ✕</button>
    <label>Nome da empresa
      <input type="text" class="grupo-nome" placeholder="Razão social">
    </label>
    <label>CNPJ
      <input type="text" class="grupo-cnpj" placeholder="00.000.000/0000-00">
    </label>
  `;
  document.getElementById("ch-grupo-list").appendChild(wrap);
  wrap.querySelector(".grupo-nome").value = nome || "";
  wrap.querySelector(".grupo-cnpj").value = cnpj || "";

  wrap.querySelectorAll("input").forEach((el) => {
    el.addEventListener("input", updateHonorariosPreview);
  });
  wrap.querySelector(".alteracao-remove").addEventListener("click", () => {
    wrap.remove();
    updateHonorariosPreview();
  });
}

function collectGrupo() {
  return Array.from(document.querySelectorAll("#ch-grupo-list .alteracao-row"))
    .map((row) => ({
      nome: row.querySelector(".grupo-nome").value,
      cnpj: row.querySelector(".grupo-cnpj").value,
    }))
    .filter((g) => g.nome || g.cnpj);
}

function collectHonorariosData() {
  return {
    contratante: {
      razaoSocial: getCh("ch_razaoSocial"),
      cnpj: getCh("ch_cnpj"),
      endereco: getCh("ch_endereco"),
      repNome: getCh("ch_repNome"),
      repProfissao: getCh("ch_repProfissao"),
      repCpf: getCh("ch_repCpf"),
    },
    contratada: CONTRATADA_FIXA,
    h: {
      valorCheio: getCh("ch_valorCheio"),
      temDesconto: checkedCh("ch_temDesconto"),
      valorDesconto: getCh("ch_valorDesconto"),
      descontoInicio: getCh("ch_descontoInicio"),
      descontoFim: getCh("ch_descontoFim"),
      vencimentoDia: getCh("ch_vencimentoDia"),
      parcelaAnualTexto: getCh("ch_parcelaAnualTexto"),
    },
    v: {
      inicio: getCh("ch_vigenciaInicio"),
      fim: getCh("ch_vigenciaFim"),
      avisoPrevio: getCh("ch_avisoPrevio"),
      temFidelidade: checkedCh("ch_temFidelidade"),
      multaPercent: getCh("ch_multaPercent"),
    },
    grupo: collectGrupo(),
    foro: {
      foro: getCh("ch_foroCidade"),
      local: getCh("ch_local"),
      data: getCh("ch_data"),
      test1Nome: getCh("ch_test1Nome"),
      test1Cpf: getCh("ch_test1Cpf"),
      test2Nome: getCh("ch_test2Nome"),
      test2Cpf: getCh("ch_test2Cpf"),
    },
  };
}

function updateHonorariosPreview() {
  const data = collectHonorariosData();
  document.getElementById("honorarios-preview").innerHTML = renderHonorariosContract(data);
}

function setupLiveUpdateHonorarios() {
  FIELD_IDS_HONORARIOS.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updateHonorariosPreview);
    el.addEventListener("change", updateHonorariosPreview);
  });
}

function setupConditionalFieldsHonorarios() {
  const descontoCheckbox = document.getElementById("ch_temDesconto");
  const descontoWrap = document.getElementById("ch_descontoWrap");
  const syncDesconto = () => descontoWrap.classList.toggle("hidden", !descontoCheckbox.checked);
  descontoCheckbox.addEventListener("change", () => { syncDesconto(); updateHonorariosPreview(); });
  syncDesconto();

  const fidelidadeCheckbox = document.getElementById("ch_temFidelidade");
  const multaWrap = document.getElementById("ch_multaWrap");
  const syncFidelidade = () => multaWrap.classList.toggle("hidden", !fidelidadeCheckbox.checked);
  fidelidadeCheckbox.addEventListener("change", () => { syncFidelidade(); updateHonorariosPreview(); });
  syncFidelidade();
}

function renderContratadaFixaHonorarios() {
  document.getElementById("ch-fixed-razaoSocial").textContent = CONTRATADA_FIXA.razaoSocial;
  document.getElementById("ch-fixed-cnpj").textContent = "CNPJ: " + CONTRATADA_FIXA.cnpj;
  document.getElementById("ch-fixed-endereco").textContent = CONTRATADA_FIXA.endereco;
  document.getElementById("ch-fixed-contato").textContent = CONTRATADA_FIXA.contato;
  document.getElementById("ch-fixed-responsavel").textContent = `${CONTRATADA_FIXA.responsavel} — CRC ${CONTRATADA_FIXA.crc}`;
}

async function setupEmpresasHonorarios() {
  const select = document.getElementById("ch-empresa-select");
  const search = document.getElementById("ch-empresa-search");
  const status = document.getElementById("ch-empresa-status");

  status.textContent = "Carregando empresas...";
  status.className = "pdf-status";
  try {
    await initEmpresaPicker(search, select, "— Selecione uma empresa —");
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
      const mapped = empresaToContratante(empresa);
      document.getElementById("ch_razaoSocial").value = mapped.razaoSocial;
      document.getElementById("ch_cnpj").value = mapped.cnpj;
      document.getElementById("ch_endereco").value = mapped.endereco;
      document.getElementById("ch_repNome").value = mapped.repNome;
      updateHonorariosPreview();
      status.textContent = "Dados do cliente carregados. Confira profissão e CPF do representante.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao carregar a empresa.";
      status.className = "pdf-status error";
    }
  });
}

function setupPdfImportHonorarios() {
  const input = document.getElementById("ch-pdf-input");
  const status = document.getElementById("ch-pdf-status");

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

      setIfFound("ch_razaoSocial", parsed.razaoSocial);
      setIfFound("ch_cnpj", parsed.cnpj);

      const enderecoPartes = [parsed.endereco, parsed.bairro, [parsed.cidade, parsed.estado].filter(Boolean).join("/"), parsed.cep ? "CEP " + parsed.cep : ""]
        .filter(Boolean)
        .join(", ");
      if (enderecoPartes) {
        document.getElementById("ch_endereco").value = enderecoPartes;
        foundCount++;
      }

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não foi possível reconhecer os dados neste PDF. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updateHonorariosPreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o PDF. Preencha manualmente.";
      status.className = "pdf-status error";
    }
  });
}

function setupDocxImportHonorarios() {
  const input = document.getElementById("ch-docx-input");
  const status = document.getElementById("ch-docx-status");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo o Word...";
    status.className = "pdf-status";

    try {
      const text = await extractTextFromDocx(file);
      const parsed = parseContratanteFromDocxText(text);

      let foundCount = 0;
      const setIfFound = (id, value) => {
        if (value) {
          document.getElementById(id).value = value;
          foundCount++;
        }
      };

      setIfFound("ch_razaoSocial", parsed.razaoSocial);
      setIfFound("ch_cnpj", parsed.cnpj);
      setIfFound("ch_endereco", parsed.endereco);
      setIfFound("ch_repNome", parsed.repNome);
      setIfFound("ch_repCpf", parsed.repCpf);

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente a partir do Word. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não consegui reconhecer os dados neste arquivo. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updateHonorariosPreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o arquivo Word. Confira se é um .docx válido.";
      status.className = "pdf-status error";
    }
  });
}

function setupActionsHonorarios() {
  document.getElementById("ch-btn-print").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("ch-btn-word").addEventListener("click", () => {
    const nome = getCh("ch_razaoSocial") || "Contrato de Honorários";
    exportElementAsWord("honorarios-preview", `Contrato de Honorários - ${nome}`);
  });

  document.getElementById("ch-add-grupo").addEventListener("click", () => {
    addGrupoRow();
    updateHonorariosPreview();
  });

  document.getElementById("ch-btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos do contrato de honorários?")) return;
    FIELD_IDS_HONORARIOS.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") return;
      el.value = "";
    });
    document.getElementById("ch_temDesconto").checked = false;
    document.getElementById("ch_temFidelidade").checked = true;
    document.getElementById("ch_multaPercent").value = "30";
    document.getElementById("ch_avisoPrevio").value = "30";
    document.getElementById("ch_parcelaAnualTexto").value = PARCELA_ANUAL_DEFAULT;
    document.getElementById("ch-grupo-list").innerHTML = "";
    document.getElementById("ch-empresa-select").value = "";
    document.getElementById("ch-pdf-input").value = "";
    document.getElementById("ch-pdf-status").textContent = "";
    document.getElementById("ch-docx-input").value = "";
    document.getElementById("ch-docx-status").textContent = "";
    setupConditionalFieldsHonorarios();
    updateHonorariosPreview();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderContratadaFixaHonorarios();
  document.getElementById("ch_parcelaAnualTexto").value = PARCELA_ANUAL_DEFAULT;
  setupConditionalFieldsHonorarios();
  setupLiveUpdateHonorarios();
  setupPdfImportHonorarios();
  setupDocxImportHonorarios();
  setupEmpresasHonorarios();
  setupActionsHonorarios();
  updateHonorariosPreview();
});
