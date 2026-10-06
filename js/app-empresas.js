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

const FILTRO_EMPRESAS_IDS = [
  "empresas-search",
  "empresas-filtro-responsavel",
  "empresas-filtro-endereco",
  "empresas-filtro-bairro",
  "empresas-filtro-cidade",
  "empresas-filtro-estado",
  "empresas-filtro-tributacao",
  "empresas-filtro-cnae",
  "empresas-filtro-situacao",
];

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

function renderEmpresasTable(lista) {
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
