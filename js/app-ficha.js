const FIELD_IDS_FICHA = [
  "f_contratante", "f_numero", "f_cnpj", "f_endereco", "f_bairro", "f_cidade", "f_estado", "f_cep",
  "f_email", "f_contatoPrincipal", "f_administracao", "f_socio1", "f_capitalSocio1", "f_socio2", "f_capitalSocio2",
  "f_vigencia", "f_plano",
  "f_cnaePrincipal", "f_cnaeSecundario", "f_tributacao", "f_valorCapital",
  "f_proLabore", "f_funcionarios",
  "f_emissaoNota", "f_situacao", "f_anexoSimples", "f_inscEstadual", "f_inscMunicipal",
];

function getF(id) { return document.getElementById(id).value; }

function collectFichaData() {
  const f = {};
  FIELD_IDS_FICHA.forEach((id) => { f[id.replace(/^f_/, "")] = getF(id); });
  return { f };
}

function updateFichaPreview() {
  const data = collectFichaData();
  document.getElementById("ficha-preview").innerHTML = renderFicha(data);
}

function setupLiveUpdateFicha() {
  FIELD_IDS_FICHA.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updateFichaPreview);
    el.addEventListener("change", updateFichaPreview);
  });
}

function setupPanelTogglesFicha() {
  document.querySelectorAll(".panel-toggle").forEach((h2) => {
    h2.addEventListener("click", () => {
      const body = document.getElementById(h2.dataset.target);
      body.classList.toggle("collapsed");
    });
  });
}

async function autoCadastrarEmpresa(status, contratanteNome, origemLabel) {
  status.textContent = `Cadastrando empresa ${origemLabel}...`;
  status.className = "pdf-status";
  try {
    const data = collectEmpresaFromForm("f_");
    const empresaSelect = document.getElementById("empresa-select");
    const record = await upsertEmpresa(data, null);
    await populateEmpresaSelect(empresaSelect, "— Nova empresa —");
    empresaSelect.value = record.id;
    status.textContent = `Empresa "${contratanteNome}" cadastrada ${origemLabel}. Confira e complete os demais dados.`;
    status.className = "pdf-status ok";
  } catch (err) {
    console.error(err);
    status.textContent = `Dados preenchidos, mas houve erro ao cadastrar. Clique em "Salvar/Atualizar".`;
    status.className = "pdf-status error";
  }
}

function setupCnpjLookupFicha() {
  const input = document.getElementById("cnpj-lookup-input");
  const btn = document.getElementById("cnpj-lookup-btn");
  const status = document.getElementById("cnpj-lookup-status");

  const buscar = async () => {
    status.textContent = "Consultando a Receita Federal...";
    status.className = "pdf-status";

    try {
      const parsed = await fetchCnpjFromApi(input.value);

      const setIfFound = (id, value) => {
        if (value) document.getElementById(id).value = value;
      };

      setIfFound("f_contratante", parsed.razaoSocial);
      setIfFound("f_cnpj", parsed.cnpj);
      setIfFound("f_endereco", parsed.endereco);
      setIfFound("f_bairro", parsed.bairro);
      setIfFound("f_cidade", parsed.cidade);
      setIfFound("f_estado", parsed.estado);
      setIfFound("f_cep", parsed.cep);
      setIfFound("f_email", parsed.email);
      setIfFound("f_cnaePrincipal", parsed.cnaePrincipal);
      setIfFound("f_cnaeSecundario", parsed.cnaeSecundario);
      setIfFound("f_tributacao", parsed.tributacao);
      setIfFound("f_valorCapital", parsed.valorCapital);
      setIfFound("f_situacao", parsed.situacao);
      setIfFound("f_socio1", parsed.socio1);
      setIfFound("f_capitalSocio1", parsed.capitalSocio1);
      setIfFound("f_socio2", parsed.socio2);
      setIfFound("f_capitalSocio2", parsed.capitalSocio2);

      updateFichaPreview();

      if (!parsed.razaoSocial) {
        status.textContent = "CNPJ encontrado, mas sem razão social retornada. Confira os dados e salve manualmente.";
        status.className = "pdf-status error";
        return;
      }

      await autoCadastrarEmpresa(status, parsed.razaoSocial, "via consulta à Receita");
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Erro ao consultar o CNPJ.";
      status.className = "pdf-status error";
    }
  };

  btn.addEventListener("click", buscar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscar();
    }
  });
}

function setupPdfImportFicha() {
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

      setIfFound("f_contratante", parsed.razaoSocial);
      setIfFound("f_cnpj", parsed.cnpj);
      setIfFound("f_bairro", parsed.bairro);
      setIfFound("f_cidade", parsed.cidade);
      setIfFound("f_estado", parsed.estado);
      setIfFound("f_cep", parsed.cep);
      setIfFound("f_cnaePrincipal", parsed.cnaePrincipal);
      setIfFound("f_cnaeSecundario", parsed.cnaeSecundario);

      const enderecoPartes = [parsed.endereco].filter(Boolean).join(", ");
      if (enderecoPartes) {
        document.getElementById("f_endereco").value = enderecoPartes;
        foundCount++;
      }

      if (foundCount === 0) {
        status.textContent = "Não foi possível reconhecer os dados neste PDF. Preencha manualmente.";
        status.className = "pdf-status error";
        updateFichaPreview();
        return;
      }

      updateFichaPreview();

      if (!parsed.razaoSocial) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente, mas não achei a razão social. Confira e clique em "Salvar/Atualizar".`;
        status.className = "pdf-status error";
        return;
      }

      await autoCadastrarEmpresa(status, parsed.razaoSocial, "a partir do PDF");
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o PDF. Preencha manualmente.";
      status.className = "pdf-status error";
    }
  });
}

function setupActionsFicha() {
  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos da ficha?")) return;
    FIELD_IDS_FICHA.forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("pdf-input").value = "";
    document.getElementById("pdf-status").textContent = "";
    document.getElementById("empresa-select").value = "";
    updateFichaPreview();
  });
}

async function setupEmpresasFicha() {
  const select = document.getElementById("empresa-select");
  const status = document.getElementById("empresa-status");

  status.textContent = "Carregando empresas...";
  status.className = "pdf-status";
  try {
    await populateEmpresaSelect(select, "— Nova empresa —");
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
      if (empresa) {
        applyEmpresaToForm(empresa, "f_");
        updateFichaPreview();
        status.textContent = "Dados carregados.";
        status.className = "pdf-status ok";
      }
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao carregar a empresa.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("empresa-save").addEventListener("click", async () => {
    const data = collectEmpresaFromForm("f_");
    if (!data.contratante) {
      status.textContent = "Informe ao menos o nome do Contratante antes de salvar.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      const record = await upsertEmpresa(data, select.value || null);
      await populateEmpresaSelect(select, "— Nova empresa —");
      select.value = record.id;
      status.textContent = "Empresa salva.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar a empresa.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("empresa-new").addEventListener("click", () => {
    select.value = "";
    FIELD_IDS_FICHA.forEach((id) => { document.getElementById(id).value = ""; });
    status.textContent = "";
    updateFichaPreview();
  });

  document.getElementById("empresa-delete").addEventListener("click", async () => {
    if (!select.value) {
      status.textContent = "Selecione uma empresa salva para excluir.";
      status.className = "pdf-status error";
      return;
    }
    if (!confirm("Excluir esta empresa da lista salva? Isso não afeta os campos preenchidos agora.")) return;
    status.textContent = "Excluindo...";
    status.className = "pdf-status";
    try {
      await deleteEmpresa(select.value);
      await populateEmpresaSelect(select, "— Nova empresa —");
      status.textContent = "Empresa excluída.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao excluir a empresa.";
      status.className = "pdf-status error";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelTogglesFicha();
  setupLiveUpdateFicha();
  setupCnpjLookupFicha();
  setupPdfImportFicha();
  setupActionsFicha();
  setupEmpresasFicha();
  updateFichaPreview();
});
