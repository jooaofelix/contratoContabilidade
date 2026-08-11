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

const FIELD_IDS_ABERTURA = [
  "ab_razaoSocial", "ab_nomeFantasia", "ab_endereco", "ab_email", "ab_telefone", "ab_iptu", "ab_capitalSocial",
];

let alteracaoCount = 0;
let socioCount = 0;

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

function addSocioRow() {
  const id = socioCount++;
  const wrap = document.createElement("div");
  wrap.className = "alteracao-row";
  wrap.dataset.id = id;
  wrap.innerHTML = `
    <button type="button" class="alteracao-remove" data-remove-socio="${id}">Remover ✕</button>
    <label>Nome
      <input type="text" class="socio-nome">
    </label>
    <div class="row">
      <label>CPF
        <input type="text" class="socio-cpf">
      </label>
      <label>Participação (%)
        <input type="text" class="socio-participacao">
      </label>
    </div>
    <div class="row">
      <label>Estado civil
        <input type="text" class="socio-estadoCivil">
      </label>
      <label>Profissão
        <input type="text" class="socio-profissao">
      </label>
    </div>
    <div class="row">
      <label>E-mail
        <input type="text" class="socio-email">
      </label>
      <label>Telefone
        <input type="text" class="socio-telefone">
      </label>
    </div>
    <label class="checkbox"><input type="checkbox" class="socio-rgCnh"> RG e CPF ou CNH recebidos</label>
    <label class="checkbox"><input type="checkbox" class="socio-comprovanteEndereco"> Comprovante de endereço recebido</label>
  `;
  document.getElementById("socios-list").appendChild(wrap);

  wrap.querySelectorAll("input[type=text]").forEach((el) => {
    el.addEventListener("input", updateProcessoPreview);
  });
  wrap.querySelectorAll("input[type=checkbox]").forEach((el) => {
    el.addEventListener("change", updateProcessoPreview);
  });
  wrap.querySelector(".alteracao-remove").addEventListener("click", () => {
    wrap.remove();
    updateProcessoPreview();
  });

  updateProcessoPreview();
}

function collectSocios() {
  return Array.from(document.querySelectorAll("#socios-list .alteracao-row")).map((row) => ({
    nome: row.querySelector(".socio-nome").value,
    cpf: row.querySelector(".socio-cpf").value,
    participacao: row.querySelector(".socio-participacao").value,
    estadoCivil: row.querySelector(".socio-estadoCivil").value,
    profissao: row.querySelector(".socio-profissao").value,
    email: row.querySelector(".socio-email").value,
    telefone: row.querySelector(".socio-telefone").value,
    rgCnh: row.querySelector(".socio-rgCnh").checked,
    comprovanteEndereco: row.querySelector(".socio-comprovanteEndereco").checked,
  })).filter((s) => s.nome || s.cpf);
}

function collectEmpresaPretendida() {
  const ab = {};
  FIELD_IDS_ABERTURA.forEach((id) => { ab[id.replace(/^ab_/, "")] = getP(id); });
  return ab;
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

let processoMode = "alteracao";

function isAberturaMode() {
  return processoMode === "abertura";
}

function updateProcessoPreview() {
  if (isAberturaMode()) {
    const p = {
      tipo: "Abertura de Empresa",
      data: getP("p_data"),
      protocolo: getP("p_protocolo"),
      observacoes: getP("p_observacoes"),
    };
    const empresaPretendida = collectEmpresaPretendida();
    const socios = collectSocios();
    document.getElementById("processo-preview").innerHTML = renderAberturaEmpresa({ p, empresaPretendida, socios });
    document.getElementById("ficha-atualizada-wrap").classList.add("hidden");
    return;
  }

  const data = collectProcessoData();
  document.getElementById("processo-preview").innerHTML = renderProcesso(data);

  const gerarFicha = document.getElementById("p_gerarFicha").checked;
  const wrap = document.getElementById("ficha-atualizada-wrap");
  wrap.classList.toggle("hidden", !gerarFicha);
  if (gerarFicha) {
    wrap.querySelector(".processo-divider").textContent = "FICHA CADASTRAL ATUALIZADA (PÓS-ALTERAÇÃO)";
    const updatedF = buildFichaAtualizada(data.f, data.alteracoes);
    document.getElementById("ficha-atualizada-preview").innerHTML = renderFicha({ f: updatedF });
  }
}

function syncModeVisibility() {
  const abertura = isAberturaMode();
  document.querySelectorAll('[data-mode="alteracao"]').forEach((el) => el.classList.toggle("hidden", abertura));
  document.querySelectorAll('[data-mode="abertura"]').forEach((el) => el.classList.toggle("hidden", !abertura));
  updateProcessoPreview();
}

function setupModeToggle() {
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      processoMode = tab.dataset.modeTab;
      document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t === tab));
      syncModeVisibility();
    });
  });
  syncModeVisibility();
}

function setupLiveUpdateProcesso() {
  FIELD_IDS_PROCESSO.concat(FIELD_IDS_ABERTURA).forEach((id) => {
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

  document.getElementById("add-socio").addEventListener("click", () => {
    addSocioRow();
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos da ficha de processo?")) return;
    FIELD_IDS_PROCESSO.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") return;
      el.value = "";
    });
    FIELD_IDS_ABERTURA.forEach((id) => { document.getElementById(id).value = ""; });
    document.getElementById("p_tipo").value = "Alteração Contratual";
    document.getElementById("p_gerarFicha").checked = true;
    document.getElementById("alteracoes-list").innerHTML = "";
    document.getElementById("socios-list").innerHTML = "";
    document.getElementById("pdf-input").value = "";
    document.getElementById("pdf-status").textContent = "";
    document.getElementById("empresa-select").value = "";
    processoMode = "alteracao";
    document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t.dataset.modeTab === "alteracao"));
    addAlteracaoRow();
    addAlteracaoRow();
    addAlteracaoRow();
    addSocioRow();
    addSocioRow();
    syncModeVisibility();
  });

  document.getElementById("cadastrar-empresa-aberta").addEventListener("click", async () => {
    const ab = collectEmpresaPretendida();
    if (!ab.razaoSocial) {
      alert("Informe ao menos a razão social da empresa antes de cadastrar.");
      return;
    }
    const socios = collectSocios();
    const p = {
      tipo: getP("p_tipo"),
      data: getP("p_data"),
      protocolo: getP("p_protocolo"),
      observacoes: getP("p_observacoes"),
    };

    const status = document.getElementById("empresa-status");
    status.textContent = "Cadastrando empresa...";
    status.className = "pdf-status";
    try {
      const novaEmpresa = {
        contratante: ab.razaoSocial,
        endereco: ab.endereco,
        email: ab.email,
        valorCapital: ab.capitalSocial,
        socio1: (socios[0] && socios[0].nome) || "",
        capitalSocio1: (socios[0] && socios[0].participacao) || "",
        socio2: (socios[1] && socios[1].nome) || "",
        capitalSocio2: (socios[1] && socios[1].participacao) || "",
      };
      const record = await upsertEmpresa(novaEmpresa, null);

      if (socios.length > 0) {
        await addHistoricoAlteracao(record.id, {
          tipo: p.tipo,
          data: p.data,
          protocolo: p.protocolo,
          observacoes: p.observacoes,
          socios,
        });
      }

      const wrap = document.getElementById("ficha-atualizada-wrap");
      wrap.querySelector(".processo-divider").textContent = "FICHA CADASTRAL DA NOVA EMPRESA";
      document.getElementById("ficha-atualizada-preview").innerHTML = renderFicha({ f: novaEmpresa });
      wrap.classList.remove("hidden");

      const select = document.getElementById("empresa-select");
      await populateEmpresaSelect(select, "— Nova empresa —");
      select.value = record.id;

      status.textContent = `Empresa "${ab.razaoSocial}" cadastrada com sucesso.`;
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao cadastrar a empresa. Confira sua conexão com o banco.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("salvar-ficha-atualizada").addEventListener("click", async () => {
    const data = collectProcessoData();
    if (!data.f.contratante) {
      alert("Informe ao menos o nome do Contratante antes de salvar.");
      return;
    }
    const status = document.getElementById("empresa-status");
    const select = document.getElementById("empresa-select");
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      const updatedF = buildFichaAtualizada(data.f, data.alteracoes);
      const record = await upsertEmpresa(updatedF, select.value || null);

      const validAlteracoes = data.alteracoes.filter((a) => a.campo && (a.de || a.para));
      if (validAlteracoes.length > 0) {
        await addHistoricoAlteracao(record.id, {
          tipo: data.p.tipo,
          data: data.p.data,
          protocolo: data.p.protocolo,
          observacoes: data.p.observacoes,
          alteracoes: validAlteracoes,
        });
      }

      await populateEmpresaSelect(select, "— Nova empresa —");
      select.value = record.id;
      status.textContent = "Ficha atualizada e histórico salvos.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar. Confira sua conexão com o banco.";
      status.className = "pdf-status error";
    }
  });
}

async function setupEmpresasProcesso() {
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
        updateProcessoPreview();
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
    FICHA_FIELD_MAP.forEach(({ key }) => { document.getElementById("f_" + key).value = ""; });
    status.textContent = "";
    updateProcessoPreview();
  });

  document.getElementById("empresa-delete").addEventListener("click", async () => {
    if (!select.value) {
      status.textContent = "Selecione uma empresa salva para excluir.";
      status.className = "pdf-status error";
      return;
    }
    if (!confirm("Excluir esta empresa da lista salva?")) return;
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
  setupPanelTogglesProcesso();
  setupLiveUpdateProcesso();
  setupPdfImportProcesso();
  setupActionsProcesso();
  setupEmpresasProcesso();
  addAlteracaoRow();
  addAlteracaoRow();
  addAlteracaoRow();
  addSocioRow();
  addSocioRow();
  setupModeToggle();
});
