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
    case "Aguardando reunião": return "status-reuniao";
    case "Diagnóstico realizado": return "status-diagnostico";
    case "Em negociação": return "status-negociacao";
    case "Analisando proposta": return "status-analisando-proposta";
    case "Analisando contrato": return "status-analisando-contrato";
    case "Fechado/Ganho": return "status-ganho";
    case "Recusado/Perdido": return "status-perdido";
    default: return "";
  }
}

const STATUS_ICONS = {
  "Aguardando resposta": "📤",
  "Aguardando reunião": "📅",
  "Diagnóstico realizado": "🔎",
  "Em negociação": "🤝",
  "Analisando proposta": "📄",
  "Analisando contrato": "✍️",
  "Fechado/Ganho": "🏆",
  "Recusado/Perdido": "❌",
};

// Etapas "vivas" do funil, na ordem em que uma negociação avança — usadas
// pra montar o gráfico de funil (Recusado/Perdido fica de fora das barras,
// já que não dá pra saber em qual etapa cada negociação perdida parou).
const FUNNEL_STAGES = VENDA_STATUS.filter((s) => s !== "Recusado/Perdido");

// Duas letras a partir do nome — pro avatar circular dos cards.
function iniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// Mostra o selo de handoff só quando a venda já fechou — antes disso não faz
// sentido perguntar se a ficha já foi repassada pro próximo setor.
function atualizarVisibilidadeHandoff() {
  const status = getV("v_status");
  document.getElementById("v_handoffWrap").classList.toggle("hidden", status !== "Fechado/Ganho");
}

function collectVendaForm() {
  const produtoSelect = document.getElementById("v_produto");
  const produtoOpt = produtoSelect.selectedOptions[0];
  return {
    empresaId: vendaEmpresaId,
    empresaNome: getV("v_empresaNome"),
    contato: getV("v_contato"),
    produtoId: produtoSelect.value || null,
    produtoNome: produtoSelect.value && produtoOpt ? produtoOpt.textContent : "",
    valor: getV("v_valor"),
    dataEnvio: getV("v_dataEnvio"),
    status: getV("v_status"),
    observacoes: getV("v_observacoes"),
    handoffFeito: document.getElementById("v_handoffFeito").checked,
  };
}

function applyVendaToForm(venda) {
  document.getElementById("v_empresaNome").value = venda.empresaNome || "";
  document.getElementById("v_contato").value = venda.contato || "";
  document.getElementById("v_produto").value = venda.produtoId || "";
  document.getElementById("v_valor").value = venda.valor || "";
  document.getElementById("v_dataEnvio").value = venda.dataEnvio || "";
  document.getElementById("v_status").value = venda.status || "Aguardando resposta";
  document.getElementById("v_observacoes").value = venda.observacoes || "";
  document.getElementById("v_handoffFeito").checked = !!venda.handoffFeito;
  vendaEmpresaId = venda.empresaId || null;
  atualizarVisibilidadeHandoff();
}

function clearVendaForm() {
  vendaEditId = null;
  vendaEmpresaId = null;
  document.getElementById("v_empresaNome").value = "";
  document.getElementById("v_contato").value = "";
  document.getElementById("v_produto").value = "";
  document.getElementById("v_valor").value = "";
  document.getElementById("v_dataEnvio").value = "";
  document.getElementById("v_status").value = "Aguardando resposta";
  document.getElementById("v_observacoes").value = "";
  document.getElementById("v_handoffFeito").checked = false;
  document.getElementById("empresa-select").value = "";
  atualizarVisibilidadeHandoff();
}

const VENDA_STATUS_FINAIS = ["Fechado/Ganho", "Recusado/Perdido"];

let metaMensalCache = META_MENSAL_PADRAO;

function renderMetaMensalHtml(vendas) {
  const totalMes = totalFechadoNoMes(vendas);
  const pct = metaMensalCache > 0 ? Math.min(100, Math.round((totalMes / metaMensalCache) * 100)) : 0;
  const batida = totalMes >= metaMensalCache;
  const nomeMesBruto = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const nomeMes = nomeMesBruto.charAt(0).toUpperCase() + nomeMesBruto.slice(1);

  return `
    <div class="vendas-meta-card ${batida ? "meta-batida" : ""}">
      <div class="vendas-meta-header">
        <span class="vendas-meta-label">🎯 Meta de vendas — ${nomeMes}</span>
        <span class="vendas-meta-valores">${formatBRL(totalMes)} / ${formatBRL(metaMensalCache)}</span>
      </div>
      <div class="vendas-meta-bar-track">
        <div class="vendas-meta-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="vendas-meta-sub">${batida ? "🎉 Meta batida este mês!" : `${pct}% da meta — faltam ${formatBRL(Math.max(0, metaMensalCache - totalMes))}`}</div>
    </div>
  `;
}

// Gráfico de funil de verdade: cada barra mostra quantas negociações "vivas"
// (tudo que não foi perdido) já chegaram naquela etapa OU foram além dela —
// por isso as barras só encolhem, nunca crescem, formando o funil clássico.
// Perdidos ficam de fora das barras (não dá pra saber em que etapa cada um
// parou) e aparecem como um selo à parte.
function renderFunilVisualHtml(vendas) {
  const ativos = vendas.filter((v) => v.status !== "Recusado/Perdido" && FUNNEL_STAGES.includes(v.status));
  const perdidos = vendas.filter((v) => v.status === "Recusado/Perdido");

  const contagem = FUNNEL_STAGES.map(() => 0);
  ativos.forEach((v) => {
    const idx = FUNNEL_STAGES.indexOf(v.status);
    for (let i = 0; i <= idx; i++) contagem[i] += 1;
  });

  const maxCount = contagem[0] || 0;

  const etapasHtml = FUNNEL_STAGES.map((stage, i) => {
    const count = contagem[i];
    const pctLargura = maxCount > 0 ? Math.max(count > 0 ? 10 : 3, Math.round((count / maxCount) * 100)) : 3;
    const conversao = i > 0 && contagem[i - 1] > 0 ? Math.round((count / contagem[i - 1]) * 100) : null;
    return `
      <div class="funil-etapa">
        <div class="funil-etapa-label">
          <span class="funil-etapa-dot ${statusClass(stage)}"></span>
          <span class="funil-etapa-nome">${STATUS_ICONS[stage] || ""} ${stage}</span>
          ${conversao !== null ? `<span class="funil-etapa-conversao">${conversao}% →</span>` : ""}
        </div>
        <div class="funil-etapa-track">
          <div class="funil-etapa-bar ${statusClass(stage)}" style="width: ${pctLargura}%">
            <span class="funil-etapa-count">${count}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="funil-visual">
      <div class="funil-visual-header">
        <h3>📊 Funil de conversão</h3>
        ${perdidos.length > 0 ? `<span class="funil-perdidos-badge">✕ ${perdidos.length} perdido${perdidos.length > 1 ? "s" : ""} no período</span>` : ""}
      </div>
      <div class="funil-etapas">${etapasHtml}</div>
    </div>
  `;
}

function renderVendasStats(vendas) {
  const porStatus = {};
  VENDA_STATUS.forEach((s) => { porStatus[s] = { count: 0, valor: 0 }; });
  vendas.forEach((v) => {
    if (!porStatus[v.status]) porStatus[v.status] = { count: 0, valor: 0 };
    porStatus[v.status].count += 1;
    porStatus[v.status].valor += parseValorBR(v.valor);
  });

  const emAberto = VENDA_STATUS
    .filter((s) => !VENDA_STATUS_FINAIS.includes(s))
    .reduce((sum, s) => sum + porStatus[s].valor, 0);

  const cardsHtml = VENDA_STATUS.map((s) => `
    <div class="vendas-stat-card ${statusClass(s)}">
      <div class="vendas-stat-icon">${STATUS_ICONS[s] || "📌"}</div>
      <div class="vendas-stat-body">
        <div class="vendas-stat-label">${s}</div>
        <div class="vendas-stat-value">${porStatus[s].count}</div>
        <div class="vendas-stat-sub">${formatBRL(porStatus[s].valor)}</div>
      </div>
    </div>
  `).join("");

  const emAbertoHtml = `
    <div class="vendas-stat-card vendas-stat-card-destaque">
      <div class="vendas-stat-icon">📊</div>
      <div class="vendas-stat-body">
        <div class="vendas-stat-label">Pipeline em aberto</div>
        <div class="vendas-stat-value">${formatBRL(emAberto)}</div>
        <div class="vendas-stat-sub">tudo que ainda não fechou nem foi perdido</div>
      </div>
    </div>
  `;

  document.getElementById("vendas-stats").innerHTML =
    renderMetaMensalHtml(vendas) + renderFunilVisualHtml(vendas) + `<div class="vendas-stats-grid">${cardsHtml}${emAbertoHtml}</div>`;
}

function setupMetaMensal() {
  document.getElementById("meta-editar-btn").addEventListener("click", async () => {
    const atual = metaMensalCache;
    const novoTexto = prompt("Meta de vendas do mês (R$):", String(atual).replace(".", ","));
    if (novoTexto === null) return;
    const novoValor = parseValorBR(novoTexto);
    if (!novoValor || novoValor <= 0) {
      alert("Informe um valor de meta válido.");
      return;
    }
    metaMensalCache = novoValor;
    await setMetaMensal(novoValor);
    renderVendasStats(getVendasNoEscopoMes().filter((v) => !v.arquivada));
  });
}

// "Reset" mensal sem apagar nada: como não tem servidor/cron rodando (é um
// site estático), o "zerar todo dia 1" acontece sozinho pelo simples fato de
// recalcular o mês atual a cada carregamento da página. Por padrão
// (filtroMes === ""), a tela só esconde o que já foi RESOLVIDO (fechado ou
// perdido) em meses anteriores — negociação em aberto continua visível não
// importa de quando é, porque ainda precisa ser resolvida. Os dados nunca
// somem de verdade: dá pra escolher um mês específico ou "Todos os meses"
// no filtro de Período e ver tudo de novo.
function vendaNoEscopoMes(v, filtroMes) {
  if (filtroMes === "todos") return true;
  const mesAlvo = filtroMes || mesAtualISO();
  if (!filtroMes && !VENDA_STATUS_FINAIS.includes(v.status)) return true;
  return (v.dataEnvio || "").slice(0, 7) === mesAlvo;
}

function getVendasNoEscopoMes() {
  const filtroMes = document.getElementById("vendas-filtro-mes").value;
  return vendasCache.filter((v) => vendaNoEscopoMes(v, filtroMes));
}

function formatarMesLabel(mesISO) {
  if (!mesISO) return "—";
  const [ano, mes] = mesISO.split("-").map(Number);
  const nome = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

// Preenche o filtro de Período com o mês atual (padrão), os outros meses que
// aparecem nos registros e "Todos os meses" — sem perder a escolha atual do
// usuário ao recarregar a lista.
function popularFiltroMes() {
  const select = document.getElementById("vendas-filtro-mes");
  const atual = mesAtualISO();
  const selecaoAnterior = select.value;

  const outrosMeses = Array.from(new Set(vendasCache.map((v) => (v.dataEnvio || "").slice(0, 7)).filter((m) => m && m !== atual)))
    .sort().reverse();

  select.innerHTML = [
    `<option value="">📌 Mês atual</option>`,
    ...outrosMeses.map((m) => `<option value="${m}">${formatarMesLabel(m)}</option>`),
    `<option value="todos">Todos os meses</option>`,
  ].join("");

  if (Array.from(select.options).some((o) => o.value === selecaoAnterior)) {
    select.value = selecaoAnterior;
  }
}

function atualizarPeriodoNota() {
  const filtroMes = document.getElementById("vendas-filtro-mes").value;
  const nota = document.getElementById("vendas-periodo-nota");
  if (filtroMes === "todos") {
    nota.textContent = "Mostrando todo o histórico de vendas.";
  } else if (filtroMes) {
    nota.textContent = `Mostrando apenas os registros de ${formatarMesLabel(filtroMes)}.`;
  } else {
    nota.textContent = `Mostrando tudo que ainda está em aberto + o que foi fechado ou perdido em ${formatarMesLabel(mesAtualISO())}. Os meses anteriores continuam salvos — use o filtro de Período pra ver.`;
  }
}

function getFilteredVendas() {
  const search = document.getElementById("vendas-search").value.trim().toLowerCase();
  const filtroStatus = document.getElementById("vendas-filtro-status").value;
  const mostrarArquivadas = document.getElementById("vendas-mostrar-arquivadas").checked;

  return getVendasNoEscopoMes().filter((v) => {
    if (!mostrarArquivadas && v.arquivada) return false;
    const matchStatus = !filtroStatus || v.status === filtroStatus;
    const matchSearch = !search ||
      (v.empresaNome || "").toLowerCase().includes(search) ||
      (v.contato || "").toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });
}

// Arquivar não apaga nada — só marca o registro pra sumir da lista por
// padrão (ver getFilteredVendas), continuando disponível em "Mostrar
// arquivadas" e totalmente reversível pelo mesmo botão.
async function toggleArquivarVenda(id) {
  const venda = vendasCache.find((v) => v.id === id);
  if (!venda) return;
  try {
    await upsertVenda(Object.assign({}, venda, { arquivada: !venda.arquivada }), id);
    await refreshVendas();
  } catch (err) {
    console.error(err);
    alert("Erro ao arquivar/desarquivar o registro.");
  }
}

function renderVendasTable() {
  const filtradas = getFilteredVendas();
  const wrap = document.getElementById("vendas-table-wrap");

  if (filtradas.length === 0) {
    wrap.innerHTML = `<div class="vendas-table-container"><div class="vendas-empty">Nenhum registro de venda encontrado.</div></div>`;
    return;
  }

  const rows = filtradas.map((v) => `
    <tr data-id="${v.id}" class="${v.arquivada ? "venda-row-arquivada" : ""}">
      <td>${v.dataEnvio ? new Date(v.dataEnvio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</td>
      <td>${v.empresaNome || "—"}${v.arquivada ? ' <span class="arquivada-badge">Arquivada</span>' : ""}</td>
      <td>${v.contato || "—"}</td>
      <td>${v.produtoNome || "—"}</td>
      <td>${v.valor ? "R$ " + v.valor : "—"}</td>
      <td><span class="status-badge ${statusClass(v.status)}">${v.status || "—"}</span></td>
      <td>${v.status === "Fechado/Ganho" ? `<span class="handoff-badge ${v.handoffFeito ? "handoff-ok" : "handoff-pendente"}">${v.handoffFeito ? "✅ Repassado" : "⏳ Pendente"}</span>` : ""}</td>
      <td>${v.observacoes || ""}</td>
      <td class="vendas-row-actions">
        <button type="button" class="btn-secondary venda-followup" data-id="${v.id}" title="Enviar 2ª chamada por WhatsApp">📲 2ª chamada</button>
        <button type="button" class="btn-secondary venda-reuniao" data-id="${v.id}" title="Marcar reunião no Google Calendar">📅 Reunião</button>
        <button type="button" class="btn-secondary venda-edit" data-id="${v.id}">Editar</button>
        <button type="button" class="btn-secondary venda-arquivar" data-id="${v.id}">${v.arquivada ? "📤 Desarquivar" : "📦 Arquivar"}</button>
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
            <th>Serviço</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Handoff</th>
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
  wrap.querySelectorAll(".venda-arquivar").forEach((btn) => {
    btn.addEventListener("click", () => toggleArquivarVenda(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-followup").forEach((btn) => {
    btn.addEventListener("click", () => enviarSegundaChamada(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-reuniao").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalReuniao(btn.dataset.id));
  });
}

// Extrai um telefone pra 2ª chamada: prioriza o contato vinculado
// (contatoId, já carregado em memória em contatosCache) e cai pra um regex
// em cima do texto livre "Nome - telefone" salvo no registro da venda.
function resolveTelefoneVenda(venda) {
  if (venda.contatoId) {
    const contato = contatosCache.find((c) => c.id === venda.contatoId);
    if (contato && contato.telefone) return contato.telefone;
  }
  const match = (venda.contato || "").match(/[\d()+\-.\s]{8,}/);
  return match ? match[0].trim() : "";
}

function buildFollowUpMensagem(venda) {
  const nome = (venda.contato || "").split(" - ")[0].trim() || venda.empresaNome || "";
  const servicoMatch = (venda.observacoes || "").match(/Proposta enviada via WhatsApp: (.+)/);
  const servico = servicoMatch ? servicoMatch[1].split(",")[0].trim() : "";
  const sobre = servico ? ` sobre ${servico}` : "";
  return `Olá ${nome}! Aqui é da AEA Contabilidade Consultiva de novo 😊 Só passando pra saber se você viu minha mensagem anterior${sobre}. Ainda tem interesse ou ficou alguma dúvida? Fico à disposição!`;
}

// Botão de acesso rápido pra reforçar contato com quem já foi prospectado e
// ainda não respondeu. Abre o WhatsApp com uma mensagem de follow-up pronta
// e marca nas observações da venda que a 2ª chamada foi enviada.
async function enviarSegundaChamada(id) {
  const venda = vendasCache.find((v) => v.id === id);
  if (!venda) return;

  const telefone = resolveTelefoneVenda(venda);
  const mensagem = buildFollowUpMensagem(venda);
  const link = buildWhatsAppLink(telefone, mensagem);
  if (!link) {
    alert('Não encontrei um telefone válido nesse registro. Clique em "Editar" e confira o campo Contato.');
    return;
  }

  // Abre já, antes de qualquer await — mesma regra de sempre pra não
  // arriscar o navegador bloquear o pop-up.
  window.open(link, "_blank");

  try {
    const hoje = new Date().toLocaleDateString("pt-BR");
    const novasObs = [venda.observacoes, `2ª chamada enviada em ${hoje}`].filter(Boolean).join(" — ");
    await upsertVenda(Object.assign({}, venda, { observacoes: novasObs }), id);
    await refreshVendas();
  } catch (err) {
    console.error(err);
  }
}

// --- Marcar reunião (link rápido do Google Calendar) --------------------

let reuniaoVendaId = null;

// dateStr "AAAA-MM-DD" + timeStr "HH:MM" são interpretados como horário
// local do navegador; convertidos pra UTC no formato que o link "quick add"
// do Google Calendar espera (AAAAMMDDTHHMMSSZ).
function formatGCalDateTime(dateStr, timeStr, minutosDuracao) {
  const inicio = new Date(`${dateStr}T${timeStr}:00`);
  const fim = new Date(inicio.getTime() + minutosDuracao * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return `${fmt(inicio)}/${fmt(fim)}`;
}

function buildGoogleCalendarLink({ titulo, dataInicio, dataFim, detalhes }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: `${dataInicio}/${dataFim}`,
    details: detalhes || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function abrirModalReuniao(id) {
  const venda = vendasCache.find((v) => v.id === id);
  if (!venda) return;
  reuniaoVendaId = id;

  document.getElementById("reuniao-titulo").value = `Reunião - AEA Contabilidade × ${venda.empresaNome || venda.contato || ""}`;
  document.getElementById("reuniao-data").value = new Date().toISOString().slice(0, 10);
  document.getElementById("reuniao-hora").value = "14:00";
  document.getElementById("reuniao-duracao").value = "60";
  document.getElementById("reuniao-detalhes").value = [venda.contato, venda.observacoes].filter(Boolean).join("\n");

  document.getElementById("reuniao-modal").classList.remove("hidden");
}

// Agendamento avulso (ex: a partir de uma anotação) — abre o mesmo modal,
// mas sem vínculo com nenhum card do funil.
function abrirModalReuniaoDeNota(id) {
  const nota = notasCache.find((n) => n.id === id);
  if (!nota) return;
  reuniaoVendaId = null;

  document.getElementById("reuniao-titulo").value = nota.titulo || "Anotação";
  document.getElementById("reuniao-data").value = new Date().toISOString().slice(0, 10);
  document.getElementById("reuniao-hora").value = "14:00";
  document.getElementById("reuniao-duracao").value = "60";
  document.getElementById("reuniao-detalhes").value = nota.texto || "";

  document.getElementById("reuniao-modal").classList.remove("hidden");
}

function fecharModalReuniao() {
  document.getElementById("reuniao-modal").classList.add("hidden");
  reuniaoVendaId = null;
}

function setupReuniaoModal() {
  document.getElementById("reuniao-cancelar").addEventListener("click", fecharModalReuniao);

  document.getElementById("reuniao-confirmar").addEventListener("click", async () => {
    const id = reuniaoVendaId;
    const venda = id ? vendasCache.find((v) => v.id === id) : null;

    const titulo = getV("reuniao-titulo");
    const data = getV("reuniao-data");
    const hora = getV("reuniao-hora");
    const duracao = parseInt(getV("reuniao-duracao"), 10) || 60;
    const detalhes = getV("reuniao-detalhes");

    if (!data || !hora) {
      alert("Preencha a data e a hora da reunião.");
      return;
    }

    const [dataInicio, dataFim] = formatGCalDateTime(data, hora, duracao).split("/");
    const link = buildGoogleCalendarLink({ titulo, dataInicio, dataFim, detalhes });

    // Abre já, antes de qualquer await — mesma regra de sempre pra não
    // arriscar o navegador bloquear o pop-up.
    window.open(link, "_blank");
    fecharModalReuniao();

    // Agendamento avulso (sem venda vinculada, ex: veio de uma anotação):
    // só abre o link mesmo, não mexe no funil.
    if (!venda) return;

    try {
      const dataHoraFmt = new Date(`${data}T${hora}:00`).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const novasObs = [venda.observacoes, `Reunião marcada para ${dataHoraFmt}`].filter(Boolean).join(" — ");
      await upsertVenda(Object.assign({}, venda, {
        status: "Aguardando reunião",
        observacoes: novasObs,
        reuniaoData: data,
        reuniaoHora: hora,
      }), id);
      await refreshVendas();
    } catch (err) {
      console.error(err);
    }
  });
}

async function moverVendaStatus(id, novoStatus) {
  const venda = vendasCache.find((v) => v.id === id);
  if (!venda || venda.status === novoStatus) return;
  try {
    await upsertVenda(Object.assign({}, venda, { status: novoStatus }), id);
    await refreshVendas();
  } catch (err) {
    console.error(err);
    alert("Erro ao mover o card. Tenta de novo.");
  }
}

function vendaCardHtml(v) {
  return `
    <div class="vendas-card ${statusClass(v.status)} ${v.arquivada ? "venda-card-arquivada" : ""}" draggable="true" data-id="${v.id}">
      <div class="vendas-card-top">
        <div class="vendas-card-avatar">${iniciais(v.empresaNome)}</div>
        <div class="vendas-card-heading">
          <div class="vendas-card-empresa">${v.empresaNome || "(sem nome)"}${v.arquivada ? ' <span class="arquivada-badge">Arquivada</span>' : ""}</div>
          <div class="vendas-card-contato">${v.contato || "—"}</div>
        </div>
      </div>
      ${v.produtoNome ? `<div class="vendas-card-produto">🧾 ${v.produtoNome}</div>` : ""}
      ${v.valor ? `<div class="vendas-card-valor">R$ ${v.valor}</div>` : ""}
      ${v.observacoes ? `<div class="vendas-card-obs">${v.observacoes}</div>` : ""}
      ${v.status === "Fechado/Ganho" ? `<span class="handoff-badge ${v.handoffFeito ? "handoff-ok" : "handoff-pendente"}">${v.handoffFeito ? "✅ Repassado" : "⏳ Repasse pendente"}</span>` : ""}
      <div class="vendas-card-actions">
        <select class="venda-card-status" data-id="${v.id}">
          ${VENDA_STATUS.map((s) => `<option value="${s}" ${s === v.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <button type="button" class="btn-secondary venda-followup" data-id="${v.id}" title="Enviar 2ª chamada por WhatsApp">📲</button>
        <button type="button" class="btn-secondary venda-reuniao" data-id="${v.id}" title="Marcar reunião no Google Calendar">📅</button>
        <button type="button" class="btn-secondary venda-edit" data-id="${v.id}">✎</button>
        <button type="button" class="btn-secondary venda-arquivar" data-id="${v.id}" title="${v.arquivada ? "Desarquivar" : "Arquivar"}">${v.arquivada ? "📤" : "📦"}</button>
        <button type="button" class="btn-danger venda-delete" data-id="${v.id}">✕</button>
      </div>
    </div>
  `;
}

// Quadro estilo Trello: uma coluna por status, cards arrastáveis entre elas
// (ou movidos pelo seletor, pra quem estiver no celular/tablet sem drag).
function renderVendasBoard() {
  const filtradas = getFilteredVendas();
  const wrap = document.getElementById("vendas-board-wrap");

  const colunas = VENDA_STATUS.map((status) => {
    const vendasDoStatus = filtradas.filter((v) => v.status === status);
    const total = vendasDoStatus.reduce((sum, v) => sum + parseValorBR(v.valor), 0);
    const cards = vendasDoStatus.length
      ? vendasDoStatus.map(vendaCardHtml).join("")
      : `<div class="vendas-board-empty">Nenhum registro aqui.</div>`;

    return `
      <div class="vendas-board-col ${statusClass(status)}" data-status="${status}">
        <div class="vendas-board-col-header">
          <span class="vendas-board-col-title"><span class="funil-etapa-dot ${statusClass(status)}"></span>${STATUS_ICONS[status] || ""} ${status}</span>
          <span class="vendas-board-col-count">${vendasDoStatus.length}</span>
        </div>
        <div class="vendas-board-col-total">${formatBRL(total)}</div>
        ${cards}
      </div>
    `;
  }).join("");

  wrap.innerHTML = `<div class="vendas-board">${colunas}</div>`;

  wrap.querySelectorAll(".venda-edit").forEach((btn) => {
    btn.addEventListener("click", () => editVenda(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-delete").forEach((btn) => {
    btn.addEventListener("click", () => removeVenda(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-arquivar").forEach((btn) => {
    btn.addEventListener("click", () => toggleArquivarVenda(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-followup").forEach((btn) => {
    btn.addEventListener("click", () => enviarSegundaChamada(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-reuniao").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalReuniao(btn.dataset.id));
  });
  wrap.querySelectorAll(".venda-card-status").forEach((select) => {
    select.addEventListener("change", () => moverVendaStatus(select.dataset.id, select.value));
  });

  wrap.querySelectorAll(".vendas-card").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.dataset.id);
      card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  wrap.querySelectorAll(".vendas-board-col").forEach((col) => {
    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", () => col.classList.remove("drag-over"));
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      moverVendaStatus(id, col.dataset.status);
    });
  });
}

function setupVendasViewToggle() {
  const btnLista = document.getElementById("vendas-view-lista");
  const btnQuadro = document.getElementById("vendas-view-quadro");
  const tableWrap = document.getElementById("vendas-table-wrap");
  const boardWrap = document.getElementById("vendas-board-wrap");

  btnLista.addEventListener("click", () => {
    btnLista.classList.add("active");
    btnQuadro.classList.remove("active");
    tableWrap.classList.remove("hidden");
    boardWrap.classList.add("hidden");
  });

  btnQuadro.addEventListener("click", () => {
    btnQuadro.classList.add("active");
    btnLista.classList.remove("active");
    boardWrap.classList.remove("hidden");
    tableWrap.classList.add("hidden");
    renderVendasBoard();
  });
}

function atualizarViewsVendas() {
  renderVendasStats(getVendasNoEscopoMes().filter((v) => !v.arquivada));
  atualizarPeriodoNota();
  renderVendasTable();
  if (!document.getElementById("vendas-board-wrap").classList.contains("hidden")) {
    renderVendasBoard();
  }
}

async function refreshVendas() {
  vendasCache = await getVendas();
  popularFiltroMes();
  atualizarViewsVendas();
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

function ativarModoVendas(mode) {
  const tab = document.querySelector(`.mode-tab[data-mode-tab="${mode}"]`);
  if (!tab) return;
  document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t === tab));
  document.querySelectorAll("[data-mode]").forEach((el) => el.classList.toggle("hidden", el.dataset.mode !== mode));
  if (mode === "carteira") refreshCarteira();
}

function setupVendasModeToggle() {
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => ativarModoVendas(tab.dataset.modeTab));
  });

  const modeParam = new URLSearchParams(window.location.search).get("mode");
  if (modeParam) ativarModoVendas(modeParam);
}

// --- Importação de contatos via Excel ---------------------------------

function normalizeHeader(str) {
  return String(str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const IMPORT_COLUMN_ALIASES = {
  nome: ["nome", "contato", "associado", "responsavel", "nomecontato", "nomedocontato", "pessoa"],
  empresa: ["empresa", "cliente", "razaosocial", "nomeempresa", "empresalead"],
  telefone: ["telefone", "whatsapp", "celular", "fone", "telefonewhatsapp", "numero"],
  email: ["email", "emails"],
  tipo: ["tipo", "tipodepessoa", "tipopessoa", "fisicaoujuridica", "pf ou pj", "pfoupj"],
  observacoes: ["observacao", "observacoes", "obs", "notas", "comentario", "comentarios"],
};

function normalizeTipoValue(raw) {
  const norm = normalizeHeader(raw);
  if (!norm) return "";
  if (norm.startsWith("pj") || norm.includes("juridica")) return TIPO_PESSOA_JURIDICA;
  if (norm.startsWith("pf") || norm.includes("fisica")) return TIPO_PESSOA_FISICA;
  return "";
}

function detectColumnMap(headerRow) {
  const map = {};
  headerRow.forEach((rawHeader, idx) => {
    const norm = normalizeHeader(rawHeader);
    Object.entries(IMPORT_COLUMN_ALIASES).forEach(([field, aliases]) => {
      if (map[field] === undefined && aliases.includes(norm)) map[field] = idx;
    });
  });
  return map;
}

// Planilhas às vezes trazem mais de um número na mesma célula, separados por
// "|" ou ";" — usa o primeiro como principal e guarda o resto nas observações.
function splitPhones(raw) {
  const parts = String(raw || "").split(/[|;]/).map((p) => p.trim()).filter(Boolean);
  return { principal: parts[0] || "", extras: parts.slice(1) };
}

function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo."));
    reader.readAsArrayBuffer(file);
  });
}

function buildImportPreview(rows) {
  if (rows.length < 2) return [];
  const colMap = detectColumnMap(rows[0]);

  return rows
    .slice(1)
    .filter((r) => r.some((cell) => String(cell).trim() !== ""))
    .map((r) => {
      const nome = colMap.nome !== undefined ? String(r[colMap.nome] || "").trim() : "";
      const empresa = colMap.empresa !== undefined ? String(r[colMap.empresa] || "").trim() : "";
      const { principal, extras } = splitPhones(colMap.telefone !== undefined ? r[colMap.telefone] : "");
      const observacoesPlanilha = colMap.observacoes !== undefined ? String(r[colMap.observacoes] || "").trim() : "";
      const observacoes = [observacoesPlanilha, extras.length ? `Outros números: ${extras.join(" | ")}` : ""]
        .filter(Boolean)
        .join(" — ");

      const tipoPlanilha = colMap.tipo !== undefined ? normalizeTipoValue(r[colMap.tipo]) : "";
      const tipo = tipoPlanilha || inferTipoContato(nome, empresa);

      return {
        nome,
        empresa,
        telefone: principal,
        email: colMap.email !== undefined ? String(r[colMap.email] || "").trim() : "",
        tipo,
        observacoes,
      };
    });
}

function renderImportPreview(rows) {
  const wrap = document.getElementById("import-preview-wrap");
  if (rows.length === 0) {
    wrap.innerHTML = "";
    return;
  }

  const validas = rows.filter((r) => r.nome || r.empresa);
  const semNome = rows.length - validas.length;

  const tableRows = rows.map((r) => `
    <tr class="${(r.nome || r.empresa) ? "" : "import-row-invalid"}">
      <td>${r.nome || "⚠️ sem nome/empresa — será ignorada"}</td>
      <td>${r.empresa || "—"}</td>
      <td>${r.tipo === TIPO_PESSOA_JURIDICA ? "🏢 PJ" : "👤 PF"}</td>
      <td>${r.telefone || "—"}</td>
      <td>${r.email || "—"}</td>
      <td>${r.observacoes || ""}</td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <p class="fixed-note">${rows.length} linha(s) lida(s) — ${validas.length} pronta(s) pra importar${semNome ? `, ${semNome} sem nome nem empresa (serão ignoradas)` : ""}.</p>
    <div class="import-preview-table-wrap">
      <table class="vendas-table">
        <thead><tr><th>Nome</th><th>Empresa</th><th>Tipo</th><th>Telefone</th><th>E-mail</th><th>Observações</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <div class="row" style="margin-top: 14px;">
      <button id="confirmar-importacao" class="btn-primary">Importar ${validas.length} contato(s)</button>
      <button id="cancelar-importacao" class="btn-secondary">Cancelar</button>
    </div>
  `;

  document.getElementById("confirmar-importacao").addEventListener("click", () => confirmImport(validas));
  document.getElementById("cancelar-importacao").addEventListener("click", () => {
    wrap.innerHTML = "";
    document.getElementById("import-file-input").value = "";
    document.getElementById("import-status").textContent = "";
  });
}

async function confirmImport(rows) {
  const status = document.getElementById("import-status");
  let ok = 0;
  for (const row of rows) {
    status.textContent = `Importando ${ok + 1}/${rows.length}: ${row.nome || row.empresa}...`;
    status.className = "pdf-status";
    try {
      await upsertContato(row, null);
      ok++;
    } catch (err) {
      console.error(err);
    }
  }
  status.textContent = `${ok} de ${rows.length} contato(s) importado(s) com sucesso.`;
  status.className = "pdf-status ok";
  document.getElementById("import-preview-wrap").innerHTML = "";
  document.getElementById("import-file-input").value = "";
  if (contatoPicker) await contatoPicker.refresh();
}

function setupImportacao() {
  document.getElementById("import-file-input").addEventListener("change", async () => {
    const input = document.getElementById("import-file-input");
    const status = document.getElementById("import-status");
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo planilha...";
    status.className = "pdf-status";
    document.getElementById("import-preview-wrap").innerHTML = "";

    try {
      const rows = await parseImportFile(file);
      const preview = buildImportPreview(rows);
      if (preview.length === 0) {
        status.textContent = "Não encontrei linhas de dados na planilha (confira se a primeira linha é o cabeçalho).";
        status.className = "pdf-status error";
        return;
      }
      status.textContent = "";
      renderImportPreview(preview);
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler a planilha. Confira se é um .xlsx/.xls/.csv válido.";
      status.className = "pdf-status error";
    }
  });
}

// --- Composer de proposta via WhatsApp ---------------------------------

let contatoPicker = null;
let contatoEditId = null;
let produtosCache = [];
let contatosCache = [];

function getCt(id) { return document.getElementById(id).value; }

function collectContatoForm() {
  return {
    nome: getCt("ct_nome"),
    empresa: getCt("ct_empresa"),
    telefone: getCt("ct_telefone"),
    email: getCt("ct_email"),
    tipo: getCt("ct_tipo"),
    observacoes: getCt("ct_observacoes"),
  };
}

function applyContatoToForm(contato) {
  document.getElementById("ct_tipo").value = contato.tipo || inferTipoContato(contato.nome, contato.empresa);
  document.getElementById("ct_nome").value = contato.nome || "";
  document.getElementById("ct_empresa").value = contato.empresa || "";
  document.getElementById("ct_telefone").value = contato.telefone || "";
  document.getElementById("ct_email").value = contato.email || "";
  document.getElementById("ct_observacoes").value = contato.observacoes || "";
}

function clearContatoForm() {
  contatoEditId = null;
  document.getElementById("ct_tipo").value = "Pessoa Física";
  document.getElementById("ct_nome").value = "";
  document.getElementById("ct_empresa").value = "";
  document.getElementById("ct_telefone").value = "";
  document.getElementById("ct_email").value = "";
  document.getElementById("ct_observacoes").value = "";
  document.getElementById("contato-select").value = "";
}

// Troca {{nome}}/{{empresa}}/{{valor}} pelos dados do contato e do valor
// (já considerando o desconto, se marcado) selecionados.
function renderMensagemTemplate(template, contato, valor) {
  return String(template || "")
    .replace(/\{\{\s*nome\s*\}\}/gi, contato.nome || contato.empresa || "")
    .replace(/\{\{\s*empresa\s*\}\}/gi, contato.empresa || "")
    .replace(/\{\{\s*valor\s*\}\}/gi, valor ? `R$ ${valor}` : "");
}

// Retorna o valor com desconto se marcado e preenchido, senão o valor cheio.
function calcularValorFinalProposta() {
  const temDesconto = document.getElementById("pp_temDesconto").checked;
  const valorDesconto = getV("pp_valorDesconto");
  const valorCheio = getV("pp_valorCheio");
  return (temDesconto && valorDesconto) ? valorDesconto : valorCheio;
}

function getSelectedProdutos() {
  const ids = Array.from(document.querySelectorAll("#produtos-checklist .produto-check:checked")).map((c) => c.value);
  return produtosCache.filter((p) => ids.includes(p.id));
}

// Com mais de um serviço marcado, junta as mensagens de cada um (já com
// nome/empresa/valor substituídos) numa proposta só, separadas em parágrafos.
function atualizarMensagemPreview() {
  const selecionados = getSelectedProdutos();
  if (selecionados.length === 0) return;
  const contato = { nome: getCt("ct_nome"), empresa: getCt("ct_empresa") };
  const valor = calcularValorFinalProposta();
  const mensagens = selecionados.map((p) => renderMensagemTemplate(p.mensagem, contato, valor));
  document.getElementById("proposta-mensagem").value = mensagens.join("\n\n");
}

function setupDescontoProposta() {
  const checkbox = document.getElementById("pp_temDesconto");
  const wrap = document.getElementById("pp_valorDescontoWrap");
  const sync = () => wrap.classList.toggle("hidden", !checkbox.checked);
  checkbox.addEventListener("change", () => { sync(); atualizarMensagemPreview(); });
  document.getElementById("pp_valorCheio").addEventListener("input", atualizarMensagemPreview);
  document.getElementById("pp_valorDesconto").addEventListener("input", atualizarMensagemPreview);
  sync();
}

function normalizePhoneForWhatsApp(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  else if ((digits.length === 12 || digits.length === 13) && !digits.startsWith("55")) digits = "55" + digits;
  return digits;
}

function buildWhatsAppLink(telefone, mensagem) {
  const digits = normalizePhoneForWhatsApp(telefone);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;
}

function contatosCacheFind(id) { return contatosCache.find((c) => c.id === id); }

// Selecionar uma empresa já cadastrada (Ficha Cadastral) preenche o mesmo
// formulário de contato — assim funciona pra cliente antigo e lead novo.
async function setupEmpresasProposta() {
  const select = document.getElementById("empresa-proposta-select");
  const search = document.getElementById("empresa-proposta-search");
  const status = document.getElementById("contato-status");

  await initEmpresaPicker(search, select, "— Selecionar empresa cadastrada —");

  select.addEventListener("change", async () => {
    if (!select.value) return;
    const empresa = await getEmpresa(select.value);
    if (!empresa) return;
    contatoEditId = null;
    document.getElementById("contato-select").value = "";
    applyContatoToForm({
      tipo: TIPO_PESSOA_JURIDICA,
      nome: empresa.administracao || empresa.socio1 || "",
      empresa: empresa.contratante || "",
      telefone: "",
      email: empresa.email || "",
      observacoes: "",
    });
    atualizarMensagemPreview();
    status.textContent = empresa.contatoPrincipal
      ? `Empresa carregada. Contato principal na ficha: ${empresa.contatoPrincipal}. Confira/preencha o telefone.`
      : "Empresa carregada. Preencha o telefone antes de enviar pelo WhatsApp.";
    status.className = "pdf-status";
  });
}

async function setupContatosProposta() {
  const select = document.getElementById("contato-select");
  const search = document.getElementById("contato-search");
  const status = document.getElementById("contato-status");

  contatoPicker = await initContatoPicker(search, select, "— Novo contato —");
  contatosCache = await getContatos();

  select.addEventListener("change", () => {
    if (!select.value) return;
    const contato = contatosCacheFind(select.value);
    if (!contato) return;
    contatoEditId = contato.id;
    applyContatoToForm(contato);
    atualizarMensagemPreview();
  });

  document.getElementById("contato-save").addEventListener("click", async () => {
    const data = collectContatoForm();
    if (!data.nome && !data.empresa) {
      status.textContent = "Informe ao menos o nome do contato ou da empresa.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      const record = await upsertContato(data, contatoEditId || select.value || null);
      await contatoPicker.refresh();
      contatosCache = await getContatos();
      select.value = record.id;
      contatoEditId = record.id;
      status.textContent = "Contato salvo.";
      status.className = "pdf-status ok";
      atualizarMensagemPreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar o contato.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("contato-new").addEventListener("click", () => {
    clearContatoForm();
    status.textContent = "";
  });

  document.getElementById("contato-delete").addEventListener("click", async () => {
    if (!select.value) {
      status.textContent = "Selecione um contato salvo para excluir.";
      status.className = "pdf-status error";
      return;
    }
    if (!confirm("Excluir este contato?")) return;
    try {
      await deleteContato(select.value);
      clearContatoForm();
      await contatoPicker.refresh();
      contatosCache = await getContatos();
      status.textContent = "Contato excluído.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao excluir o contato.";
      status.className = "pdf-status error";
    }
  });
}

function renderProdutosManageList() {
  const wrap = document.getElementById("produtos-list");
  wrap.innerHTML = produtosCache.map((p) => `
    <div class="alteracao-row" data-id="${p.id}">
      <button type="button" class="alteracao-remove" data-remove-produto="${p.id}">Remover ✕</button>
      <label>Nome do serviço
        <input type="text" class="produto-nome" value="${(p.nome || "").replace(/"/g, "&quot;")}">
      </label>
      <label>Tipo
        <select class="produto-tipo">
          <option value="Pontual" ${tipoDoProduto(p) === "Pontual" ? "selected" : ""}>Pontual (avulso)</option>
          <option value="Recorrente" ${tipoDoProduto(p) === "Recorrente" ? "selected" : ""}>Recorrente (mensal)</option>
        </select>
      </label>
      <label>Mensagem (use {{nome}} e {{empresa}})
        <textarea class="produto-mensagem" rows="4">${p.mensagem || ""}</textarea>
      </label>
      <button type="button" class="btn-secondary produto-salvar" data-save-produto="${p.id}">Salvar este serviço</button>
    </div>
  `).join("");

  wrap.querySelectorAll("[data-save-produto]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".alteracao-row");
      const nome = row.querySelector(".produto-nome").value;
      const tipo = row.querySelector(".produto-tipo").value;
      const mensagem = row.querySelector(".produto-mensagem").value;
      await upsertProduto({ nome, tipo, mensagem }, btn.dataset.saveProduto);
      await refreshProdutos();
    });
  });
  wrap.querySelectorAll("[data-remove-produto]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remover este serviço?")) return;
      await deleteProduto(btn.dataset.removeProduto);
      await refreshProdutos();
    });
  });
}

function populateVendaProdutoSelect() {
  const select = document.getElementById("v_produto");
  const atual = select.value;
  select.innerHTML = `<option value="">— Selecione (opcional) —</option>` + produtosCache.map((p) =>
    `<option value="${p.id}">${p.nome} (${tipoDoProduto(p) === "Recorrente" ? "recorrente" : "pontual"})</option>`
  ).join("");
  if (produtosCache.some((p) => p.id === atual)) select.value = atual;
}

function populateProdutosChecklist() {
  const wrap = document.getElementById("produtos-checklist");
  const checkedIds = new Set(Array.from(wrap.querySelectorAll(".produto-check:checked")).map((c) => c.value));

  wrap.innerHTML = produtosCache.map((p) => `
    <label class="checkbox">
      <input type="checkbox" class="produto-check" value="${p.id}" ${checkedIds.has(p.id) ? "checked" : ""}>
      ${p.nome}
    </label>
  `).join("");

  if (checkedIds.size === 0 && produtosCache.length > 0) {
    wrap.querySelector(".produto-check").checked = true;
  }

  wrap.querySelectorAll(".produto-check").forEach((c) => {
    c.addEventListener("change", atualizarMensagemPreview);
  });
}

async function refreshProdutos() {
  produtosCache = await getProdutos();
  populateProdutosChecklist();
  populateLoteProdutosChecklist();
  renderProdutosManageList();
  populateVendaProdutoSelect();
  atualizarMensagemPreview();
}

async function criarNovoServico() {
  await upsertProduto({ nome: "Novo serviço", mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva." }, null);
  await refreshProdutos();
}

function setupProdutos() {
  document.getElementById("add-produto").addEventListener("click", criarNovoServico);
  document.getElementById("add-produto-rapido").addEventListener("click", criarNovoServico);
}

function setupEnvioWhatsApp() {
  document.getElementById("btn-enviar-whatsapp").addEventListener("click", async () => {
    const status = document.getElementById("proposta-status");
    const contato = collectContatoForm();
    const mensagem = document.getElementById("proposta-mensagem").value;
    const selecionados = getSelectedProdutos();

    if (!contato.nome && !contato.empresa) {
      status.textContent = "Selecione ou preencha um contato antes de enviar.";
      status.className = "pdf-status error";
      return;
    }
    const link = buildWhatsAppLink(contato.telefone, mensagem);
    if (!link) {
      status.textContent = "Telefone inválido ou vazio. Preencha o telefone do contato (com DDD).";
      status.className = "pdf-status error";
      return;
    }

    // Abre o WhatsApp já, antes de qualquer await — abrir depois de uma
    // espera assíncrona corre o risco de o navegador bloquear como pop-up.
    window.open(link, "_blank");

    status.textContent = "Link do WhatsApp aberto. Registrando no Funil de Vendas...";
    status.className = "pdf-status";
    try {
      const record = await upsertContato(contato, contatoEditId || document.getElementById("contato-select").value || null);
      contatoEditId = record.id;
      if (contatoPicker) await contatoPicker.refresh();
      contatosCache = await getContatos();

      await upsertVenda({
        empresaId: null,
        contatoId: record.id,
        empresaNome: contato.empresa || contato.nome,
        contato: [contato.nome, contato.telefone].filter(Boolean).join(" - "),
        valor: calcularValorFinalProposta(),
        dataEnvio: new Date().toISOString().slice(0, 10),
        status: "Aguardando resposta",
        observacoes: `Proposta enviada via WhatsApp: ${selecionados.map((p) => p.nome).join(", ")}`,
      }, null);
      await refreshVendas();

      status.textContent = 'WhatsApp aberto e registrado no Funil de Vendas como "Aguardando resposta".';
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "WhatsApp aberto, mas houve erro ao registrar no funil.";
      status.className = "pdf-status error";
    }
  });
}


// --- Envio em lote -------------------------------------------------------
// Não existe forma de mandar mensagem no WhatsApp sem alguém clicar
// "Enviar" dentro do próprio app — isso é limitação do WhatsApp (e
// automatizar isso de verdade violaria os termos deles). O que dá pra fazer
// é deixar o clique-a-clique bem mais rápido: passa pelos contatos filtrados
// um de cada vez, mensagem já pronta, um clique abre o WhatsApp e já
// registra no funil, outro avança pro próximo.

let loteQueue = [];
let loteIndex = 0;
let loteProdutosSelecionados = [];
let loteEnviados = 0;
let lotePulados = 0;

function populateLoteProdutosChecklist() {
  const wrap = document.getElementById("lote-produtos-checklist");
  const checkedIds = new Set(Array.from(wrap.querySelectorAll(".produto-check:checked")).map((c) => c.value));

  wrap.innerHTML = produtosCache.map((p) => `
    <label class="checkbox">
      <input type="checkbox" class="produto-check" value="${p.id}" ${checkedIds.has(p.id) ? "checked" : ""}>
      ${p.nome}
    </label>
  `).join("");

  if (checkedIds.size === 0 && produtosCache.length > 0) {
    wrap.querySelector(".produto-check").checked = true;
  }
}

function getLoteSelectedProdutos() {
  const ids = Array.from(document.querySelectorAll("#lote-produtos-checklist .produto-check:checked")).map((c) => c.value);
  return produtosCache.filter((p) => ids.includes(p.id));
}

function calcularValorFinalLote() {
  const temDesconto = document.getElementById("lote-temDesconto").checked;
  const valorDesconto = getV("lote-valorDesconto");
  const valorCheio = getV("lote-valorCheio");
  return (temDesconto && valorDesconto) ? valorDesconto : valorCheio;
}

function setupLoteDesconto() {
  const checkbox = document.getElementById("lote-temDesconto");
  const wrap = document.getElementById("lote-valorDescontoWrap");
  const sync = () => wrap.classList.toggle("hidden", !checkbox.checked);
  checkbox.addEventListener("change", sync);
  sync();
}

function montarMensagemLote(contato) {
  const valor = calcularValorFinalLote();
  const mensagens = loteProdutosSelecionados.map((p) => renderMensagemTemplate(p.mensagem, contato, valor));
  return mensagens.join("\n\n");
}

function renderLoteFim() {
  document.getElementById("lote-wrap").innerHTML = `
    <div class="vendas-table-container">
      <div class="vendas-empty">
        Fila concluída. ${loteEnviados} enviado(s), ${lotePulados} pulado(s) de ${loteQueue.length} contato(s).
      </div>
    </div>
  `;
}

function renderLoteAtual() {
  const wrap = document.getElementById("lote-wrap");

  if (loteIndex >= loteQueue.length) {
    renderLoteFim();
    return;
  }

  const contato = loteQueue[loteIndex];
  const mensagem = montarMensagemLote(contato);

  wrap.innerHTML = `
    <section class="panel">
      <h2>Contato ${loteIndex + 1} de ${loteQueue.length} — ${loteEnviados} enviado(s), ${lotePulados} pulado(s)</h2>
      <div class="panel-body">
        <label>Nome
          <input type="text" id="lote-atual-nome" value="${(contato.nome || "").replace(/"/g, "&quot;")}">
        </label>
        <label>Empresa
          <input type="text" id="lote-atual-empresa" value="${(contato.empresa || "").replace(/"/g, "&quot;")}">
        </label>
        <label>Telefone (WhatsApp)
          <input type="text" id="lote-atual-telefone" value="${(contato.telefone || "").replace(/"/g, "&quot;")}" placeholder="preencha se estiver vazio">
        </label>
        <label>Mensagem
          <textarea id="lote-atual-mensagem" rows="8">${mensagem}</textarea>
        </label>
        <div class="row">
          <button id="lote-enviar" class="btn-primary">📲 Abrir no WhatsApp e marcar enviado</button>
          <button id="lote-pular" class="btn-secondary">⏭️ Pular</button>
        </div>
        <button id="lote-parar" class="btn-danger">⏹️ Parar fila</button>
        <div id="lote-status" class="pdf-status"></div>
      </div>
    </section>
  `;

  document.getElementById("lote-enviar").addEventListener("click", async () => {
    const status = document.getElementById("lote-status");
    const nome = getV("lote-atual-nome");
    const empresa = getV("lote-atual-empresa");
    const telefone = getV("lote-atual-telefone");
    const mensagemAtual = getV("lote-atual-mensagem");

    const link = buildWhatsAppLink(telefone, mensagemAtual);
    if (!link) {
      status.textContent = "Telefone inválido ou vazio. Preencha o telefone antes de enviar.";
      status.className = "pdf-status error";
      return;
    }

    // Mesma regra de sempre: abre o WhatsApp antes de qualquer await, senão
    // o navegador pode bloquear como pop-up.
    window.open(link, "_blank");

    status.textContent = "WhatsApp aberto. Registrando...";
    status.className = "pdf-status";
    try {
      const record = await upsertContato({ nome, empresa, telefone, email: contato.email || "", tipo: contato.tipo, observacoes: contato.observacoes || "" }, contato.id);
      await upsertVenda({
        empresaId: null,
        contatoId: record.id,
        empresaNome: empresa || nome,
        contato: [nome, telefone].filter(Boolean).join(" - "),
        valor: calcularValorFinalLote(),
        dataEnvio: new Date().toISOString().slice(0, 10),
        status: "Aguardando resposta",
        observacoes: `Proposta enviada via WhatsApp: ${loteProdutosSelecionados.map((p) => p.nome).join(", ")}`,
      }, null);
      loteEnviados++;
      loteIndex++;
      await refreshVendas();
      if (contatoPicker) await contatoPicker.refresh();
      contatosCache = await getContatos();
      renderLoteAtual();
    } catch (err) {
      console.error(err);
      status.textContent = "WhatsApp aberto, mas houve erro ao registrar. Clique em Pular ou tente de novo.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("lote-pular").addEventListener("click", () => {
    lotePulados++;
    loteIndex++;
    renderLoteAtual();
  });

  document.getElementById("lote-parar").addEventListener("click", () => {
    document.getElementById("lote-wrap").innerHTML = "";
  });
}

function setupLote() {
  document.getElementById("lote-iniciar").addEventListener("click", async () => {
    const status = document.getElementById("lote-filtro-status");
    loteProdutosSelecionados = getLoteSelectedProdutos();
    if (loteProdutosSelecionados.length === 0) {
      status.textContent = "Marque ao menos um serviço.";
      status.className = "pdf-status error";
      return;
    }

    const grupo = getV("lote-grupo");
    let filtrados = contatosCache;
    if (grupo === "pf") filtrados = filtrados.filter((c) => c.tipo !== TIPO_PESSOA_JURIDICA);
    if (grupo === "pj") filtrados = filtrados.filter((c) => c.tipo === TIPO_PESSOA_JURIDICA);

    if (document.getElementById("lote-pular-enviados").checked) {
      const nomesProdutos = loteProdutosSelecionados.map((p) => p.nome);
      const vendas = await getVendas();
      const idsJaEnviados = new Set(
        vendas
          .filter((v) => v.contatoId && nomesProdutos.some((nome) => (v.observacoes || "").includes(nome)))
          .map((v) => v.contatoId)
      );
      filtrados = filtrados.filter((c) => !idsJaEnviados.has(c.id));
    }

    if (filtrados.length === 0) {
      status.textContent = "Nenhum contato encontrado com esse filtro (ou todos já foram contatados sobre esse serviço).";
      status.className = "pdf-status error";
      return;
    }

    loteQueue = filtrados;
    loteIndex = 0;
    loteEnviados = 0;
    lotePulados = 0;
    status.textContent = `Fila pronta com ${filtrados.length} contato(s).`;
    status.className = "pdf-status ok";
    renderLoteAtual();
  });
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
    const status = document.getElementById("venda-status");
    try {
      const data = collectVendaForm();
      if (!data.empresaNome) {
        status.textContent = "Informe ao menos o nome da empresa/lead.";
        status.className = "pdf-status error";
        return;
      }
      status.textContent = "Salvando...";
      status.className = "pdf-status";
      await upsertVenda(data, vendaEditId);
      status.textContent = "Registro salvo.";
      status.className = "pdf-status ok";
      clearVendaForm();
      await refreshVendas();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar o registro: " + (err && err.message ? err.message : "erro desconhecido. Confira sua conexão e tente de novo.");
      status.className = "pdf-status error";
    }
  });

  document.getElementById("venda-new").addEventListener("click", () => {
    clearVendaForm();
    document.getElementById("venda-status").textContent = "";
  });

  const rerenderVisiveis = () => {
    renderVendasTable();
    if (!document.getElementById("vendas-board-wrap").classList.contains("hidden")) {
      renderVendasBoard();
    }
  };
  document.getElementById("vendas-search").addEventListener("input", rerenderVisiveis);
  document.getElementById("vendas-filtro-status").addEventListener("change", rerenderVisiveis);
  document.getElementById("vendas-mostrar-arquivadas").addEventListener("change", rerenderVisiveis);
  document.getElementById("vendas-filtro-mes").addEventListener("change", atualizarViewsVendas);

  document.getElementById("v_status").addEventListener("change", atualizarVisibilidadeHandoff);
}

// --- Carteira de Clientes ---------------------------------------------
// Visão por empresa (não por negociação): status do relacionamento, plano
// de contabilidade atual (vem da Ficha Cadastral) e o histórico de vendas
// já fechadas com aquela empresa — reaproveita vendasCache, então só fica
// em dia depois que o Funil já carregou pelo menos uma vez.

let carteiraEmpresasCache = [];

function totalHistoricoEmpresa(empresaId) {
  return vendasCache
    .filter((v) => v.empresaId === empresaId && v.status === "Fechado/Ganho")
    .reduce((sum, v) => sum + parseValorBR(v.valor), 0);
}

function historicoEmpresaHtml(empresaId) {
  const vendasEmpresa = vendasCache
    .filter((v) => v.empresaId === empresaId && v.status === "Fechado/Ganho")
    .sort((a, b) => (b.dataEnvio || "").localeCompare(a.dataEnvio || ""));

  if (vendasEmpresa.length === 0) {
    return `<div class="carteira-historico-vazio">Nenhuma venda fechada registrada ainda.</div>`;
  }

  return vendasEmpresa.map((v) => `
    <div class="carteira-historico-item">
      <span class="carteira-historico-data">${v.dataEnvio ? new Date(v.dataEnvio + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</span>
      <span class="carteira-historico-servico">${v.produtoNome || "Serviço não especificado"}</span>
      <span class="carteira-historico-valor">${v.valor ? "R$ " + v.valor : "—"}</span>
      ${v.observacoes ? `<span class="carteira-historico-motivo">${v.observacoes}</span>` : ""}
    </div>
  `).join("");
}

function statusClienteClass(status) {
  switch (status) {
    case "Lead": return "cliente-lead";
    case "Em negociação": return "cliente-negociacao";
    case "Cliente Ativo": return "cliente-ativo";
    case "Inativo/Cancelado": return "cliente-inativo";
    default: return "cliente-lead";
  }
}

function carteiraCardHtml(empresa) {
  const total = totalHistoricoEmpresa(empresa.id);
  const plano = empresa.contabil || "—";
  const statusAtual = empresa.statusCliente || "Lead";
  return `
    <div class="carteira-card ${statusClienteClass(statusAtual)}" data-id="${empresa.id}">
      <div class="carteira-card-header">
        <div class="carteira-card-avatar">${iniciais(empresa.contratante)}</div>
        <div class="carteira-card-heading">
          <div class="carteira-card-nome">${empresa.contratante || "(sem nome)"}</div>
          <div class="carteira-card-cnpj">${empresa.cnpj || "—"}</div>
        </div>
      </div>
      <div class="carteira-card-body">
        <label class="carteira-status-label">Status
          <select class="carteira-status-select" data-id="${empresa.id}">
            ${STATUS_CLIENTE_OPTS.map((s) => `<option value="${s}" ${s === statusAtual ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </label>
        <div class="carteira-card-info">
          <span class="carteira-plano-badge">📋 Plano: ${plano}</span>
          <span class="carteira-total-badge">💰 Total já vendido: ${formatBRL(total)}</span>
        </div>
      </div>
      <button type="button" class="btn-secondary carteira-toggle-historico" data-id="${empresa.id}">📜 Ver histórico de vendas ▾</button>
      <div class="carteira-historico hidden" id="carteira-historico-${empresa.id}">
        ${historicoEmpresaHtml(empresa.id)}
      </div>
    </div>
  `;
}

function getFilteredCarteira() {
  const search = document.getElementById("carteira-search").value.trim().toLowerCase();
  const filtroStatus = document.getElementById("carteira-filtro-status").value;
  return carteiraEmpresasCache.filter((e) => {
    const matchStatus = !filtroStatus || (e.statusCliente || "Lead") === filtroStatus;
    const matchSearch = !search ||
      (e.contratante || "").toLowerCase().includes(search) ||
      (e.cnpj || "").toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });
}

function renderCarteira() {
  const wrap = document.getElementById("carteira-wrap");
  const filtradas = getFilteredCarteira();

  if (filtradas.length === 0) {
    wrap.innerHTML = `<div class="vendas-empty">Nenhuma empresa cadastrada encontrada.</div>`;
    return;
  }

  const ordenadas = filtradas.slice().sort((a, b) => (a.contratante || "").localeCompare(b.contratante || ""));
  wrap.innerHTML = `<div class="carteira-grid">${ordenadas.map(carteiraCardHtml).join("")}</div>`;

  wrap.querySelectorAll(".carteira-status-select").forEach((select) => {
    select.addEventListener("change", async () => {
      const id = select.dataset.id;
      try {
        await setEmpresaStatusCliente(id, select.value);
        const empresa = carteiraEmpresasCache.find((e) => e.id === id);
        if (empresa) empresa.statusCliente = select.value;
      } catch (err) {
        console.error(err);
        alert("Erro ao atualizar o status do cliente.");
      }
    });
  });

  wrap.querySelectorAll(".carteira-toggle-historico").forEach((btn) => {
    btn.addEventListener("click", () => {
      const historico = document.getElementById(`carteira-historico-${btn.dataset.id}`);
      historico.classList.toggle("hidden");
      btn.textContent = historico.classList.contains("hidden") ? "📜 Ver histórico de vendas ▾" : "📜 Ocultar histórico ▴";
    });
  });
}

async function refreshCarteira() {
  carteiraEmpresasCache = await getEmpresas();
  renderCarteira();
}

function setupCarteira() {
  const filtroSelect = document.getElementById("carteira-filtro-status");
  STATUS_CLIENTE_OPTS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    filtroSelect.appendChild(opt);
  });

  document.getElementById("carteira-search").addEventListener("input", renderCarteira);
  filtroSelect.addEventListener("change", renderCarteira);
}

// --- Anotações livres -----------------------------------------------------

let notasCache = [];
let notaEditId = null;

function formatNotaData(nota) {
  const ms = nota.updatedAtMs || 0;
  if (!ms) return "";
  return new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function notaCardHtml(n) {
  const cartaoBtn = n.cartaoVendaId
    ? `<button type="button" class="btn-secondary nota-cartao" data-id="${n.id}" disabled>✅ Já no funil</button>`
    : `<button type="button" class="btn-secondary nota-cartao" data-id="${n.id}">📌 Gerar cartão</button>`;
  return `
    <div class="nota-card" data-id="${n.id}">
      ${n.titulo ? `<div class="nota-card-titulo">${escapeHtmlVendas(n.titulo)}</div>` : ""}
      <div class="nota-card-texto">${escapeHtmlVendas(n.texto || "").replace(/\n/g, "<br>")}</div>
      <div class="nota-card-footer">
        <span class="nota-card-data">${formatNotaData(n)}</span>
        <div class="vendas-row-actions">
          <button type="button" class="btn-secondary nota-agenda" data-id="${n.id}">📅 Agenda</button>
          ${cartaoBtn}
          <button type="button" class="btn-secondary nota-edit" data-id="${n.id}">Editar</button>
          <button type="button" class="btn-danger nota-delete" data-id="${n.id}">Excluir</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHtmlVendas(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderNotasList() {
  const search = document.getElementById("notas-search").value.trim().toLowerCase();
  const filtradas = search
    ? notasCache.filter((n) =>
        (n.titulo || "").toLowerCase().includes(search) || (n.texto || "").toLowerCase().includes(search)
      )
    : notasCache;

  const wrap = document.getElementById("notas-list-wrap");
  if (filtradas.length === 0) {
    wrap.innerHTML = `<div class="vendas-table-container"><div class="vendas-empty">Nenhuma anotação ainda.</div></div>`;
    return;
  }

  wrap.innerHTML = `<div class="notas-grid">${filtradas.map(notaCardHtml).join("")}</div>`;

  wrap.querySelectorAll(".nota-edit").forEach((btn) => {
    btn.addEventListener("click", () => editNota(btn.dataset.id));
  });
  wrap.querySelectorAll(".nota-delete").forEach((btn) => {
    btn.addEventListener("click", () => removeNota(btn.dataset.id));
  });
  wrap.querySelectorAll(".nota-agenda").forEach((btn) => {
    btn.addEventListener("click", () => abrirModalReuniaoDeNota(btn.dataset.id));
  });
  wrap.querySelectorAll(".nota-cartao:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => gerarCartaoDoNota(btn.dataset.id));
  });
}

async function gerarCartaoDoNota(id) {
  const nota = notasCache.find((n) => n.id === id);
  if (!nota) return;
  if (nota.cartaoVendaId) return;
  try {
    const venda = await upsertVenda({
      empresaNome: nota.titulo || "Anotação sem título",
      contato: "",
      valor: "",
      dataEnvio: new Date().toISOString().slice(0, 10),
      status: "Aguardando resposta",
      observacoes: nota.texto || "",
    });
    await upsertNota(Object.assign({}, nota, { cartaoVendaId: venda.id }), id);
    await refreshNotas();
    await refreshVendas();
    alert("Cartão criado no funil de vendas.");
  } catch (err) {
    console.error(err);
    alert("Erro ao gerar o cartão no funil de vendas.");
  }
}

async function refreshNotas() {
  notasCache = await getNotas();
  renderNotasList();
}

function clearNotaForm() {
  notaEditId = null;
  document.getElementById("nota-titulo").value = "";
  document.getElementById("nota-texto").value = "";
}

function editNota(id) {
  const nota = notasCache.find((n) => n.id === id);
  if (!nota) return;
  notaEditId = id;
  document.getElementById("nota-titulo").value = nota.titulo || "";
  document.getElementById("nota-texto").value = nota.texto || "";
  document.getElementById("nota-status").textContent = "Editando anotação. Altere e clique em Salvar.";
  document.getElementById("nota-status").className = "pdf-status";
}

async function removeNota(id) {
  if (!confirm("Excluir esta anotação?")) return;
  try {
    await deleteNota(id);
    if (notaEditId === id) clearNotaForm();
    await refreshNotas();
  } catch (err) {
    console.error(err);
    alert("Erro ao excluir a anotação.");
  }
}

function setupNotas() {
  document.getElementById("nota-salvar").addEventListener("click", async () => {
    const status = document.getElementById("nota-status");
    const titulo = document.getElementById("nota-titulo").value;
    const texto = document.getElementById("nota-texto").value;
    if (!titulo && !texto) {
      status.textContent = "Escreva algo antes de salvar.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      await upsertNota({ titulo, texto }, notaEditId);
      status.textContent = "Anotação salva.";
      status.className = "pdf-status ok";
      clearNotaForm();
      await refreshNotas();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar a anotação.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("nota-nova").addEventListener("click", () => {
    clearNotaForm();
    document.getElementById("nota-status").textContent = "";
  });

  document.getElementById("notas-search").addEventListener("input", renderNotasList);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("v_dataEnvio").value = new Date().toISOString().slice(0, 10);
  setupVendasModeToggle();
  setupVendasViewToggle();
  setupReuniaoModal();
  setupImportacao();
  setupEmpresasVendas();
  setupVendaActions();
  setupMetaMensal();
  setupCarteira();
  (async () => {
    metaMensalCache = await getMetaMensal();
    await refreshVendas();
  })();

  setupEmpresasProposta();
  setupContatosProposta();
  setupDescontoProposta();
  refreshProdutos();
  setupProdutos();
  setupEnvioWhatsApp();

  setupLoteDesconto();
  setupLote();

  setupNotas();
  refreshNotas();
});
