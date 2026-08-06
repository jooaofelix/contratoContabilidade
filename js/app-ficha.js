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

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não foi possível reconhecer os dados neste PDF. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updateFichaPreview();
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

function setupEmpresasFicha() {
  const select = document.getElementById("empresa-select");
  const status = document.getElementById("empresa-status");

  populateEmpresaSelect(select, "— Nova empresa —");

  select.addEventListener("change", () => {
    if (!select.value) return;
    const empresa = getEmpresa(select.value);
    if (empresa) {
      applyEmpresaToForm(empresa, "f_");
      updateFichaPreview();
      status.textContent = "Dados carregados.";
      status.className = "pdf-status ok";
    }
  });

  document.getElementById("empresa-save").addEventListener("click", () => {
    const data = collectEmpresaFromForm("f_");
    if (!data.contratante) {
      status.textContent = "Informe ao menos o nome do Contratante antes de salvar.";
      status.className = "pdf-status error";
      return;
    }
    const record = upsertEmpresa(data);
    populateEmpresaSelect(select, "— Nova empresa —");
    select.value = record.id;
    status.textContent = "Empresa salva.";
    status.className = "pdf-status ok";
  });

  document.getElementById("empresa-new").addEventListener("click", () => {
    select.value = "";
    FIELD_IDS_FICHA.forEach((id) => { document.getElementById(id).value = ""; });
    status.textContent = "";
    updateFichaPreview();
  });

  document.getElementById("empresa-delete").addEventListener("click", () => {
    if (!select.value) {
      status.textContent = "Selecione uma empresa salva para excluir.";
      status.className = "pdf-status error";
      return;
    }
    if (!confirm("Excluir esta empresa da lista salva? Isso não afeta os campos preenchidos agora.")) return;
    deleteEmpresa(select.value);
    populateEmpresaSelect(select, "— Nova empresa —");
    status.textContent = "Empresa excluída.";
    status.className = "pdf-status ok";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelTogglesFicha();
  setupLiveUpdateFicha();
  setupPdfImportFicha();
  setupActionsFicha();
  setupEmpresasFicha();
  updateFichaPreview();
});
