let vendasCache = [];
let vendaEditId = null;
let vendaEmpresaId = null;

function getV(id) { return document.getElementById(id).value; }

function parseValorBR(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function formatBRL(n) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusClass(status) {
  switch (status) {
    case "Aguardando resposta": return "status-aguardando";
    case "Em negociação": return "status-negociacao";
    case "Fechado/Ganho": return "status-ganho";
    case "Recusado/Perdido": return "status-perdido";
    default: return "";
  }
}

function collectVendaForm() {
  return {
    empresaId: vendaEmpresaId,
    empresaNome: getV("v_empresaNome"),
    contato: getV("v_contato"),
    valor: getV("v_valor"),
    dataEnvio: getV("v_dataEnvio"),
    status: getV("v_status"),
    observacoes: getV("v_observacoes"),
  };
}

function applyVendaToForm(venda) {
  document.getElementById("v_empresaNome").value = venda.empresaNome || "";
  document.getElementById("v_contato").value = venda.contato || "";
  document.getElementById("v_valor").value = venda.valor || "";
  document.getElementById("v_dataEnvio").value = venda.dataEnvio || "";
  document.getElementById("v_status").value = venda.status || "Aguardando resposta";
  document.getElementById("v_observacoes").value = venda.observacoes || "";
  vendaEmpresaId = venda.empresaId || null;
}

function clearVendaForm() {
  vendaEditId = null;
  vendaEmpresaId = null;
  document.getElementById("v_empresaNome").value = "";
  document.getElementById("v_contato").value = "";
  document.getElementById("v_valor").value = "";
  document.getElementById("v_dataEnvio").value = "";
  document.getElementById("v_status").value = "Aguardando resposta";
  document.getElementById("v_observacoes").value = "";
  document.getElementById("empresa-select").value = "";
}

function renderVendasStats(vendas) {
  const porStatus = {};
  VENDA_STATUS.forEach((s) => { porStatus[s] = { count: 0, valor: 0 }; });
  vendas.forEach((v) => {
    if (!porStatus[v.status]) porStatus[v.status] = { count: 0, valor: 0 };
    porStatus[v.status].count += 1;
    porStatus[v.status].valor += parseValorBR(v.valor);
  });

  const emAberto = (porStatus["Aguardando resposta"]?.valor || 0) + (porStatus["Em negociação"]?.valor || 0);

  const cards = [
    { label: "Aguardando resposta", data: porStatus["Aguardando resposta"] },
    { label: "Em negociação", data: porStatus["Em negociação"] },
    { label: "Fechado/Ganho", data: porStatus["Fechado/Ganho"] },
    { label: "Recusado/Perdido", data: porStatus["Recusado/Perdido"] },
  ];

  const cardsHtml = cards.map((c) => `
    <div class="vendas-stat-card">
      <div class="vendas-stat-label">${c.label}</div>
      <div class="vendas-stat-value">${c.data ? c.data.count : 0}</div>
      <div class="vendas-stat-sub">${formatBRL(c.data ? c.data.valor : 0)}</div>
    </div>
  `).join("");

  const emAbertoHtml = `
    <div class="vendas-stat-card">
      <div class="vendas-stat-label">Pipeline em aberto</div>
      <div class="vendas-stat-value">${formatBRL(emAberto)}</div>
      <div class="vendas-stat-sub">aguardando + em negociação</div>
    </div>
  `;

  document.getElementById("vendas-stats").innerHTML = cardsHtml + emAbertoHtml;
}

function renderVendasTable() {
  const search = document.getElementById("vendas-search").value.trim().toLowerCase();
  const filtroStatus = document.getElementById("vendas-filtro-status").value;

  const filtradas = vendasCache.filter((v) => {
    const matchStatus = !filtroStatus || v.status === filtroStatus;
    const matchSearch = !search ||
      (v.empresaNome || "").toLowerCase().includes(search) ||
      (v.contato || "").toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });

  const wrap = document.getElementById("vendas-table-wrap");

  if (filtradas.length === 0) {
    wrap.innerHTML = `<div class="vendas-table-container"><div class="vendas-empty">Nenhum registro de venda encontrado.</div></div>`;
    return;
  }

  const rows = filtradas.map((v) => `
    <tr data-id="${v.id}">
      <td>${v.dataEnvio ? new Date(v.dataEnvio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
      <td>${v.empresaNome || "—"}</td>
      <td>${v.contato || "—"}</td>
      <td>${v.valor ? "R$ " + v.valor : "—"}</td>
      <td><span class="status-badge ${statusClass(v.status)}">${v.status || "—"}</span></td>
      <td>${v.observacoes || ""}</td>
      <td class="vendas-row-actions">
        <button type="button" class="btn-secondary venda-edit" data-id="${v.id}">Editar</button>
        <button type="button" class="btn-danger venda-delete" data-id="${v.id}">Excluir</button>
      </td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <div class="vendas-table-container">
      <table class="vendas-table">
        <thead>
          <tr>
            <th>Envio</th>
            <th>Empresa / Lead</th>
            <th>Contato</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Observações</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  wrap.querySelectorAll(".venda-edit").forEach((btn) => {
    btn.addEventListener("click", () => editVenda(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-delete").forEach((btn) => {
    btn.addEventListener("click", () => removeVenda(btn.dataset.id));
  });
}

async function refreshVendas() {
  vendasCache = await getVendas();
  renderVendasStats(vendasCache);
  renderVendasTable();
}

function editVenda(id) {
  const venda = vendasCache.find((v) => v.id === id);
  if (!venda) return;
  vendaEditId = id;
  applyVendaToForm(venda);
  document.getElementById("venda-status").textContent = "Editando registro. Altere os campos e clique em Salvar.";
  document.getElementById("venda-status").className = "pdf-status";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeVenda(id) {
  if (!confirm("Excluir este registro de venda?")) return;
  try {
    await deleteVenda(id);
    if (vendaEditId === id) clearVendaForm();
    await refreshVendas();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir o registro.");
  }
}

async function setupEmpresasVendas() {
  const select = document.getElementById("empresa-select");
  const search = document.getElementById("empresa-search");

  const picker = await initEmpresaPicker(search, select, "— Selecionar empresa cadastrada —");

  select.addEventListener("change", async () => {
    if (!select.value) return;
    const empresa = await getEmpresa(select.value);
    if (!empresa) return;
    vendaEmpresaId = empresa.id;
    document.getElementById("v_empresaNome").value = empresa.contratante || "";
  });

  return picker;
}

function setupVendaActions() {
  document.getElementById("venda-save").addEventListener("click", async () => {
    const data = collectVendaForm();
    const status = document.getElementById("venda-status");
    if (!data.empresaNome) {
      status.textContent = "Informe ao menos o nome da empresa/lead.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      await upsertVenda(data, vendaEditId);
      status.textContent = "Registro salvo.";
      status.className = "pdf-status ok";
      clearVendaForm();
      await refreshVendas();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar o registro.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("venda-new").addEventListener("click", () => {
    clearVendaForm();
    document.getElementById("venda-status").textContent = "";
  });

  document.getElementById("vendas-search").addEventListener("input", renderVendasTable);
  document.getElementById("vendas-filtro-status").addEventListener("change", renderVendasTable);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("v_dataEnvio").value = new Date().toISOString().slice(0, 10);
  setupEmpresasVendas();
  setupVendaActions();
  refreshVendas();
});
