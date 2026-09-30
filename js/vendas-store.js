// Camada de dados no Firestore para o funil de vendas. Coleção "vendas"
// separada de "empresas" — um registro de venda pode ou não estar ligado a
// uma empresa já cadastrada (empresaId), pra cobrir tanto leads novos quanto
// upsell/renovação de clientes existentes.

const VENDAS_COLLECTION = "vendas";
const CONFIG_COLLECTION = "configuracoes";
const META_MENSAL_PADRAO = 5000;

const VENDA_STATUS = [
  "Aguardando resposta",
  "Aguardando reunião",
  "Diagnóstico realizado",
  "Em negociação",
  "Analisando proposta",
  "Analisando contrato",
  "Fechado/Ganho",
  "Recusado/Perdido",
];

// Status "de carteira" da empresa — independente do status de uma negociação
// específica no funil, é o retrato geral do relacionamento com o cliente.
const STATUS_CLIENTE_OPTS = ["Lead", "Em negociação", "Cliente Ativo", "Inativo/Cancelado"];

async function getVendas() {
  const snap = await db.collection(VENDAS_COLLECTION).get();
  const vendas = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  vendas.sort((a, b) => (b.dataEnvio || "").localeCompare(a.dataEnvio || ""));
  return vendas;
}

async function getVenda(id) {
  if (!id) return null;
  const doc = await db.collection(VENDAS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

// O Firestore recusa a escrita inteira (lança exceção) se QUALQUER campo do
// objeto for undefined — troca por null antes de gravar, senão um valor
// undefined em qualquer campo faz o registro inteiro falhar em silêncio.
function semUndefined(obj) {
  const limpo = {};
  Object.keys(obj).forEach((k) => { limpo[k] = obj[k] === undefined ? null : obj[k]; });
  return limpo;
}

async function upsertVenda(data, existingId) {
  const id = existingId || db.collection(VENDAS_COLLECTION).doc().id;
  const docRef = db.collection(VENDAS_COLLECTION).doc(id);

  const existingSnap = await docRef.get();
  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, semUndefined(data), {
    createdAt,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, data);
}

async function deleteVenda(id) {
  await db.collection(VENDAS_COLLECTION).doc(id).delete();
}

// Meta de vendas do mês (editável na tela) — guardada num único documento
// compartilhado, já que o sistema não tem login por usuário.
async function getMetaMensal() {
  const doc = await db.collection(CONFIG_COLLECTION).doc("vendas").get();
  const valor = doc.exists ? doc.data().metaMensal : null;
  return typeof valor === "number" && valor > 0 ? valor : META_MENSAL_PADRAO;
}

async function setMetaMensal(valor) {
  await db.collection(CONFIG_COLLECTION).doc("vendas").set({ metaMensal: valor }, { merge: true });
}

function mesAtualISO() {
  return new Date().toISOString().slice(0, 7); // "AAAA-MM"
}

// Soma o valor de todas as vendas Fechado/Ganho cuja Data de envio caia no
// mês informado (por padrão, o mês atual) — usada pra bater com a meta.
function totalFechadoNoMes(vendas, mesISO) {
  const alvo = mesISO || mesAtualISO();
  return vendas
    .filter((v) => v.status === "Fechado/Ganho" && (v.dataEnvio || "").slice(0, 7) === alvo)
    .reduce((sum, v) => sum + parseValorBR(v.valor), 0);
}
