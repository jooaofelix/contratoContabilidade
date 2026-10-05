// Camada de dados no Firestore pros orçamentos/propostas salvos. Coleção
// "orcamentos" separada — salvar aqui é opcional (o Orçamento continua
// funcionando sem nunca salvar nada, só gerando o PDF/mensagem na hora),
// mas permite voltar a um orçamento já feito depois (reabrir pra editar)
// e também gerar um Contrato a partir dele (ver aplicarOrcamentoAoContrato
// em app.js e o painel "Gerar a partir de um Orçamento salvo" em
// contrato.html).

const ORCAMENTOS_COLLECTION = "orcamentos";

// O Firestore recusa a escrita inteira se QUALQUER campo (em qualquer
// nível, já que o registro tem objetos aninhados e listas) for undefined —
// troca recursivamente por null antes de gravar.
function semUndefinedOrcamento(valor) {
  if (Array.isArray(valor)) return valor.map(semUndefinedOrcamento);
  if (valor && typeof valor === "object") {
    const limpo = {};
    Object.keys(valor).forEach((k) => { limpo[k] = semUndefinedOrcamento(valor[k] === undefined ? null : valor[k]); });
    return limpo;
  }
  return valor;
}

async function getOrcamentos() {
  const snap = await db.collection(ORCAMENTOS_COLLECTION).get();
  const orcamentos = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  orcamentos.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
  return orcamentos;
}

async function getOrcamentoById(id) {
  if (!id) return null;
  const doc = await db.collection(ORCAMENTOS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

async function upsertOrcamentoRegistro(data, existingId) {
  const id = existingId || db.collection(ORCAMENTOS_COLLECTION).doc().id;
  const docRef = db.collection(ORCAMENTOS_COLLECTION).doc(id);

  const existingSnap = await docRef.get();
  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, semUndefinedOrcamento(data), {
    createdAt,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    // Guarda também um timestamp em milissegundos legível no cliente — o
    // serverTimestamp do Firestore só vira Date depois de ir e voltar do
    // servidor, e pra ordenar a lista localmente logo após salvar (antes
    // de recarregar) é mais simples já ter um número em mãos.
    updatedAtMs: Date.now(),
  });
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, data);
}

async function deleteOrcamentoRegistro(id) {
  await db.collection(ORCAMENTOS_COLLECTION).doc(id).delete();
}

function orcamentoLabel(o) {
  const nome = (o.cliente && o.cliente.empresa) || "(sem nome)";
  const dataIso = o.cliente && o.cliente.dataProposta;
  const dataFmt = dataIso ? " — " + dataIso.split("-").reverse().join("/") : "";
  return nome + dataFmt;
}

async function populateOrcamentoSelect(selectEl, placeholderText) {
  const orcamentos = await getOrcamentos();
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">${placeholderText || "— Selecione um orçamento —"}</option>`;
  orcamentos.forEach((o) => {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = orcamentoLabel(o);
    selectEl.appendChild(opt);
  });
  if (orcamentos.some((o) => o.id === current)) {
    selectEl.value = current;
  }
  return orcamentos;
}

// Mesmo padrão de initEmpresaPicker (ver empresas-store.js): popula o
// select e liga um campo de busca que filtra por nome/CNPJ em memória.
async function initOrcamentoPicker(searchInput, selectEl, placeholderText) {
  let cache = [];

  function applyFilter() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = q
      ? cache.filter((o) => {
          const nome = ((o.cliente && o.cliente.empresa) || "").toLowerCase();
          const cnpj = ((o.cliente && o.cliente.cnpj) || "").toLowerCase();
          return nome.includes(q) || cnpj.includes(q);
        })
      : cache;

    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">${placeholderText || "— Selecione um orçamento —"}</option>`;
    filtered.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.id;
      opt.textContent = orcamentoLabel(o);
      selectEl.appendChild(opt);
    });
    if (filtered.some((o) => o.id === current)) {
      selectEl.value = current;
    }
  }

  async function refresh() {
    cache = await getOrcamentos();
    applyFilter();
    return cache;
  }

  searchInput.addEventListener("input", applyFilter);

  await refresh();
  return { refresh };
}
