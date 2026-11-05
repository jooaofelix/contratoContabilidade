// Parser universal de documentos de Departamento Pessoal — item 1 da
// especificação da Central de Importação e Atualização Inteligente.
//
// IMPORTANTE sobre o que isso É e o que NÃO é: isso é reconhecimento de
// padrões de texto/tabela (mesma técnica já usada em pdf-extractor.js pro
// cartão CNPJ e contratos), não um modelo de IA generalista que "entende"
// qualquer documento. Funciona bem com layouts tabulares usuais (folha
// analítica, relação de empregados, planilha de salários) e com campos
// identificados por rótulo. Documentos muito fora do padrão, ou imagens sem
// camada de texto (foto/scan sem OCR), não têm como ser lidos com confiança
// — por isso toda saída traz "avisos" e nunca finge ter certeza.
//
// Saída comum de parseDocumentoFolha(file), não importa o formato de origem:
// {
//   arquivoNome, tipoDetectado,
//   empresaDetectada: {nome, cnpj} | null,
//   competenciaDetectada: "AAAA-MM" | null,
//   funcionarios: [{nome, cpf, matricula, cargo, salario, admissao}],
//   apontamentos: [{funcionarioNome, funcionarioCpf, rubricaCodigo, rubricaDescricao, referencia, valor, tipoEventoSugerido}],
//   avisos: ["texto explicando qualquer incerteza"],
// }

function parseValorFolha(str) {
  if (!str && str !== 0) return null;
  const limpo = String(str).trim().replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  const cleaned = limpo.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// --- 1. Detecção de conteúdo (não só a extensão) ----------------------------

async function detectarTipoArquivo(file) {
  const cabecalho = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const bytes = Array.from(cabecalho).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (bytes.startsWith("25504446")) return "pdf"; // %PDF
  if (bytes.startsWith("ffd8ff")) return "imagem"; // JPEG
  if (bytes.startsWith("89504e47")) return "imagem"; // PNG

  if (bytes.startsWith("504b0304")) {
    // ZIP (docx, xlsx e xls modernos são ZIP por dentro) — espia os nomes dos
    // arquivos internos pra diferenciar, em vez de confiar só na extensão.
    try {
      const zip = await JSZip.loadAsync(file);
      if (zip.file("word/document.xml")) return "docx";
      if (zip.file("xl/workbook.xml") || Object.keys(zip.files).some((n) => n.startsWith("xl/"))) return "xlsx";
    } catch (e) { /* não era um zip válido — cai no texto puro abaixo */ }
  }

  // Formatos de texto: tenta JSON, depois XML, depois assume CSV/TXT.
  const texto = await file.text();
  const amostra = texto.trim().slice(0, 2000);
  if (/^[\[{]/.test(amostra)) {
    try { JSON.parse(texto); return "json"; } catch (e) { /* não era JSON de verdade */ }
  }
  if (/^<\?xml|^<[a-zA-Z]/.test(amostra)) {
    const doc = new DOMParser().parseFromString(texto, "application/xml");
    if (!doc.querySelector("parsererror")) return "xml";
  }
  const extensao = (file.name.split(".").pop() || "").toLowerCase();
  if (extensao === "csv" || (amostra.includes(";") || amostra.includes(",")) && amostra.includes("\n")) return "csv";
  return "txt";
}

// --- 2. Empresa e competência, a partir de texto livre ----------------------

function detectarEmpresaEmTexto(texto) {
  const mCnpj = texto.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
  if (!mCnpj) return null;
  // Nome da empresa costuma vir logo antes do CNPJ num cabeçalho de folha —
  // pega a linha anterior como palpite; sem confiança alta nisso, por isso
  // sempre acompanha de um aviso pedindo confirmação.
  const antes = texto.slice(0, mCnpj.index).trim();
  const linhas = antes.split(/\n|\r/).map((l) => l.trim()).filter(Boolean);
  const nome = linhas.length ? linhas[linhas.length - 1].slice(0, 120) : "";
  return { nome, cnpj: mCnpj[1] };
}

const MESES_NOMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function detectarCompetenciaEmTexto(texto) {
  const baixo = texto.toLowerCase();

  let m = baixo.match(/compet[eê]ncia\s*[:\-]?\s*(\d{1,2})\s*\/\s*(\d{4})/);
  if (m) return `${m[2]}-${m[1].padStart(2, "0")}`;

  m = baixo.match(/compet[eê]ncia\s*[:\-]?\s*([a-zà-ú]+)\s*\/\s*(\d{4})/);
  if (m) {
    const mes = MESES_NOMES.indexOf(m[1]) + 1;
    if (mes) return `${m[2]}-${String(mes).padStart(2, "0")}`;
  }

  for (let i = 0; i < MESES_NOMES.length; i++) {
    const re = new RegExp(`${MESES_NOMES[i]}\\s*(?:de\\s*)?(\\d{4})`);
    const mm = baixo.match(re);
    if (mm) return `${mm[1]}-${String(i + 1).padStart(2, "0")}`;
  }

  m = baixo.match(/\b(0[1-9]|1[0-2])\/(\d{4})\b/);
  if (m) return `${m[2]}-${m[1]}`;

  return null;
}

// --- 3. Funcionários e apontamentos a partir de texto livre (PDF/DOCX/TXT) --

// Uma linha de funcionário quase sempre tem um CPF reconhecível — usa isso
// como âncora e tenta nome/cargo/admissão/salário ao redor dele.
function extrairFuncionariosDeTexto(texto) {
  const linhas = texto.split(/\n|\r/).map((l) => l.replace(/\s{2,}/g, " ").trim()).filter(Boolean);
  const funcionarios = [];
  const cpfRe = /(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/;

  linhas.forEach((linha) => {
    const mCpf = linha.match(cpfRe);
    if (!mCpf || !validarCpf(mCpf[1])) return;

    const antesCpf = linha.slice(0, mCpf.index).trim();
    const depoisCpf = linha.slice(mCpf.index + mCpf[0].length).trim();

    // Nome: maior trecho de letras maiúsculas antes do CPF (descarta
    // matrícula numérica que às vezes vem na frente).
    const nome = (antesCpf.match(/[A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'\s.]{4,60}/) || [""])[0].trim();
    const matricula = (antesCpf.match(/^\s*(\d{1,10})\b/) || [])[1] || "";

    const dataAdmissao = parseDataBrImport(depoisCpf);
    const valores = depoisCpf.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g) || [];
    const salario = valores.length ? parseValorFolha(valores[valores.length - 1]) : null;

    const cargoMatch = depoisCpf.replace(/\d{2}\/\d{2}\/\d{4}/, "").match(/[A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú\s]{3,40}/);
    const cargo = cargoMatch ? cargoMatch[0].trim() : "";

    if (nome) {
      funcionarios.push({ nome, cpf: normalizarCpf(mCpf[1]), matricula, cargo, salario, admissao: dataAdmissao || null });
    }
  });

  return funcionarios;
}

// Uma linha de rubrica/apontamento: código curto + descrição + valor no fim
// (holerite ou relatório de apontamentos), sem CPF na linha.
function extrairApontamentosDeTexto(texto) {
  const linhas = texto.split(/\n|\r/).map((l) => l.replace(/\s{2,}/g, " ").trim()).filter(Boolean);
  const apontamentos = [];
  const linhaRubricaRe = /^([A-Z0-9]{2,6})\s+([A-ZÀ-Úa-zà-ú][A-ZÀ-Úa-zà-ú0-9%\s.-]{3,45}?)\s+(?:(\d{1,4}(?:,\d{2})?)\s+)?(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;

  linhas.forEach((linha) => {
    if (/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/.test(linha)) return; // linha de funcionário, não de rubrica
    const m = linha.match(linhaRubricaRe);
    if (!m) return;
    apontamentos.push({
      rubricaCodigo: m[1],
      rubricaDescricao: m[2].trim(),
      referencia: m[3] ? parseValorFolha(m[3]) : null,
      valor: parseValorFolha(m[4]),
      tipoEventoSugerido: sugerirTipoEvento(m[2]),
    });
  });

  return apontamentos;
}

// Só um PALPITE de classificação (fixa/variável/calculada) pra ajudar a
// organizar a tela — nunca decide incidência tributária sozinho (item 7).
function sugerirTipoEvento(descricao) {
  const baixo = (descricao || "").toLowerCase();
  if (/inss|irrf|fgts|ir\s|previdenc/i.test(baixo)) return "calculado";
  if (/hora extra|falta|atraso|comiss|adiantamento|dsr|not[uú]rno/i.test(baixo)) return "variavel";
  return "fixa";
}

// --- 4. Tabelas (XLSX/CSV) ---------------------------------------------------

function lerLinhasXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error("Erro ao ler a planilha."));
    reader.readAsArrayBuffer(file);
  });
}

async function lerLinhasCsv(file) {
  const texto = await file.text();
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  const separador = (linhas[0] || "").includes(";") ? ";" : ",";
  return linhas.map((l) => l.split(separador).map((c) => c.trim()));
}

const SINONIMOS_COLUNA_FUNCIONARIO = {
  nome: ["nome", "funcionário", "funcionario", "colaborador", "empregado"],
  cpf: ["cpf"],
  matricula: ["matrícula", "matricula", "registro", "matr"],
  cargo: ["cargo", "função", "funcao"],
  salario: ["salário", "salario", "salário base", "remuneração", "remuneracao", "valor"],
  admissao: ["admissão", "admissao", "data admissão", "data de admissão"],
};

const SINONIMOS_COLUNA_RUBRICA = {
  rubricaCodigo: ["código", "codigo", "cód", "cod rubrica", "cód. rubrica"],
  rubricaDescricao: ["descrição", "descricao", "rubrica", "evento", "verba"],
  referencia: ["referência", "referencia", "ref", "quantidade", "qtd"],
  valor: ["valor"],
};

function mapearColunas(headerRow, sinonimos) {
  const mapa = {};
  headerRow.forEach((titulo, idx) => {
    const normalizado = String(titulo || "").trim().toLowerCase();
    Object.keys(sinonimos).forEach((campo) => {
      if (mapa[campo] !== undefined) return;
      if (sinonimos[campo].some((s) => normalizado === s || normalizado.includes(s))) mapa[campo] = idx;
    });
  });
  return mapa;
}

function linhasParaFuncionarios(linhas) {
  if (linhas.length < 2) return [];
  const mapa = mapearColunas(linhas[0], SINONIMOS_COLUNA_FUNCIONARIO);
  if (mapa.cpf === undefined && mapa.nome === undefined) return [];

  return linhas.slice(1)
    .filter((l) => l.some((c) => String(c).trim() !== ""))
    .map((l) => ({
      nome: mapa.nome !== undefined ? String(l[mapa.nome] || "").trim() : "",
      cpf: mapa.cpf !== undefined ? normalizarCpf(l[mapa.cpf]) : "",
      matricula: mapa.matricula !== undefined ? String(l[mapa.matricula] || "").trim() : "",
      cargo: mapa.cargo !== undefined ? String(l[mapa.cargo] || "").trim() : "",
      salario: mapa.salario !== undefined ? parseValorFolha(l[mapa.salario]) : null,
      admissao: mapa.admissao !== undefined ? formatarDataPlanilha(l[mapa.admissao]) : null,
    }))
    .filter((f) => f.nome || f.cpf);
}

function linhasParaApontamentos(linhas) {
  if (linhas.length < 2) return [];
  const mapa = mapearColunas(linhas[0], SINONIMOS_COLUNA_RUBRICA);
  if (mapa.valor === undefined || (mapa.rubricaCodigo === undefined && mapa.rubricaDescricao === undefined)) return [];

  // Se a planilha também tiver coluna de CPF/nome, cada linha é o apontamento
  // de um funcionário específico — guarda pra casar na reconciliação.
  const mapaFunc = mapearColunas(linhas[0], SINONIMOS_COLUNA_FUNCIONARIO);

  return linhas.slice(1)
    .filter((l) => l.some((c) => String(c).trim() !== ""))
    .map((l) => ({
      funcionarioNome: mapaFunc.nome !== undefined ? String(l[mapaFunc.nome] || "").trim() : "",
      funcionarioCpf: mapaFunc.cpf !== undefined ? normalizarCpf(l[mapaFunc.cpf]) : "",
      rubricaCodigo: mapa.rubricaCodigo !== undefined ? String(l[mapa.rubricaCodigo] || "").trim() : "",
      rubricaDescricao: mapa.rubricaDescricao !== undefined ? String(l[mapa.rubricaDescricao] || "").trim() : "",
      referencia: mapa.referencia !== undefined ? parseValorFolha(l[mapa.referencia]) : null,
      valor: parseValorFolha(l[mapa.valor]),
      tipoEventoSugerido: sugerirTipoEvento(mapa.rubricaDescricao !== undefined ? l[mapa.rubricaDescricao] : ""),
    }))
    .filter((a) => a.valor !== null);
}

function formatarDataPlanilha(valor) {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return parseDataBrImport(String(valor || "")) || null;
}

// --- 5. JSON e XML (best-effort, por nome de campo) --------------------------

// Sem schema fixo pra JSON/XML de folha — assume que, se houver uma lista de
// objetos com chaves reconhecíveis (cpf, nome, salario...), é uma lista de
// funcionários; flattening simples, nada de inferência mais profunda.
function objetosParaFuncionarios(lista) {
  return lista
    .filter((o) => o && typeof o === "object")
    .map((o) => {
      const achar = (chaves) => {
        const k = Object.keys(o).find((key) => chaves.includes(key.toLowerCase()));
        return k ? o[k] : null;
      };
      return {
        nome: String(achar(["nome", "funcionario", "funcionário", "colaborador"]) || "").trim(),
        cpf: normalizarCpf(achar(["cpf"])),
        matricula: String(achar(["matricula", "matrícula", "registro"]) || "").trim(),
        cargo: String(achar(["cargo", "funcao", "função"]) || "").trim(),
        salario: parseValorFolha(achar(["salario", "salário", "salariobase", "remuneracao", "remuneração"])),
        admissao: achar(["admissao", "admissão", "dataadmissao"]) || null,
      };
    })
    .filter((f) => f.nome || f.cpf);
}

function xmlParaObjetos(doc) {
  // Pega o elemento repetido com mais ocorrências (ex: <funcionario> dentro
  // de <funcionarios>) e vira uma lista de {tag: texto} por item.
  const contagem = {};
  doc.querySelectorAll("*").forEach((el) => {
    contagem[el.tagName] = (contagem[el.tagName] || 0) + 1;
  });
  const tagRepetida = Object.keys(contagem).filter((t) => contagem[t] > 1).sort((a, b) => contagem[b] - contagem[a])[0];
  if (!tagRepetida) return [];

  return Array.from(doc.getElementsByTagName(tagRepetida)).map((el) => {
    const obj = {};
    Array.from(el.children).forEach((filho) => { obj[filho.tagName.toLowerCase()] = filho.textContent; });
    if (Object.keys(obj).length === 0) obj._texto = el.textContent;
    return obj;
  });
}

// --- Orquestrador -------------------------------------------------------------

async function parseDocumentoFolha(file) {
  const avisos = [];
  const tipoDetectado = await detectarTipoArquivo(file);

  let texto = "";
  let funcionarios = [];
  let apontamentos = [];

  if (tipoDetectado === "imagem") {
    avisos.push("Este arquivo é uma imagem sem leitor de OCR disponível no sistema — não foi possível extrair texto automaticamente. Preencha manualmente ou envie um PDF/planilha com texto selecionável.");
    return { arquivoNome: file.name, tipoDetectado, empresaDetectada: null, competenciaDetectada: null, funcionarios: [], apontamentos: [], avisos };
  }

  if (tipoDetectado === "pdf") {
    texto = await extractTextFromPdf(file);
    if (!texto.trim()) avisos.push("O PDF não tem texto selecionável (provavelmente é uma imagem/scan) — não foi possível ler o conteúdo.");
  } else if (tipoDetectado === "docx") {
    texto = await extractTextFromDocx(file);
  } else if (tipoDetectado === "txt") {
    texto = await file.text();
  } else if (tipoDetectado === "xlsx") {
    const linhas = await lerLinhasXlsx(file);
    funcionarios = linhasParaFuncionarios(linhas);
    apontamentos = linhasParaApontamentos(linhas);
    texto = linhas.map((l) => l.join(" ")).join("\n"); // ainda serve pra achar empresa/competência
  } else if (tipoDetectado === "csv") {
    const linhas = await lerLinhasCsv(file);
    funcionarios = linhasParaFuncionarios(linhas);
    apontamentos = linhasParaApontamentos(linhas);
    texto = linhas.map((l) => l.join(" ")).join("\n");
  } else if (tipoDetectado === "json") {
    const dados = JSON.parse(await file.text());
    const lista = Array.isArray(dados) ? dados : (dados.funcionarios || dados.empregados || [dados]);
    funcionarios = objetosParaFuncionarios(lista);
    texto = JSON.stringify(dados);
  } else if (tipoDetectado === "xml") {
    const doc = new DOMParser().parseFromString(await file.text(), "application/xml");
    funcionarios = objetosParaFuncionarios(xmlParaObjetos(doc));
    texto = doc.documentElement ? doc.documentElement.textContent : "";
  }

  if (texto && funcionarios.length === 0) funcionarios = extrairFuncionariosDeTexto(texto);
  if (texto && apontamentos.length === 0) apontamentos = extrairApontamentosDeTexto(texto);

  const empresaDetectada = texto ? detectarEmpresaEmTexto(texto) : null;
  const competenciaDetectada = texto ? detectarCompetenciaEmTexto(texto) : null;

  if (!empresaDetectada) avisos.push("Não foi possível identificar a empresa com segurança neste documento — confirme manualmente antes de prosseguir.");
  if (!competenciaDetectada) avisos.push("Não foi possível identificar a competência (mês/ano) deste documento — confirme manualmente antes de prosseguir.");
  if (funcionarios.length === 0 && apontamentos.length === 0) avisos.push("Não foi encontrado nenhum funcionário ou rubrica reconhecível neste documento.");

  return { arquivoNome: file.name, tipoDetectado, empresaDetectada, competenciaDetectada, funcionarios, apontamentos, avisos };
}
