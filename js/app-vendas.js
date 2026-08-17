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
  observacoes: ["observacao", "observacoes", "obs", "notas", "comentario", "comentarios"],
};

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

      return {
        nome,
        empresa,
        telefone: principal,
        email: colMap.email !== undefined ? String(r[colMap.email] || "").trim() : "",
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
      <td>${r.telefone || "—"}</td>
      <td>${r.email || "—"}</td>
      <td>${r.observacoes || ""}</td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <p class="fixed-note">${rows.length} linha(s) lida(s) — ${validas.length} pronta(s) pra importar${semNome ? `, ${semNome} sem nome nem empresa (serão ignoradas)` : ""}.</p>
    <div class="import-preview-table-wrap">
      <table class="vendas-table">
        <thead><tr><th>Nome</th><th>Empresa</th><th>Telefone</th><th>E-mail</th><th>Observações</th></tr></thead>
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
    observacoes: getCt("ct_observacoes"),
  };
}

function applyContatoToForm(contato) {
  document.getElementById("ct_nome").value = contato.nome || "";
  document.getElementById("ct_empresa").value = contato.empresa || "";
  document.getElementById("ct_telefone").value = contato.telefone || "";
  document.getElementById("ct_email").value = contato.email || "";
  document.getElementById("ct_observacoes").value = contato.observacoes || "";
}

function clearContatoForm() {
  contatoEditId = null;
  document.getElementById("ct_nome").value = "";
  document.getElementById("ct_empresa").value = "";
  document.getElementById("ct_telefone").value = "";
  document.getElementById("ct_email").value = "";
  document.getElementById("ct_observacoes").value = "";
  document.getElementById("contato-select").value = "";
}

// Troca {{nome}}/{{empresa}} pelos dados do contato selecionado.
function renderMensagemTemplate(template, contato) {
  return String(template || "")
    .replace(/\{\{\s*nome\s*\}\}/gi, contato.nome || contato.empresa || "")
    .replace(/\{\{\s*empresa\s*\}\}/gi, contato.empresa || "");
}

function atualizarMensagemPreview() {
  const produto = produtosCache.find((p) => p.id === document.getElementById("produto-select").value);
  if (!produto) return;
  const contato = { nome: getCt("ct_nome"), empresa: getCt("ct_empresa") };
  document.getElementById("proposta-mensagem").value = renderMensagemTemplate(produto.mensagem, contato);
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

function populateProdutoSelect() {
  const select = document.getElementById("produto-select");
  const current = select.value;
  select.innerHTML = produtosCache.map((p) => `<option value="${p.id}">${p.nome}</option>`).join("");
  if (produtosCache.some((p) => p.id === current)) select.value = current;
}

async function refreshProdutos() {
  produtosCache = await getProdutos();
  populateProdutoSelect();
  renderProdutosManageList();
  atualizarMensagemPreview();
}

function setupProdutos() {
  document.getElementById("produto-select").addEventListener("change", atualizarMensagemPreview);
  document.getElementById("add-produto").addEventListener("click", async () => {
    await upsertProduto({ nome: "Novo serviço", mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva." }, null);
    await refreshProdutos();
  });
}

function setupEnvioWhatsApp() {
  document.getElementById("btn-enviar-whatsapp").addEventListener("click", async () => {
    const status = document.getElementById("proposta-status");
    const contato = collectContatoForm();
    const mensagem = document.getElementById("proposta-mensagem").value;
    const produto = produtosCache.find((p) => p.id === document.getElementById("produto-select").value);

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
        empresaNome: contato.empresa || contato.nome,
        contato: [contato.nome, contato.telefone].filter(Boolean).join(" - "),
        valor: "",
        dataEnvio: new Date().toISOString().slice(0, 10),
        status: "Aguardando resposta",
        observacoes: `Proposta enviada via WhatsApp: ${produto ? produto.nome : ""}`,
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
  setupVendasModeToggle();
  setupImportacao();
  setupEmpresasVendas();
  setupVendaActions();
  refreshVendas();

  setupContatosProposta();
  refreshProdutos();
  setupProdutos();
  setupEnvioWhatsApp();
});
