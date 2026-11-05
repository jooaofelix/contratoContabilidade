// Mock de Firestore rodando no navegador (injetado via page.addInitScript),
// com o estado guardado no localStorage — sobrevive a navegação/reload, ao
// contrário de um objeto JS capturado por closure (que é serializado por
// valor e perde a referência a cada nova navegação). Suporta where()/limit()
// simples, subcoleções e batch(), o suficiente pro folha-store.js.
function installFirestoreMock(seed) {
  const KEY = "__fakeFirestoreDb";
  if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(seed || {}));

  function readDb() { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  function writeDb(db) { localStorage.setItem(KEY, JSON.stringify(db)); }

  function buildQuery(name, filtros, limite) {
    return {
      where(field, op, value) { return buildQuery(name, filtros.concat([{ field, value }]), limite); },
      limit(n) { return buildQuery(name, filtros, n); },
      async get() {
        const db = readDb();
        let docs = Object.entries(db[name] || {}).map(([id, data]) => ({ id, data: () => data, exists: true }));
        filtros.forEach((f) => { docs = docs.filter((d) => d.data()[f.field] === f.value); });
        if (limite) docs = docs.slice(0, limite);
        return { docs, empty: docs.length === 0 };
      },
    };
  }

  function buildSubcollection(parentName, parentId, subName) {
    const key = `_sub_${parentName}_${parentId}_${subName}`;
    return {
      async add(record) {
        const db = readDb();
        db[key] = db[key] || {};
        const subId = "sub_" + Math.random().toString(36).slice(2, 10);
        db[key][subId] = record;
        writeDb(db);
        return { id: subId };
      },
      orderBy() { return this; },
      async get() {
        const db = readDb();
        const subDocs = db[key] || {};
        const entries = Object.entries(subDocs).map(([id, data]) => ({ id, data: () => data }));
        entries.sort((a, b) => (b.data().createdAtMs || 0) - (a.data().createdAtMs || 0));
        return { docs: entries };
      },
    };
  }

  const mockDb = {
    collection(name) {
      return Object.assign(buildQuery(name, [], null), {
        async get() {
          const db = readDb();
          const docs = Object.entries(db[name] || {}).map(([id, data]) => ({ id, data: () => data, exists: true }));
          return { docs };
        },
        doc(id) {
          id = id || "auto_" + Math.random().toString(36).slice(2, 12);
          return {
            id,
            async get() {
              const db = readDb();
              const data = db[name] && db[name][id];
              return { exists: !!data, data: () => data, id };
            },
            async set(record, opts) {
              const db = readDb();
              db[name] = db[name] || {};
              if (opts && opts.merge) db[name][id] = Object.assign({}, db[name][id] || {}, record);
              else db[name][id] = record;
              writeDb(db);
            },
            async delete() {
              const db = readDb();
              if (db[name]) delete db[name][id];
              writeDb(db);
            },
            collection(sub) { return buildSubcollection(name, id, sub); },
          };
        },
      });
    },
    collectionGroup() { return { async get() { return { docs: [] }; } }; },
    batch() {
      const ops = [];
      return {
        set(ref, data) { ops.push(() => ref.set(data)); },
        async commit() { for (const op of ops) await op(); },
      };
    },
  };

  const firestoreFn = () => mockDb;
  firestoreFn.FieldValue = { serverTimestamp: () => "SERVER_TS" };
  window.firebase = { firestore: firestoreFn, initializeApp: () => {} };
  window.__readFakeDb = readDb;
}

module.exports = { installFirestoreMock };
