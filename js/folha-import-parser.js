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

// Tira acento pra comparar — cabeçalhos reais variam entre "Descrição" e
// "Descricao" sem padrão, então os sinônimos abaixo não precisam listar as
// duas formas de cada palavra.
function semAcento(str) {
  return String(str || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function mapearColunas(headerRow, sinonimos) {
  const mapa = {};
  headerRow.forEach((titulo, idx) => {
    const normalizado = semAcento(String(titulo || "").trim().toLowerCase());
    Object.keys(sinonimos).forEach((campo) => {
      if (mapa[campo] !== undefined) return;
      if (sinonimos[campo].some((s) => { const sNorm = semAcento(s); return normalizado === sNorm || normalizado.includes(sNorm); })) mapa[campo] = idx;
    });
  });
  return mapa;
}

function linhasParaFuncionarios(linhas) {
  if (linhas.length < 2) return [];
  const mapa = mapearColunas(linhas[0], SINONIMOS_COLUNA_FUNCIONARIO);
  if (mapa.cpf === undefined && mapa.nome === undefined) return [];

  const funcionarios = linhas.slice(1)
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

  // Uma planilha com só uma coluna de nome batendo por coincidência (ex: um
  // relatório de horas extras com "Colaborador") e mais NADA reconhecível
  // (sem CPF, cargo, salário, admissão ou matrícula em nenhuma linha) não é
  // evidência suficiente de que isso é uma lista de funcionários — melhor não
  // sugerir "novo funcionário" nenhum do que sugerir cadastros levianamente a
  // partir de um nome mencionado num relatório de outra natureza.
  const temAlgumSinalAlemDoNome = funcionarios.some((f) => f.cpf || f.matricula || f.cargo || f.salario !== null || f.admissao);
  if (!temAlgumSinalAlemDoNome) return [];

  return funcionarios;
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

// --- 6. PDF por posição + formato "Extrato Mensal" (folha analítica real) ---
//
// Descoberta ao testar com folhas reais: o pdf.js (extractTextFromPdf, em
// pdf-extractor.js) devolve os fragmentos de texto na ordem em que aparecem
// no stream do PDF, que para esse tipo de relatório NÃO é a ordem de leitura
// visual (rótulo e valor saem longe um do outro). Por isso o Folha usa sua
// própria extração, reagrupando os fragmentos por posição (Y vira a linha, X
// ordena dentro da linha) — o mesmo princípio de um "pdftotext -layout". Isso
// fica só aqui (não mexe em extractTextFromPdf, usada por outros importadores
// do sistema que já dependem do comportamento atual).
async function extractTextoPdfPorPosicao(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let textoFinal = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const content = await pagina.getTextContent();
    const porY = {};
    content.items.forEach((item) => {
      if (!item.str || !item.str.trim()) return;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!porY[y]) porY[y] = [];
      porY[y].push({ x, str: item.str });
    });
    // Linhas com Y a até 2px de distância são a mesma linha visual (pequenas
    // variações de baseline entre fontes/tamanhos na mesma linha).
    const ys = Object.keys(porY).map(Number).sort((a, b) => b - a);
    const grupos = [];
    let atual = null;
    ys.forEach((y) => {
      if (atual && Math.abs(atual.y - y) <= 2) atual.itens.push(...porY[y]);
      else { atual = { y, itens: [...porY[y]] }; grupos.push(atual); }
    });
    grupos.forEach((g) => {
      g.itens.sort((a, b) => a.x - b.x);
      textoFinal += g.itens.map((it) => it.str).join(" ").replace(/\s+/g, " ").trim() + "\n";
    });
  }
  return textoFinal;
}

// "Extrato Mensal" é o nome do relatório usado por sistemas de folha bem
// difundidos (ex: Domínio) — um bloco por funcionário, com rótulos fixos
// (Empr./Situação/CPF/Adm/Cargo/C.B.O/Salário) e as rubricas do mês em duas
// colunas (proventos à esquerda, descontos à direita).
function pareceExtratoMensalDominio(texto) {
  return /EXTRATO MENSAL/.test(texto) && /Empr\.\s*:/.test(texto);
}

function parseExtratoMensalDominio(texto) {
  const avisos = [];

  const mEmpresa = texto.match(/Empresa:\s*(?:\d+\s*-\s*)?([^\n]+?)\s+Página/);
  const mCnpj = texto.match(/CNPJ:\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
  const empresaDetectada = mCnpj ? { nome: mEmpresa ? mEmpresa[1].trim() : "", cnpj: mCnpj[1] } : null;

  const mCompetencia = texto.match(/Competência:\s*(\d{1,2})\s*\/\s*(\d{4})/);
  const competenciaDetectada = mCompetencia ? `${mCompetencia[2]}-${mCompetencia[1].padStart(2, "0")}` : null;

  // Tira o resumo agregado ("Resumo por Rubrica" + totais de INSS/FGTS/IRRF
  // que vêm na sequência) — não pertence a nenhum funcionário específico e
  // atrapalharia a extração por bloco.
  const semResumo = texto.replace(/Resumo por Rubrica[\s\S]*?(?=Empr\.\s*:|$)/g, "");

  const regexEmpregado = /Empr\.\s*:\s*(\d+)\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú'`\s]+?)\s+Situação\s*:\s*(\S+)\s+CPF\s*:\s*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\s+Adm\s*:\s*(\d{2}\/\d{2}\/\d{4})/g;
  const posicoes = [];
  let m;
  while ((m = regexEmpregado.exec(semResumo))) {
    posicoes.push({
      index: m.index,
      matricula: m[1],
      nome: m[2].trim(),
      cpf: normalizarCpf(m[4]),
      admissao: parseDataBrImport(m[5]),
    });
  }

  const funcionarios = [];
  const apontamentos = [];

  posicoes.forEach((pos, i) => {
    const fim = i + 1 < posicoes.length ? posicoes[i + 1].index : semResumo.length;
    const bloco = semResumo.slice(pos.index, fim);

    const mCargo = bloco.match(/Cargo\s*:\s*\d*\s*([A-ZÀ-Úa-zà-ú0-9\/\s-]+?)\s+C\.B\.O/);
    const mSalario = bloco.match(/Salário\s*:\s*([\d.,]+)/);

    funcionarios.push({
      nome: pos.nome,
      cpf: pos.cpf,
      matricula: pos.matricula,
      cargo: mCargo ? mCargo[1].trim() : "",
      salario: mSalario ? parseValorFolha(mSalario[1]) : null,
      admissao: pos.admissao || null,
    });

    // Só os lançamentos de verdade: começa DEPOIS do valor de "Salário:" (senão
    // o final desse valor, ex: a dezena de "2.735,20", pode virar um falso
    // "código de rubrica" por coincidência de dígitos) e termina em "ND: <n>",
    // onde começa o resumo de totais daquele funcionário.
    const inicioRubricas = mSalario ? mSalario.index + mSalario[0].length : 0;
    const blocoRubricas = bloco.slice(inicioRubricas).split(/\bND\s*:\s*\d/)[0];
    const regexRubrica = /(\d{2,6})\s+([A-Za-zÀ-ÿ0-9ºª%\/.()'-]+(?:\s+[A-Za-zÀ-ÿ0-9ºª%\/.()'-]+)*?)\s+([\d.,]+)\s+([\d.,]+)\s+([PD])\b/g;
    let r;
    while ((r = regexRubrica.exec(blocoRubricas))) {
      apontamentos.push({
        funcionarioNome: pos.nome,
        funcionarioCpf: pos.cpf,
        rubricaCodigo: r[1],
        rubricaDescricao: r[2].trim(),
        referencia: parseValorFolha(r[3]),
        valor: parseValorFolha(r[4]),
        tipoEventoSugerido: sugerirTipoEvento(r[2]),
      });
    }
  });

  if (posicoes.length === 0) avisos.push("O documento parece ser um Extrato Mensal, mas não foi possível reconhecer nenhum bloco de funcionário dentro dele — confira o layout manualmente.");

  return { empresaDetectada, competenciaDetectada, funcionarios, apontamentos, avisos };
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

  let resultadoExtratoMensal = null;
  if (tipoDetectado === "pdf") {
    texto = await extractTextoPdfPorPosicao(file);
    if (!texto.trim()) avisos.push("O PDF não tem texto selecionável (provavelmente é uma imagem/scan) — não foi possível ler o conteúdo.");
    else if (pareceExtratoMensalDominio(texto)) resultadoExtratoMensal = parseExtratoMensalDominio(texto);
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

  let empresaDetectada;
  let competenciaDetectada;

  if (resultadoExtratoMensal) {
    funcionarios = resultadoExtratoMensal.funcionarios;
    apontamentos = resultadoExtratoMensal.apontamentos;
    empresaDetectada = resultadoExtratoMensal.empresaDetectada;
    competenciaDetectada = resultadoExtratoMensal.competenciaDetectada;
    avisos.push(...resultadoExtratoMensal.avisos);
  } else {
    if (texto && funcionarios.length === 0) funcionarios = extrairFuncionariosDeTexto(texto);
    if (texto && apontamentos.length === 0) apontamentos = extrairApontamentosDeTexto(texto);
    empresaDetectada = texto ? detectarEmpresaEmTexto(texto) : null;
    competenciaDetectada = texto ? detectarCompetenciaEmTexto(texto) : null;
  }

  if (!empresaDetectada) avisos.push("Não foi possível identificar a empresa com segurança neste documento — confirme manualmente antes de prosseguir.");
  if (!competenciaDetectada) avisos.push("Não foi possível identificar a competência (mês/ano) deste documento — confirme manualmente antes de prosseguir.");
  if (funcionarios.length === 0 && apontamentos.length === 0) avisos.push("Não foi encontrado nenhum funcionário ou rubrica reconhecível neste documento.");

  return { arquivoNome: file.name, tipoDetectado, empresaDetectada, competenciaDetectada, funcionarios, apontamentos, avisos };
}
