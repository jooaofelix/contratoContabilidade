const FIELD_IDS = [
  "c_razaoSocial", "c_cnpj", "c_endereco", "c_repNome", "c_repCpf",
  "o_objeto",
  "h_temValorProvisorio", "h_valorProvisorio", "h_provisorioValidoAte",
  "h_valorCheio", "h_temDesconto", "h_valorDesconto", "h_descontoInicio", "h_descontoFim", "h_vencimentoDia", "h_sistemasTerceiros",
  "v_inicio", "v_fim", "v_avisoPrevio", "f_temFidelidade", "f_multaPercent",
  "foro_cidade", "a_local", "a_data", "a_test1Nome", "a_test1Cpf", "a_test2Nome", "a_test2Cpf",
];

// A CONTRATADA é sempre a AEA Contabilidade Consultiva — fixo, não editável.
const CONTRATADA_FIXA = {
  razaoSocial: "AEA CONTABILIDADE CONSULTIVA LTDA",
  cnpj: "65.132.309/0001-80",
  endereco: "Rua Jurema Vieira Medrado, nº 88, Sala 305, Parque Residencial Aquarius, São José dos Campos/SP, CEP 12.246-180",
  contato: "andreandrade@aeacontabil.com.br | (12) 3921-9902",
  responsavel: "ANDRÉ ANDRADE",
  crc: "1SP223916",
};

const ESCOPO_STORAGE_KEY = "contratoContabilidade.escopoPadrao";

// Lista (não mais objeto fixo por id) — cada campo do Resumo do Escopo
// agora é uma linha livre (nome + texto), adicionável/removível na tela
// (ver addEscopoCampoRow). Esses continuam sendo os campos padrão na
// primeira vez que a tela abre (ou depois de limpar o formulário), até o
// usuário salvar outro conjunto como padrão.
const ESCOPO_DEFAULTS = [
  { label: "Parte fiscal", texto: "Apuração ordinária de tributos do Simples Nacional, emissão e controle de guias e envio de obrigações acessórias fiscais aplicáveis." },
  { label: "Parte contábil", texto: "Classificação e escrituração contábil, conciliações, balancetes e demonstrações contábeis quando aplicáveis, conforme documentos recebidos." },
  { label: "Gestão de RH", texto: "Gestão de rotinas de RH conforme documentos e informações recebidos em tempo hábil." },
  { label: "Consultiva", texto: "Acompanhamento estratégico e personalizado com o contador responsável, voltado a orientações ordinárias de gestão, dentro do escopo contratado." },
  { label: "Obrigações acessórias", texto: "Entrega das declarações e obrigações acessórias mensais e anuais inerentes ao escopo contábil contratado, conforme legislação vigente." },
  { label: "Atendimento", texto: "Orientações ordinárias sobre rotinas contábeis, fiscais, trabalhistas e envio de documentos dentro do escopo contratado." },
  { label: "Não incluídos", texto: "Serviços societários, alterações contratuais, abertura ou encerramento de empresas, regularizações, parcelamentos, certidões, certificado digital, consultorias específicas e demais serviços extraordinários." },
];

function get(id) { return document.getElementById(id).value; }
function checked(id) { return document.getElementById(id).checked; }

function collectFormData() {
  return {
    contratante: {
      razaoSocial: get("c_razaoSocial"),
      cnpj: get("c_cnpj"),
      endereco: get("c_endereco"),
      repNome: get("c_repNome"),
      repCpf: get("c_repCpf"),
    },
    contratada: CONTRATADA_FIXA,
    objeto: {
      objeto: get("o_objeto"),
      campos: collectEscopoCampos(),
    },
    honorarios: {
      temValorProvisorio: checked("h_temValorProvisorio"),
      valorProvisorio: get("h_valorProvisorio"),
      provisorioValidoAte: get("h_provisorioValidoAte"),
      valorCheio: get("h_valorCheio"),
      temDesconto: checked("h_temDesconto"),
      valorDesconto: get("h_valorDesconto"),
      descontoInicio: get("h_descontoInicio"),
      descontoFim: get("h_descontoFim"),
      vencimentoDia: get("h_vencimentoDia"),
      sistemasTerceiros: get("h_sistemasTerceiros"),
    },
    contratantesAdicionais: collectContratantesAdicionais(),
    vigencia: {
      inicio: get("v_inicio"),
      fim: get("v_fim"),
      avisoPrevio: get("v_avisoPrevio"),
      temFidelidade: checked("f_temFidelidade"),
      multaPercent: get("f_multaPercent"),
    },
    foro: {
      foro: get("foro_cidade"),
      local: get("a_local"),
      data: get("a_data"),
      test1Nome: get("a_test1Nome"),
      test1Cpf: get("a_test1Cpf"),
      test2Nome: get("a_test2Nome"),
      test2Cpf: get("a_test2Cpf"),
    },
  };
}

// --- Empresas adicionais (grupo econômico no mesmo contrato) -------------
// Mesmo instrumento, mesmas cláusulas e mesmos honorários — cada empresa
// adicional só ganha seu próprio quadro de identificação (CNPJ, endereço,
// representante) no documento, como CONTRATANTE adicional.

let contratanteAdicionalCountOrc = 0;

function addContratanteAdicionalRow(empresa) {
  empresa = empresa || {};
  const id = contratanteAdicionalCountOrc++;
  const wrap = document.createElement("div");
  wrap.className = "alteracao-row";
  wrap.dataset.contratanteRow = id;
  wrap.innerHTML = `
    <button type="button" class="alteracao-remove" data-remove-contratante="${id}">Remover ✕</button>
    <label>Razão Social
      <input type="text" class="ca-razaoSocial" placeholder="Nome da empresa">
    </label>
    <label>CNPJ
      <input type="text" class="ca-cnpj" placeholder="00.000.000/0000-00">
    </label>
    <label>Endereço completo
      <input type="text" class="ca-endereco" placeholder="Rua, número, bairro, cidade/UF, CEP">
    </label>
    <div class="row">
      <label>Nome do representante
        <input type="text" class="ca-repNome" placeholder="Nome do sócio/representante">
      </label>
      <label class="small">CPF
        <input type="text" class="ca-repCpf" placeholder="000.000.000-00">
      </label>
    </div>
  `;
  document.getElementById("contratantes-adicionais-list").appendChild(wrap);
  wrap.querySelector(".ca-razaoSocial").value = empresa.razaoSocial || "";
  wrap.querySelector(".ca-cnpj").value = empresa.cnpj || "";
  wrap.querySelector(".ca-endereco").value = empresa.endereco || "";
  wrap.querySelector(".ca-repNome").value = empresa.repNome || "";
  wrap.querySelector(".ca-repCpf").value = empresa.repCpf || "";

  wrap.querySelectorAll("input").forEach((el) => el.addEventListener("input", updatePreview));
  wrap.querySelector("[data-remove-contratante]").addEventListener("click", () => {
    wrap.remove();
    updatePreview();
  });
}

function collectContratantesAdicionais() {
  return Array.from(document.querySelectorAll("#contratantes-adicionais-list .alteracao-row"))
    .map((row) => ({
      razaoSocial: row.querySelector(".ca-razaoSocial").value,
      cnpj: row.querySelector(".ca-cnpj").value,
      endereco: row.querySelector(".ca-endereco").value,
      repNome: row.querySelector(".ca-repNome").value,
      repCpf: row.querySelector(".ca-repCpf").value,
    }))
    .filter((e) => e.razaoSocial || e.cnpj);
}

function setupContratantesAdicionais() {
  document.getElementById("add-contratante-adicional").addEventListener("click", () => {
    addContratanteAdicionalRow();
    updatePreview();
  });
}

// --- Paginação por medição real no navegador -----------------------------
//
// Antes disso, quem decidia onde cada cláusula/quadro do contrato terminava
// era o próprio motor de impressão do navegador (CSS/fluxo natural) — só
// que ele não tem como saber, sem renderizar de verdade, quanto cabe numa
// folha A4, e às vezes corta uma tabela ou um parágrafo bem no meio (bug
// observado e reproduzido, documentado em app-orcamento.js). Aqui cada
// bloco do contrato (ver montarBlocosContrato em contract-template.js) é
// renderizado escondido, medido de verdade (getBoundingClientRect) e só
// depois agrupado em folhas — o resultado é pré-paginado: cada
// .contract-page final já sabe que cabe inteira numa folha A4, então vira
// sua própria página impressa sem depender de heurística nenhuma do
// navegador. A mesma função gera tanto a pré-visualização na tela quanto o
// que sai no Imprimir/Exportar PDF — os dois são sempre idênticos.

// 277mm (folha A4 menos os 10mm de margem de cada lado do @page) a 96dpi.
const CONTRATO_PAGINA_ALTURA_UTIL_PX = 1047;
// Padding vertical de .contract-page (24px em cima + 24px embaixo).
const CONTRATO_PADDING_VERTICAL_PX = 48;
// Precisa bater com o gap: 12px da regra .contract-page > * + * no CSS.
const CONTRATO_BLOCO_GAP_PX = 12;

function medirBlocosContrato(blocosHtml, contratada) {
  const medidorWrap = document.createElement("div");
  medidorWrap.className = "contract-pages-wrap";
  medidorWrap.style.cssText = "position:absolute; visibility:hidden; left:-9999px; top:0; width:718px;";

  const medidorPagina = document.createElement("div");
  medidorPagina.className = "contract-page";
  medidorWrap.appendChild(medidorPagina);

  const wrappers = blocosHtml.map((html) => {
    const w = document.createElement("div");
    w.innerHTML = html;
    medidorPagina.appendChild(w);
    return w;
  });
  const brandWrapper = document.createElement("div");
  brandWrapper.innerHTML = brandBarContrato(contratada);
  medidorPagina.appendChild(brandWrapper);
  const footerWrapper = document.createElement("div");
  footerWrapper.innerHTML = pageFooterContrato(contratada);
  medidorPagina.appendChild(footerWrapper);

  document.body.appendChild(medidorWrap);
  const alturas = wrappers.map((w) => w.getBoundingClientRect().height);
  const alturaBrand = brandWrapper.getBoundingClientRect().height;
  const alturaFooter = footerWrapper.getBoundingClientRect().height;
  document.body.removeChild(medidorWrap);

  return { alturas, alturaBrand, alturaFooter };
}

// Empacota os blocos em folhas por altura real: acumula um bloco por vez
// na folha atual enquanto couber no orçamento de altura útil; quando o
// próximo bloco não cabe mais, fecha a folha e começa uma nova. Cada bloco
// (cláusula inteira, quadro de identificação, etc.) é indivisível — nunca é
// cortado ao meio entre duas folhas.
function paginarBlocosContrato(blocos, contratada) {
  if (blocos.length === 0) return [];
  const { alturas, alturaBrand, alturaFooter } = medirBlocosContrato(blocos.map((b) => b.html), contratada);
  const orcamentoUtil = CONTRATO_PAGINA_ALTURA_UTIL_PX - CONTRATO_PADDING_VERTICAL_PX - alturaBrand - alturaFooter - CONTRATO_BLOCO_GAP_PX * 2;

  const paginas = [];
  let paginaAtual = [];
  let alturaAtual = 0;

  blocos.forEach((bloco, i) => {
    const alturaBloco = alturas[i];
    const gap = paginaAtual.length > 0 ? CONTRATO_BLOCO_GAP_PX : 0;
    if (paginaAtual.length > 0 && alturaAtual + gap + alturaBloco > orcamentoUtil) {
      paginas.push(paginaAtual);
      paginaAtual = [];
      alturaAtual = 0;
    }
    paginaAtual.push(bloco);
    alturaAtual += (paginaAtual.length > 1 ? CONTRATO_BLOCO_GAP_PX : 0) + alturaBloco;
  });
  if (paginaAtual.length > 0) paginas.push(paginaAtual);
  return paginas;
}

function montarPreviewPaginadoContrato(data) {
  const blocos = montarBlocosContrato(data);
  const paginas = paginarBlocosContrato(blocos, data.contratada);
  return paginas
    .map((paginaBlocos) => `
      <section class="contract-page" data-pdf-page>
        ${brandBarContrato(data.contratada)}
        ${paginaBlocos.map((b) => `<div class="contract-bloco">${b.html}</div>`).join("")}
        ${pageFooterContrato(data.contratada)}
      </section>`)
    .join("");
}

function updatePreview() {
  const data = collectFormData();
  document.getElementById("contract-preview").innerHTML = montarPreviewPaginadoContrato(data);
}

function setupLiveUpdate() {
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });
}

function setupPanelToggles() {
  document.querySelectorAll(".panel-toggle").forEach((h2) => {
    h2.addEventListener("click", () => {
      const body = document.getElementById(h2.dataset.target);
      body.classList.toggle("collapsed");
    });
  });
}

function setupConditionalFields() {
  const descontoCheckbox = document.getElementById("h_temDesconto");
  const descontoWrap = document.getElementById("h_descontoWrap");
  const syncDesconto = () => descontoWrap.classList.toggle("hidden", !descontoCheckbox.checked);
  descontoCheckbox.addEventListener("change", () => { syncDesconto(); updatePreview(); });
  syncDesconto();

  // Valor provisório substitui o fluxo normal de valor cheio/desconto
  // enquanto não houver reunião pra definir o valor definitivo — os dois
  // modos são mutuamente exclusivos na tela (o contrato só usa um ou outro).
  const provisorioCheckbox = document.getElementById("h_temValorProvisorio");
  const provisorioWrap = document.getElementById("h_provisorioWrap");
  const valorCheioWrap = document.getElementById("h_valorCheioWrap");
  const syncProvisorio = () => {
    provisorioWrap.classList.toggle("hidden", !provisorioCheckbox.checked);
    valorCheioWrap.classList.toggle("hidden", provisorioCheckbox.checked);
  };
  provisorioCheckbox.addEventListener("change", () => { syncProvisorio(); updatePreview(); });
  syncProvisorio();

  const fidelidadeCheckbox = document.getElementById("f_temFidelidade");
  const multaWrap = document.getElementById("f_multaWrap");
  const syncFidelidade = () => multaWrap.classList.toggle("hidden", !fidelidadeCheckbox.checked);
  fidelidadeCheckbox.addEventListener("change", () => { syncFidelidade(); updatePreview(); });
  syncFidelidade();
}

// --- Campos do Resumo do Escopo (Anexo 1) — lista livre, não mais fixa ---
// Cada linha (nome do campo + texto) vira uma linha da tabela "Resumo do
// Escopo" no contrato, na mesma ordem em que aparece aqui — adicionável e
// removível na tela, em vez dos 7 campos fixos de antes.

let escopoCampoCount = 0;

function addEscopoCampoRow(campo) {
  campo = campo || {};
  const id = escopoCampoCount++;
  const wrap = document.createElement("div");
  wrap.className = "alteracao-row";
  wrap.dataset.escopoRow = id;
  wrap.innerHTML = `
    <button type="button" class="alteracao-remove" data-remove-escopo-campo="${id}">Remover ✕</button>
    <label>Nome do campo
      <input type="text" class="ec-label" placeholder="ex: Parte fiscal">
    </label>
    <label>Texto
      <textarea class="ec-texto" rows="2" placeholder="Descrição desse campo do escopo"></textarea>
    </label>
  `;
  document.getElementById("escopo-campos-list").appendChild(wrap);
  wrap.querySelector(".ec-label").value = campo.label || "";
  wrap.querySelector(".ec-texto").value = campo.texto || "";

  wrap.querySelectorAll(".ec-label, .ec-texto").forEach((el) => {
    el.addEventListener("input", updatePreview);
  });
  wrap.querySelector("[data-remove-escopo-campo]").addEventListener("click", () => {
    wrap.remove();
    updatePreview();
  });
}

function collectEscopoCampos() {
  return Array.from(document.querySelectorAll("#escopo-campos-list .alteracao-row"))
    .map((row) => ({
      label: row.querySelector(".ec-label").value,
      texto: row.querySelector(".ec-texto").value,
    }))
    .filter((c) => c.label || c.texto);
}

function setupEscopoCampos() {
  document.getElementById("add-escopo-campo").addEventListener("click", () => {
    addEscopoCampoRow();
    updatePreview();
  });
}

// Só popula na primeira vez (lista ainda vazia) — depois disso quem decide
// o que tem na lista é o usuário (adicionar/editar/remover na tela).
function setupEscopoDefaults() {
  const lista = document.getElementById("escopo-campos-list");
  if (lista.children.length > 0) return;

  const saved = localStorage.getItem(ESCOPO_STORAGE_KEY);
  let defaults = ESCOPO_DEFAULTS;
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) defaults = parsed;
    } catch (e) { /* ignora dados corrompidos */ }
  }
  defaults.forEach((campo) => addEscopoCampoRow(campo));
}

function renderContratadaFixa() {
  document.getElementById("fixed-razaoSocial").textContent = CONTRATADA_FIXA.razaoSocial;
  document.getElementById("fixed-cnpj").textContent = "CNPJ: " + CONTRATADA_FIXA.cnpj;
  document.getElementById("fixed-endereco").textContent = CONTRATADA_FIXA.endereco;
  document.getElementById("fixed-contato").textContent = CONTRATADA_FIXA.contato;
  document.getElementById("fixed-responsavel").textContent = `${CONTRATADA_FIXA.responsavel} — CRC ${CONTRATADA_FIXA.crc}`;
}

function setupEscopoPersistence() {
  document.getElementById("save-escopo").addEventListener("click", () => {
    const escopo = collectEscopoCampos();
    localStorage.setItem(ESCOPO_STORAGE_KEY, JSON.stringify(escopo));

    const status = document.getElementById("pdf-status");
    status.textContent = "Escopo padrão salvo neste navegador.";
    status.className = "pdf-status ok";
  });
}

function setupPdfImport() {
  const input = document.getElementById("pdf-input");
  const status = document.getElementById("pdf-status");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo PDF...";
    status.className = "pdf-status";

    try {
      const text = await extractTextFromPdf(file);
      const parsed = parseCnpjCardText(text);

      let foundCount = 0;
      const setIfFound = (id, value) => {
        if (value) {
          document.getElementById(id).value = value;
          foundCount++;
        }
      };

      setIfFound("c_razaoSocial", parsed.razaoSocial);
      setIfFound("c_cnpj", parsed.cnpj);

      const enderecoPartes = [parsed.endereco, parsed.bairro, [parsed.cidade, parsed.estado].filter(Boolean).join("/"), parsed.cep ? "CEP " + parsed.cep : ""]
        .filter(Boolean)
        .join(", ");
      if (enderecoPartes) {
        document.getElementById("c_endereco").value = enderecoPartes;
        foundCount++;
      }

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não foi possível reconhecer os dados neste PDF. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updatePreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o PDF. Preencha manualmente.";
      status.className = "pdf-status error";
    }
  });
}

function setupDocxImport() {
  const input = document.getElementById("docx-input");
  const status = document.getElementById("docx-status");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo o Word...";
    status.className = "pdf-status";

    try {
      const text = await extractTextFromDocx(file);
      const parsed = parseContratanteFromDocxText(text);

      let foundCount = 0;
      const setIfFound = (id, value) => {
        if (value) {
          document.getElementById(id).value = value;
          foundCount++;
        }
      };

      setIfFound("c_razaoSocial", parsed.razaoSocial);
      setIfFound("c_cnpj", parsed.cnpj);
      setIfFound("c_endereco", parsed.endereco);
      setIfFound("c_repNome", parsed.repNome);
      setIfFound("c_repCpf", parsed.repCpf);

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente a partir do Word. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não consegui reconhecer os dados neste arquivo. Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updatePreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o arquivo Word. Confira se é um .docx válido.";
      status.className = "pdf-status error";
    }
  });
}

// Importa um contrato de Prestação de Serviços já emitido por este sistema
// (PDF com texto selecionável) de volta pro formulário — ver
// parseContratoServicosPdfText em pdf-extractor.js pros detalhes de onde
// cada campo vem e a limitação com PDF gerado como imagem (pós-correção do
// bug de corte de página).
function setupContratoPdfImport() {
  const input = document.getElementById("contrato-pdf-input");
  const status = document.getElementById("contrato-pdf-status");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo PDF...";
    status.className = "pdf-status";

    try {
      const text = await extractTextFromPdf(file);
      const parsed = parseContratoServicosPdfText(text);

      let foundCount = 0;
      const setIfFound = (id, value) => {
        if (value) {
          document.getElementById(id).value = value;
          foundCount++;
        }
      };
      const setCheckboxIfFound = (id, value) => {
        if (value === undefined) return;
        const el = document.getElementById(id);
        el.checked = value;
        el.dispatchEvent(new Event("change"));
        foundCount++;
      };

      setIfFound("c_razaoSocial", parsed.c_razaoSocial);
      setIfFound("c_cnpj", parsed.c_cnpj);
      setIfFound("c_endereco", parsed.c_endereco);
      setIfFound("c_repNome", parsed.c_repNome);
      setIfFound("c_repCpf", parsed.c_repCpf);

      setIfFound("o_objeto", parsed.o_objeto);

      // Campos do Resumo do Escopo do PDF substituem os que já estivessem
      // na tela (mesmo critério das empresas adicionais).
      if (parsed.escopoCampos && parsed.escopoCampos.length > 0) {
        document.getElementById("escopo-campos-list").innerHTML = "";
        parsed.escopoCampos.forEach((campo) => {
          addEscopoCampoRow(campo);
          foundCount++;
        });
      }

      // Valor provisório e desconto são mutuamente exclusivos no formulário
      // (ver setupConditionalFields) — marca só o que foi encontrado no PDF.
      if (parsed.h_temValorProvisorio) {
        setCheckboxIfFound("h_temValorProvisorio", true);
        setIfFound("h_valorProvisorio", parsed.h_valorProvisorio);
        setIfFound("h_provisorioValidoAte", parsed.h_provisorioValidoAte);
      } else {
        setIfFound("h_valorCheio", parsed.h_valorCheio);
        if (parsed.h_temDesconto) {
          setCheckboxIfFound("h_temDesconto", true);
          setIfFound("h_valorDesconto", parsed.h_valorDesconto);
          setIfFound("h_descontoInicio", parsed.h_descontoInicio);
          setIfFound("h_descontoFim", parsed.h_descontoFim);
        }
      }
      setIfFound("h_vencimentoDia", parsed.h_vencimentoDia);
      setIfFound("h_sistemasTerceiros", parsed.h_sistemasTerceiros);

      setIfFound("v_inicio", parsed.v_inicio);
      setIfFound("v_fim", parsed.v_fim);
      setIfFound("v_avisoPrevio", parsed.v_avisoPrevio);
      setCheckboxIfFound("f_temFidelidade", parsed.f_temFidelidade);
      setIfFound("f_multaPercent", parsed.f_multaPercent);

      setIfFound("foro_cidade", parsed.foro_cidade);
      setIfFound("a_local", parsed.a_local);
      setIfFound("a_data", parsed.a_data);
      setIfFound("a_test1Nome", parsed.a_test1Nome);
      setIfFound("a_test1Cpf", parsed.a_test1Cpf);
      setIfFound("a_test2Nome", parsed.a_test2Nome);
      setIfFound("a_test2Cpf", parsed.a_test2Cpf);

      // Empresas adicionais do PDF substituem as que já estivessem na tela
      // (reimportar um contrato é um recomeço, não uma mescla).
      if (parsed.contratantesAdicionais && parsed.contratantesAdicionais.length > 0) {
        document.getElementById("contratantes-adicionais-list").innerHTML = "";
        parsed.contratantesAdicionais.forEach((empresa) => {
          addContratanteAdicionalRow(empresa);
          foundCount++;
        });
      }

      if (foundCount > 0) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente a partir do PDF. Confira os dados.`;
        status.className = "pdf-status ok";
      } else {
        status.textContent = "Não consegui reconhecer os dados neste PDF — provavelmente é um PDF sem texto selecionável (gerado como imagem, ou escaneado). Preencha manualmente.";
        status.className = "pdf-status error";
      }

      updatePreview();
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o PDF. Confira se o arquivo não está corrompido.";
      status.className = "pdf-status error";
    }
  });
}

function empresaToContratante(empresa) {
  const enderecoPartes = [
    empresa.endereco,
    empresa.bairro,
    [empresa.cidade, empresa.estado].filter(Boolean).join("/"),
    empresa.cep ? "CEP " + empresa.cep : "",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    razaoSocial: empresa.contratante || "",
    cnpj: empresa.cnpj || "",
    endereco: enderecoPartes,
    repNome: empresa.administracao || empresa.socio1 || "",
  };
}

async function setupEmpresasContrato() {
  const select = document.getElementById("empresa-select");
  const search = document.getElementById("empresa-search");
  const status = document.getElementById("empresa-status");

  let picker = { refresh: async () => {} };
  status.textContent = "Carregando empresas...";
  status.className = "pdf-status";
  try {
    picker = await initEmpresaPicker(search, select, "— Selecione uma empresa —");
    status.textContent = "";
  } catch (err) {
    console.error(err);
    status.textContent = "Não foi possível conectar ao banco de empresas.";
    status.className = "pdf-status error";
  }

  select.addEventListener("change", async () => {
    if (!select.value) return;
    status.textContent = "Carregando...";
    status.className = "pdf-status";
    try {
      const empresa = await getEmpresa(select.value);
      if (!empresa) return;
      const mapped = empresaToContratante(empresa);
      document.getElementById("c_razaoSocial").value = mapped.razaoSocial;
      document.getElementById("c_cnpj").value = mapped.cnpj;
      document.getElementById("c_endereco").value = mapped.endereco;
      document.getElementById("c_repNome").value = mapped.repNome;
      updatePreview();
      updateDriveFolderLink(document.getElementById("empresa-drive-link"), empresa.driveFolders && empresa.driveFolders.contrato);
      status.textContent = "Dados do cliente carregados. Confira o CPF do representante.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao carregar a empresa.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("empresa-drive").addEventListener("click", async () => {
    if (!driveConfigured()) {
      status.textContent = "A integração com o Google Drive ainda não foi configurada.";
      status.className = "pdf-status error";
      return;
    }
    const nome = get("c_razaoSocial");
    const cnpj = get("c_cnpj");
    if (!nome) {
      status.textContent = "Preencha ao menos a Razão Social do contratante antes de salvar no Drive.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando contrato no Drive...";
    status.className = "pdf-status";
    try {
      const data = { contratante: nome, cnpj, endereco: get("c_endereco"), administracao: get("c_repNome") };
      const record = await upsertEmpresa(data, select.value || null);
      await picker.refresh();
      select.value = record.id;
      const result = await saveDocumentToDrive({ elementId: "contract-preview", empresaId: record.id, empresaNome: nome, cnpj, tipoLabel: "Contrato", tipoKey: "contrato" });
      updateDriveFolderLink(document.getElementById("empresa-drive-link"), result.folderId);
      status.textContent = "Contrato salvo no Drive.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar no Drive: " + err.message;
      status.className = "pdf-status error";
    }
  });
}

function setupActions() {
  document.getElementById("btn-print").addEventListener("click", async () => {
    const btn = document.getElementById("btn-print");
    const nome = get("c_razaoSocial") || "Contrato";
    const textoOriginal = btn.textContent;
    btn.textContent = "Gerando PDF...";
    btn.disabled = true;
    try {
      const pageEls = Array.from(document.querySelectorAll("#contract-preview .contract-page"));
      const pdf = await montarPdfPorPaginas(pageEls);
      pdf.save(`Contrato - ${nome}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Não foi possível gerar o PDF: " + (err && err.message ? err.message : "erro desconhecido."));
    } finally {
      btn.textContent = textoOriginal;
      btn.disabled = false;
    }
  });

  document.getElementById("btn-word").addEventListener("click", () => {
    const nome = get("c_razaoSocial") || "Contrato";
    exportElementAsWord("contract-preview", `Contrato de Prestação de Serviços - ${nome}`);
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos do contratante e das condições do contrato?")) return;
    FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el.type === "checkbox") return;
      el.value = "";
    });
    document.getElementById("h_temDesconto").checked = false;
    document.getElementById("h_temValorProvisorio").checked = false;
    document.getElementById("f_temFidelidade").checked = true;
    document.getElementById("f_multaPercent").value = "30";
    document.getElementById("v_avisoPrevio").value = "30";
    document.getElementById("pdf-input").value = "";
    document.getElementById("pdf-status").textContent = "";
    document.getElementById("docx-input").value = "";
    document.getElementById("docx-status").textContent = "";
    document.getElementById("contratantes-adicionais-list").innerHTML = "";
    document.getElementById("escopo-campos-list").innerHTML = "";
    setupEscopoDefaults();
    setupConditionalFields();
    updatePreview();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderContratadaFixa();
  setupPanelToggles();
  setupConditionalFields();
  setupEscopoCampos();
  setupEscopoPersistence();
  setupEscopoDefaults();
  setupLiveUpdate();
  setupPdfImport();
  setupDocxImport();
  setupContratoPdfImport();
  setupEmpresasContrato();
  setupContratantesAdicionais();
  setupActions();
  updatePreview();
});
