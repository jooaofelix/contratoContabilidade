// Camada de dados no Firestore do AEA Folha. Seis coleções:
//
// - folhaFuncionarios   — um funcionário (empresaId, cpf, cargo, salário, admissão...).
//     subcoleção historicoSalarial — cada alteração de salário-base, com data de
//     vigência e documento de origem.
// - folhaCompetencias   — uma "rodada" de folha (empresaId + "AAAA-MM"), com status
//     aberta/fechada; ao fechar, guarda um snapshot imutável (ver fecharCompetencia).
// - folhaRubricas       — catálogo de rubricas/verbas (fixa, variável ou calculada),
//     com as incidências (INSS/IRRF/FGTS) e se já foram conferidas — nunca presumidas
//     automaticamente (ver item 7 da especificação).
// - folhaApontamentos   — um lançamento (funcionário × competência × rubrica).
// - folhaImportacoes    — histórico/auditoria de cada arquivo importado: hash (pra
//     idempotência), o que foi extraído, o que foi aprovado/rejeitado.
// - folhaRevisoes       — toda alteração feita numa competência JÁ FECHADA vira uma
//     revisão explícita aqui, nunca uma edição silenciosa do snapshot.

const FOLHA_FUNCIONARIOS_COLLECTION = "folhaFuncionarios";
const FOLHA_HISTORICO_SALARIAL_SUBCOLLECTION = "historicoSalarial";
const FOLHA_COMPETENCIAS_COLLECTION = "folhaCompetencias";
const FOLHA_RUBRICAS_COLLECTION = "folhaRubricas";
const FOLHA_APONTAMENTOS_COLLECTION = "folhaApontamentos";
const FOLHA_IMPORTACOES_COLLECTION = "folhaImportacoes";
const FOLHA_REVISOES_COLLECTION = "folhaRevisoes";

// --- Utilitários -----------------------------------------------------------

function normalizarCpf(cpf) {
  return String(cpf || "").replace(/\D/g, "");
}

function formatarCpf(cpf) {
  const d = normalizarCpf(cpf);
  if (d.length !== 11) return cpf || "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

// Algoritmo padrão de dígito verificador (mod 11) — rejeita também as
// sequências de dígito único (111.111.111-11 etc.), que passariam no cálculo
// mas nunca são CPFs reais.
function validarCpf(cpf) {
  const d = normalizarCpf(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const calcDigito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return calcDigito(9) === Number(d[9]) && calcDigito(10) === Number(d[10]);
}

// Hash do conteúdo do arquivo (SHA-256) — chave de idempotência: reimportar o
// mesmo arquivo não deve gerar funcionários/apontamentos duplicados (item 10).
async function hashArquivo(file) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function semUndefinedFolha(valor) {
  if (Array.isArray(valor)) return valor.map(semUndefinedFolha);
  if (valor && typeof valor === "object" && !(valor instanceof Date)) {
    const limpo = {};
    Object.keys(valor).forEach((k) => { limpo[k] = semUndefinedFolha(valor[k] === undefined ? null : valor[k]); });
    return limpo;
  }
  return valor;
}

function competenciaAtualISO() {
  return new Date().toISOString().slice(0, 7); // "AAAA-MM"
}

function proximaCompetencia(competenciaISO) {
  const [ano, mes] = competenciaISO.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// --- Funcionários ------------------------------------------------------------

async function getFuncionarios(empresaId) {
  const snap = await db.collection(FOLHA_FUNCIONARIOS_COLLECTION).where("empresaId", "==", empresaId).get();
  const funcionarios = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  funcionarios.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  return funcionarios;
}

async function getFuncionario(id) {
  if (!id) return null;
  const doc = await db.collection(FOLHA_FUNCIONARIOS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

async function upsertFuncionario(data, existingId) {
  const id = existingId || db.collection(FOLHA_FUNCIONARIOS_COLLECTION).doc().id;
  const docRef = db.collection(FOLHA_FUNCIONARIOS_COLLECTION).doc(id);

  const existingSnap = await docRef.get();
  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, semUndefinedFolha(data), {
    cpf: normalizarCpf(data.cpf),
    createdAt,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, record);
}

// Toda mudança de salário-base passa por aqui (nunca um set() direto no
// funcionário) — preserva quem mudou, de onde veio e desde quando vale,
// requisito do item 4 ("registrar usuário, data, valor anterior, novo valor
// e documento de origem").
async function registrarAlteracaoSalarial(funcionarioId, { salarioAnterior, salarioNovo, dataVigencia, usuario, documentoOrigem }) {
  const funcionarioRef = db.collection(FOLHA_FUNCIONARIOS_COLLECTION).doc(funcionarioId);
  await funcionarioRef.collection(FOLHA_HISTORICO_SALARIAL_SUBCOLLECTION).add(semUndefinedFolha({
    salarioAnterior,
    salarioNovo,
    dataVigencia,
    usuario,
    documentoOrigem,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  }));
  await funcionarioRef.set({ salarioBase: salarioNovo, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

async function getHistoricoSalarial(funcionarioId) {
  const snap = await db.collection(FOLHA_FUNCIONARIOS_COLLECTION)
    .doc(funcionarioId)
    .collection(FOLHA_HISTORICO_SALARIAL_SUBCOLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
}

// --- Competências ------------------------------------------------------------

async function getCompetencias(empresaId) {
  const snap = await db.collection(FOLHA_COMPETENCIAS_COLLECTION).where("empresaId", "==", empresaId).get();
  const competencias = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  competencias.sort((a, b) => (b.competencia || "").localeCompare(a.competencia || ""));
  return competencias;
}

async function getCompetencia(id) {
  if (!id) return null;
  const doc = await db.collection(FOLHA_COMPETENCIAS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

async function getCompetenciaPorChave(empresaId, competencia) {
  const snap = await db.collection(FOLHA_COMPETENCIAS_COLLECTION)
    .where("empresaId", "==", empresaId)
    .where("competencia", "==", competencia)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
}

async function upsertCompetencia(data, existingId) {
  const id = existingId || db.collection(FOLHA_COMPETENCIAS_COLLECTION).doc().id;
  const docRef = db.collection(FOLHA_COMPETENCIAS_COLLECTION).doc(id);

  const existingSnap = await docRef.get();
  if (existingSnap.exists && existingSnap.data().status === "fechada" && !data.permitirAlterarFechada) {
    throw new Error("Esta competência já está fechada. Abra uma revisão explícita em vez de editar direto.");
  }

  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, semUndefinedFolha(data), {
    status: data.status || (existingSnap.exists ? existingSnap.data().status : "aberta"),
    createdAt,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  delete record.permitirAlterarFechada;
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, record);
}

// Fecha a competência e grava um retrato imutável dela (funcionários e
// apontamentos daquele momento) — snapshot pensado pro item 9
// ("preservar snapshots das folhas aprovadas"). Depois disso, qualquer
// alteração precisa passar por registrarRevisao().
async function fecharCompetencia(id, snapshot) {
  await db.collection(FOLHA_COMPETENCIAS_COLLECTION).doc(id).set({
    status: "fechada",
    snapshot: semUndefinedFolha(snapshot),
    fechadaEm: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

// --- Rubricas ------------------------------------------------------------

// Rubricas globais (empresaId null) + as específicas da empresa, combinadas —
// o catálogo de uma empresa herda o catálogo padrão do escritório.
async function getRubricas(empresaId) {
  const [globaisSnap, empresaSnap] = await Promise.all([
    db.collection(FOLHA_RUBRICAS_COLLECTION).where("empresaId", "==", null).get(),
    empresaId ? db.collection(FOLHA_RUBRICAS_COLLECTION).where("empresaId", "==", empresaId).get() : Promise.resolve({ docs: [] }),
  ]);
  const rubricas = [...globaisSnap.docs, ...empresaSnap.docs].map((doc) => Object.assign({ id: doc.id }, doc.data()));
  rubricas.sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""));
  return rubricas;
}

async function getRubrica(id) {
  if (!id) return null;
  const doc = await db.collection(FOLHA_RUBRICAS_COLLECTION).doc(id).get();
  return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
}

async function upsertRubrica(data, existingId) {
  const id = existingId || db.collection(FOLHA_RUBRICAS_COLLECTION).doc().id;
  const docRef = db.collection(FOLHA_RUBRICAS_COLLECTION).doc(id);

  const existingSnap = await docRef.get();
  const createdAt = existingSnap.exists && existingSnap.data().createdAt
    ? existingSnap.data().createdAt
    : firebase.firestore.FieldValue.serverTimestamp();

  const record = Object.assign({}, semUndefinedFolha(data), {
    createdAt,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await docRef.set(record, { merge: true });
  return Object.assign({ id }, record);
}

// Registra que um código/descrição vindo de um documento importado
// corresponde a esta rubrica interna — pra não perguntar de novo da próxima
// vez que o mesmo código aparecer (mas nunca decide incidência sozinho).
async function mapearRubricaExterna(rubricaId, { codigoOriginal, descricaoOriginal }) {
  const docRef = db.collection(FOLHA_RUBRICAS_COLLECTION).doc(rubricaId);
  const doc = await docRef.get();
  const mapeamentoExterno = (doc.exists && doc.data().mapeamentoExterno) || [];
  const jaMapeado = mapeamentoExterno.some((m) => m.codigoOriginal === codigoOriginal);
  if (!jaMapeado) {
    mapeamentoExterno.push({ codigoOriginal: codigoOriginal || "", descricaoOriginal: descricaoOriginal || "" });
    await docRef.set({ mapeamentoExterno }, { merge: true });
  }
}

// --- Apontamentos ------------------------------------------------------------

async function getApontamentos(competenciaId) {
  const snap = await db.collection(FOLHA_APONTAMENTOS_COLLECTION).where("competenciaId", "==", competenciaId).get();
  return snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
}

// Chave de deduplicação de um apontamento — mesma competência, mesmo
// funcionário, mesma rubrica, mesma origem de importação nunca deveria virar
// dois registros (item 10, idempotência).
function chaveApontamento(a) {
  return [a.competenciaId, a.funcionarioId, a.rubricaId, a.origemImportacaoId || "manual"].join("::");
}

async function bulkUpsertApontamentos(lista) {
  const competenciaId = lista[0] && lista[0].competenciaId;
  const existentes = competenciaId ? await getApontamentos(competenciaId) : [];
  const chavesExistentes = new Set(existentes.map(chaveApontamento));

  const batch = db.batch();
  let gravados = 0;
  lista.forEach((apontamento) => {
    if (chavesExistentes.has(chaveApontamento(apontamento))) return; // já existe — idempotente, não duplica
    const ref = db.collection(FOLHA_APONTAMENTOS_COLLECTION).doc();
    batch.set(ref, semUndefinedFolha(Object.assign({}, apontamento, {
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    })));
    gravados++;
  });
  if (gravados > 0) await batch.commit();
  return { gravados, ignoradosPorDuplicidade: lista.length - gravados };
}

// --- Importações (histórico/auditoria) ---------------------------------------

async function getImportacoes(empresaId) {
  const snap = empresaId
    ? await db.collection(FOLHA_IMPORTACOES_COLLECTION).where("empresaId", "==", empresaId).get()
    : await db.collection(FOLHA_IMPORTACOES_COLLECTION).get();
  const importacoes = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  importacoes.sort((a, b) => (b.dataImportacaoMs || 0) - (a.dataImportacaoMs || 0));
  return importacoes;
}

// Procura uma importação anterior com o mesmo hash — é essa checagem que
// impede reprocessar sem querer o mesmo arquivo (item 10). Vale pra qualquer
// status: o simples fato de já termos extraído esse arquivo antes é o que
// importa aqui, não se cada item dele já foi aprovado.
async function getImportacaoPorHash(empresaId, arquivoHash) {
  const snap = await db.collection(FOLHA_IMPORTACOES_COLLECTION)
    .where("empresaId", "==", empresaId)
    .where("arquivoHash", "==", arquivoHash)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
}

async function registrarImportacao(data) {
  const ref = db.collection(FOLHA_IMPORTACOES_COLLECTION).doc();
  const record = Object.assign({}, semUndefinedFolha(data), {
    dataImportacaoMs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await ref.set(record);
  return Object.assign({ id: ref.id }, record);
}

async function atualizarImportacao(id, patch) {
  await db.collection(FOLHA_IMPORTACOES_COLLECTION).doc(id).set(semUndefinedFolha(patch), { merge: true });
}

// --- Revisões (alteração de competência fechada) -----------------------------

async function registrarRevisao(data) {
  const ref = db.collection(FOLHA_REVISOES_COLLECTION).doc();
  const record = Object.assign({}, semUndefinedFolha(data), {
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  await ref.set(record);
  return Object.assign({ id: ref.id }, record);
}

async function getRevisoes(competenciaId) {
  const snap = await db.collection(FOLHA_REVISOES_COLLECTION).where("competenciaId", "==", competenciaId).get();
  const revisoes = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  revisoes.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return revisoes;
}
