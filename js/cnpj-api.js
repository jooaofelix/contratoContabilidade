// Consulta pública de CNPJ via BrasilAPI (dados públicos da Receita Federal,
// consolidados por um serviço aberto e gratuito). Não é uma API oficial da
// Receita — a Receita não expõe uma para consulta individual — mas usa os
// mesmos dados cadastrais públicos. https://brasilapi.com.br/docs#tag/CNPJ

function onlyDigitsCnpj(str) {
  return (str || "").replace(/\D/g, "");
}

function formatCnpjMask(digits) {
  if (!digits || digits.length !== 14) return digits || "";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatCepMask(value) {
  const digits = onlyDigitsCnpj(value);
  if (digits.length !== 8) return value || "";
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

function formatTelefoneBr(value) {
  const digits = onlyDigitsCnpj(value);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value || "";
}

function formatMoedaBr(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchCnpjFromApi(cnpjRaw) {
  const digits = onlyDigitsCnpj(cnpjRaw);
  if (digits.length !== 14) {
    throw new Error("CNPJ inválido. Digite os 14 números do CNPJ.");
  }

  let response;
  try {
    response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  } catch (err) {
    throw new Error("Não foi possível conectar ao serviço de consulta. Confira sua internet.");
  }

  if (response.status === 404) {
    throw new Error("CNPJ não encontrado na Receita Federal.");
  }
  if (!response.ok) {
    throw new Error("Não foi possível consultar a Receita agora. Tente novamente em instantes.");
  }

  const d = await response.json();

  const endereco = [
    [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" "),
    d.numero ? `nº ${d.numero}` : "",
    d.complemento || "",
  ]
    .filter(Boolean)
    .join(", ");

  const cnaeSecundario = (d.cnaes_secundarios || [])
    .map((c) => `${c.codigo} - ${c.descricao}`)
    .join("\n");

  const socios = (d.qsa || []).filter((s) => s && s.nome_socio);
  const socio1 = socios[0] || {};
  const socio2 = socios[1] || {};

  let tributacao = "";
  if (d.opcao_pelo_simples) tributacao = "Simples Nacional";
  else if (d.opcao_pelo_mei) tributacao = "MEI";

  return {
    razaoSocial: d.razao_social || "",
    cnpj: formatCnpjMask(digits),
    endereco,
    bairro: d.bairro || "",
    cidade: d.municipio || "",
    estado: d.uf || "",
    cep: formatCepMask(d.cep),
    email: d.email || "",
    telefone: formatTelefoneBr(d.ddd_telefone_1),
    cnaePrincipal: d.cnae_fiscal ? `${d.cnae_fiscal} - ${d.cnae_fiscal_descricao || ""}`.trim() : "",
    cnaeSecundario,
    tributacao,
    valorCapital: formatMoedaBr(d.capital_social),
    situacao: d.descricao_situacao_cadastral || "",
    socio1: socio1.nome_socio || "",
    capitalSocio1: socio1.percentual_capital_social != null ? String(socio1.percentual_capital_social) : "",
    socio2: socio2.nome_socio || "",
    capitalSocio2: socio2.percentual_capital_social != null ? String(socio2.percentual_capital_social) : "",
  };
}
