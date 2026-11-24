// Pendências Hubstron — guarda no Firestore a lista de clientes exportada do
// Hubstron (situação de procuração e certificado digital + contatos) e o
// andamento da cobrança de cada empresa (status, itens já resolvidos, notas).
//
// Um documento por empresa, com o CNPJ (só dígitos) como id, para que uma
// nova importação atualize os dados sem perder o status já marcado.

const PENDENCIAS_HUBSTRON_COLLECTION = "pendenciasHubstron";

async function getPendenciasHubstron() {
  const snap = await db.collection(PENDENCIAS_HUBSTRON_COLLECTION).get();
  return snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
}

async function updatePendenciaHubstron(id, data) {
  const record = Object.assign({}, data, { atualizadoEmMs: Date.now() });
  await db.collection(PENDENCIAS_HUBSTRON_COLLECTION).doc(id).set(record, { merge: true });
}

async function deletePendenciaHubstron(id) {
  await db.collection(PENDENCIAS_HUBSTRON_COLLECTION).doc(id).delete();
}
