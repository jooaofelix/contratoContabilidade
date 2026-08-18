// Camada de dados no Firestore para o funil de vendas. Coleção "vendas"
// separada de "empresas" — um registro de venda pode ou não estar ligado a
// uma empresa já cadastrada (empresaId), pra cobrir tanto leads novos quanto
// upsell/renovação de clientes existentes.

const VENDAS_COLLECTION = "vendas";

const VENDA_STATUS = [
  "Aguardando resposta",
  "Aguardando reunião",
  "Em negociação",
  "Analisando proposta",
  "Analisando contrato",
  "Fechado/Ganho",
  "Recusado/Perdido",
];

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

async function upsertVenda(data, existingId) {
  const id = existingId || db.collection(VENDAS_COLLECTION).doc().id;
  const docRef = db.collection(VENDAS_COLLECTION).doc(id);

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

async function deleteVenda(id) {
  await db.collection(VENDAS_COLLECTION).doc(id).delete();
}
