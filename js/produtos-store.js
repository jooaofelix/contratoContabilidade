// Serviços de contabilidade e o texto-modelo de mensagem de cada um, usados
// no composer de proposta via WhatsApp. Editável pela tela; começa com
// sugestões prontas na primeira vez que alguém abre o sistema (só semeia se
// a coleção estiver vazia — depois disso, o que estiver salvo manda).

const PRODUTOS_COLLECTION = "produtosProposta";

const PRODUTOS_SEED = [
  {
    nome: "Abertura de Empresa",
    mensagem: "Olá {{nome}}! Tudo bem? Aqui é da AEA Contabilidade Consultiva 😊 Vi que você está pensando em abrir uma empresa e quero te ajudar com todo o processo — desde a escolha do enquadramento tributário até a emissão do CNPJ, sem burocracia. Posso te enviar uma proposta com valores e prazos?",
  },
  {
    nome: "Contabilidade Mensal (Simples Nacional)",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Ficamos sabendo que a {{empresa}} pode estar buscando um novo escritório de contabilidade. Trabalhamos com atendimento próximo, apuração de impostos em dia e suporte direto com o contador responsável. Posso te apresentar nossa proposta de honorários?",
  },
  {
    nome: "Migração de Contabilidade",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Sabemos que trocar de contador pode parecer complicado — cuidamos de toda a transição pra você, sem dor de cabeça e sem deixar nenhuma obrigação passar. Posso te mostrar como funciona e enviar uma proposta pra {{empresa}}?",
  },
  {
    nome: "Departamento Pessoal / Folha de Pagamento",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Vi que a {{empresa}} pode estar precisando de suporte com folha de pagamento, admissões, rescisões e obrigações trabalhistas. Fazemos essa gestão completa pra você focar no seu negócio. Posso te enviar mais detalhes?",
  },
  {
    nome: "Consultoria Tributária",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Notamos que pode haver oportunidades de economia tributária pra {{empresa}} com um planejamento adequado. Fazemos uma análise inicial gratuita pra te mostrar o potencial de redução legal de impostos. Podemos conversar?",
  },
  {
    nome: "Baixa de Empresa",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Vi que a {{empresa}} está encerrando as atividades e quero te ajudar com todo o processo de baixa — regularização de pendências, comunicação aos órgãos e encerramento sem complicação. Posso te enviar mais detalhes e uma proposta?",
  },
  {
    nome: "Alteração Contratual",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Soube que a {{empresa}} precisa fazer uma alteração contratual (endereço, sócios, atividade, capital social etc.) e quero te ajudar a resolver isso rápido e sem burocracia. Posso te enviar mais informações?",
  },
  {
    nome: "Transformação de Tipo Societário",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Vi que pode ser interessante pra {{empresa}} avaliar uma transformação do tipo societário (ex: de MEI/EI para LTDA). Podemos conversar sobre as vantagens e como fazer essa mudança com segurança?",
  },
  {
    nome: "Certificado Digital",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Notei que a {{empresa}} pode estar precisando emitir ou renovar o certificado digital. Cuidamos de todo o processo pra você, rápido e sem dor de cabeça. Posso te ajudar?",
  },
];

async function getProdutos() {
  const snap = await db.collection(PRODUTOS_COLLECTION).get();
  let produtos = snap.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));

  if (produtos.length === 0) {
    for (const seed of PRODUTOS_SEED) {
      await upsertProduto(seed, null);
    }
    const snap2 = await db.collection(PRODUTOS_COLLECTION).get();
    produtos = snap2.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
  }

  produtos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  return produtos;
}

async function upsertProduto(data, existingId) {
  const id = existingId || db.collection(PRODUTOS_COLLECTION).doc().id;
  await db.collection(PRODUTOS_COLLECTION).doc(id).set(data, { merge: true });
  return Object.assign({ id }, data);
}

async function deleteProduto(id) {
  await db.collection(PRODUTOS_COLLECTION).doc(id).delete();
}
