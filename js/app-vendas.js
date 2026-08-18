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
    case "Em negociação": return "status-negociacao";
    case "Analisando proposta": return "status-analisando-proposta";
    case "Analisando contrato": return "status-analisando-contrato";
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

const VENDA_STATUS_FINAIS = ["Fechado/Ganho", "Recusado/Perdido"];

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
    <div class="vendas-stat-card">
      <div class="vendas-stat-label">${s}</div>
      <div class="vendas-stat-value">${porStatus[s].count}</div>
      <div class="vendas-stat-sub">${formatBRL(porStatus[s].valor)}</div>
    </div>
  `).join("");

  const emAbertoHtml = `
    <div class="vendas-stat-card">
      <div class="vendas-stat-label">Pipeline em aberto</div>
      <div class="vendas-stat-value">${formatBRL(emAberto)}</div>
      <div class="vendas-stat-sub">tudo que ainda não fechou nem foi perdido</div>
    </div>
  `;

  document.getElementById("vendas-stats").innerHTML = cardsHtml + emAbertoHtml;
}

function getFilteredVendas() {
  const search = document.getElementById("vendas-search").value.trim().toLowerCase();
  const filtroStatus = document.getElementById("vendas-filtro-status").value;

  return vendasCache.filter((v) => {
    const matchStatus = !filtroStatus || v.status === filtroStatus;
    const matchSearch = !search ||
      (v.empresaNome || "").toLowerCase().includes(search) ||
      (v.contato || "").toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });
}

function renderVendasTable() {
  const filtradas = getFilteredVendas();
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
        <button type="button" class="btn-secondary venda-followup" data-id="${v.id}" title="Enviar 2ª chamada por WhatsApp">📲 2ª chamada</button>
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
  wrap.querySelectorAll(".venda-followup").forEach((btn) => {
    btn.addEventListener("click", () => enviarSegundaChamada(btn.dataset.id));
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
    <div class="vendas-card" draggable="true" data-id="${v.id}">
      <div class="vendas-card-empresa">${v.empresaNome || "(sem nome)"}</div>
      <div class="vendas-card-contato">${v.contato || "—"}</div>
      ${v.valor ? `<div class="vendas-card-valor">R$ ${v.valor}</div>` : ""}
      ${v.observacoes ? `<div class="vendas-card-obs">${v.observacoes}</div>` : ""}
      <div class="vendas-card-actions">
        <select class="venda-card-status" data-id="${v.id}">
          ${VENDA_STATUS.map((s) => `<option value="${s}" ${s === v.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
        <button type="button" class="btn-secondary venda-followup" data-id="${v.id}" title="Enviar 2ª chamada por WhatsApp">📲</button>
        <button type="button" class="btn-secondary venda-edit" data-id="${v.id}">✎</button>
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
      <div class="vendas-board-col" data-status="${status}">
        <div class="vendas-board-col-header">
          <span>${status}</span>
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
  wrap.querySelectorAll(".venda-followup").forEach((btn) => {
    btn.addEventListener("click", () => enviarSegundaChamada(btn.dataset.id));
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

async function refreshVendas() {
  vendasCache = await getVendas();
  renderVendasStats(vendasCache);
  renderVendasTable();
  if (!document.getElementById("vendas-board-wrap").classList.contains("hidden")) {
    renderVendasBoard();
  }
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

function setupVendasModeToggle() {
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.modeTab;
      document.querySelectorAll(".mode-tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll("[data-mode]").forEach((el) => el.classList.toggle("hidden", el.dataset.mode !== mode));
    });
  });
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
      const mensagem = row.querySelector(".produto-mensagem").value;
      await upsertProduto({ nome, mensagem }, btn.dataset.saveProduto);
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

  const rerenderVisiveis = () => {
    renderVendasTable();
    if (!document.getElementById("vendas-board-wrap").classList.contains("hidden")) {
      renderVendasBoard();
    }
  };
  document.getElementById("vendas-search").addEventListener("input", rerenderVisiveis);
  document.getElementById("vendas-filtro-status").addEventListener("change", rerenderVisiveis);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("v_dataEnvio").value = new Date().toISOString().slice(0, 10);
  setupVendasModeToggle();
  setupVendasViewToggle();
  setupImportacao();
  setupEmpresasVendas();
  setupVendaActions();
  refreshVendas();

  setupEmpresasProposta();
  setupContatosProposta();
  setupDescontoProposta();
  refreshProdutos();
  setupProdutos();
  setupEnvioWhatsApp();

  setupLoteDesconto();
  setupLote();
});
