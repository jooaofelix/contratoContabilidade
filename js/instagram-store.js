// Camada de dados no Firestore pro controle de Instagram: ideias de posts
// (com um funil de produção próprio) e os temas/pilares de conteúdo que
// organizam essas ideias.

const INSTAGRAM_IDEIAS_COLLECTION = "instagramIdeias";
const INSTAGRAM_TEMAS_COLLECTION = "instagramTemas";

const IDEIA_STATUS = ["Ideia", "Roteiro/Copy", "Produção", "Agendado", "Publicado"];
const TIPO_POST_OPTS = ["Feed", "Reels", "Story", "Carrossel"];

async function getIdeias() {
  const snap = await db.collection(INSTAGRAM_IDEIAS_COLLECTION).get();
  const ideias = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  ideias.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return ideias;
}

async function getIdeia(id) {
  if (!id) return null;
  const doc = await db.collection(INSTAGRAM_IDEIAS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

async function upsertIdeia(data, existingId) {
  const id = existingId || db.collection(INSTAGRAM_IDEIAS_COLLECTION).doc().id;
  const docRef = db.collection(INSTAGRAM_IDEIAS_COLLECTION).doc(id);

  const existingSnap = await docRef.get();
  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, data, {
    createdAt,
    createdAtMs: existingSnap.exists && existingSnap.data().createdAtMs ? existingSnap.data().createdAtMs : Date.now(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, data);
}

async function deleteIdeia(id) {
  await db.collection(INSTAGRAM_IDEIAS_COLLECTION).doc(id).delete();
}

const TEMA_CORES_SUGERIDAS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#ca8a04", "#64748b"];

async function getTemas() {
  const snap = await db.collection(INSTAGRAM_TEMAS_COLLECTION).get();
  const temas = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  temas.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  return temas;
}

async function upsertTema(data, existingId) {
  const id = existingId || db.collection(INSTAGRAM_TEMAS_COLLECTION).doc().id;
  await db.collection(INSTAGRAM_TEMAS_COLLECTION).doc(id).set(data, { merge: true });
  return Object.assign({ id }, data);
}

async function deleteTema(id) {
  await db.collection(INSTAGRAM_TEMAS_COLLECTION).doc(id).delete();
}
