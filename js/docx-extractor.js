// Leitura de dados a partir de um .docx (Word) — usado pra importar dados de
// um contrato/documento já preenchido em vez de digitar tudo de novo. Um
// .docx é um ZIP com XML dentro; usa o JSZip pra abrir e extrai o texto puro
// de word/document.xml, depois procura os dados por padrões de texto (igual
// já é feito com o PDF do cartão CNPJ — bom esforço, sempre confira depois).

async function extractTextFromDocx(file) {
  const zip = await JSZip.loadAsync(file);
  const xmlFile = zip.file("word/document.xml");
  if (!xmlFile) throw new Error("Não parece ser um arquivo .docx válido.");
  const xml = await xmlFile.async("string");

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const nodes = doc.getElementsByTagNameNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "t");

  let text = "";
  for (let i = 0; i < nodes.length; i++) {
    text += nodes[i].textContent;
    // <w:p> (parágrafo) não tem texto próprio; aproxima quebra de linha
    // olhando o elemento seguinte seria mais preciso, mas concatenar com
    // espaço já é suficiente pros regex de busca abaixo.
    text += " ";
  }
  return text.replace(/\s+/g, " ").trim();
}

function findMatch(text, regex) {
  const m = text.match(regex);
  return m ? m[1].trim() : "";
}

// Contratante (cliente) — modo "Prestação de Serviços". Procura pela
// qualificação da parte que não é a AEA.
function parseContratanteFromDocxText(text) {
  const razaoSocial = findMatch(text, /de outro lado,?\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú0-9.,\s&-]{4,80}?),\s*(?:pessoa jurídica|inscrit[ao])/i)
    || findMatch(text, /CONTRATANTE:?\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú0-9.,\s&-]{4,80}?),\s*(?:pessoa jurídica|inscrit[ao]|CNPJ)/i);

  const cnpj = findMatch(text, /CNPJ\s*(?:sob\s*n[ºo°]?)?\s*[:\-]?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);

  const endereco = findMatch(text, /(?:com sede (?:n[ao])?|sede na)\s*([^,]+(?:,[^,]+){1,6}?)(?:,\s*neste ato|,\s*doravante)/i);

  const repNome = findMatch(text, /representad[ao]\s*(?:neste ato\s*)?por\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{4,60}?),?\s*(?:portador|inscrit[ao]|CPF)/i);

  const repCpf = findMatch(text, /CPF\s*(?:sob\s*n[ºo°]?|n[ºo°])?\s*[:\-]?\s*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);

  return { razaoSocial, cnpj, endereco, repNome, repCpf };
}

// Mentorado(a) — modo "Parceria Comercial / Indicação".
function parseMentoradoFromDocxText(text) {
  const nome = findMatch(text, /de outro lado,?\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{4,70}?),\s*(?:inscrit[ao]|nacionalidade|residente|portador)/i)
    || findMatch(text, /MENTORADO\(A\)\)?:?\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{4,70}?),/i);

  const nacionalidade = findMatch(text, /\b(brasileir[ao]|estrangeir[ao])\b/i);
  const estadoCivil = findMatch(text, /\b(solteir[ao]|casad[ao]|divorciad[ao]|vi[úu]v[ao]|uni[ãa]o est[áa]vel)\b/i);
  const rg = findMatch(text, /RG\s*n[ºo°]?\s*[:\-]?\s*([\d.\-xX]{5,15})/i);
  const cpf = findMatch(text, /CPF\s*(?:sob\s*n[ºo°]?|n[ºo°])?\s*[:\-]?\s*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);
  const endereco = findMatch(text, /residente e domiciliado\(?a?\)?\s*(?:em|na|no)\s*([^,]+(?:,[^,]+){1,5}?)(?:,\s*doravante|,\s*e-?mail|\.)/i);
  const email = findMatch(text, /([\w.+-]+@[\w-]+\.[\w.-]+)/);
  const telefone = findMatch(text, /telefone\s*[:\-]?\s*(\(?\d{2}\)?\s*\d{4,5}-?\d{4})/i)
    || findMatch(text, /(\(?\d{2}\)?\s*9?\d{4}-?\d{4})/);

  return { nome, nacionalidade, estadoCivil, profissao: "", rg, cpf, endereco, email, telefone };
}
