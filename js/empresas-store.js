const EMPRESAS_STORAGE_KEY = "contratoContabilidade.empresas";

const EMPRESA_FIELDS = [
  "contratante", "cnpj", "endereco", "bairro", "cidade", "estado", "cep",
  "email", "contatoPrincipal", "administracao", "socio1", "capitalSocio1", "socio2", "capitalSocio2",
  "vigencia", "plano",
  "cnaePrincipal", "cnaeSecundario", "tributacao", "valorCapital",
  "proLabore", "funcionarios",
  "emissaoNota", "situacao", "anexoSimples", "inscEstadual", "inscMunicipal",
];

function getEmpresas() {
  try {
    return JSON.parse(localStorage.getItem(EMPRESAS_STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveEmpresasList(list) {
  localStorage.setItem(EMPRESAS_STORAGE_KEY, JSON.stringify(list));
}

function getEmpresa(id) {
  return getEmpresas().find((e) => e.id === id);
}

// Cria uma nova empresa ou atualiza uma existente com o mesmo CNPJ.
function upsertEmpresa(data) {
  const list = getEmpresas();
  const cnpj = (data.cnpj || "").trim();
  let idx = cnpj ? list.findIndex((e) => (e.cnpj || "").trim() === cnpj) : -1;

  const record = Object.assign({}, data, {
    id: idx >= 0 ? list[idx].id : "emp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    savedAt: new Date().toISOString(),
  });

  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  saveEmpresasList(list);
  return record;
}

function deleteEmpresa(id) {
  saveEmpresasList(getEmpresas().filter((e) => e.id !== id));
}

function collectEmpresaFromForm(prefix) {
  prefix = prefix || "f_";
  const data = {};
  EMPRESA_FIELDS.forEach((key) => {
    const el = document.getElementById(prefix + key);
    if (el) data[key] = el.value;
  });
  return data;
}

function applyEmpresaToForm(empresa, prefix) {
  prefix = prefix || "f_";
  EMPRESA_FIELDS.forEach((key) => {
    const el = document.getElementById(prefix + key);
    if (el) el.value = empresa[key] || "";
  });
}

function empresaLabel(empresa) {
  const nome = empresa.contratante || "(sem nome)";
  return empresa.cnpj ? `${nome} — ${empresa.cnpj}` : nome;
}

function populateEmpresaSelect(selectEl, placeholderText) {
  const empresas = getEmpresas().sort((a, b) => (a.contratante || "").localeCompare(b.contratante || ""));
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">${placeholderText || "— Selecione uma empresa —"}</option>`;
  empresas.forEach((e) => {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = empresaLabel(e);
    selectEl.appendChild(opt);
  });
  if (empresas.some((e) => e.id === current)) {
    selectEl.value = current;
  }
  return empresas;
}
