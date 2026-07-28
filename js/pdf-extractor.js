// Extração por padrões de texto do "Comprovante de Inscrição e Situação
// Cadastral" (cartão CNPJ) da Receita Federal. Layouts diferentes (ex:
// digitalizado/escaneado) podem não conter texto selecionável e portanto
// não extrair nada.

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
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

  const logradouro = matchAfterLabel(
    clean,
    ["LOGRADOURO"],
    ["NÚMERO", "COMPLEMENTO"]
  );

  const bairro = matchAfterLabel(
    clean,
    ["BAIRRO/DISTRITO"],
    ["MUNICÍPIO", "CEP"]
  );

  const municipio = matchAfterLabel(
    clean,
    ["MUNICÍPIO"],
    ["UF", "CEP"]
  );

  const ufMatch = clean.match(/\bUF\b\s*([A-Z]{2})\b/);

  const cepMatch = clean.match(/\bCEP\b\s*([\d.\-]{8,10})/);

  return {
    razaoSocial,
    cnpj: cnpjMatch ? cnpjMatch[0] : "",
    endereco: logradouro,
    bairro,
    cidade: municipio,
    estado: ufMatch ? ufMatch[1] : "",
    cep: cepMatch ? cepMatch[1] : "",
  };
}
