// Contatos/leads para o composer de proposta via WhatsApp (aba "Início de
// Proposta" em Vendas). Coleção separada de "empresas" porque nem todo
// contato aqui vira cliente formal — é só quem você quer abordar.

const CONTATOS_COLLECTION = "contatosProposta";

async function getContatos() {
  const snap = await db.collection(CONTATOS_COLLECTION).get();
  const contatos = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  contatos.sort((a, b) => (a.nome || a.empresa || "").localeCompare(b.nome || b.empresa || ""));
  return contatos;
}

async function getContato(id) {
  if (!id) return null;
  const doc = await db.collection(CONTATOS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

async function upsertContato(data, existingId) {
  const id = existingId || db.collection(CONTATOS_COLLECTION).doc().id;
  const docRef = db.collection(CONTATOS_COLLECTION).doc(id);

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

async function deleteContato(id) {
  await db.collection(CONTATOS_COLLECTION).doc(id).delete();
}

function contatoLabel(contato) {
  if (contato.nome && contato.empresa) return `${contato.nome} — ${contato.empresa}`;
  return contato.nome || contato.empresa || "(sem nome)";
}

async function populateContatoSelect(selectEl, placeholderText) {
  const contatos = await getContatos();
  const current = selectEl.value;
  selectEl.innerHTML = `<option value="">${placeholderText || "— Selecione um contato —"}</option>`;
  contatos.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = contatoLabel(c);
    selectEl.appendChild(opt);
  });
  if (contatos.some((c) => c.id === current)) selectEl.value = current;
  return contatos;
}

// Busca em memória por nome OU empresa — digitar "Maria" ou "Padaria do
// João" encontra o mesmo contato se os dois campos baterem.
async function initContatoPicker(searchInput, selectEl, placeholderText) {
  let cache = [];

  function applyFilter() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = q
      ? cache.filter(
          (c) =>
            (c.nome || "").toLowerCase().includes(q) ||
            (c.empresa || "").toLowerCase().includes(q)
        )
      : cache;

    const current = selectEl.value;
    selectEl.innerHTML = `<option value="">${placeholderText || "— Selecione um contato —"}</option>`;
    filtered.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = contatoLabel(c);
      selectEl.appendChild(opt);
    });
    if (filtered.some((c) => c.id === current)) selectEl.value = current;
  }

  async function refresh() {
    cache = await populateContatoSelect(selectEl, placeholderText);
    return cache;
  }

  searchInput.addEventListener("input", applyFilter);
  await refresh();
  return { refresh };
}
