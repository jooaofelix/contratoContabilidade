// Camada de dados no Firestore pras demandas do dia a dia — tarefas soltas
// (não ligadas a uma venda ou empresa específica), cada uma com uma data e
// um status: Pendente, Revisar (pra olhar de novo depois) ou Feito.

const DEMANDAS_DIARIAS_COLLECTION = "demandasDiarias";
const DEMANDA_STATUS = ["Pendente", "Revisar", "Feito"];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

async function getDemandasDiarias() {
  const snap = await db.collection(DEMANDAS_DIARIAS_COLLECTION).get();
  const demandas = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  demandas.sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  return demandas;
}

async function upsertDemandaDiaria(data, existingId) {
  const id = existingId || db.collection(DEMANDAS_DIARIAS_COLLECTION).doc().id;
  const docRef = db.collection(DEMANDAS_DIARIAS_COLLECTION).doc(id);

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

async function deleteDemandaDiaria(id) {
  await db.collection(DEMANDAS_DIARIAS_COLLECTION).doc(id).delete();
}
