const FICHA_FIELD_MAP = [
  { key: "contratante", label: "Contratante" },
  { key: "cnpj", label: "CNPJ" },
  { key: "endereco", label: "Endereço" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
  { key: "cep", label: "CEP" },
  { key: "email", label: "E-mail" },
  { key: "contatoPrincipal", label: "Contato Principal" },
  { key: "administracao", label: "Administração" },
  { key: "socio1", label: "Sócio 01" },
  { key: "capitalSocio1", label: "Capital Sócio 01 (%)" },
  { key: "socio2", label: "Sócio 02" },
  { key: "capitalSocio2", label: "Capital Sócio 02 (%)" },
  { key: "vigencia", label: "Vigência" },
  { key: "plano", label: "Plano" },
  { key: "cnaePrincipal", label: "CNAE Principal" },
  { key: "cnaeSecundario", label: "CNAE Secundário" },
  { key: "tributacao", label: "Tributação" },
  { key: "valorCapital", label: "Valor Capital" },
  { key: "proLabore", label: "Pró-labore" },
  { key: "funcionarios", label: "Funcionários" },
  { key: "emissaoNota", label: "Emissão de Nota" },
  { key: "situacao", label: "Situação" },
  { key: "anexoSimples", label: "Anexo Simples" },
  { key: "inscEstadual", label: "Insc. Estadual" },
  { key: "inscMunicipal", label: "Insc. Municipal" },
];

const FIELD_IDS_PROCESSO = [
  "f_contratante", "f_numero", "f_cnpj", "f_endereco", "f_bairro", "f_cidade", "f_estado", "f_cep",
  "f_email", "f_contatoPrincipal", "f_administracao", "f_socio1", "f_capitalSocio1", "f_socio2", "f_capitalSocio2",
  "f_vigencia", "f_plano",
  "f_cnaePrincipal", "f_cnaeSecundario", "f_tributacao", "f_valorCapital",
  "f_proLabore", "f_funcionarios",
  "f_emissaoNota", "f_situacao", "f_anexoSimples", "f_inscEstadual", "f_inscMunicipal",
  "p_tipo", "p_data", "p_protocolo", "p_observacoes", "p_gerarFicha",
];

let alteracaoCount = 0;

function getP(id) { return document.getElementById(id).value; }

function campoOptionsHtml() {
  const known = FICHA_FIELD_MAP.map((f) => `<option value="${f.key}">${f.label}</option>`).join("");
  return `<option value="">Selecione...</option>${known}<option value="__outro__">Outro (não listado)</option>`;
}

function addAlteracaoRow(key, campoCustom, de, para) {
  const id = alteracaoCount++;
  const wrap = document.createElement("div");
  wrap.className = "alteracao-row";
  wrap.dataset.id = id;
  wrap.innerHTML = `
    <button type="button" class="alteracao-remove" data-remove="${id}">Remover ✕</button>
    <label>Campo
      <select class="alt-campo-select">${campoOptionsHtml()}</select>
    </label>
    <label class="alt-campo-custom-wrap hidden">Nome do campo
      <input type="text" class="alt-campo-custom" placeholder="ex: Nome Fantasia">
    </label>
    <div class="row">
      <label>Valor anterior
        <input type="text" class="alt-de" placeholder="de">
      </label>
      <label>Valor novo
        <input type="text" class="alt-para" placeholder="para">
      </label>
    </div>
  `;
  document.getElementById("alteracoes-list").appendChild(wrap);

  const select = wrap.querySelector(".alt-campo-select");
  const customWrap = wrap.querySelector(".alt-campo-custom-wrap");
  const customInput = wrap.querySelector(".alt-campo-custom");

  select.value = key || "";
  customInput.value = campoCustom || "";
  customWrap.classList.toggle("hidden", select.value !== "__outro__");
  wrap.querySelector(".alt-de").value = de || "";
  wrap.querySelector(".alt-para").value = para || "";

  select.addEventListener("change", () => {
    customWrap.classList.toggle("hidden", select.value !== "__outro__");
    updateProcessoPreview();
  });

  wrap.querySelectorAll("input").forEach((el) => {
    el.addEventListener("input", updateProcessoPreview);
  });
  wrap.querySelector(".alteracao-remove").addEventListener("click", () => {
    wrap.remove();
    updateProcessoPreview();
  });

  updateProcessoPreview();
}

function fieldLabel(key) {
  const found = FICHA_FIELD_MAP.find((f) => f.key === key);
  return found ? found.label : "";
}

function collectAlteracoes() {
  return Array.from(document.querySelectorAll("#alteracoes-list .alteracao-row")).map((row) => {
    const key = row.querySelector(".alt-campo-select").value;
    const isOutro = key === "__outro__";
    const custom = row.querySelector(".alt-campo-custom").value;
    return {
      key: isOutro ? null : (key || null),
      campo: isOutro ? custom : fieldLabel(key),
      de: row.querySelector(".alt-de").value,
      para: row.querySelector(".alt-para").value,
    };
  });
}

function collectEmpresaData() {
  const f = {};
  FICHA_FIELD_MAP.forEach(({ key }) => { f[key] = getP("f_" + key); });
  return f;
}

function collectProcessoData() {
  const f = collectEmpresaData();
  const p = {
    tipo: getP("p_tipo"),
    data: getP("p_data"),
    protocolo: getP("p_protocolo"),
    observacoes: getP("p_observacoes"),
  };
  return { f, p, alteracoes: collectAlteracoes() };
}

function buildFichaAtualizada(f, alteracoes) {
  const updated = Object.assign({}, f);
  alteracoes.forEach((a) => {
    if (a.key && a.para) {
      updated[a.key] = a.para;
    }
  });
  return updated;
}

function updateProcessoPreview() {
  const data = collectProcessoData();
  document.getElementById("processo-preview").innerHTML = renderProcesso(data);

  const gerarFicha = document.getElementById("p_gerarFicha").checked;
  const wrap = document.getElementById("ficha-atualizada-wrap");
  wrap.classList.toggle("hidden", !gerarFicha);
  if (gerarFicha) {
    const updatedF = buildFichaAtualizada(data.f, data.alteracoes);
    document.getElementById("ficha-atualizada-preview").innerHTML = renderFicha({ f: updatedF });
  }
}

function setupLiveUpdateProcesso() {
  FIELD_IDS_PROCESSO.forEach((id) => {
    const el = document.getElementById(id);
    const evt = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(evt, updateProcessoPreview);
    el.addEventListener("change", updateProcessoPreview);
  });
}

function setupPanelTogglesProcesso() {
  document.querySelectorAll(".panel-toggle").forEach((h2) => {
    h2.addEventListener("click", () => {
      const body = document.getElementById(h2.dataset.target);
      body.classList.toggle("collapsed");
    });
  });
}

function setupPdfImportProcesso() {
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

      if (parsed.endereco) {
        document.getElementById("f_endereco").value = parsed.endereco;
        foundCount++;
      }

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não foi possível reconhecer os dados neste PDF. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updateProcessoPreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o PDF. Preencha manualmente.";
      status.className = "pdf-status error";
    }
  });
}

function setupActionsProcesso() {
  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("add-alteracao").addEventListener("click", () => {
    addAlteracaoRow();
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos da ficha de processo?")) return;
    FIELD_IDS_PROCESSO.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") return;
      el.value = "";
    });
    document.getElementById("p_tipo").value = "Alteração Contratual";
    document.getElementById("p_gerarFicha").checked = true;
    document.getElementById("alteracoes-list").innerHTML = "";
    document.getElementById("pdf-input").value = "";
    document.getElementById("pdf-status").textContent = "";
    document.getElementById("empresa-select").value = "";
    addAlteracaoRow();
    addAlteracaoRow();
    addAlteracaoRow();
    updateProcessoPreview();
  });

  document.getElementById("salvar-ficha-atualizada").addEventListener("click", () => {
    const data = collectProcessoData();
    if (!data.f.contratante) {
      alert("Informe ao menos o nome do Contratante antes de salvar.");
      return;
    }
    const updatedF = buildFichaAtualizada(data.f, data.alteracoes);
    const record = upsertEmpresa(updatedF);
    populateEmpresaSelect(document.getElementById("empresa-select"), "— Nova empresa —");
    document.getElementById("empresa-select").value = record.id;
    const status = document.getElementById("empresa-status");
    status.textContent = "Ficha atualizada salva na empresa.";
    status.className = "pdf-status ok";
  });
}

function setupEmpresasProcesso() {
  const select = document.getElementById("empresa-select");
  const status = document.getElementById("empresa-status");

  populateEmpresaSelect(select, "— Nova empresa —");

  select.addEventListener("change", () => {
    if (!select.value) return;
    const empresa = getEmpresa(select.value);
    if (empresa) {
      applyEmpresaToForm(empresa, "f_");
      updateProcessoPreview();
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
    FICHA_FIELD_MAP.forEach(({ key }) => { document.getElementById("f_" + key).value = ""; });
    status.textContent = "";
    updateProcessoPreview();
  });

  document.getElementById("empresa-delete").addEventListener("click", () => {
    if (!select.value) {
      status.textContent = "Selecione uma empresa salva para excluir.";
      status.className = "pdf-status error";
      return;
    }
    if (!confirm("Excluir esta empresa da lista salva?")) return;
    deleteEmpresa(select.value);
    populateEmpresaSelect(select, "— Nova empresa —");
    status.textContent = "Empresa excluída.";
    status.className = "pdf-status ok";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelTogglesProcesso();
  setupLiveUpdateProcesso();
  setupPdfImportProcesso();
  setupActionsProcesso();
  setupEmpresasProcesso();
  addAlteracaoRow();
  addAlteracaoRow();
  addAlteracaoRow();
  updateProcessoPreview();
});
