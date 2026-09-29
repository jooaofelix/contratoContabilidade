// Serviços de contabilidade e o texto-modelo de mensagem de cada um, usados
// no composer de proposta via WhatsApp. Editável pela tela; começa com
// sugestões prontas na primeira vez que alguém abre o sistema (só semeia se
// a coleção estiver vazia — depois disso, o que estiver salvo manda).

const PRODUTOS_COLLECTION = "produtosProposta";

// "Pontual" = venda avulsa, cobrada uma vez só (abertura, alteração, etc).
// "Recorrente" = cobrança mensal (plano de honorário ou sistema/add-on).
const PRODUTOS_SEED = [
  {
    nome: "Abertura de Empresa",
    tipo: "Pontual",
    mensagem: "Olá {{nome}}! Tudo bem? Aqui é da AEA Contabilidade Consultiva 😊 Vi que você está pensando em abrir uma empresa e quero te ajudar com todo o processo — desde a escolha do enquadramento tributário até a emissão do CNPJ, sem burocracia. Posso te enviar uma proposta com valores e prazos?",
  },
  {
    nome: "Contabilidade Mensal (Simples Nacional)",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Ficamos sabendo que a {{empresa}} pode estar buscando um novo escritório de contabilidade. Trabalhamos com atendimento próximo, apuração de impostos em dia e suporte direto com o contador responsável. Posso te apresentar nossa proposta de honorários?",
  },
  {
    nome: "Migração de Contabilidade",
    tipo: "Pontual",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Sabemos que trocar de contador pode parecer complicado — cuidamos de toda a transição pra você, sem dor de cabeça e sem deixar nenhuma obrigação passar. Posso te mostrar como funciona e enviar uma proposta pra {{empresa}}?",
  },
  {
    nome: "Departamento Pessoal / Folha de Pagamento",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Vi que a {{empresa}} pode estar precisando de suporte com folha de pagamento, admissões, rescisões e obrigações trabalhistas. Fazemos essa gestão completa pra você focar no seu negócio. Posso te enviar mais detalhes?",
  },
  {
    nome: "Consultoria Tributária",
    tipo: "Pontual",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Notamos que pode haver oportunidades de economia tributária pra {{empresa}} com um planejamento adequado. Fazemos uma análise inicial gratuita pra te mostrar o potencial de redução legal de impostos. Podemos conversar?",
  },
  {
    nome: "Baixa de Empresa",
    tipo: "Pontual",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Vi que a {{empresa}} está encerrando as atividades e quero te ajudar com todo o processo de baixa — regularização de pendências, comunicação aos órgãos e encerramento sem complicação. Posso te enviar mais detalhes e uma proposta?",
  },
  {
    nome: "Alteração Contratual",
    tipo: "Pontual",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Soube que a {{empresa}} precisa fazer uma alteração contratual (endereço, sócios, atividade, capital social etc.) e quero te ajudar a resolver isso rápido e sem burocracia. Posso te enviar mais informações?",
  },
  {
    nome: "Transformação de Tipo Societário",
    tipo: "Pontual",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Vi que pode ser interessante pra {{empresa}} avaliar uma transformação do tipo societário (ex: de MEI/EI para LTDA). Podemos conversar sobre as vantagens e como fazer essa mudança com segurança?",
  },
  {
    nome: "Certificado Digital",
    tipo: "Pontual",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Notei que a {{empresa}} pode estar precisando emitir ou renovar o certificado digital. Cuidamos de todo o processo pra você, rápido e sem dor de cabeça. Posso te ajudar?",
  },
  {
    nome: "Parceria Money Brokers Brasil",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva 😊 Preparamos uma parceria estratégica exclusiva pra mentorados da Money Brokers Brasil: você indica os clientes que já atende, cuidamos de toda a contabilidade com foco em aprovação de crédito bancário, e você recebe comissão de 10% a 20% todo mês, de forma recorrente — sem nenhum esforço técnico da sua parte. Preparei os detalhes completos aqui: https://parceria-money.jvctrfelix.workers.dev/#comecar. Posso te explicar melhor como funciona?",
  },
];

// Itens adicionados depois que a base de serviços de quem já usava o sistema
// tinha sido semeada — não entram em PRODUTOS_SEED (que só roda com a coleção
// vazia) porque senão nunca chegariam pra quem já tinha produtos salvos.
// getProdutos() confere pelo nome e cria o que estiver faltando, sem duplicar.
const PRODUTOS_SEED_ADICIONAL = [
  {
    nome: "Plano Escritório",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Temos o plano Escritório pra {{empresa}}: contabilidade completa com atendimento presencial/próximo. Posso te enviar os detalhes e valores?",
  },
  {
    nome: "Plano Digital",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Temos o plano Digital pra {{empresa}}: toda a contabilidade resolvida à distância, com agilidade e sem burocracia. Posso te enviar os detalhes e valores?",
  },
  {
    nome: "Plano Completo",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Temos o plano Completo pra {{empresa}}: contábil, fiscal e departamento pessoal, tudo em um só lugar. Posso te enviar os detalhes e valores?",
  },
  {
    nome: "Plano Consultiva",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Temos o plano Consultiva pra {{empresa}}: além da contabilidade, um acompanhamento próximo com orientação estratégica pro seu negócio. Posso te enviar os detalhes e valores?",
  },
  {
    nome: "Sistema Nibo",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Posso configurar o sistema Nibo pra {{empresa}}, facilitando a gestão financeira e a comunicação com a contabilidade. Posso te enviar mais detalhes?",
  },
  {
    nome: "Sistema Emitte",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Posso configurar o sistema Emitte pra {{empresa}}, pra facilitar a emissão de notas fiscais. Posso te enviar mais detalhes?",
  },
  {
    nome: "Emissão de Notas",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Podemos assumir a emissão mensal das notas fiscais de {{empresa}}, sem você precisar se preocupar com isso. Posso te enviar mais detalhes?",
  },
  {
    nome: "Contábil",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Podemos assumir a rotina contábil completa de {{empresa}} — escrituração, balancetes e obrigações em dia. Posso te enviar mais detalhes?",
  },
  {
    nome: "Fiscal",
    tipo: "Recorrente",
    mensagem: "Olá {{nome}}! Aqui é da AEA Contabilidade Consultiva. Podemos assumir a rotina fiscal de {{empresa}} — apuração de impostos e obrigações acessórias sempre em dia. Posso te enviar mais detalhes?",
  },
];

// Categorias usadas no Orçamento pra organizar o checklist de serviços em 3
// blocos: Honorário (os planos mensais — mutuamente exclusivos), Escritório
// (serviços de rotina vendidos à parte) e Adicional (tudo o mais do
// catálogo). Só entram aqui os nomes que já existiam antes desse campo
// existir — itens novos (Contábil, Fiscal) já nascem com "categoria" no
// próprio seed acima, sem precisar de fallback.
const PRODUTOS_CATEGORIA_HONORARIO = new Set(["Plano Digital", "Plano Completo", "Plano Consultiva"]);
const PRODUTOS_CATEGORIA_ESCRITORIO = new Set([
  "Departamento Pessoal / Folha de Pagamento", "Contábil", "Fiscal", "Emissão de Notas",
]);

function categoriaDoProduto(produto) {
  if (!produto) return "Adicional";
  if (produto.categoria) return produto.categoria;
  if (PRODUTOS_CATEGORIA_HONORARIO.has(produto.nome)) return "Honorário";
  if (PRODUTOS_CATEGORIA_ESCRITORIO.has(produto.nome)) return "Escritório";
  return "Adicional";
}

// O que aparece no PDF do orçamento no lugar da lista genérica de etapas
// quando o cliente escolhe um dos planos de honorário — baseado na página
// de planos da AEA (aea-contabilidade). Ajustável depois pela tela, se
// algum dia isso virar um campo editável; por enquanto é só fallback fixo.
const PRODUTOS_DETALHES_FALLBACK = {
  "Plano Digital": [
    "Acesso pelo aplicativo exclusivo AEA",
    "Obrigações fiscais sempre em dia",
    "Praticidade e agilidade 100% digital",
    "Suporte por canais digitais dedicados",
  ],
  "Plano Completo": [
    "Sistema financeiro integrado e implantado",
    "Enquadramento contábil otimizado",
    "Dados e relatórios em tempo real",
    "Gestão completa de obrigações",
  ],
  "Plano Consultiva": [
    "Mentoria direta com o contador responsável",
    "Precificação e orçamento especializado",
    "Suporte para acesso a crédito e financiamentos",
    "Relatórios gerenciais modernos e customizados",
    "Planejamento tributário estratégico contínuo",
  ],
};

function detalhesDoProduto(produto) {
  if (!produto) return [];
  if (Array.isArray(produto.detalhes) && produto.detalhes.length > 0) return produto.detalhes;
  return PRODUTOS_DETALHES_FALLBACK[produto.nome] || [];
}

// Nomes de itens antigos (semeados antes do campo "tipo" existir) que são
// recorrentes — usado só como fallback de exibição, nunca escreve no banco.
const PRODUTOS_TIPO_RECORRENTE_FALLBACK = new Set(
  PRODUTOS_SEED.filter((p) => p.tipo === "Recorrente").map((p) => p.nome)
);

function tipoDoProduto(produto) {
  if (produto && produto.tipo) return produto.tipo;
  if (produto && PRODUTOS_TIPO_RECORRENTE_FALLBACK.has(produto.nome)) return "Recorrente";
  return "Pontual";
}

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

  const nomesExistentes = new Set(produtos.map((p) => p.nome));
  const faltantes = PRODUTOS_SEED_ADICIONAL.filter((s) => !nomesExistentes.has(s.nome));
  if (faltantes.length > 0) {
    for (const seed of faltantes) {
      await upsertProduto(seed, null);
    }
    const snap3 = await db.collection(PRODUTOS_COLLECTION).get();
    produtos = snap3.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
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
