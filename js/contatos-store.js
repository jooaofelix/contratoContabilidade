// Contatos/leads para o composer de proposta via WhatsApp (aba "Início de
// Proposta" em Vendas). Coleção separada de "empresas" porque nem todo
// contato aqui vira cliente formal — é só quem você quer abordar.

const CONTATOS_COLLECTION = "contatosProposta";
const TIPO_PESSOA_FISICA = "Pessoa Física";
const TIPO_PESSOA_JURIDICA = "Pessoa Jurídica";

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

// Heurística simples pra planilhas/PDFs importados sem coluna de tipo: nome
// com "cara" de razão social vira Pessoa Jurídica, o resto Pessoa Física.
// Só é usada como sugestão inicial — dá pra corrigir manualmente depois.
// Siglas curtas (ltda, me, epp...) só contam como palavra inteira, senão
// "Guilherme" ou "Mendonça" seriam classificados como PJ por engano.
function inferTipoContato(nome, empresa) {
  if (empresa) return TIPO_PESSOA_JURIDICA;
  const n = String(nome || "").toLowerCase();
  const palavras = new Set(n.split(/[^a-zà-ú0-9/.]+/).filter(Boolean));
  const siglas = ["ltda", "eireli", "me", "epp", "mei", "s/a", "s.a", "s/s", "corp", "grupo", "group"];
  if (siglas.some((s) => palavras.has(s))) return TIPO_PESSOA_JURIDICA;

  const termos = ["soluções", "solucoes", "capital", "comércio", "comercio", "serviços", "servicos", "consultoria", "negócios", "negocios"];
  return termos.some((t) => n.includes(t)) ? TIPO_PESSOA_JURIDICA : TIPO_PESSOA_FISICA;
}

function groupContatosByTipo(contatos) {
  const pf = contatos.filter((c) => c.tipo !== TIPO_PESSOA_JURIDICA);
  const pj = contatos.filter((c) => c.tipo === TIPO_PESSOA_JURIDICA);
  return { pf, pj };
}

function optionsHtml(contatos) {
  return contatos.map((c) => `<option value="${c.id}">${contatoLabel(c)}</option>`).join("");
}

function renderContatoOptions(selectEl, contatos, placeholderText) {
  const current = selectEl.value;
  const { pf, pj } = groupContatosByTipo(contatos);
  let html = `<option value="">${placeholderText || "— Selecione um contato —"}</option>`;
  if (pf.length) html += `<optgroup label="👤 Pessoa Física">${optionsHtml(pf)}</optgroup>`;
  if (pj.length) html += `<optgroup label="🏢 Pessoa Jurídica">${optionsHtml(pj)}</optgroup>`;
  selectEl.innerHTML = html;
  if (contatos.some((c) => c.id === current)) selectEl.value = current;
}

async function populateContatoSelect(selectEl, placeholderText) {
  const contatos = await getContatos();
  renderContatoOptions(selectEl, contatos, placeholderText);
  return contatos;
}

// Busca em memória por nome OU empresa — digitar "Maria" ou "Padaria do
// João" encontra o mesmo contato se os dois campos baterem. Mantém a lista
// agrupada em Pessoa Física / Pessoa Jurídica mesmo filtrada.
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
    renderContatoOptions(selectEl, filtered, placeholderText);
  }

  async function refresh() {
    cache = await populateContatoSelect(selectEl, placeholderText);
    return cache;
  }

  searchInput.addEventListener("input", applyFilter);
  await refresh();
  return { refresh };
}
