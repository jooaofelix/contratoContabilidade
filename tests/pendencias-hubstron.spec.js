// Testes da aba "Pendências Hubstron" (vendas.html?mode=pendencias).
// Usa uma planilha fictícia em CSV com datas relativas a hoje, para que as
// regras de prioridade (vencido / vence em até 30 dias / 31–90 dias) não
// dependam da data em que o teste roda.
const assert = require("assert");
const { installFirestoreMock } = require("./helpers/firestore-mock");

const BASE_URL = "http://127.0.0.1:8321";

function dataRelativa(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const CABECALHO = ["Procuração", "Certificado Digital", "Razão Social | Nome", "CNPJ | CPF", "Tipo de cadastro",
  "Regime Tributário", "Estado", "Cidade", "Email 1", "Email 2", "Email 3", "Telefone 1", "Telefone 2", "Telefone 3",
  "Nome 1", "Nome 2", "Nome 3"];

function linha(proc, cert, nome, cnpj, contato, tel, email) {
  return [proc, cert, nome, cnpj, "Pessoa Jurídica", "Simples Nacional", "SP", "SAO JOSE DOS CAMPOS",
    email || "N/A", "N/A", "N/A", tel || "N/A", "N/A", "N/A", contato || "N/A", "N/A", "N/A"];
}

function planilha(linhas) {
  const csv = [CABECALHO].concat(linhas).map((l) => l.join(";")).join("\n");
  return { name: "clientes.csv", mimeType: "text/csv", buffer: Buffer.from("\uFEFF" + csv, "utf-8") };
}

function linhasPadrao() {
  return [
    linha(`Válida até ${dataRelativa(2000)}`, `Válido até ${dataRelativa(400)}`, "EMPRESA OK LTDA", "11.111.111/0001-11", "Ana", "(12) 99999-0001", "ana@ok.com"),
    linha("Sem procuração", `Vence em ${dataRelativa(10)}`, "ALFA LTDA", "22.222.222/0001-22", "Bruno - Alfa", "(12) 99999-0002", "bruno@alfa.com"),
    linha(`Válida até ${dataRelativa(2000)}`, "Não integrado", "BETA LTDA", "33.333.333/0001-33", "Bruno - Alfa", "(12) 99999-0002", "bruno@alfa.com"),
    linha("Cancelada", `Vencido ${dataRelativa(-5)}`, "GAMA LTDA", "44.444.444/0001-44", "Carla", "(12) 99999-0003", "carla@gama.com"),
    linha(`Válida até ${dataRelativa(2000)}`, `Válido até ${dataRelativa(60)}`, "DELTA LTDA", "55.555.555/0001-55", "Davi", "(12) 99999-0004", ""),
    linha("Sem procuração", "Desativar 2 etapas", "SEM CONTATO LTDA", "66.666.666/0001-66", "", "", ""),
  ];
}

async function abrirPendencias(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  // o Firestore é o mock; o SDK real (CDN) não deve sobrescrevê-lo
  await page.route(/gstatic\.com/, (r) => r.fulfill({ body: "", contentType: "text/javascript" }));
  await page.addInitScript(installFirestoreMock, {});
  await page.addInitScript(() => { window.open = (url) => { window.__urlAberta = url; }; });
  await page.goto(`${BASE_URL}/vendas.html?mode=pendencias&v=${Date.now()}`, { waitUntil: "networkidle" });
  return { page, erros };
}

async function importar(page, linhas) {
  await page.setInputFiles("#ph-import-input", [planilha(linhas)]);
  await page.waitForFunction(() => /importadas/.test(document.getElementById("ph-import-status").textContent), null, { timeout: 10000 });
}

async function abrirEmpresa(page, nome) {
  await page.click(`.ph-card:has-text("${nome}")`);
  await page.waitForSelector("#ph-modal:not(.hidden)");
}

// --- Teste 1: classificação ---------------------------------------------------

async function testeClassificacao(browser) {
  const { page, erros } = await abrirPendencias(browser);
  assert.ok(await page.isVisible("#ph-vazio"), "sem dados, mostra o aviso para importar");
  await importar(page, linhasPadrao());

  const r = await page.evaluate(() => {
    const por = Object.fromEntries(phEmpresas().map((e) => [e.nome, e]));
    return {
      ok: por["EMPRESA OK LTDA"].temPendencia,
      alfa: [por["ALFA LTDA"].prioridade, por["ALFA LTDA"].itens.map((i) => i.tipo)],
      beta: [por["BETA LTDA"].prioridade, por["BETA LTDA"].itens.map((i) => i.tipo)],
      gama: [por["GAMA LTDA"].prioridade, por["GAMA LTDA"].itens.map((i) => i.tipo)],
      delta: [por["DELTA LTDA"].prioridade, por["DELTA LTDA"].itens.map((i) => i.tipo)],
      semContato: por["SEM CONTATO LTDA"].semContato,
      cards: document.querySelectorAll(".ph-card").length,
      urgentes: document.querySelectorAll(".ph-secao.ph-p1 .ph-card").length,
    };
  });
  assert.strictEqual(r.ok, false, "empresa regular não tem pendência");
  assert.deepStrictEqual(r.alfa, [1, ["cert-vencendo", "proc-sem"]]);
  assert.deepStrictEqual(r.beta, [2, ["cert-nao-integrado"]]);
  assert.deepStrictEqual(r.gama, [1, ["cert-vencido", "proc-cancelada"]]);
  assert.deepStrictEqual(r.delta, [3, ["cert-90"]]);
  assert.strictEqual(r.semContato, true);
  assert.strictEqual(r.cards, 5, "só empresas com pendência aparecem");
  assert.strictEqual(r.urgentes, 2, "Alfa e Gama são urgentes");
  assert.strictEqual(erros.length, 0, "não deveria haver erros de JS: " + erros.join(" | "));
  await page.close();
}

// --- Teste 2: mensagem agrupada + WhatsApp marca como enviada -----------------

async function testeMensagemEEnvio(browser) {
  const { page, erros } = await abrirPendencias(browser);
  await importar(page, linhasPadrao());
  await abrirEmpresa(page, "ALFA LTDA");

  const msg = await page.inputValue("#ph-mensagem");
  assert.ok(msg.startsWith("Olá, Bruno!"), "usa o primeiro nome do contato: " + msg.slice(0, 30));
  assert.ok(msg.includes("*ALFA LTDA*") && msg.includes("*BETA LTDA*"), "inclui as empresas do mesmo contato");
  assert.ok(msg.indexOf("ALFA") < msg.indexOf("BETA"), "a empresa clicada vem primeiro");

  await page.uncheck("#ph-incluir-grupo");
  assert.ok(!(await page.inputValue("#ph-mensagem")).includes("BETA"), "desmarcando, a mensagem fica só com a empresa clicada");
  await page.check("#ph-incluir-grupo");

  await page.click("#ph-btn-whatsapp");
  await page.waitForFunction(() => /Mensagem enviada/.test(document.getElementById("ph-msg-status").textContent));
  const url = await page.evaluate(() => window.__urlAberta);
  assert.ok(url.startsWith("https://wa.me/5512999990002?text="), "abre o WhatsApp do contato: " + url);

  const status = await page.evaluate(() => {
    const db = window.__readFakeDb().pendenciasHubstron;
    return [db["22222222000122"].status, db["33333333000133"].status, db["44444444000144"].status];
  });
  assert.deepStrictEqual(status, ["Mensagem enviada", "Mensagem enviada", "Pendente"]);
  assert.strictEqual(erros.length, 0, "não deveria haver erros de JS: " + erros.join(" | "));
  await page.close();
}

// --- Teste 3: fechar pendências e reimportar ----------------------------------

async function testeFecharEReimportar(browser) {
  const { page, erros } = await abrirPendencias(browser);
  await importar(page, linhasPadrao());
  await abrirEmpresa(page, "GAMA LTDA");

  await page.check(".ph-item-check >> nth=0");
  await page.waitForFunction(() => document.getElementById("ph-det-salvo").textContent === "Salvo.");
  assert.notStrictEqual(await page.inputValue("#ph-det-status"), "Resolvido", "com um item ainda aberto, não fecha");
  await page.check(".ph-item-check >> nth=1");
  await page.waitForFunction(() => /fechada/.test(document.getElementById("ph-det-salvo").textContent));
  assert.strictEqual(await page.inputValue("#ph-det-status"), "Resolvido", "todos os itens resolvidos fecham a empresa");

  await page.fill("#ph-det-obs", "cliente renovou");
  await page.click("#ph-det-obs-salvar");
  await page.keyboard.press("Escape");

  // reimportar a mesma planilha mantém o que foi fechado
  await importar(page, linhasPadrao());
  let gama = await page.evaluate(() => phEmpresas().find((e) => e.nome === "GAMA LTDA"));
  assert.strictEqual(gama.status, "Resolvido", "reimportação sem mudança mantém o status");
  assert.strictEqual(gama.observacoes, "cliente renovou");
  assert.strictEqual(await page.locator('.ph-card:has-text("GAMA LTDA")').count(), 0, "resolvida some da lista padrão");
  await page.check("#ph-mostrar-resolvidas");
  assert.strictEqual(await page.locator('.ph-secao.ph-sec-fechada .ph-card:has-text("GAMA LTDA")').count(), 1);

  // se a situação mudou no Hubstron, volta para Pendente
  const novas = linhasPadrao();
  novas[3] = linha("Cancelada", `Vencido ${dataRelativa(-1)}`, "GAMA LTDA", "44.444.444/0001-44", "Carla", "(12) 99999-0003", "carla@gama.com");
  await importar(page, novas);
  gama = await page.evaluate(() => phEmpresas().find((e) => e.nome === "GAMA LTDA"));
  assert.strictEqual(gama.status, "Pendente", "situação alterada reabre a empresa");
  assert.deepStrictEqual(gama.itensResolvidos, []);
  assert.strictEqual(erros.length, 0, "não deveria haver erros de JS: " + erros.join(" | "));
  await page.close();
}

module.exports = [
  { nome: "pendências Hubstron: classifica certificado/procuração por prioridade", fn: testeClassificacao },
  { nome: "pendências Hubstron: mensagem agrupa o contato e WhatsApp marca como enviada", fn: testeMensagemEEnvio },
  { nome: "pendências Hubstron: itens resolvidos fecham a empresa e sobrevivem à reimportação", fn: testeFecharEReimportar },
];
