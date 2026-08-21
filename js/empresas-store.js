// Camada de dados no Firestore. Coleção "empresas" (uma empresa = um documento)
// e subcoleção "empresas/{id}/alteracoes" com o histórico de cada Ficha de Processo
// salva para aquela empresa.

const EMPRESAS_COLLECTION = "empresas";
const ALTERACOES_SUBCOLLECTION = "alteracoes";

const EMPRESA_FIELDS = [
  "contratante", "cnpj", "endereco", "bairro", "cidade", "estado", "cep",
  "email", "telefone", "contatoPrincipal", "administracao", "socio1", "capitalSocio1", "socio2", "capitalSocio2",
  "vigencia", "plano",
  "cnaePrincipal", "cnaeSecundario", "tributacao", "valorCapital",
  "proLabore", "funcionarios",
  "emissaoNota", "situacao", "anexoSimples", "inscEstadual", "inscMunicipal",
  "observacoes",
];

function sanitizeCnpjForId(cnpj) {
  const digits = (cnpj || "").replace(/\D/g, "");
  return digits || null;
}

async function getEmpresas() {
  const snap = await db.collection(EMPRESAS_COLLECTION).get();
  return snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
}

async function getEmpresa(id) {
  if (!id) return null;
  const doc = await db.collection(EMPRESAS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

// Cria ou atualiza uma empresa. Se existingId for informado, sempre atualiza
// aquele documento (mesmo que o CNPJ tenha mudado). Caso contrário, usa o CNPJ
// como ID do documento para evitar duplicar a mesma empresa cadastrada em
// telas/dispositivos diferentes; sem CNPJ, gera um ID novo.
async function upsertEmpresa(data, existingId) {
  const cnpjId = sanitizeCnpjForId(data.cnpj);
  const id = existingId || cnpjId || db.collection(EMPRESAS_COLLECTION).doc().id;
  const docRef = db.collection(EMPRESAS_COLLECTION).doc(id);

  // preserva o createdAt original em atualizações; só grava na primeira vez,
  // para os relatórios saberem quais empresas são novas em cada período.
  const existingSnap = await docRef.get();
  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, data, {
    createdAt,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, data);
}

async function deleteEmpresa(id) {
  await db.collection(EMPRESAS_COLLECTION).doc(id).delete();
}

// Guarda o ID da subpasta do Drive já criada para esta empresa dentro da
// pasta-raiz de um tipo de documento (ex: "fichaCadastral", "contrato"), para
// reusar nas próximas vezes que algo daquele tipo for salvo para o mesmo
// cliente. Usa notação de ponto para não sobrescrever os outros tipos já
// salvos no mesmo campo driveFolders.
async function setEmpresaDriveFolder(id, tipoKey, folderId) {
  const update = {};
  update[`driveFolders.${tipoKey}`] = folderId;
  await db.collection(EMPRESAS_COLLECTION).doc(id).set(update, { merge: true });
}

async function addHistoricoAlteracao(empresaId, evento) {
  const record = Object.assign({}, evento, {
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await db
    .collection(EMPRESAS_COLLECTION)
    .doc(empresaId)
    .collection(ALTERACOES_SUBCOLLECTION)
    .add(record);
}

// Busca as alterações de TODAS as empresas de uma vez (usado no relatório mensal).
async function getAllAlteracoes() {
  const snap = await db.collectionGroup(ALTERACOES_SUBCOLLECTION).get();
  return snap.docs.map((doc) =>
    Object.assign({ id: doc.id, empresaId: doc.ref.parent.parent.id }, doc.data())
  );
}

async function getHistoricoAlteracoes(empresaId) {
  const snap = await db
    .collection(EMPRESAS_COLLECTION)
    .doc(empresaId)
    .collection(ALTERACOES_SUBCOLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
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

async function populateEmpresaSelect(selectEl, placeholderText) {
  const empresas = (await getEmpresas()).sort((a, b) =>
    (a.contratante || "").localeCompare(b.contratante || "")
  );
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

// Popula o select e liga um campo de busca que filtra as opções por
// nome/CNPJ em memória (sem nova consulta ao banco a cada tecla). Retorna um
// objeto com refresh() para recarregar do banco (ex: após salvar/excluir)
// mantendo a busca em sincronia com a lista atual.
async function initEmpresaPicker(searchInput, selectEl, placeholderText) {
  let cache = [];

  function applyFilter() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = q
      ? cache.filter(
          (e) =>
            (e.contratante || "").toLowerCase().includes(q) ||
            (e.cnpj || "").toLowerCase().includes(q)
        )
      : cache;

    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">${placeholderText || "— Selecione uma empresa —"}</option>`;
    filtered.forEach((e) => {
      const opt = document.createElement("option");
      opt.value = e.id;
      opt.textContent = empresaLabel(e);
      selectEl.appendChild(opt);
    });
    if (filtered.some((e) => e.id === current)) {
      selectEl.value = current;
    }
  }

  async function refresh() {
    cache = await populateEmpresaSelect(selectEl, placeholderText);
    return cache;
  }

  searchInput.addEventListener("input", applyFilter);

  await refresh();
  return { refresh };
}
