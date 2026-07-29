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
    updateFichaPreview();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelTogglesFicha();
  setupLiveUpdateFicha();
  setupPdfImportFicha();
  setupActionsFicha();
  updateFichaPreview();
});
