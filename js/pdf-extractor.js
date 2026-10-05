// Extração por padrões de texto do "Comprovante de Inscrição e Situação
// Cadastral" (cartão CNPJ) da Receita Federal. Layouts diferentes (ex:
// digitalizado/escaneado) podem não conter texto selecionável e portanto
// não extrair nada.

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
}

async function extractTextFromPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }
  return text;
}

function matchAfterLabel(text, labels, stopLabels) {
  for (const label of labels) {
    const idx = text.indexOf(label);
    if (idx === -1) continue;
    let slice = text.slice(idx + label.length);
    let cut = slice.length;
    for (const stop of stopLabels) {
      const stopIdx = slice.indexOf(stop);
      if (stopIdx !== -1 && stopIdx < cut) cut = stopIdx;
    }
    const value = slice.slice(0, cut).trim().replace(/\s{2,}/g, " ");
    if (value) return value;
  }
  return "";
}

function parseCnpjCardText(text) {
  const clean = text.replace(/\s+/g, " ");

  const cnpjMatch = clean.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);

  const razaoSocial = matchAfterLabel(
    clean,
    ["NOME EMPRESARIAL"],
    ["TÍTULO DO ESTABELECIMENTO", "CÓDIGO E DESCRIÇÃO DA ATIVIDADE"]
  );

  // Restringe a busca de NÚMERO/COMPLEMENTO ao bloco de endereço,
  // pois "NÚMERO" também aparece em "NÚMERO DE INSCRIÇÃO" no topo do documento.
  const logradouroIdx = clean.indexOf("LOGRADOURO");
  const enderecoBlock = logradouroIdx !== -1 ? clean.slice(logradouroIdx, logradouroIdx + 500) : "";

  const logradouro = matchAfterLabel(
    enderecoBlock,
    ["LOGRADOURO"],
    ["NÚMERO", "COMPLEMENTO"]
  );

  const numero = matchAfterLabel(
    enderecoBlock,
    ["NÚMERO"],
    ["COMPLEMENTO", "CEP"]
  );

  const complemento = matchAfterLabel(
    enderecoBlock,
    ["COMPLEMENTO"],
    ["CEP"]
  );

  const bairro = matchAfterLabel(
    enderecoBlock,
    ["BAIRRO/DISTRITO"],
    ["MUNICÍPIO", "CEP"]
  );

  const municipio = matchAfterLabel(
    enderecoBlock,
    ["MUNICÍPIO"],
    ["UF", "CEP"]
  );

  const ufMatch = enderecoBlock.match(/\bUF\b\s*([A-Z]{2})\b/);

  const cepMatch = enderecoBlock.match(/\bCEP\b\s*([\d.\-]{8,10})/);

  const logradouroCompleto = [logradouro, numero ? `nº ${numero}` : "", complemento]
    .filter(Boolean)
    .join(", ");

  const cnaePrincipal = matchAfterLabel(
    clean,
    ["CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL"],
    ["CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS", "CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA"]
  );

  const cnaeSecundario = matchAfterLabel(
    clean,
    ["CÓDIGO E DESCRIÇÃO DAS ATIVIDADES ECONÔMICAS SECUNDÁRIAS"],
    ["CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA"]
  );

  const naturezaJuridica = matchAfterLabel(
    clean,
    ["CÓDIGO E DESCRIÇÃO DA NATUREZA JURÍDICA"],
    ["LOGRADOURO"]
  );

  const email = matchAfterLabel(
    clean,
    ["ENDEREÇO ELETRÔNICO"],
    ["TELEFONE", "ENTE FEDERATIVO RESPONSÁVEL"]
  );

  const telefone = matchAfterLabel(
    clean,
    ["TELEFONE"],
    ["ENTE FEDERATIVO RESPONSÁVEL", "SITUAÇÃO CADASTRAL"]
  );

  return {
    razaoSocial,
    cnpj: cnpjMatch ? cnpjMatch[0] : "",
    endereco: logradouroCompleto,
    bairro,
    cidade: municipio,
    estado: ufMatch ? ufMatch[1] : "",
    cep: cepMatch ? cepMatch[1] : "",
    cnaePrincipal,
    cnaeSecundario,
    naturezaJuridica,
    email,
    telefone,
  };
}

// --- Importar um contrato já emitido (PDF deste próprio sistema) ---------
//
// Lê de volta um contrato de Prestação de Serviços gerado por este sistema
// (ver contract-template.js) — reconhece os rótulos dos quadros de
// identificação e das cláusulas pra pré-preencher o formulário inteiro, em
// vez de digitar tudo de novo pra reemitir/editar um contrato já feito.
//
// Só funciona com PDF de TEXTO selecionável. O botão "Imprimir/Exportar
// PDF" deste sistema gera cada página como IMAGEM (ver montarPdfPorPaginas
// em drive-upload.js — foi a correção pro bug de corte de página do
// Chrome), então um PDF baixado por ele mesmo DEPOIS dessa mudança não tem
// texto pra extrair; um PDF mais antigo (de antes dessa correção) ou um
// gerado por "Imprimir" do navegador continua funcionando normalmente.

// Usa o mesmo array MESES de contract-template.js (carregado antes desta
// função ser efetivamente chamada, mesmo que este arquivo seja lido pelo
// navegador antes — const no escopo global já existe no momento do clique).
function mesExtensoParaNumero(nome) {
  const idx = (typeof MESES !== "undefined" ? MESES : []).findIndex((m) => m.toLowerCase() === (nome || "").trim().toLowerCase());
  return idx === -1 ? null : idx + 1;
}

function parseDataExtensoImport(str) {
  const m = (str || "").match(/(\d{1,2})\s+de\s+([a-zà-úç]+)\s+de\s+(\d{4})/i);
  if (!m) return "";
  const mes = mesExtensoParaNumero(m[2]);
  if (!mes) return "";
  return `${m[3]}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function parseMesAnoExtensoImport(str) {
  const m = (str || "").match(/([a-zà-úç]+)\s+de\s+(\d{4})/i);
  if (!m) return "";
  const mes = mesExtensoParaNumero(m[1]);
  if (!mes) return "";
  return `${m[2]}-${String(mes).padStart(2, "0")}`;
}

function parseDataBrImport(str) {
  const m = (str || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}

// Campo vazio no contrato original vira texto de placeholder no PDF (ex:
// "[CNPJ]", "________") em vez de realmente vazio — trata como não
// encontrado, pra não reimportar lixo visual como se fosse dado real.
function limparValorImport(v) {
  v = (v || "").trim().replace(/\s{2,}/g, " ");
  if (!v || /^\[.*\]$/.test(v) || /^_+$/.test(v)) return "";
  return v;
}

function parseContratoServicosPdfText(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  const result = {};

  // Sinal mais confiável de que isso É um contrato deste sistema (texto de
  // verdade, não PDF-imagem sem camada de texto) — sem isso, nem tenta o
  // resto, pra não "encontrar" falso positivo tipo marcar DA FIDELIDADE
  // CONTRATUAL como ausente só porque o texto inteiro está vazio.
  if (!/QUADRO DE IDENTIFICAÇÃO - CONTRATANTE/.test(clean)) {
    return result;
  }

  let m = clean.match(/QUADRO DE IDENTIFICAÇÃO - CONTRATANTE\s+Campo\s+Informação\s+Contratante\s+([\s\S]*?)\s+CNPJ\s+([\s\S]*?)\s+Endereço\s+([\s\S]*?)\s+Representante Legal\s+([\s\S]*?)\s+CPF\s+(\S+)/);
  if (m) {
    result.c_razaoSocial = limparValorImport(m[1]);
    result.c_cnpj = limparValorImport(m[2]);
    result.c_endereco = limparValorImport(m[3]);
    result.c_repNome = limparValorImport(m[4]);
    result.c_repCpf = limparValorImport(m[5]);
  }

  const adicionaisRe = /QUADRO DE IDENTIFICAÇÃO - CONTRATANTE ADICIONAL \d+\s+Campo\s+Informação\s+Contratante\s+([\s\S]*?)\s+CNPJ\s+([\s\S]*?)\s+Endereço\s+([\s\S]*?)\s+Representante Legal\s+([\s\S]*?)\s+CPF\s+(\S+)/g;
  result.contratantesAdicionais = [];
  let am;
  while ((am = adicionaisRe.exec(clean))) {
    result.contratantesAdicionais.push({
      razaoSocial: limparValorImport(am[1]),
      cnpj: limparValorImport(am[2]),
      endereco: limparValorImport(am[3]),
      repNome: limparValorImport(am[4]),
      repCpf: limparValorImport(am[5]),
    });
  }

  m = clean.match(/\bObjeto\s+([\s\S]*?)\s+Valor contratado\b/);
  if (m) result.o_objeto = limparValorImport(m[1]);

  m = clean.match(/Valor PROVISÓRIO de R\$\s*([\d.,]+)\s*mensais,\s*válido até\s*([\s\S]*?)(?:,\s*quando|\.)/);
  if (m) {
    result.h_temValorProvisorio = true;
    result.h_valorProvisorio = m[1];
    result.h_provisorioValidoAte = parseDataExtensoImport(m[2]);
  } else {
    m = clean.match(/Valor cheio:\s*R\$\s*([\d.,]+)\s*mensais\.\s*Desconto temporário de\s*R\$\s*([\d.,]+)\s*mensais,\s*aplicável às competências de\s*([\s\S]*?)\s*a\s*([\s\S]*?),/);
    if (m) {
      result.h_valorCheio = m[1];
      result.h_temDesconto = true;
      result.h_valorDesconto = m[2];
      result.h_descontoInicio = parseMesAnoExtensoImport(m[3]);
      result.h_descontoFim = parseMesAnoExtensoImport(m[4]);
    } else {
      m = clean.match(/honorários mensais no valor de\s*R\$\s*([\d.,]+),\s*referentes/);
      if (m) result.h_valorCheio = m[1];
    }
  }

  m = clean.match(/vencimento dos honorários será todo dia\s*(\d+)\s*de cada mês/i);
  if (m) result.h_vencimentoDia = m[1];

  m = clean.match(/Os sistemas\s+([\s\S]*?)\s+serão contratados e pagos diretamente/);
  if (m) result.h_sistemasTerceiros = limparValorImport(m[1]);

  m = clean.match(/iniciando-se em\s*(\d{2}\/\d{2}\/\d{4})\s*e encerrando-se em\s*(\d{2}\/\d{2}\/\d{4})/);
  if (m) {
    result.v_inicio = parseDataBrImport(m[1]);
    result.v_fim = parseDataBrImport(m[2]);
  }

  m = clean.match(/antecedência mínima de\s*(\d+)\s*\(/);
  if (m) result.v_avisoPrevio = m[1];

  result.f_temFidelidade = /DA FIDELIDADE CONTRATUAL/.test(clean);
  m = clean.match(/equivalente a\s*(\d+)%/);
  if (m) result.f_multaPercent = m[1];

  m = clean.match(/Fica eleito o foro da comarca de\s*([\s\S]*?)\s*para dirimir/);
  if (m) result.foro_cidade = limparValorImport(m[1]);

  m = clean.match(/ASSINATURAS\s+([\s\S]*?),\s*(\d{1,2}\s+de\s+[a-zà-úç]+\s+de\s+\d{4})\./i);
  if (m) {
    result.a_local = limparValorImport(m[1]);
    result.a_data = parseDataExtensoImport(m[2]);
  }

  m = clean.match(/Testemunha 1\s+Nome:\s*([\s\S]*?)\s+CPF:\s*([\s\S]*?)\s+Testemunha 2\s+Nome:\s*([\s\S]*?)\s+CPF:\s*([\s\S]*?)(?:\s+Rua|$)/);
  if (m) {
    result.a_test1Nome = limparValorImport(m[1]);
    result.a_test1Cpf = limparValorImport(m[2]);
    result.a_test2Nome = limparValorImport(m[3]);
    result.a_test2Cpf = limparValorImport(m[4]);
  }

  // Só reconhece o Resumo do Escopo se os rótulos ainda forem os padrão
  // (nome + texto em sequência, sem delimitador no PDF, não dá pra
  // reconhecer rótulos livres/customizados de forma confiável) — campos
  // renomeados ou reordenados pelo usuário não voltam sozinhos; ele edita
  // a lista na tela depois de importar.
  m = clean.match(/RESUMO DO ESCOPO\s+Campo\s+Informação\s+Parte fiscal\s+([\s\S]*?)\s+Parte contábil\s+([\s\S]*?)\s+Gestão de RH\s+([\s\S]*?)\s+Consultiva\s+([\s\S]*?)\s+Obrigações acessórias\s+([\s\S]*?)\s+Atendimento\s+([\s\S]*?)\s+Não incluídos\s+([\s\S]*?)\s+Rua\s/);
  if (m) {
    result.escopoCampos = [
      { label: "Parte fiscal", texto: limparValorImport(m[1]) },
      { label: "Parte contábil", texto: limparValorImport(m[2]) },
      { label: "Gestão de RH", texto: limparValorImport(m[3]) },
      { label: "Consultiva", texto: limparValorImport(m[4]) },
      { label: "Obrigações acessórias", texto: limparValorImport(m[5]) },
      { label: "Atendimento", texto: limparValorImport(m[6]) },
      { label: "Não incluídos", texto: limparValorImport(m[7]) },
    ].filter((c) => c.texto);
  }

  return result;
}
