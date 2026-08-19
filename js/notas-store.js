// Anotações livres dentro de Vendas — lugar pra guardar qualquer informação
// solta (ideias, coisas pra lembrar depois, recados) sem precisar vincular a
// um cliente/venda específico.

const NOTAS_COLLECTION = "notasVendas";

async function getNotas() {
  const snap = await db.collection(NOTAS_COLLECTION).get();
  const notas = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  notas.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
  return notas;
}

async function upsertNota(data, existingId) {
  const id = existingId || db.collection(NOTAS_COLLECTION).doc().id;
  const docRef = db.collection(NOTAS_COLLECTION).doc(id);

  const existingSnap = await docRef.get();
  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, data, {
    createdAt,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    // guarda também um número simples de ordenação, porque serverTimestamp()
    // fica pendente no cache local até confirmar com o servidor, e sort()
    // no cliente não pode depender de um valor que ainda não chegou.
    updatedAtMs: Date.now(),
  });
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, data);
}

async function deleteNota(id) {
  await db.collection(NOTAS_COLLECTION).doc(id).delete();
}
