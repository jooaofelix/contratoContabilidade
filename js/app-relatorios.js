function escapeHtmlR(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDateBrR(iso) {
  if (!iso) return "—";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function inRangeStr(dateStr, from, to) {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

function timestampInRange(ts, from, to) {
  if (!ts || !ts.toDate) return false;
  return inRangeStr(isoDate(ts.toDate()), from, to);
}

function countBy(list, key, fallback) {
  const counts = {};
  list.forEach((item) => {
    const raw = (item[key] || "").toString().trim();
    const v = raw || fallback;
    counts[v] = (counts[v] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

async function buildReportData(from, to) {
  const [empresas, alteracoesTodas] = await Promise.all([getEmpresas(), getAllAlteracoes()]);

  const nomeMap = {};
  empresas.forEach((e) => { nomeMap[e.id] = e.contratante || "(sem nome)"; });

  const novasNoPeriodo = empresas.filter((e) => timestampInRange(e.createdAt, from, to));

  const alteracoesNoPeriodo = alteracoesTodas
    .filter((a) => inRangeStr(a.data, from, to))
    .map((a) => Object.assign({}, a, { empresaNome: nomeMap[a.empresaId] || "(empresa não encontrada)" }))
    .sort((a, b) => (a.data || "").localeCompare(b.data || ""));

  return {
    totalEmpresas: empresas.length,
    novasNoPeriodo,
    alteracoesNoPeriodo,
    porTributacao: countBy(empresas, "tributacao", "Não informado"),
    porCidade: countBy(empresas, "cidade", "Não informado"),
    porTipoAlteracao: countBy(alteracoesNoPeriodo, "tipo", "Outro"),
  };
}

function statCard(value, label) {
  return `
    <div class="stat-card">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${escapeHtmlR(label)}</div>
    </div>`;
}

function renderBarList(title, entries) {
  const max = Math.max(1, ...entries.map(([, c]) => c));
  const rows = entries
    .map(([label, count]) => `
      <div class="bar-row">
        <span class="bar-label">${escapeHtmlR(label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${((count / max) * 100).toFixed(0)}%"></div></div>
        <span class="bar-count">${count}</span>
      </div>`)
    .join("");
  return `
    <div class="bar-list">
      <h4>${escapeHtmlR(title)}</h4>
      ${rows || '<p class="placeholder">Sem dados neste período.</p>'}
    </div>`;
}

function renderAlteracoesTable(list) {
  if (list.length === 0) {
    return '<p class="placeholder">Nenhuma alteração registrada no período selecionado.</p>';
  }
  const rows = list
    .map((a) => {
      const resumo = (a.alteracoes || [])
        .map((c) => `${escapeHtmlR(c.campo)}: ${escapeHtmlR(c.de || "—")} → ${escapeHtmlR(c.para || "—")}`)
        .join("; ") || "—";
      return `
        <tr>
          <td>${escapeHtmlR(a.empresaNome)}</td>
          <td>${escapeHtmlR(a.tipo || "—")}</td>
          <td>${formatDateBrR(a.data)}</td>
          <td>${escapeHtmlR(a.protocolo || "—")}</td>
          <td>${resumo}</td>
        </tr>`;
    })
    .join("");
  return `
    <table class="rel-table">
      <thead><tr><th>Empresa</th><th>Tipo</th><th>Data</th><th>Protocolo</th><th>Alterações</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderNovasEmpresas(list) {
  if (list.length === 0) {
    return '<p class="placeholder">Nenhuma empresa nova cadastrada no período selecionado.</p>';
  }
  const items = list
    .map((e) => `<li>${escapeHtmlR(e.contratante || "(sem nome)")}${e.cnpj ? " — " + escapeHtmlR(e.cnpj) : ""}</li>`)
    .join("");
  return `<ul class="rel-list">${items}</ul>`;
}

function renderReport(data, from, to) {
  return `
    <div class="rel-header">
      <div class="rel-header-title">RELATÓRIO MENSAL</div>
      <div class="rel-header-sub">AEA Contabilidade Consultiva</div>
      <div class="rel-header-period">${formatDateBrR(from)} a ${formatDateBrR(to)}</div>
    </div>

    <div class="rel-stats">
      ${statCard(data.totalEmpresas, "Empresas cadastradas (total)")}
      ${statCard(data.novasNoPeriodo.length, "Novas empresas no período")}
      ${statCard(data.alteracoesNoPeriodo.length, "Alterações no período")}
    </div>

    <h3 class="rel-section-title">Visão Geral de Clientes</h3>
    <div class="rel-columns">
      ${renderBarList("Por regime tributário", data.porTributacao)}
      ${renderBarList("Por cidade", data.porCidade)}
    </div>

    <div class="rel-block">
      <h4>Novas empresas no período</h4>
      ${renderNovasEmpresas(data.novasNoPeriodo)}
    </div>

    <h3 class="rel-section-title">Alterações no Período</h3>
    <div class="rel-columns">
      ${renderBarList("Por tipo de alteração", data.porTipoAlteracao)}
    </div>
    <div class="rel-block">
      <h4>Detalhamento</h4>
      ${renderAlteracoesTable(data.alteracoesNoPeriodo)}
    </div>
  `;
}

async function updateReport() {
  const from = document.getElementById("rel_de").value;
  const to = document.getElementById("rel_ate").value;
  const status = document.getElementById("rel_status");
  const preview = document.getElementById("relatorio-preview");

  if (!from || !to) {
    status.textContent = "Informe as duas datas do período.";
    status.className = "pdf-status error";
    return;
  }

  status.textContent = "Carregando...";
  status.className = "pdf-status";
  preview.innerHTML = '<p class="placeholder">Carregando relatório...</p>';

  try {
    const data = await buildReportData(from, to);
    preview.innerHTML = renderReport(data, from, to);
    status.textContent = "Relatório atualizado.";
    status.className = "pdf-status ok";
  } catch (err) {
    console.error(err);
    status.textContent = "Erro ao carregar o relatório. Confira a conexão com o banco.";
    status.className = "pdf-status error";
    preview.innerHTML = '<p class="placeholder">Não foi possível carregar o relatório.</p>';
  }
}

function setPeriodo(from, to) {
  document.getElementById("rel_de").value = isoDate(from);
  document.getElementById("rel_ate").value = isoDate(to);
}

document.addEventListener("DOMContentLoaded", () => {
  const now = new Date();
  setPeriodo(firstDayOfMonth(now), lastDayOfMonth(now));

  document.getElementById("rel_mesAtual").addEventListener("click", () => {
    const n = new Date();
    setPeriodo(firstDayOfMonth(n), lastDayOfMonth(n));
    updateReport();
  });

  document.getElementById("rel_mesAnterior").addEventListener("click", () => {
    const n = new Date();
    const prevMonth = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    setPeriodo(firstDayOfMonth(prevMonth), lastDayOfMonth(prevMonth));
    updateReport();
  });

  document.getElementById("rel_atualizar").addEventListener("click", updateReport);
  document.getElementById("btn-print").addEventListener("click", () => window.print());

  updateReport();
});
