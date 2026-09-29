let ideiasCache = [];
let temasCache = [];
let ideiaEditId = null;
let temaEditId = null;

function getI(id) { return document.getElementById(id).value; }

function postStatusClass(status) {
  switch (status) {
    case "Ideia": return "status-post-ideia";
    case "Roteiro/Copy": return "status-post-roteiro";
    case "Produção": return "status-post-producao";
    case "Agendado": return "status-post-agendado";
    case "Publicado": return "status-post-publicado";
    default: return "";
  }
}

const POST_STATUS_ICONS = {
  "Ideia": "💡",
  "Roteiro/Copy": "✍️",
  "Produção": "🎬",
  "Agendado": "📅",
  "Publicado": "✅",
};

const TIPO_POST_ICONS = {
  Feed: "🖼️",
  Reels: "🎥",
  Story: "⚡",
  Carrossel: "🔁",
};

function iniciaisTexto(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function temaPorId(id) {
  return temasCache.find((t) => t.id === id) || null;
}

// --- Ideias de posts ----------------------------------------------------

function popularSelectsFormIdeia() {
  const tipoSelect = document.getElementById("ig_tipo");
  const atualTipo = tipoSelect.value;
  tipoSelect.innerHTML = TIPO_POST_OPTS.map((t) => `<option value="${t}">${TIPO_POST_ICONS[t] || ""} ${t}</option>`).join("");
  if (atualTipo) tipoSelect.value = atualTipo;

  const statusSelect = document.getElementById("ig_status");
  const atualStatus = statusSelect.value;
  statusSelect.innerHTML = IDEIA_STATUS.map((s) => `<option value="${s}">${POST_STATUS_ICONS[s] || ""} ${s}</option>`).join("");
  if (atualStatus) statusSelect.value = atualStatus;

  const temaSelect = document.getElementById("ig_tema");
  const atualTema = temaSelect.value;
  temaSelect.innerHTML = `<option value="">— Sem tema —</option>` + temasCache.map((t) => `<option value="${t.id}">${t.nome}</option>`).join("");
  if (Array.from(temaSelect.options).some((o) => o.value === atualTema)) temaSelect.value = atualTema;
}

function popularFiltrosIdeias() {
  const filtroTema = document.getElementById("ideias-filtro-tema");
  const atualTema = filtroTema.value;
  filtroTema.innerHTML = `<option value="">Todos os temas</option>` + temasCache.map((t) => `<option value="${t.id}">${t.nome}</option>`).join("");
  if (Array.from(filtroTema.options).some((o) => o.value === atualTema)) filtroTema.value = atualTema;

  const filtroTipo = document.getElementById("ideias-filtro-tipo");
  const atualTipo = filtroTipo.value;
  filtroTipo.innerHTML = `<option value="">Todos os formatos</option>` + TIPO_POST_OPTS.map((t) => `<option value="${t}">${TIPO_POST_ICONS[t] || ""} ${t}</option>`).join("");
  if (atualTipo) filtroTipo.value = atualTipo;
}

function collectIdeiaForm() {
  return {
    titulo: getI("ig_titulo"),
    tipo: getI("ig_tipo"),
    temaId: getI("ig_tema") || null,
    status: getI("ig_status"),
    dataPlanejada: getI("ig_data"),
    legenda: getI("ig_legenda"),
    hashtags: getI("ig_hashtags"),
    referencia: getI("ig_referencia"),
    observacoes: getI("ig_observacoes"),
  };
}

function applyIdeiaToForm(ideia) {
  document.getElementById("ig_titulo").value = ideia.titulo || "";
  document.getElementById("ig_tipo").value = ideia.tipo || "Feed";
  document.getElementById("ig_tema").value = ideia.temaId || "";
  document.getElementById("ig_status").value = ideia.status || "Ideia";
  document.getElementById("ig_data").value = ideia.dataPlanejada || "";
  document.getElementById("ig_legenda").value = ideia.legenda || "";
  document.getElementById("ig_hashtags").value = ideia.hashtags || "";
  document.getElementById("ig_referencia").value = ideia.referencia || "";
  document.getElementById("ig_observacoes").value = ideia.observacoes || "";
}

function clearIdeiaForm() {
  ideiaEditId = null;
  document.getElementById("ig_titulo").value = "";
  document.getElementById("ig_tipo").value = "Feed";
  document.getElementById("ig_tema").value = "";
  document.getElementById("ig_status").value = "Ideia";
  document.getElementById("ig_data").value = "";
  document.getElementById("ig_legenda").value = "";
  document.getElementById("ig_hashtags").value = "";
  document.getElementById("ig_referencia").value = "";
  document.getElementById("ig_observacoes").value = "";
}

function renderIdeiasStats(ideias) {
  const porStatus = {};
  IDEIA_STATUS.forEach((s) => { porStatus[s] = 0; });
  ideias.forEach((i) => { if (porStatus[i.status] === undefined) porStatus[i.status] = 0; porStatus[i.status] += 1; });

  document.getElementById("ideias-stats").innerHTML = `
    <div class="vendas-stats-grid">
      ${IDEIA_STATUS.map((s) => `
        <div class="vendas-stat-card ${postStatusClass(s)}">
          <div class="vendas-stat-icon">${POST_STATUS_ICONS[s] || "📌"}</div>
          <div class="vendas-stat-body">
            <div class="vendas-stat-label">${s}</div>
            <div class="vendas-stat-value">${porStatus[s]}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function getFilteredIdeias() {
  const search = document.getElementById("ideias-search").value.trim().toLowerCase();
  const filtroTema = document.getElementById("ideias-filtro-tema").value;
  const filtroTipo = document.getElementById("ideias-filtro-tipo").value;

  return ideiasCache.filter((i) => {
    const matchTema = !filtroTema || i.temaId === filtroTema;
    const matchTipo = !filtroTipo || i.tipo === filtroTipo;
    const matchSearch = !search ||
      (i.titulo || "").toLowerCase().includes(search) ||
      (i.legenda || "").toLowerCase().includes(search);
    return matchTema && matchTipo && matchSearch;
  });
}

function temaDotHtml(temaId) {
  const tema = temaPorId(temaId);
  if (!tema) return "";
  return `<span class="tema-dot" style="background:${tema.cor || "#9ca3af"}" title="${tema.nome}"></span> ${tema.nome}`;
}

function renderIdeiasTable() {
  const filtradas = getFilteredIdeias();
  const wrap = document.getElementById("ideias-table-wrap");

  if (filtradas.length === 0) {
    wrap.innerHTML = `<div class="vendas-table-container"><div class="vendas-empty">Nenhuma ideia encontrada.</div></div>`;
    return;
  }

  const rows = filtradas.map((i) => `
    <tr data-id="${i.id}">
      <td>${TIPO_POST_ICONS[i.tipo] || ""} ${i.tipo || "—"}</td>
      <td>${i.titulo || "—"}</td>
      <td>${temaDotHtml(i.temaId) || "—"}</td>
      <td><span class="status-badge ${postStatusClass(i.status)}">${i.status || "—"}</span></td>
      <td>${i.dataPlanejada ? new Date(i.dataPlanejada + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
      <td class="vendas-row-actions">
        <button type="button" class="btn-secondary ideia-edit" data-id="${i.id}">Editar</button>
        <button type="button" class="btn-danger ideia-delete" data-id="${i.id}">Excluir</button>
      </td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <div class="vendas-table-container">
      <table class="vendas-table">
        <thead>
          <tr>
            <th>Formato</th>
            <th>Título</th>
            <th>Tema</th>
            <th>Status</th>
            <th>Data planejada</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll(".ideia-edit").forEach((btn) => btn.addEventListener("click", () => editIdeia(btn.dataset.id)));
  wrap.querySelectorAll(".ideia-delete").forEach((btn) => btn.addEventListener("click", () => removeIdeia(btn.dataset.id)));
}

function ideiaCardHtml(i) {
  const tema = temaPorId(i.temaId);
  const legendaPreview = (i.legenda || "").slice(0, 90);
  return `
    <div class="vendas-card ${postStatusClass(i.status)}" draggable="true" data-id="${i.id}">
      <div class="vendas-card-top">
        <div class="vendas-card-avatar" style="background:${tema ? tema.cor : "var(--darker)"}">${TIPO_POST_ICONS[i.tipo] || "📌"}</div>
        <div class="vendas-card-heading">
          <div class="vendas-card-empresa">${i.titulo || "(sem título)"}</div>
          <div class="vendas-card-contato">${tema ? tema.nome : "Sem tema"}</div>
        </div>
      </div>
      ${legendaPreview ? `<div class="vendas-card-obs">${legendaPreview}${(i.legenda || "").length > 90 ? "…" : ""}</div>` : ""}
      ${i.dataPlanejada ? `<div class="vendas-card-produto">📅 ${new Date(i.dataPlanejada + "T00:00:00").toLocaleDateString("pt-BR")}</div>` : ""}
      <div class="vendas-card-actions">
        <select class="ideia-card-status" data-id="${i.id}">
          ${IDEIA_STATUS.map((s) => `<option value="${s}" ${s === i.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <button type="button" class="btn-secondary ideia-edit" data-id="${i.id}">✎</button>
        <button type="button" class="btn-danger ideia-delete" data-id="${i.id}">✕</button>
      </div>
    </div>
  `;
}

function renderIdeiasBoard() {
  const filtradas = getFilteredIdeias();
  const wrap = document.getElementById("ideias-board-wrap");

  const colunas = IDEIA_STATUS.map((status) => {
    const doStatus = filtradas.filter((i) => i.status === status);
    const cards = doStatus.length ? doStatus.map(ideiaCardHtml).join("") : `<div class="vendas-board-empty">Nada aqui.</div>`;
    return `
      <div class="vendas-board-col ${postStatusClass(status)}" data-status="${status}">
        <div class="vendas-board-col-header">
          <span class="vendas-board-col-title"><span class="funil-etapa-dot ${postStatusClass(status)}"></span>${POST_STATUS_ICONS[status] || ""} ${status}</span>
          <span class="vendas-board-col-count">${doStatus.length}</span>
        </div>
        ${cards}
      </div>
    `;
  }).join("");

  wrap.innerHTML = `<div class="vendas-board">${colunas}</div>`;

  wrap.querySelectorAll(".ideia-edit").forEach((btn) => btn.addEventListener("click", () => editIdeia(btn.dataset.id)));
  wrap.querySelectorAll(".ideia-delete").forEach((btn) => btn.addEventListener("click", () => removeIdeia(btn.dataset.id)));
  wrap.querySelectorAll(".ideia-card-status").forEach((select) => {
    select.addEventListener("change", () => moverIdeiaStatus(select.dataset.id, select.value));
  });

  wrap.querySelectorAll(".vendas-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.id);
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  wrap.querySelectorAll(".vendas-board-col").forEach((col) => {
    col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("drag-over"); });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      moverIdeiaStatus(e.dataTransfer.getData("text/plain"), col.dataset.status);
    });
  });
}

async function moverIdeiaStatus(id, novoStatus) {
  const ideia = ideiasCache.find((i) => i.id === id);
  if (!ideia || ideia.status === novoStatus) return;
  try {
    await upsertIdeia(Object.assign({}, ideia, { status: novoStatus }), id);
    await refreshIdeias();
  } catch (err) {
    console.error(err);
    alert("Erro ao mover o card. Tenta de novo.");
  }
}

function editIdeia(id) {
  const ideia = ideiasCache.find((i) => i.id === id);
  if (!ideia) return;
  ideiaEditId = id;
  applyIdeiaToForm(ideia);
  ativarModoInstagram("ideias");
  document.getElementById("ideia-status").textContent = "Editando ideia. Altere os campos e clique em Salvar.";
  document.getElementById("ideia-status").className = "pdf-status";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeIdeia(id) {
  if (!confirm("Excluir esta ideia de post?")) return;
  try {
    await deleteIdeia(id);
    if (ideiaEditId === id) clearIdeiaForm();
    await refreshIdeias();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir.");
  }
}

function atualizarViewsIdeias() {
  renderIdeiasStats(ideiasCache);
  renderIdeiasTable();
  if (!document.getElementById("ideias-board-wrap").classList.contains("hidden")) {
    renderIdeiasBoard();
  }
}

async function refreshIdeias() {
  ideiasCache = await getIdeias();
  popularFiltrosIdeias();
  atualizarViewsIdeias();
}

function setupIdeiaActions() {
  document.getElementById("ideia-save").addEventListener("click", async () => {
    const data = collectIdeiaForm();
    const status = document.getElementById("ideia-status");
    if (!data.titulo) {
      status.textContent = "Dê um título/resumo pra ideia.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      await upsertIdeia(data, ideiaEditId);
      status.textContent = "Ideia salva.";
      status.className = "pdf-status ok";
      clearIdeiaForm();
      await refreshIdeias();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("ideia-new").addEventListener("click", () => {
    clearIdeiaForm();
    document.getElementById("ideia-status").textContent = "";
  });

  document.getElementById("ideia-delete").addEventListener("click", async () => {
    if (!ideiaEditId) {
      document.getElementById("ideia-status").textContent = "Selecione uma ideia (clique em Editar num card) pra excluir.";
      document.getElementById("ideia-status").className = "pdf-status error";
      return;
    }
    await removeIdeia(ideiaEditId);
  });

  const rerender = () => {
    renderIdeiasTable();
    if (!document.getElementById("ideias-board-wrap").classList.contains("hidden")) renderIdeiasBoard();
  };
  document.getElementById("ideias-search").addEventListener("input", rerender);
  document.getElementById("ideias-filtro-tema").addEventListener("change", rerender);
  document.getElementById("ideias-filtro-tipo").addEventListener("change", rerender);
}

function setupIdeiasViewToggle() {
  const btnLista = document.getElementById("ideias-view-lista");
  const btnQuadro = document.getElementById("ideias-view-quadro");
  const tableWrap = document.getElementById("ideias-table-wrap");
  const boardWrap = document.getElementById("ideias-board-wrap");

  btnLista.addEventListener("click", () => {
    btnLista.classList.add("active");
    btnQuadro.classList.remove("active");
    tableWrap.classList.remove("hidden");
    boardWrap.classList.add("hidden");
  });

  btnQuadro.addEventListener("click", () => {
    btnQuadro.classList.add("active");
    btnLista.classList.remove("active");
    tableWrap.classList.add("hidden");
    boardWrap.classList.remove("hidden");
    renderIdeiasBoard();
  });
}

// --- Temas & Pilares ------------------------------------------------------

function collectTemaForm() {
  return {
    nome: getI("tm_nome"),
    cor: getI("tm_cor"),
    descricao: getI("tm_descricao"),
  };
}

function applyTemaToForm(tema) {
  document.getElementById("tm_nome").value = tema.nome || "";
  document.getElementById("tm_cor").value = tema.cor || "#2563eb";
  document.getElementById("tm_descricao").value = tema.descricao || "";
}

function clearTemaForm() {
  temaEditId = null;
  document.getElementById("tm_nome").value = "";
  document.getElementById("tm_cor").value = "#2563eb";
  document.getElementById("tm_descricao").value = "";
}

function temaCardHtml(tema) {
  const count = ideiasCache.filter((i) => i.temaId === tema.id).length;
  return `
    <div class="tema-card" data-id="${tema.id}" style="border-top-color: ${tema.cor || "#9ca3af"}">
      <div class="tema-card-header">
        <div class="tema-card-avatar" style="background:${tema.cor || "#9ca3af"}">${iniciaisTexto(tema.nome)}</div>
        <div class="tema-card-heading">
          <div class="tema-card-nome">${tema.nome || "(sem nome)"}</div>
          <div class="tema-card-count">${count} ideia${count === 1 ? "" : "s"}</div>
        </div>
      </div>
      ${tema.descricao ? `<div class="tema-card-desc">${tema.descricao}</div>` : ""}
      <div class="vendas-row-actions">
        <button type="button" class="btn-secondary tema-edit" data-id="${tema.id}">Editar</button>
        <button type="button" class="btn-danger tema-delete" data-id="${tema.id}">Excluir</button>
      </div>
    </div>
  `;
}

function renderTemas() {
  const wrap = document.getElementById("temas-wrap");
  if (temasCache.length === 0) {
    wrap.innerHTML = `<div class="vendas-empty">Nenhum tema cadastrado ainda. Crie o primeiro pilar de conteúdo ao lado.</div>`;
    return;
  }
  wrap.innerHTML = `<div class="tema-grid">${temasCache.map(temaCardHtml).join("")}</div>`;

  wrap.querySelectorAll(".tema-edit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tema = temasCache.find((t) => t.id === btn.dataset.id);
      if (!tema) return;
      temaEditId = tema.id;
      applyTemaToForm(tema);
      document.getElementById("tema-status").textContent = "Editando tema. Altere e clique em Salvar.";
      document.getElementById("tema-status").className = "pdf-status";
    });
  });
  wrap.querySelectorAll(".tema-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Excluir este tema? As ideias que usam ele ficam sem tema.")) return;
      try {
        await deleteTema(btn.dataset.id);
        if (temaEditId === btn.dataset.id) clearTemaForm();
        await refreshTemas();
        await refreshIdeias();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir o tema.");
      }
    });
  });
}

async function refreshTemas() {
  temasCache = await getTemas();
  popularSelectsFormIdeia();
  popularFiltrosIdeias();
  renderTemas();
}

function setupTemaActions() {
  const swatchWrap = document.getElementById("tema-cores-sugeridas");
  swatchWrap.innerHTML = TEMA_CORES_SUGERIDAS.map((c) => `<button type="button" class="tema-swatch" data-cor="${c}" style="background:${c}"></button>`).join("");
  swatchWrap.querySelectorAll(".tema-swatch").forEach((btn) => {
    btn.addEventListener("click", () => { document.getElementById("tm_cor").value = btn.dataset.cor; });
  });

  document.getElementById("tema-save").addEventListener("click", async () => {
    const data = collectTemaForm();
    const status = document.getElementById("tema-status");
    if (!data.nome) {
      status.textContent = "Dê um nome pro tema.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      await upsertTema(data, temaEditId);
      status.textContent = "Tema salvo.";
      status.className = "pdf-status ok";
      clearTemaForm();
      await refreshTemas();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("tema-new").addEventListener("click", () => {
    clearTemaForm();
    document.getElementById("tema-status").textContent = "";
  });
}

// --- Alternância de abas ----------------------------------------------

function ativarModoInstagram(mode) {
  const tab = document.querySelector(`.mode-tab[data-mode-tab="${mode}"]`);
  if (!tab) return;
  document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t === tab));
  document.querySelectorAll("[data-mode]").forEach((el) => el.classList.toggle("hidden", el.dataset.mode !== mode));
  // A contagem de ideias por tema pode ter mudado numa ideia salva enquanto
  // o usuário estava na outra aba — reaproveita o que já está em memória
  // (sem nova consulta ao banco) só pra recalcular a contagem na tela.
  if (mode === "temas") renderTemas();
}

function setupModoToggle() {
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => ativarModoInstagram(tab.dataset.modeTab));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupModoToggle();
  setupIdeiaActions();
  setupIdeiasViewToggle();
  setupTemaActions();

  popularSelectsFormIdeia();
  await refreshTemas();
  await refreshIdeias();
});
