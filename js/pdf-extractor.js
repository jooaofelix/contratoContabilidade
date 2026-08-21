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
