// Painel fixo (aparece em toda página) com as reuniões marcadas pros
// próximos dias e as anotações mais recentes, pra não depender de entrar em
// Vendas toda hora só pra lembrar do que está por vir. Se injeta sozinho
// (HTML, CSS e comportamento), só precisa do script incluído na página —
// e precisa que vendas-store.js/notas-store.js (e o Firebase "db") já
// estejam carregados antes dele.

(function () {
  const JANELA_DIAS = 7;

  function escapeHtmlDemandas(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fmtDataHora(dataStr, horaStr) {
    if (!dataStr) return "";
    const d = new Date(`${dataStr}T${horaStr || "00:00"}:00`);
    const dataFmt = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return horaStr ? `${dataFmt} às ${horaStr}` : dataFmt;
  }

  async function carregarDemandas() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje.getTime() + JANELA_DIAS * 86400000);

    let vendas = [];
    try {
      vendas = await getVendas();
    } catch (err) {
      console.error(err);
    }
    const proximas = vendas
      .filter((v) => v.reuniaoData)
      .filter((v) => {
        const d = new Date(`${v.reuniaoData}T${v.reuniaoHora || "00:00"}:00`);
        return d >= hoje && d <= limite;
      })
      .sort((a, b) => `${a.reuniaoData}${a.reuniaoHora || ""}`.localeCompare(`${b.reuniaoData}${b.reuniaoHora || ""}`));

    let notas = [];
    try {
      notas = await getNotas();
    } catch (err) {
      console.error(err);
    }

    return { proximas, notas: notas.slice(0, 5) };
  }

  function demandaItemHtml(v) {
    return `
      <div class="demandas-item">
        <div class="demandas-item-titulo">${escapeHtmlDemandas(v.empresaNome || v.contato || "Sem nome")}</div>
        <div class="demandas-item-sub">📅 ${fmtDataHora(v.reuniaoData, v.reuniaoHora)}</div>
      </div>
    `;
  }

  function notaItemHtml(n) {
    const texto = (n.texto || "").slice(0, 70);
    const reticencias = (n.texto || "").length > 70 ? "…" : "";
    return `
      <div class="demandas-item">
        <div class="demandas-item-titulo">${escapeHtmlDemandas(n.titulo || "Anotação")}</div>
        <div class="demandas-item-sub">${escapeHtmlDemandas(texto)}${reticencias}</div>
      </div>
    `;
  }

  function montarPainelHtml({ proximas, notas }) {
    const demandasHtml = proximas.length
      ? proximas.map(demandaItemHtml).join("")
      : `<div class="demandas-vazio">Nenhuma reunião marcada pros próximos ${JANELA_DIAS} dias.</div>`;
    const notasHtml = notas.length
      ? notas.map(notaItemHtml).join("")
      : `<div class="demandas-vazio">Nenhuma anotação ainda.</div>`;

    return `
      <div class="demandas-panel-header">
        <span>🔔 O que vem por aí</span>
        <button type="button" id="demandas-fechar" aria-label="Fechar">✕</button>
      </div>
      <div class="demandas-panel-body">
        <div class="demandas-section">
          <h4>Próximos ${JANELA_DIAS} dias</h4>
          ${demandasHtml}
        </div>
        <div class="demandas-section">
          <h4>Anotações recentes</h4>
          ${notasHtml}
        </div>
        <a class="demandas-link" href="vendas.html?mode=notas">Abrir Vendas →</a>
      </div>
    `;
  }

  function injetarEstilos() {
    if (document.getElementById("demandas-widget-style")) return;
    const style = document.createElement("style");
    style.id = "demandas-widget-style";
    style.textContent = `
      #demandas-widget-btn {
        position: fixed;
        bottom: 22px;
        right: 22px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: none;
        background: var(--accent);
        color: #fff;
        font-size: 1.4rem;
        cursor: pointer;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
        z-index: 9999;
      }
      #demandas-widget-btn[data-badge]::after {
        content: attr(data-badge);
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 999px;
        background: var(--danger, #dc2626);
        color: #fff;
        font-size: 0.65rem;
        font-weight: 700;
        line-height: 18px;
      }
      #demandas-widget-panel {
        position: fixed;
        bottom: 22px;
        right: 22px;
        width: min(320px, calc(100vw - 32px));
        max-height: 70vh;
        overflow-y: auto;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        font-size: 0.85rem;
      }
      .demandas-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: var(--darker);
        color: #fff;
        padding: 10px 14px;
        border-radius: 10px 10px 0 0;
        font-weight: 700;
        position: sticky;
        top: 0;
      }
      .demandas-panel-header button {
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 0.9rem;
      }
      .demandas-panel-body { padding: 12px 14px; }
      .demandas-section { margin-bottom: 14px; }
      .demandas-section h4 {
        margin: 0 0 6px;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #6b7280;
      }
      .demandas-item {
        padding: 6px 0;
        border-bottom: 1px solid var(--bg);
      }
      .demandas-item:last-child { border-bottom: none; }
      .demandas-item-titulo { font-weight: 600; color: var(--darker); }
      .demandas-item-sub { color: #6b7280; font-size: 0.78rem; }
      .demandas-vazio { color: #9ca3af; font-size: 0.8rem; }
      .demandas-link {
        display: block;
        text-align: center;
        margin-top: 4px;
        color: var(--accent);
        font-weight: 600;
        text-decoration: none;
        font-size: 0.8rem;
      }
      @media print {
        #demandas-widget-btn, #demandas-widget-panel { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function injetarWidget() {
    injetarEstilos();

    const btn = document.createElement("button");
    btn.id = "demandas-widget-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "Próximas demandas");
    btn.textContent = "🔔";

    const painel = document.createElement("div");
    painel.id = "demandas-widget-panel";
    painel.className = "hidden";

    document.body.appendChild(btn);
    document.body.appendChild(painel);

    function atualizarBadge(n) {
      if (n > 0) btn.setAttribute("data-badge", n > 9 ? "9+" : String(n));
      else btn.removeAttribute("data-badge");
    }

    async function renderPainel() {
      const dados = await carregarDemandas();
      painel.innerHTML = montarPainelHtml(dados);
      document.getElementById("demandas-fechar").addEventListener("click", fechar);
      atualizarBadge(dados.proximas.length);
    }

    function fechar() {
      painel.classList.add("hidden");
    }

    btn.addEventListener("click", async () => {
      painel.classList.toggle("hidden");
      if (!painel.classList.contains("hidden")) {
        painel.innerHTML = `<div class="demandas-panel-header"><span>🔔 O que vem por aí</span></div><div class="demandas-panel-body"><div class="demandas-vazio">Carregando...</div></div>`;
        await renderPainel();
      }
    });

    // Carrega em segundo plano só pra já mostrar o número no ícone, sem
    // precisar abrir o painel.
    carregarDemandas().then((dados) => atualizarBadge(dados.proximas.length)).catch(() => {});
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (typeof db === "undefined" || typeof getVendas !== "function" || typeof getNotas !== "function") return;
    injetarWidget();
  });
})();
