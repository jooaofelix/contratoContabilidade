function formatDateBrH(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

function escapeHtmlH(str) {
  return (str || "").toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderHistoricoEntry(evento) {
  const changesHtml = (evento.alteracoes || [])
    .map((a) => `<li><strong>${escapeHtmlH(a.campo)}:</strong> ${escapeHtmlH(a.de || "—")} <span class="hc-arrow">→</span> ${escapeHtmlH(a.para || "—")}</li>`)
    .join("");

  return `
    <div class="historico-entry">
      <div class="historico-head">
        <span class="historico-tipo">${escapeHtmlH(evento.tipo || "Alteração")}</span>
        <span class="historico-date">${formatDateBrH(evento.data)}${evento.protocolo ? " · Protocolo " + escapeHtmlH(evento.protocolo) : ""}</span>
      </div>
      <ul class="historico-changes">${changesHtml || '<li class="placeholder">Nenhuma alteração registrada.</li>'}</ul>
      ${evento.observacoes ? `<p class="historico-obs">${escapeHtmlH(evento.observacoes)}</p>` : ""}
    </div>`;
}

async function loadHistorico(empresaId) {
  const wrap = document.getElementById("historico-list");
  wrap.innerHTML = '<p class="historico-empty">Carregando...</p>';
  try {
    const eventos = await getHistoricoAlteracoes(empresaId);
    if (eventos.length === 0) {
      wrap.innerHTML = '<p class="historico-empty">Nenhuma alteração registrada para esta empresa ainda.</p>';
      return;
    }
    wrap.innerHTML = eventos.map(renderHistoricoEntry).join("");
  } catch (err) {
    console.error(err);
    wrap.innerHTML = '<p class="historico-empty">Erro ao carregar o histórico. Confira a conexão com o banco.</p>';
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const select = document.getElementById("empresa-select");
  const wrap = document.getElementById("historico-list");
  const nomeEl = document.getElementById("historico-empresa-nome");
  wrap.innerHTML = '<p class="historico-empty">Selecione uma empresa para ver o histórico de alterações.</p>';

  try {
    await populateEmpresaSelect(select, "— Selecione uma empresa —");
  } catch (err) {
    console.error(err);
    wrap.innerHTML = '<p class="historico-empty">Não foi possível conectar ao banco de empresas.</p>';
  }

  select.addEventListener("change", () => {
    if (!select.value) {
      nomeEl.textContent = "";
      wrap.innerHTML = '<p class="historico-empty">Selecione uma empresa para ver o histórico de alterações.</p>';
      return;
    }
    nomeEl.textContent = select.options[select.selectedIndex].textContent;
    loadHistorico(select.value);
  });
});
