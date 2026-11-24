// Aba "Pendências Hubstron" dentro de Vendas.
//
// Lê a planilha de clientes exportada do Hubstron (procuração, certificado
// digital e contatos), calcula o que está pendente em cada empresa, mostra
// tudo agrupado por prioridade e, ao clicar numa empresa, monta a mensagem
// pronta para mandar ao cliente (WhatsApp, e-mail ou copiar). Cada empresa
// tem um status de acompanhamento e cada pendência pode ser marcada como
// resolvida — quando todas são resolvidas, a empresa fecha sozinha.
//
// Depende de: pendencias-hubstron-store.js, e de funções globais do
// app-vendas.js (parseImportFile, normalizeHeader, buildWhatsAppLink).

const PH_STATUS = ["Pendente", "Mensagem enviada", "Aguardando cliente", "Resolvido"];
const PH_STATUS_CLASSE = {
  "Pendente": "ph-st-pendente",
  "Mensagem enviada": "ph-st-enviada",
  "Aguardando cliente": "ph-st-aguardando",
  "Resolvido": "ph-st-resolvido",
};
const PH_PRIORIDADES = {
  1: { label: "Urgente", icone: "🔴", classe: "ph-p1" },
  2: { label: "Alta", icone: "🟡", classe: "ph-p2" },
  3: { label: "Média", icone: "🔵", classe: "ph-p3" },
};
const PH_ASSINATURA = "AEA Contabilidade";

let phCache = [];
let phSelecionadoId = null;
let phCarregado = false;

// --- Utilidades -------------------------------------------------------------

function phEsc(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function phLimpo(v) {
  const s = String(v == null ? "" : v).trim();
  return /^n\/?a$/i.test(s) || s === "-" ? "" : s;
}

function phHoje() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function phParseDataBR(str) {
  const m = String(str || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
}

function phFormatData(d) {
  return d.toLocaleDateString("pt-BR");
}

function phDiasAte(d) {
  return Math.round((d - phHoje()) / 86400000);
}

function phDigitos(s) {
  return String(s || "").replace(/\D/g, "");
}

function phPrimeiroNome(contato) {
  const base = String(contato || "").split(" - ")[0].trim().split(/\s+/)[0] || "";
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
}

// --- Regras de pendência ----------------------------------------------------

// Devolve a lista de pendências da empresa (independente do que já foi
// marcado como resolvido). Cada item tem uma chave estável ("cert"/"proc"),
// prioridade (1 urgente, 2 alta, 3 média), um rótulo curto e o texto que vai
// na mensagem para o cliente.
function phCalcularItens(emp) {
  const itens = [];
  const cert = String(emp.certificado || "").trim();
  const proc = String(emp.procuracao || "").trim();
  const certData = phParseDataBR(cert);
  const certNorm = normalizeHeader(cert);

  if (/^vencido/i.test(cert) && certData) {
    itens.push({ chave: "cert", tipo: "cert-vencido", prioridade: 1, ordem: phDiasAte(certData),
      rotulo: `Certificado vencido em ${phFormatData(certData)}`,
      texto: `o certificado digital venceu em ${phFormatData(certData)} e precisa ser renovado` });
  } else if (certData && phDiasAte(certData) < 0) {
    itens.push({ chave: "cert", tipo: "cert-vencido", prioridade: 1, ordem: phDiasAte(certData),
      rotulo: `Certificado vencido em ${phFormatData(certData)}`,
      texto: `o certificado digital venceu em ${phFormatData(certData)} e precisa ser renovado` });
  } else if (certData && phDiasAte(certData) <= 30) {
    const dias = phDiasAte(certData);
    itens.push({ chave: "cert", tipo: "cert-vencendo", prioridade: 1, ordem: dias,
      rotulo: dias === 0 ? "Certificado vence HOJE" : `Certificado vence em ${phFormatData(certData)} (${dias} dia${dias === 1 ? "" : "s"})`,
      texto: dias === 0
        ? `o certificado digital vence HOJE (${phFormatData(certData)}) e precisa ser renovado`
        : `o certificado digital vence em ${phFormatData(certData)} e precisa ser renovado` });
  } else if (certData && phDiasAte(certData) <= 90) {
    const dias = phDiasAte(certData);
    itens.push({ chave: "cert", tipo: "cert-90", prioridade: 3, ordem: dias,
      rotulo: `Certificado vence em ${phFormatData(certData)} (${dias} dias)`,
      texto: `o certificado digital vence em ${phFormatData(certData)}, já vale programar a renovação` });
  } else if (certNorm.includes("naointegrado")) {
    itens.push({ chave: "cert", tipo: "cert-nao-integrado", prioridade: 2, ordem: 999,
      rotulo: "Certificado não integrado",
      texto: "precisamos que nos envie o certificado digital (arquivo A1 + senha) para integrarmos ao nosso sistema" });
  } else if (certNorm.includes("desativar") || certNorm.includes("etapas")) {
    itens.push({ chave: "cert", tipo: "cert-2etapas", prioridade: 2, ordem: 999,
      rotulo: "Certificado: desativar 2 etapas",
      texto: "precisamos que desative a verificação em 2 etapas para concluirmos a integração do certificado digital" });
  }

  const procData = phParseDataBR(proc);
  const procNorm = normalizeHeader(proc);
  if (procNorm.startsWith("cancelada")) {
    itens.push({ chave: "proc", tipo: "proc-cancelada", prioridade: 1, ordem: -1,
      rotulo: "Procuração cancelada",
      texto: "a procuração eletrônica (e-CAC) foi cancelada e precisa ser refeita para a nossa contabilidade" });
  } else if (procNorm.startsWith("expirada") || (procData && phDiasAte(procData) < 0)) {
    itens.push({ chave: "proc", tipo: "proc-expirada", prioridade: 1, ordem: procData ? phDiasAte(procData) : -1,
      rotulo: procData ? `Procuração expirada em ${phFormatData(procData)}` : "Procuração expirada",
      texto: `a procuração eletrônica (e-CAC) expirou${procData ? " em " + phFormatData(procData) : ""} e precisa ser renovada` });
  } else if (procNorm.startsWith("semproc")) {
    itens.push({ chave: "proc", tipo: "proc-sem", prioridade: 2, ordem: 999,
      rotulo: "Sem procuração",
      texto: "precisamos da procuração eletrônica no e-CAC para a nossa contabilidade" });
  } else if (procData && phDiasAte(procData) <= 90) {
    const dias = phDiasAte(procData);
    itens.push({ chave: "proc", tipo: "proc-vencendo", prioridade: dias <= 30 ? 1 : 3, ordem: dias,
      rotulo: `Procuração vence em ${phFormatData(procData)} (${dias} dias)`,
      texto: `a procuração eletrônica (e-CAC) vence em ${phFormatData(procData)} e precisa ser renovada` });
  }

  return itens;
}

const PH_TIPOS_FILTRO = [
  ["cert-vencido", "Certificado vencido"],
  ["cert-vencendo", "Certificado vence em até 30 dias"],
  ["cert-90", "Certificado vence em 31–90 dias"],
  ["cert-nao-integrado", "Certificado não integrado"],
  ["cert-2etapas", "Certificado: desativar 2 etapas"],
  ["proc-cancelada", "Procuração cancelada"],
  ["proc-expirada", "Procuração expirada"],
  ["proc-vencendo", "Procuração vencendo"],
  ["proc-sem", "Sem procuração"],
];

// Junta dados salvos + regras: itens em aberto, prioridade, contato principal.
function phEnriquecer(emp) {
  const resolvidos = emp.itensResolvidos || [];
  const itens = phCalcularItens(emp).map((it) => Object.assign({}, it, { resolvido: resolvidos.includes(it.chave) }));
  const abertos = itens.filter((it) => !it.resolvido);
  const contatos = (emp.contatos || []).filter((c) => c.nome || c.telefone || c.email);
  const principal = contatos[0] || { nome: "", telefone: "", email: "" };
  const status = emp.status || "Pendente";
  const fechada = status === "Resolvido" || (itens.length > 0 && abertos.length === 0);
  const telDig = phDigitos(principal.telefone);
  return Object.assign({}, emp, {
    itens,
    abertos,
    contatos,
    principal,
    status: fechada ? "Resolvido" : status,
    fechada,
    temPendencia: itens.length > 0,
    semContato: !contatos.some((c) => c.telefone || c.email),
    prioridade: abertos.length ? Math.min(...abertos.map((i) => i.prioridade)) : (itens.length ? Math.min(...itens.map((i) => i.prioridade)) : 9),
    ordem: abertos.length ? Math.min(...abertos.map((i) => i.ordem)) : 999,
    grupo: telDig ? "tel:" + telDig.slice(-8) : (principal.nome ? "nome:" + normalizeHeader(principal.nome) : "id:" + emp.id),
  });
}

function phEmpresas() {
  return phCache.map(phEnriquecer);
}

// --- Importação da planilha -------------------------------------------------

function phColuna(header, nomes) {
  const norm = header.map(normalizeHeader);
  for (const n of nomes) {
    const idx = norm.indexOf(n);
    if (idx !== -1) return idx;
  }
  return -1;
}

function phLinhasParaEmpresas(rows) {
  if (!rows || rows.length < 2) throw new Error("A planilha está vazia.");
  const h = rows[0];
  const col = {
    nome: phColuna(h, ["razaosocialnome", "razaosocial", "nome", "empresa"]),
    cnpj: phColuna(h, ["cnpjcpf", "cnpj", "cpfcnpj", "documento"]),
    procuracao: phColuna(h, ["procuracao"]),
    certificado: phColuna(h, ["certificadodigital", "certificado"]),
    regime: phColuna(h, ["regimetributario", "regime"]),
    cidade: phColuna(h, ["cidade", "municipio"]),
    estado: phColuna(h, ["estado", "uf"]),
  };
  if (col.nome === -1 || col.cnpj === -1 || (col.procuracao === -1 && col.certificado === -1)) {
    throw new Error("Não reconheci as colunas. A planilha precisa ter: Razão Social, CNPJ, Procuração e Certificado Digital (exportação de clientes do Hubstron).");
  }
  const contatoCols = [1, 2, 3].map((n) => ({
    nome: phColuna(h, ["nome" + n]),
    telefone: phColuna(h, ["telefone" + n]),
    email: phColuna(h, ["email" + n]),
  }));
  const cel = (row, idx) => (idx === -1 ? "" : phLimpo(row[idx]));

  const empresas = [];
  rows.slice(1).forEach((row) => {
    const nome = cel(row, col.nome);
    const cnpj = cel(row, col.cnpj);
    const id = phDigitos(cnpj);
    if (!nome || !id) return;
    // O Hubstron exporta Nome N / Telefone N / E-mail N, mas nem sempre o
    // telefone N é do Nome N — o primeiro nome preenchido vira o principal.
    const contatos = contatoCols
      .map((c) => ({ nome: cel(row, c.nome), telefone: cel(row, c.telefone), email: cel(row, c.email) }))
      .filter((c) => c.nome || c.telefone || c.email);
    empresas.push({
      id,
      nome: nome.replace(/\s+/g, " "),
      cnpj,
      procuracao: cel(row, col.procuracao),
      certificado: cel(row, col.certificado),
      regime: cel(row, col.regime),
      cidade: cel(row, col.cidade),
      estado: cel(row, col.estado),
      contatos,
    });
  });
  if (!empresas.length) throw new Error("Nenhuma empresa com Razão Social e CNPJ encontrada na planilha.");
  return empresas;
}

async function phImportarArquivo(file) {
  const status = document.getElementById("ph-import-status");
  status.textContent = "Lendo planilha...";
  status.className = "pdf-status";
  try {
    const rows = await parseImportFile(file);
    const novas = phLinhasParaEmpresas(rows);
    const existentes = new Map(phCache.map((e) => [e.id, e]));
    const agora = Date.now();
    let mudaram = 0;

    await Promise.all(novas.map((emp) => {
      const antiga = existentes.get(emp.id);
      const record = Object.assign({}, emp, { importadoEmMs: agora });
      delete record.id;
      // Se a situação do certificado ou da procuração mudou no Hubstron, o
      // acompanhamento anterior não vale mais: volta para "Pendente".
      if (!antiga || antiga.certificado !== emp.certificado || antiga.procuracao !== emp.procuracao) {
        if (antiga) mudaram++;
        Object.assign(record, { status: "Pendente", itensResolvidos: [] });
      }
      return updatePendenciaHubstron(emp.id, record);
    }));

    const idsNovos = new Set(novas.map((e) => e.id));
    const sairam = phCache.filter((e) => !idsNovos.has(e.id));
    if (sairam.length && confirm(`${sairam.length} empresa(s) que estavam na lista não aparecem nesta planilha. Remover da lista de pendências?`)) {
      await Promise.all(sairam.map((e) => deletePendenciaHubstron(e.id)));
    }

    await refreshPendenciasHubstron(true);
    const comPend = phEmpresas().filter((e) => e.temPendencia).length;
    status.textContent = `✅ ${novas.length} empresas importadas — ${comPend} com pendência.` +
      (mudaram ? ` ${mudaram} tiveram a situação alterada e voltaram para "Pendente".` : "");
    status.className = "pdf-status ok";
  } catch (err) {
    console.error(err);
    status.textContent = err.message || "Erro ao importar a planilha.";
    status.className = "pdf-status error";
  }
}

// --- Mensagem ---------------------------------------------------------------

function phMembrosDoGrupo(emp, todas) {
  return todas.filter((e) => e.grupo === emp.grupo && e.abertos.length && !e.fechada);
}

function phMontarMensagem(empresas, contatoNome) {
  const nome = phPrimeiroNome(contatoNome);
  const linhas = empresas.map((e) =>
    `*${e.nome}* (CNPJ ${e.cnpj}): ${e.abertos.map((i) => i.texto).join("; ")}.`
  ).join("\n\n");
  const plural = empresas.reduce((n, e) => n + e.abertos.length, 0) > 1;
  return `Olá${nome ? ", " + nome : ""}! Tudo bem? Aqui é da ${PH_ASSINATURA}. ` +
    `Estamos fazendo uma revisão cadastral e identificamos ${plural ? "algumas pendências" : "uma pendência"}:\n\n` +
    `${linhas}\n\nPode nos ajudar com isso? Qualquer dúvida estamos à disposição. Obrigado!`;
}

// --- Renderização da lista --------------------------------------------------

function phStatCard(icone, label, valor, sub, classe) {
  return `
    <div class="vendas-stat-card ${classe || ""}">
      <div class="vendas-stat-icon">${icone}</div>
      <div class="vendas-stat-body">
        <div class="vendas-stat-label">${label}</div>
        <div class="vendas-stat-value">${valor}</div>
        ${sub ? `<div class="vendas-stat-sub">${sub}</div>` : ""}
      </div>
    </div>`;
}

function phRenderStats(todas) {
  const wrap = document.getElementById("ph-stats");
  const comPend = todas.filter((e) => e.temPendencia);
  const abertas = comPend.filter((e) => !e.fechada);
  const fechadas = comPend.length - abertas.length;
  const porPrio = (p) => abertas.filter((e) => e.prioridade === p).length;
  const enviadas = abertas.filter((e) => e.status !== "Pendente").length;
  const pct = comPend.length ? Math.round((fechadas / comPend.length) * 100) : 0;

  wrap.innerHTML = `
    <div class="ph-progresso">
      <div class="ph-progresso-topo">
        <span>Pendências fechadas</span>
        <strong>${fechadas} de ${comPend.length} empresas (${pct}%)</strong>
      </div>
      <div class="ph-progresso-trilho"><div class="ph-progresso-barra" style="width:${pct}%"></div></div>
    </div>
    <div class="vendas-stats-grid">
      ${phStatCard("🔴", "Urgentes", porPrio(1), "vencido, vence em até 30 dias ou procuração cancelada", "ph-stat-p1")}
      ${phStatCard("🟡", "Prioridade alta", porPrio(2), "não integrado, 2 etapas ou sem procuração", "ph-stat-p2")}
      ${phStatCard("🔵", "Prioridade média", porPrio(3), "certificado vence em 31–90 dias", "ph-stat-p3")}
      ${phStatCard("📨", "Já contatadas", enviadas, `${abertas.length - enviadas} ainda sem contato`, "ph-stat-enviada")}
      ${phStatCard("📵", "Sem contato cadastrado", abertas.filter((e) => e.semContato).length, "descobrir com quem falar", "ph-stat-semcontato")}
      ${phStatCard("✅", "Sem pendência", todas.length - comPend.length, `de ${todas.length} empresas importadas`, "ph-stat-ok")}
    </div>`;
}

function phFiltrar(todas) {
  const busca = normalizeHeader(document.getElementById("ph-busca").value);
  const prio = document.getElementById("ph-filtro-prioridade").value;
  const tipo = document.getElementById("ph-filtro-tipo").value;
  const status = document.getElementById("ph-filtro-status").value;
  const mostrarFechadas = document.getElementById("ph-mostrar-resolvidas").checked || status === "Resolvido";

  return todas.filter((e) => {
    if (!e.temPendencia) return false;
    if (e.fechada && !mostrarFechadas) return false;
    if (prio === "sem-contato" ? !e.semContato : (prio && String(e.prioridade) !== prio)) return false;
    if (tipo && !e.itens.some((i) => i.tipo === tipo)) return false;
    if (status && e.status !== status) return false;
    if (busca) {
      const alvo = normalizeHeader([e.nome, e.cnpj, ...e.contatos.map((c) => `${c.nome} ${c.telefone} ${c.email}`)].join(" "));
      if (!alvo.includes(busca) && !phDigitos(e.cnpj).includes(phDigitos(busca) || "§")) return false;
    }
    return true;
  });
}

function phCardHtml(e, todas) {
  const p = PH_PRIORIDADES[e.prioridade] || PH_PRIORIDADES[3];
  const outras = phMembrosDoGrupo(e, todas).filter((x) => x.id !== e.id).length;
  const badges = e.itens.map((i) =>
    `<span class="ph-badge ph-badge-${i.prioridade}${i.resolvido ? " ph-badge-ok" : ""}">${i.resolvido ? "✔ " : ""}${phEsc(i.rotulo)}</span>`
  ).join("");
  const contato = e.semContato
    ? `<span class="ph-sem-contato">📵 Sem contato cadastrado</span>`
    : `👤 ${phEsc(e.principal.nome || "—")}${e.principal.telefone ? " · " + phEsc(e.principal.telefone) : ""}`;
  return `
    <button type="button" class="ph-card ${e.fechada ? "ph-card-fechada" : p.classe}" data-id="${phEsc(e.id)}">
      <div class="ph-card-topo">
        <div class="ph-card-nome">${phEsc(e.nome)}</div>
        <span class="ph-status ${PH_STATUS_CLASSE[e.status] || ""}">${phEsc(e.status)}</span>
      </div>
      <div class="ph-card-cnpj">${phEsc(e.cnpj)}${e.regime ? " · " + phEsc(e.regime) : ""}</div>
      <div class="ph-badges">${badges}</div>
      <div class="ph-card-rodape">
        <span class="ph-card-contato">${contato}</span>
        ${outras ? `<span class="ph-card-grupo" title="O mesmo contato responde por outras empresas com pendência">+${outras} empresa${outras > 1 ? "s" : ""} do mesmo contato</span>` : ""}
        <span class="ph-card-abrir">Ver mensagem →</span>
      </div>
    </button>`;
}

function phRenderLista() {
  const lista = document.getElementById("ph-lista");
  const vazio = document.getElementById("ph-vazio");
  const todas = phEmpresas();

  if (!phCache.length) {
    document.getElementById("ph-stats").innerHTML = "";
    lista.innerHTML = "";
    vazio.classList.remove("hidden");
    return;
  }
  vazio.classList.add("hidden");
  phRenderStats(todas);

  const filtradas = phFiltrar(todas).sort((a, b) =>
    (a.fechada - b.fechada) || (a.prioridade - b.prioridade) || (a.ordem - b.ordem) || a.nome.localeCompare(b.nome)
  );

  if (!filtradas.length) {
    lista.innerHTML = `<p class="fixed-note">Nenhuma empresa encontrada com esses filtros.</p>`;
    return;
  }

  const secoes = [];
  [1, 2, 3].forEach((prio) => {
    const grupo = filtradas.filter((e) => !e.fechada && e.prioridade === prio);
    if (grupo.length) secoes.push({ titulo: `${PH_PRIORIDADES[prio].icone} ${PH_PRIORIDADES[prio].label}`, classe: PH_PRIORIDADES[prio].classe, itens: grupo });
  });
  const fechadas = filtradas.filter((e) => e.fechada);
  if (fechadas.length) secoes.push({ titulo: "✅ Resolvidas", classe: "ph-sec-fechada", itens: fechadas });

  lista.innerHTML = secoes.map((s) => `
    <section class="ph-secao ${s.classe}">
      <h3 class="ph-secao-titulo">${s.titulo} <span class="ph-secao-qtd">${s.itens.length}</span></h3>
      <div class="ph-grid">${s.itens.map((e) => phCardHtml(e, todas)).join("")}</div>
    </section>`).join("");
}

// --- Detalhe (modal) --------------------------------------------------------

function phEmpresaSelecionada() {
  return phEmpresas().find((e) => e.id === phSelecionadoId) || null;
}

function phAbrirDetalhe(id) {
  phSelecionadoId = id;
  document.getElementById("ph-incluir-grupo").checked = true;
  phRenderDetalhe(true);
  document.getElementById("ph-modal").classList.remove("hidden");
  document.body.classList.add("ph-modal-aberto");
}

function phFecharDetalhe() {
  phSelecionadoId = null;
  document.getElementById("ph-modal").classList.add("hidden");
  document.body.classList.remove("ph-modal-aberto");
}

function phEmpresasDaMensagem(emp) {
  const todas = phEmpresas();
  const incluir = document.getElementById("ph-incluir-grupo").checked;
  const grupo = phMembrosDoGrupo(emp, todas);
  if (!incluir) return emp.abertos.length ? [emp] : [];
  // a empresa clicada vem sempre primeiro
  return [emp].concat(grupo.filter((e) => e.id !== emp.id)).filter((e) => e.abertos.length);
}

function phRenderDetalhe(regerarMensagem) {
  const emp = phEmpresaSelecionada();
  if (!emp) { phFecharDetalhe(); return; }
  const todas = phEmpresas();
  const p = PH_PRIORIDADES[emp.prioridade] || PH_PRIORIDADES[3];

  document.getElementById("ph-det-nome").textContent = emp.nome;
  document.getElementById("ph-det-info").textContent =
    [emp.cnpj, emp.regime, [emp.cidade, emp.estado].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  const prioEl = document.getElementById("ph-det-prioridade");
  prioEl.textContent = emp.fechada ? "✅ Resolvida" : `${p.icone} Prioridade ${p.label.toLowerCase()}`;
  prioEl.className = "ph-det-prioridade " + (emp.fechada ? "ph-sec-fechada" : p.classe);

  // situação no Hubstron + checklist de pendências
  document.getElementById("ph-det-situacao").innerHTML = `
    <div><span>Certificado digital</span><strong>${phEsc(emp.certificado || "—")}</strong></div>
    <div><span>Procuração</span><strong>${phEsc(emp.procuracao || "—")}</strong></div>`;
  document.getElementById("ph-det-itens").innerHTML = emp.itens.map((i) => `
    <label class="ph-item ${i.resolvido ? "ph-item-ok" : ""}">
      <input type="checkbox" class="ph-item-check" data-chave="${i.chave}" ${i.resolvido ? "checked" : ""}>
      <span class="ph-badge ph-badge-${i.prioridade}${i.resolvido ? " ph-badge-ok" : ""}">${phEsc(i.rotulo)}</span>
      <span class="ph-item-acao">${i.resolvido ? "resolvida" : "marcar como resolvida"}</span>
    </label>`).join("");

  const statusSel = document.getElementById("ph-det-status");
  statusSel.value = emp.status;
  document.getElementById("ph-det-obs").value = emp.observacoes || "";
  const hist = [];
  if (emp.enviadoEmMs) hist.push(`📨 Mensagem enviada em ${new Date(emp.enviadoEmMs).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`);
  if (emp.resolvidoEmMs && emp.fechada) hist.push(`✅ Resolvida em ${new Date(emp.resolvidoEmMs).toLocaleDateString("pt-BR")}`);
  document.getElementById("ph-det-historico").textContent = hist.join(" · ");

  // contato
  const contatosHtml = emp.contatos.length
    ? emp.contatos.map((c) => {
        const dig = phDigitos(c.telefone);
        const alerta = dig.length === 10 && dig[2] === "9" ? ` <span class="ph-alerta" title="Celular com 8 dígitos — provavelmente falta o 9">⚠️ falta o 9?</span>` : "";
        return `<div class="ph-contato-linha">👤 <strong>${phEsc(c.nome || "—")}</strong>
          ${c.telefone ? ` · 📞 ${phEsc(c.telefone)}${alerta}` : ""}
          ${c.email ? ` · ✉️ ${phEsc(c.email)}` : ""}</div>`;
      }).join("")
    : `<div class="ph-sem-contato">📵 Nenhum contato cadastrado no Hubstron — descubra com quem falar e atualize lá.</div>`;
  document.getElementById("ph-det-contatos").innerHTML = contatosHtml;

  // outras empresas do mesmo contato
  const outras = phMembrosDoGrupo(emp, todas).filter((e) => e.id !== emp.id);
  const grupoWrap = document.getElementById("ph-grupo-wrap");
  grupoWrap.classList.toggle("hidden", !outras.length);
  document.getElementById("ph-grupo-lista").innerHTML = outras.map((e) =>
    `<button type="button" class="ph-link-empresa" data-id="${phEsc(e.id)}">${phEsc(e.nome)}</button>`).join(", ");

  // mensagem
  const msgWrap = document.getElementById("ph-mensagem-wrap");
  const empresasMsg = phEmpresasDaMensagem(emp);
  msgWrap.classList.toggle("hidden", !empresasMsg.length);
  if (regerarMensagem && empresasMsg.length) {
    document.getElementById("ph-mensagem").value = phMontarMensagem(empresasMsg, emp.principal.nome);
  }
  const temTel = !!normalizePhoneForWhatsApp(emp.principal.telefone);
  document.getElementById("ph-btn-whatsapp").disabled = !temTel;
  document.getElementById("ph-btn-email").disabled = !emp.contatos.some((c) => c.email);
  document.getElementById("ph-msg-status").textContent = "";
}

async function phSalvar(id, dados, mensagemOk) {
  const st = document.getElementById("ph-det-salvo");
  try {
    await updatePendenciaHubstron(id, dados);
    const local = phCache.find((e) => e.id === id);
    if (local) Object.assign(local, dados);
    if (st && mensagemOk) { st.textContent = mensagemOk; st.className = "pdf-status ok"; }
  } catch (err) {
    console.error(err);
    if (st) { st.textContent = "Erro ao salvar. Tente de novo."; st.className = "pdf-status error"; }
    throw err;
  }
}

function phDadosStatus(emp, novoStatus) {
  const dados = { status: novoStatus };
  if (novoStatus === "Resolvido") dados.resolvidoEmMs = Date.now();
  // reabrir uma empresa que fechou porque todos os itens foram marcados
  if (novoStatus !== "Resolvido" && emp.itens.length && emp.abertos.length === 0) dados.itensResolvidos = [];
  return dados;
}

async function phMarcarEnviadas(empresas) {
  const agora = Date.now();
  await Promise.all(empresas.map((e) => {
    const dados = { enviadoEmMs: agora };
    if (e.status === "Pendente") dados.status = "Mensagem enviada";
    return phSalvar(e.id, dados);
  }));
  phRenderLista();
  phRenderDetalhe(false);
  const n = empresas.length;
  const st = document.getElementById("ph-msg-status");
  st.textContent = `Status atualizado para "Mensagem enviada" em ${n} empresa${n > 1 ? "s" : ""}.`;
  st.className = "pdf-status ok";
}

function setupPendenciasHubstronDetalhe() {
  document.getElementById("ph-modal-fechar").addEventListener("click", phFecharDetalhe);
  document.getElementById("ph-modal").addEventListener("click", (ev) => {
    if (ev.target.id === "ph-modal") phFecharDetalhe();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && phSelecionadoId) phFecharDetalhe();
  });

  document.getElementById("ph-det-itens").addEventListener("change", async (ev) => {
    const box = ev.target.closest(".ph-item-check");
    if (!box) return;
    const emp = phEmpresaSelecionada();
    const atuais = new Set(emp.itensResolvidos || []);
    if (box.checked) atuais.add(box.dataset.chave); else atuais.delete(box.dataset.chave);
    const itensResolvidos = Array.from(atuais);
    const dados = { itensResolvidos };
    const todasOk = emp.itens.every((i) => atuais.has(i.chave));
    if (todasOk) Object.assign(dados, { status: "Resolvido", resolvidoEmMs: Date.now() });
    else if (emp.status === "Resolvido") dados.status = emp.enviadoEmMs ? "Aguardando cliente" : "Pendente";
    await phSalvar(emp.id, dados, todasOk ? "✅ Todas as pendências resolvidas — empresa fechada." : "Salvo.");
    phRenderLista();
    phRenderDetalhe(true);
  });

  document.getElementById("ph-det-status").addEventListener("change", async (ev) => {
    const emp = phEmpresaSelecionada();
    await phSalvar(emp.id, phDadosStatus(emp, ev.target.value), "Status salvo.");
    phRenderLista();
    phRenderDetalhe(false);
  });

  document.getElementById("ph-det-obs-salvar").addEventListener("click", async () => {
    const emp = phEmpresaSelecionada();
    await phSalvar(emp.id, { observacoes: document.getElementById("ph-det-obs").value.trim() }, "Observação salva.");
  });

  document.getElementById("ph-incluir-grupo").addEventListener("change", () => phRenderDetalhe(true));
  document.getElementById("ph-grupo-lista").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".ph-link-empresa");
    if (btn) phAbrirDetalhe(btn.dataset.id);
  });
  document.getElementById("ph-btn-regerar").addEventListener("click", () => phRenderDetalhe(true));

  document.getElementById("ph-btn-whatsapp").addEventListener("click", async () => {
    const emp = phEmpresaSelecionada();
    const link = buildWhatsAppLink(emp.principal.telefone, document.getElementById("ph-mensagem").value);
    if (!link) return;
    window.open(link, "_blank");
    await phMarcarEnviadas(phEmpresasDaMensagem(emp));
  });

  document.getElementById("ph-btn-copiar").addEventListener("click", async () => {
    const texto = document.getElementById("ph-mensagem").value;
    const st = document.getElementById("ph-msg-status");
    try {
      await navigator.clipboard.writeText(texto);
    } catch (err) {
      const ta = document.getElementById("ph-mensagem");
      ta.select();
      document.execCommand("copy");
    }
    st.textContent = "📋 Mensagem copiada.";
    st.className = "pdf-status ok";
  });

  document.getElementById("ph-btn-email").addEventListener("click", async () => {
    const emp = phEmpresaSelecionada();
    const emails = Array.from(new Set(emp.contatos.map((c) => c.email).filter(Boolean)));
    if (!emails.length) return;
    // e-mail não usa o negrito do WhatsApp (*texto*)
    const corpo = document.getElementById("ph-mensagem").value.replace(/\*([^*\n]+)\*/g, "$1");
    const assunto = `Pendências cadastrais — ${emp.nome}`;
    window.location.href = `mailto:${emails.join(",")}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
    await phMarcarEnviadas(phEmpresasDaMensagem(emp));
  });
}

// --- Setup ------------------------------------------------------------------

async function refreshPendenciasHubstron(forcar) {
  if (phCarregado && !forcar) { phRenderLista(); return; }
  const lista = document.getElementById("ph-lista");
  if (!phCarregado) lista.innerHTML = `<p class="fixed-note">Carregando pendências...</p>`;
  try {
    phCache = await getPendenciasHubstron();
    phCarregado = true;
    const ultima = Math.max(0, ...phCache.map((e) => e.importadoEmMs || 0));
    document.getElementById("ph-ultima-importacao").textContent = ultima
      ? `Última importação: ${new Date(ultima).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · ${phCache.length} empresas`
      : "";
    phRenderLista();
  } catch (err) {
    console.error(err);
    lista.innerHTML = `<p class="pdf-status error">Erro ao carregar as pendências.</p>`;
  }
}

function setupPendenciasHubstron() {
  if (!document.getElementById("ph-lista")) return;

  const tipoSel = document.getElementById("ph-filtro-tipo");
  PH_TIPOS_FILTRO.forEach(([valor, label]) => tipoSel.insertAdjacentHTML("beforeend", `<option value="${valor}">${label}</option>`));
  const statusSel = document.getElementById("ph-filtro-status");
  const detStatus = document.getElementById("ph-det-status");
  PH_STATUS.forEach((s) => {
    statusSel.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
    detStatus.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
  });

  ["ph-busca", "ph-filtro-prioridade", "ph-filtro-tipo", "ph-filtro-status", "ph-mostrar-resolvidas"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener(el.tagName === "INPUT" && el.type === "text" ? "input" : "change", phRenderLista);
  });

  document.getElementById("ph-import-input").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (file) await phImportarArquivo(file);
    ev.target.value = "";
  });

  document.getElementById("ph-lista").addEventListener("click", (ev) => {
    const card = ev.target.closest(".ph-card");
    if (card) phAbrirDetalhe(card.dataset.id);
  });

  setupPendenciasHubstronDetalhe();
}

document.addEventListener("DOMContentLoaded", setupPendenciasHubstron);
