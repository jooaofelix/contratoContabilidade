let demandasCache = [];
let demandaEditId = null;
let diaVisualizado = hojeISO();

function getD(id) { return document.getElementById(id).value; }

function formatDataBrDemanda(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatDataLongaDemanda(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const texto = d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// --- Atividade do sistema inteiro criada hoje -----------------------------
// Junta tudo que foi cadastrado hoje em qualquer aba (Ficha Cadastral,
// Vendas, Ficha de Processo, Instagram, Anotações, Contatos) num só feed,
// só de leitura — pra "cair" automaticamente nas Demandas sem precisar
// anotar manualmente. Cada loja guarda a data de criação de um jeito
// (Timestamp do servidor ou um número em ms já resolvido no cliente);
// timestampParaMs() aceita os dois formatos.

function timestampParaMs(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  if (typeof ts === "number") return ts;
  return null;
}

function criadoHojeMs(ms) {
  if (!ms) return false;
  return new Date(ms).toISOString().slice(0, 10) === hojeISO();
}

async function carregarAtividadeHoje() {
  const [empresas, vendas, ideias, notas, contatos, alteracoes] = await Promise.all([
    typeof getEmpresas === "function" ? getEmpresas().catch(() => []) : [],
    typeof getVendas === "function" ? getVendas().catch(() => []) : [],
    typeof getIdeias === "function" ? getIdeias().catch(() => []) : [],
    typeof getNotas === "function" ? getNotas().catch(() => []) : [],
    typeof getContatos === "function" ? getContatos().catch(() => []) : [],
    typeof getAllAlteracoes === "function" ? getAllAlteracoes().catch(() => []) : [],
  ]);

  const empresaNomePorId = {};
  empresas.forEach((e) => { empresaNomePorId[e.id] = e.contratante || "(sem nome)"; });

  const eventos = [];

  empresas.forEach((e) => {
    const ms = timestampParaMs(e.createdAt);
    if (criadoHojeMs(ms)) eventos.push({ ms, icone: "📋", tipo: "Ficha Cadastral", titulo: e.contratante || "(sem nome)" });
  });

  vendas.forEach((v) => {
    const ms = timestampParaMs(v.createdAt);
    if (criadoHojeMs(ms)) eventos.push({ ms, icone: "💼", tipo: "Venda", titulo: `${v.empresaNome || "(sem nome)"}${v.status ? " — " + v.status : ""}` });
  });

  ideias.forEach((i) => {
    const ms = timestampParaMs(i.createdAtMs || i.createdAt);
    if (criadoHojeMs(ms)) eventos.push({ ms, icone: "📸", tipo: "Ideia de post", titulo: i.titulo || "(sem título)" });
  });

  notas.forEach((n) => {
    const ms = timestampParaMs(n.createdAt);
    if (criadoHojeMs(ms)) eventos.push({ ms, icone: "📝", tipo: "Anotação", titulo: n.titulo || (n.texto || "").slice(0, 60) || "(sem título)" });
  });

  contatos.forEach((c) => {
    const ms = timestampParaMs(c.createdAt);
    if (criadoHojeMs(ms)) eventos.push({ ms, icone: "👤", tipo: "Contato/lead", titulo: (typeof contatoLabel === "function" ? contatoLabel(c) : c.nome || c.empresa || "(sem nome)") });
  });

  alteracoes.forEach((a) => {
    const ms = timestampParaMs(a.createdAt);
    if (criadoHojeMs(ms)) eventos.push({ ms, icone: "🗂️", tipo: "Ficha de Processo", titulo: `${a.tipo || "Alteração"} — ${empresaNomePorId[a.empresaId] || "empresa"}` });
  });

  eventos.sort((a, b) => (b.ms || 0) - (a.ms || 0));
  return eventos;
}

function atividadeRowHtml(ev) {
  const hora = ev.ms ? new Date(ev.ms).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  return `
    <div class="atividade-row">
      <span class="atividade-icone">${ev.icone}</span>
      <div class="atividade-row-body">
        <span class="atividade-tipo">${ev.tipo}</span>
        <span class="atividade-titulo">${String(ev.titulo || "").replace(/</g, "&lt;")}</span>
      </div>
      <span class="atividade-hora">${hora}</span>
    </div>
  `;
}

function renderAtividadeHoje(eventos) {
  const wrap = document.getElementById("demandas-atividade-wrap");
  if (eventos.length === 0) {
    wrap.innerHTML = `<div class="vendas-empty">Nada foi cadastrado no sistema hoje ainda.</div>`;
    return;
  }
  wrap.innerHTML = eventos.map(atividadeRowHtml).join("");
}

function collectDemandaForm() {
  return {
    texto: getD("dm_texto"),
    data: getD("dm_data") || hojeISO(),
    status: document.getElementById("dm_revisar").checked ? "Revisar" : "Pendente",
  };
}

function clearDemandaForm() {
  demandaEditId = null;
  document.getElementById("dm_texto").value = "";
  document.getElementById("dm_data").value = diaVisualizado;
  document.getElementById("dm_revisar").checked = false;
  document.getElementById("demanda-status").textContent = "";
}

function editDemanda(id) {
  const d = demandasCache.find((x) => x.id === id);
  if (!d) return;
  demandaEditId = id;
  document.getElementById("dm_texto").value = d.texto || "";
  document.getElementById("dm_data").value = d.data || hojeISO();
  document.getElementById("dm_revisar").checked = d.status === "Revisar";
  document.getElementById("demanda-status").textContent = "Editando. Ajuste e clique em Adicionar pra salvar (o status de Feito/Revisar continua controlado pelos botões da lista).";
  document.getElementById("demanda-status").className = "pdf-status";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeDemanda(id) {
  if (!confirm("Excluir esta demanda?")) return;
  try {
    await deleteDemandaDiaria(id);
    if (demandaEditId === id) clearDemandaForm();
    await refreshDemandas();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir.");
  }
}

async function toggleFeitoDemanda(id) {
  const d = demandasCache.find((x) => x.id === id);
  if (!d) return;
  const novoStatus = d.status === "Feito" ? "Pendente" : "Feito";
  try {
    await upsertDemandaDiaria(Object.assign({}, d, { status: novoStatus }), id);
    await refreshDemandas();
  } catch (err) {
    console.error(err);
    alert("Erro ao atualizar.");
  }
}

async function toggleRevisarDemanda(id) {
  const d = demandasCache.find((x) => x.id === id);
  if (!d) return;
  const novoStatus = d.status === "Revisar" ? "Pendente" : "Revisar";
  try {
    await upsertDemandaDiaria(Object.assign({}, d, { status: novoStatus }), id);
    await refreshDemandas();
  } catch (err) {
    console.error(err);
    alert("Erro ao atualizar.");
  }
}

function demandaRowHtml(d, opts) {
  opts = opts || {};
  const feito = d.status === "Feito";
  const revisar = d.status === "Revisar";
  return `
    <div class="demanda-row ${feito ? "demanda-row-feita" : ""}" data-id="${d.id}">
      <input type="checkbox" class="demanda-check" data-id="${d.id}" ${feito ? "checked" : ""} title="Marcar como feito">
      <div class="demanda-row-body">
        <div class="demanda-row-texto">${(d.texto || "").replace(/</g, "&lt;")}</div>
        ${opts.mostrarData !== false ? `<div class="demanda-row-data">${formatDataBrDemanda(d.data)}</div>` : ""}
      </div>
      <div class="demanda-row-actions">
        <button type="button" class="btn-secondary demanda-revisar-btn ${revisar ? "active" : ""}" data-id="${d.id}" title="Marcar/desmarcar como para revisar">🔁</button>
        <button type="button" class="btn-secondary demanda-edit" data-id="${d.id}">✎</button>
        <button type="button" class="btn-danger demanda-delete" data-id="${d.id}">✕</button>
      </div>
    </div>
  `;
}

function wireListaDemandas(wrap) {
  wrap.querySelectorAll(".demanda-check").forEach((c) => {
    c.addEventListener("change", () => toggleFeitoDemanda(c.dataset.id));
  });
  wrap.querySelectorAll(".demanda-revisar-btn").forEach((b) => {
    b.addEventListener("click", () => toggleRevisarDemanda(b.dataset.id));
  });
  wrap.querySelectorAll(".demanda-edit").forEach((b) => {
    b.addEventListener("click", () => editDemanda(b.dataset.id));
  });
  wrap.querySelectorAll(".demanda-delete").forEach((b) => {
    b.addEventListener("click", () => removeDemanda(b.dataset.id));
  });
}

function renderGrupoDemandas(wrapId, lista, opts) {
  const wrap = document.getElementById(wrapId);
  if (lista.length === 0) {
    wrap.innerHTML = `<div class="vendas-empty">Nada por aqui.</div>`;
    return;
  }
  wrap.innerHTML = lista.map((d) => demandaRowHtml(d, opts)).join("");
  wireListaDemandas(wrap);
}

function renderDemandasStats(atrasadas, doDia, revisar) {
  document.getElementById("demandas-stats").innerHTML = `
    <div class="vendas-stats-grid">
      <div class="vendas-stat-card status-perdido">
        <div class="vendas-stat-icon">⏰</div>
        <div class="vendas-stat-body">
          <div class="vendas-stat-label">Atrasadas</div>
          <div class="vendas-stat-value">${atrasadas.length}</div>
        </div>
      </div>
      <div class="vendas-stat-card status-negociacao">
        <div class="vendas-stat-icon">📌</div>
        <div class="vendas-stat-body">
          <div class="vendas-stat-label">${diaVisualizado === hojeISO() ? "Pendentes hoje" : "Pendentes no dia"}</div>
          <div class="vendas-stat-value">${doDia.length}</div>
        </div>
      </div>
      <div class="vendas-stat-card status-diagnostico">
        <div class="vendas-stat-icon">🔁</div>
        <div class="vendas-stat-body">
          <div class="vendas-stat-label">Para revisar</div>
          <div class="vendas-stat-value">${revisar.length}</div>
        </div>
      </div>
    </div>
  `;
}

function atualizarTituloDia() {
  const titulo = document.getElementById("demandas-dia-titulo");
  const hoje = hojeISO();
  titulo.textContent = diaVisualizado === hoje ? "📌 Hoje" : `📌 ${formatDataLongaDemanda(diaVisualizado)}`;
}

function renderDemandas() {
  const hoje = hojeISO();
  const atrasadas = demandasCache.filter((d) => d.status === "Pendente" && d.data && d.data < hoje);
  const doDia = demandasCache.filter((d) => d.status === "Pendente" && d.data === diaVisualizado);
  const revisar = demandasCache.filter((d) => d.status === "Revisar").sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  const feitas = demandasCache.filter((d) => d.status === "Feito").sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  renderDemandasStats(atrasadas, doDia, revisar);
  atualizarTituloDia();
  renderGrupoDemandas("demandas-atrasadas-wrap", atrasadas);
  renderGrupoDemandas("demandas-dia-wrap", doDia, { mostrarData: false });
  renderGrupoDemandas("demandas-revisar-wrap", revisar);
  renderGrupoDemandas("demandas-feitas-wrap", feitas);
}

async function refreshDemandas() {
  const [demandas, atividade] = await Promise.all([
    getDemandasDiarias(),
    carregarAtividadeHoje(),
  ]);
  demandasCache = demandas;
  renderDemandas();
  renderAtividadeHoje(atividade);
}

function irParaDia(iso) {
  diaVisualizado = iso;
  document.getElementById("dm_ver_data").value = iso;
  renderDemandas();
}

function setupNavegacaoDia() {
  document.getElementById("dm_ver_data").addEventListener("change", (e) => irParaDia(e.target.value || hojeISO()));
  document.getElementById("dm_dia_hoje").addEventListener("click", () => irParaDia(hojeISO()));
  document.getElementById("dm_dia_anterior").addEventListener("click", () => {
    const d = new Date(diaVisualizado + "T00:00:00");
    d.setDate(d.getDate() - 1);
    irParaDia(d.toISOString().slice(0, 10));
  });
  document.getElementById("dm_dia_proximo").addEventListener("click", () => {
    const d = new Date(diaVisualizado + "T00:00:00");
    d.setDate(d.getDate() + 1);
    irParaDia(d.toISOString().slice(0, 10));
  });
}

function setupFormDemanda() {
  document.getElementById("demanda-salvar").addEventListener("click", async () => {
    const data = collectDemandaForm();
    const status = document.getElementById("demanda-status");
    if (!data.texto.trim()) {
      status.textContent = "Escreva o que precisa ser feito.";
      status.className = "pdf-status error";
      return;
    }
    // Editando uma demanda que já estava Feito e o form não mexe nisso
    // diretamente — preserva o Feito a menos que o usuário tenha marcado
    // "para revisar" agora.
    if (demandaEditId) {
      const atual = demandasCache.find((d) => d.id === demandaEditId);
      if (atual && atual.status === "Feito" && !document.getElementById("dm_revisar").checked) {
        data.status = "Feito";
      }
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      await upsertDemandaDiaria(data, demandaEditId);
      status.textContent = "Demanda salva.";
      status.className = "pdf-status ok";
      clearDemandaForm();
      await refreshDemandas();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("demanda-nova").addEventListener("click", clearDemandaForm);
}

function setupPanelTogglesDemandas() {
  document.querySelectorAll(".panel-toggle").forEach((h2) => {
    h2.addEventListener("click", () => {
      document.getElementById(h2.dataset.target).classList.toggle("collapsed");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dm_data").value = hojeISO();
  document.getElementById("dm_ver_data").value = hojeISO();
  setupNavegacaoDia();
  setupFormDemanda();
  setupPanelTogglesDemandas();
  refreshDemandas();
});
