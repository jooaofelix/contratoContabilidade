// Consulta CNPJ — ferramenta avulsa, sem relação com o funil de vendas nem
// com o resto do sistema. Só consulta dados públicos (cadastro, Simples/MEI
// via BrasilAPI, e sanções CEIS/CNEP via Portal da Transparência) e mostra
// na tela. Não salva nada no Firestore.

function onlyDigitsConsulta(str) {
  return (str || "").replace(/\D/g, "");
}

function formatCnpjMaskConsulta(digits) {
  if (!digits || digits.length !== 14) return digits || "";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatDataBr(dataStr) {
  if (!dataStr) return "";
  const m = String(dataStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dataStr;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function escapeHtmlConsulta(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function fetchCadastroCnpj(digits) {
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
  return response.json();
}

async function fetchSancoes(digits) {
  if (!TRANSPARENCIA_API_KEY) return null;

  const headers = { "chave-api-dados": TRANSPARENCIA_API_KEY };
  const [ceisRes, cnepRes] = await Promise.all([
    fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/ceis?cnpjSancionado=${digits}&pagina=1`, { headers }),
    fetch(`https://api.portaldatransparencia.gov.br/api-de-dados/cnep?cnpjSancionado=${digits}&pagina=1`, { headers }),
  ]);

  if (!ceisRes.ok || !cnepRes.ok) {
    throw new Error("Não foi possível consultar o Portal da Transparência (confira a chave configurada).");
  }

  const ceis = await ceisRes.json();
  const cnep = await cnepRes.json();
  return { ceis, cnep };
}

function cardCadastro(d) {
  const situacao = d.descricao_situacao_cadastral || "—";
  const situacaoOk = /ativa/i.test(situacao);
  return `
    <section class="consulta-card">
      <h3>🏢 Dados cadastrais</h3>
      <div class="consulta-linha"><span>Razão social</span><strong>${escapeHtmlConsulta(d.razao_social || "—")}</strong></div>
      <div class="consulta-linha"><span>Nome fantasia</span><strong>${escapeHtmlConsulta(d.nome_fantasia || "—")}</strong></div>
      <div class="consulta-linha"><span>Situação cadastral</span><strong class="${situacaoOk ? "consulta-ok" : "consulta-alerta"}">${escapeHtmlConsulta(situacao)}</strong></div>
      <div class="consulta-linha"><span>Data da situação</span><strong>${formatDataBr(d.data_situacao_cadastral)}</strong></div>
      <div class="consulta-linha"><span>Início de atividade</span><strong>${formatDataBr(d.data_inicio_atividade)}</strong></div>
      <div class="consulta-linha"><span>Porte</span><strong>${escapeHtmlConsulta(d.descricao_porte || "—")}</strong></div>
      <div class="consulta-linha"><span>CNAE principal</span><strong>${escapeHtmlConsulta(d.cnae_fiscal ? `${d.cnae_fiscal} - ${d.cnae_fiscal_descricao || ""}` : "—")}</strong></div>
      <div class="consulta-linha"><span>Município/UF</span><strong>${escapeHtmlConsulta([d.municipio, d.uf].filter(Boolean).join("/") || "—")}</strong></div>
    </section>
  `;
}

function cardRegime(d) {
  const simples = d.opcao_pelo_simples;
  const mei = d.opcao_pelo_mei;
  return `
    <section class="consulta-card">
      <h3>📑 Regime tributário</h3>
      <div class="consulta-linha">
        <span>Simples Nacional</span>
        <strong class="${simples ? "consulta-ok" : ""}">${simples ? "Optante" : "Não optante"}</strong>
      </div>
      ${simples ? `<div class="consulta-linha"><span>Data da opção</span><strong>${formatDataBr(d.data_opcao_pelo_simples)}</strong></div>` : ""}
      ${d.data_exclusao_do_simples ? `<div class="consulta-linha"><span>Data de exclusão</span><strong>${formatDataBr(d.data_exclusao_do_simples)}</strong></div>` : ""}
      <div class="consulta-linha">
        <span>MEI</span>
        <strong class="${mei ? "consulta-ok" : ""}">${mei ? "Optante" : "Não optante"}</strong>
      </div>
      ${mei ? `<div class="consulta-linha"><span>Data da opção</span><strong>${formatDataBr(d.data_opcao_pelo_mei)}</strong></div>` : ""}
      ${d.data_exclusao_do_mei ? `<div class="consulta-linha"><span>Data de exclusão</span><strong>${formatDataBr(d.data_exclusao_do_mei)}</strong></div>` : ""}
    </section>
  `;
}

function cardSancoes(sancoes) {
  if (sancoes === null) {
    return `
      <section class="consulta-card">
        <h3>⚠️ Sanções (CEIS/CNEP)</h3>
        <p class="consulta-aviso">Chave do Portal da Transparência não configurada. Peça a chave gratuita em
        <a href="https://api.portaldatransparencia.gov.br/swagger-ui.html" target="_blank" rel="noopener">api.portaldatransparencia.gov.br</a>
        e cole em <code>js/transparencia-config.js</code>.</p>
      </section>
    `;
  }

  const temCeis = (sancoes.ceis || []).length > 0;
  const temCnep = (sancoes.cnep || []).length > 0;
  const limpo = !temCeis && !temCnep;

  return `
    <section class="consulta-card">
      <h3>⚠️ Sanções (CEIS/CNEP)</h3>
      <div class="consulta-linha">
        <span>CEIS (empresas inidôneas/suspensas)</span>
        <strong class="${temCeis ? "consulta-alerta" : "consulta-ok"}">${temCeis ? `CONSTA (${sancoes.ceis.length})` : "Não consta"}</strong>
      </div>
      <div class="consulta-linha">
        <span>CNEP (empresas punidas)</span>
        <strong class="${temCnep ? "consulta-alerta" : "consulta-ok"}">${temCnep ? `CONSTA (${sancoes.cnep.length})` : "Não consta"}</strong>
      </div>
      ${limpo ? `<p class="consulta-aviso consulta-ok">Nenhuma sanção encontrada no Portal da Transparência.</p>` : ""}
    </section>
  `;
}

function setupConsulta() {
  const input = document.getElementById("consulta-cnpj");
  const btn = document.getElementById("consulta-btn");
  const status = document.getElementById("consulta-status");
  const resultado = document.getElementById("consulta-resultado");

  btn.addEventListener("click", async () => {
    const digits = onlyDigitsConsulta(input.value);
    resultado.innerHTML = "";
    if (digits.length !== 14) {
      status.textContent = "Digite os 14 números do CNPJ.";
      status.className = "pdf-status error";
      return;
    }

    status.textContent = "Consultando...";
    status.className = "pdf-status";
    btn.disabled = true;

    try {
      const dados = await fetchCadastroCnpj(digits);
      let sancoes = null;
      try {
        sancoes = await fetchSancoes(digits);
      } catch (err) {
        console.error(err);
      }

      resultado.innerHTML = cardCadastro(dados) + cardRegime(dados) + cardSancoes(sancoes);
      status.textContent = `Consulta concluída para ${formatCnpjMaskConsulta(digits)}.`;
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Erro ao consultar o CNPJ.";
      status.className = "pdf-status error";
    } finally {
      btn.disabled = false;
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
}

document.addEventListener("DOMContentLoaded", setupConsulta);
