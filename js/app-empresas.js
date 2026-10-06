// Relatório/filtro de todas as empresas cadastradas (Ficha Cadastral) por
// informações do cartão CNPJ — endereço, bairro, cidade, UF, tributação,
// CNAE e situação — e pelo responsável (sócio administrador). Carrega tudo
// uma vez do Firestore e filtra em memória a cada tecla (dataset pequeno o
// bastante pra não precisar de nova consulta por filtro).

let empresasCacheLista = [];

function escapeHtmlEmpresas(str) {
  return (str || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function enderecoCompletoEmpresa(e) {
  return [e.endereco, e.bairro, [e.cidade, e.estado].filter(Boolean).join("/"), e.cep ? "CEP " + e.cep : ""]
    .filter(Boolean)
    .join(", ");
}

// Sócio administrador (ou 1º sócio) — mesmo critério usado em
// empresaToContratante (app.js) pra preencher o representante legal.
function responsavelEmpresa(e) {
  return (e.socio1 || e.administracao || "").trim();
}

const FILTRO_EMPRESAS_CAMPOS = [
  { id: "empresas-search", label: "Busca" },
  { id: "empresas-filtro-responsavel", label: "Responsável" },
  { id: "empresas-filtro-endereco", label: "Endereço" },
  { id: "empresas-filtro-bairro", label: "Bairro" },
  { id: "empresas-filtro-cidade", label: "Cidade" },
  { id: "empresas-filtro-estado", label: "UF" },
  { id: "empresas-filtro-tributacao", label: "Tributação" },
  { id: "empresas-filtro-cnae", label: "CNAE" },
  { id: "empresas-filtro-situacao", label: "Situação" },
];
const FILTRO_EMPRESAS_IDS = FILTRO_EMPRESAS_CAMPOS.map((c) => c.id);

function getFiltrosEmpresas() {
  return {
    busca: document.getElementById("empresas-search").value.trim().toLowerCase(),
    responsavel: document.getElementById("empresas-filtro-responsavel").value.trim().toLowerCase(),
    endereco: document.getElementById("empresas-filtro-endereco").value.trim().toLowerCase(),
    bairro: document.getElementById("empresas-filtro-bairro").value.trim().toLowerCase(),
    cidade: document.getElementById("empresas-filtro-cidade").value.trim().toLowerCase(),
    estado: document.getElementById("empresas-filtro-estado").value.trim().toLowerCase(),
    tributacao: document.getElementById("empresas-filtro-tributacao").value.trim().toLowerCase(),
    cnae: document.getElementById("empresas-filtro-cnae").value.trim().toLowerCase(),
    situacao: document.getElementById("empresas-filtro-situacao").value.trim().toLowerCase(),
  };
}

function empresaPassaNosFiltros(e, f) {
  const contem = (campo, termo) => !termo || (campo || "").toLowerCase().includes(termo);

  if (f.busca) {
    const alvo = `${e.contratante || ""} ${e.cnpj || ""}`.toLowerCase();
    if (!alvo.includes(f.busca)) return false;
  }
  if (!contem(`${responsavelEmpresa(e)} ${e.socio2 || ""}`, f.responsavel)) return false;
  if (!contem(e.endereco, f.endereco)) return false;
  if (!contem(e.bairro, f.bairro)) return false;
  if (!contem(e.cidade, f.cidade)) return false;
  if (!contem(e.estado, f.estado)) return false;
  if (!contem(e.tributacao, f.tributacao)) return false;
  if (!contem(`${e.cnaePrincipal || ""} ${e.cnaeSecundario || ""}`, f.cnae)) return false;
  if (!contem(e.situacao, f.situacao)) return false;
  return true;
}

let ultimaContagemFiltrada = 0;

function renderEmpresasTable(lista) {
  ultimaContagemFiltrada = lista.length;
  const wrap = document.getElementById("empresas-table-wrap");
  const nota = document.getElementById("empresas-resultado-nota");
  nota.textContent = `${lista.length} empresa(s) encontrada(s) de ${empresasCacheLista.length} cadastrada(s).`;

  if (lista.length === 0) {
    wrap.innerHTML = `<div class="empresas-table-container"><p class="empresas-empty">Nenhuma empresa encontrada com esses filtros.</p></div>`;
    return;
  }

  const ordenada = [...lista].sort((a, b) => (a.contratante || "").localeCompare(b.contratante || ""));

  wrap.innerHTML = `
    <div class="empresas-table-container">
      <table class="empresas-table">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Responsável</th>
            <th>Endereço</th>
            <th>Cidade/UF</th>
            <th>Tributação</th>
            <th>CNAE Principal</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          ${ordenada
            .map(
              (e) => `
            <tr>
              <td>
                ${escapeHtmlEmpresas(e.contratante || "(sem nome)")}
                <div class="empresas-cnpj">${escapeHtmlEmpresas(e.cnpj || "—")}</div>
              </td>
              <td>
                ${escapeHtmlEmpresas(responsavelEmpresa(e)) || "—"}
                ${e.socio2 ? `<div class="empresas-cnpj">e ${escapeHtmlEmpresas(e.socio2)}</div>` : ""}
              </td>
              <td>${escapeHtmlEmpresas(enderecoCompletoEmpresa(e)) || "—"}</td>
              <td>${escapeHtmlEmpresas([e.cidade, e.estado].filter(Boolean).join("/")) || "—"}</td>
              <td>${escapeHtmlEmpresas(e.tributacao) || "—"}</td>
              <td>${escapeHtmlEmpresas(e.cnaePrincipal) || "—"}</td>
              <td>${escapeHtmlEmpresas(e.situacao) || "—"}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function aplicarFiltrosEmpresas() {
  const f = getFiltrosEmpresas();
  const filtrada = empresasCacheLista.filter((e) => empresaPassaNosFiltros(e, f));
  renderEmpresasTable(filtrada);
}

function setupFiltrosEmpresas() {
  FILTRO_EMPRESAS_IDS.forEach((id) => {
    document.getElementById(id).addEventListener("input", aplicarFiltrosEmpresas);
  });

  document.getElementById("empresas-limpar-filtros").addEventListener("click", () => {
    FILTRO_EMPRESAS_IDS.forEach((id) => { document.getElementById(id).value = ""; });
    aplicarFiltrosEmpresas();
  });

  document.getElementById("empresas-imprimir").addEventListener("click", () => {
    montarCabecalhoImpressaoEmpresas();
    window.print();
  });
}

// Só aparece na folha impressa (ver @media print em empresas.css) — mostra
// quais filtros estavam aplicados na hora da impressão, já que o toolbar em
// si fica escondido no papel.
function montarCabecalhoImpressaoEmpresas() {
  const filtrosAtivos = FILTRO_EMPRESAS_CAMPOS
    .map((c) => ({ label: c.label, valor: document.getElementById(c.id).value.trim() }))
    .filter((c) => c.valor);

  const resumoFiltros = filtrosAtivos.length
    ? filtrosAtivos.map((c) => `${c.label}: ${escapeHtmlEmpresas(c.valor)}`).join(" &nbsp;•&nbsp; ")
    : "Nenhum filtro aplicado (lista completa)";

  const hoje = new Date().toLocaleDateString("pt-BR");

  document.getElementById("empresas-print-header").innerHTML = `
    <h2>AEA Contabilidade Consultiva — Relatório de Empresas Cadastradas</h2>
    <p>${ultimaContagemFiltrada} empresa(s) encontrada(s) de ${empresasCacheLista.length} cadastrada(s). Gerado em ${hoje}.<br>${resumoFiltros}</p>
  `;
}

async function carregarEmpresasLista() {
  const nota = document.getElementById("empresas-resultado-nota");
  nota.textContent = "Carregando empresas...";
  try {
    empresasCacheLista = await getEmpresas();
    aplicarFiltrosEmpresas();
  } catch (err) {
    console.error(err);
    nota.textContent = "Não foi possível conectar ao banco de empresas.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupFiltrosEmpresas();
  carregarEmpresasLista();
});
