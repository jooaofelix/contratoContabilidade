const assert = require("assert");
const path = require("path");
const { chromium } = require("playwright");
const { installFirestoreMock } = require("./helpers/firestore-mock");

const BASE_URL = "http://127.0.0.1:8321";

function csvFixture(linhas) {
  return Buffer.from(linhas.map((l) => l.join(";")).join("\n"), "utf-8");
}

async function abrirFolha(browser, seed) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.addInitScript(installFirestoreMock, seed || { empresas: {} });
  await page.goto(`${BASE_URL}/folha.html?v=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  return { page, erros };
}

async function selecionarEmpresa(page, selectId, empresaId) {
  await page.selectOption(`#${selectId}`, empresaId);
}

// --- Teste 1: CPF ------------------------------------------------------------

async function testeValidarCpf(browser) {
  const { page, erros } = await abrirFolha(browser, { empresas: {} });
  const resultado = await page.evaluate(() => ({
    valido1: validarCpf("111.444.777-35"),
    valido2: validarCpf("529.982.247-25"),
    repetido: validarCpf("111.111.111-11"),
    invalido: validarCpf("123.456.789-00"),
  }));
  assert.strictEqual(resultado.valido1, true, "CPF 111.444.777-35 deveria ser válido");
  assert.strictEqual(resultado.valido2, true, "CPF 529.982.247-25 deveria ser válido");
  assert.strictEqual(resultado.repetido, false, "sequência repetida nunca é CPF válido");
  assert.strictEqual(resultado.invalido, false, "CPF com dígito verificador errado deve ser rejeitado");
  assert.strictEqual(erros.length, 0, "não deveria haver erros de JS: " + erros.join(" | "));
  await page.close();
}

// --- Teste 2: importar cria NOVO, não sobrescreve DIVERGÊNCIA em lote --------

async function testeImportarEDivergencia(browser) {
  const seed = {
    empresas: { emp1: { contratante: "EMPRESA TESTE LTDA", cnpj: "12.345.678/0001-90" } },
    folhaFuncionarios: {
      func_existente: {
        empresaId: "emp1", nome: "MARIA DA SILVA SANTOS", cpf: "11144477735",
        cargo: "Assistente Administrativo", salarioBase: 3000, dataAdmissao: "2024-02-10", ativo: true,
      },
    },
  };
  const { page, erros } = await abrirFolha(browser, seed);
  await selecionarEmpresa(page, "folha-empresa-select-importar", "emp1");

  const csv = csvFixture([
    ["Nome", "CPF", "Cargo", "Salário", "Admissão"],
    ["JOAO PEDRO OLIVEIRA", "529.982.247-25", "Auxiliar de Estoque", "2.200,00", "01/03/2024"],
    ["MARIA DA SILVA SANTOS", "111.444.777-35", "Assistente Administrativo", "3.300,00", "10/02/2024"],
  ]);

  await page.setInputFiles("#folha-import-input", [{ name: "folha-teste.csv", mimeType: "text/csv", buffer: csv }]);
  await page.click("#folha-import-processar");
  await page.waitForSelector(".folha-grupo", { timeout: 10000 });
  await page.waitForTimeout(300);

  const badges = await page.$$eval(".folha-grupo .folha-badge", (els) => els.map((e) => e.textContent.trim()));
  assert.ok(badges.some((b) => b.includes("Novo funcionário")), "deveria mostrar um NOVO: " + badges.join(", "));
  assert.ok(badges.some((b) => b.includes("Funcionário existente")), "deveria mostrar um EXISTENTE: " + badges.join(", "));

  // Linha divergente (2ª empresa, uid=1) deve vir com checkbox desabilitado
  // (não entra em lote) e o select de divergência no padrão seguro "manter".
  const grupoDivergente = page.locator('.folha-grupo[data-uid="1"]');
  await assert.doesNotReject(grupoDivergente.locator(".folha-badge-divergencia").waitFor({ timeout: 3000 }));
  const checkboxDivergenteDesabilitado = await grupoDivergente.locator(".folha-grupo-checkbox").isDisabled();
  assert.strictEqual(checkboxDivergenteDesabilitado, true, "item com divergência não pode ser elegível pra lote");
  const valorSelectPadrao = await grupoDivergente.locator(".folha-campo-divergencia").inputValue();
  assert.strictEqual(valorSelectPadrao, "manter", "divergência nunca deve vir pré-selecionada como 'atualizar'");

  // Aprova em lote (só o NOVO está marcável) e confere que o existente não mudou.
  page.once("dialog", (d) => d.accept());
  await page.click(".folha-marcar-todos");
  await page.click(".folha-aprovar-selecionados");
  await page.waitForTimeout(600);

  let db = await page.evaluate(() => window.__readFakeDb());
  const funcionarios = Object.values(db.folhaFuncionarios || {});
  assert.strictEqual(funcionarios.length, 2, "deveria ter criado só 1 funcionário novo (mais o já existente)");
  const existenteAposLote = db.folhaFuncionarios.func_existente;
  assert.strictEqual(existenteAposLote.salarioBase, 3000, "aprovação em lote NUNCA pode sobrescrever divergência salarial sozinha");

  const novoCriado = Object.values(db.folhaFuncionarios).find((f) => f.cpf === "52998224725");
  assert.ok(novoCriado, "funcionário novo deveria ter sido criado");
  assert.strictEqual(novoCriado.salarioBase, 2200);

  // Agora resolve a divergência manualmente, escolhendo "atualizar".
  await grupoDivergente.locator(".folha-campo-divergencia").selectOption("atualizar");
  await grupoDivergente.locator(".folha-aplicar-individual").click();
  await page.waitForTimeout(400);

  db = await page.evaluate(() => window.__readFakeDb());
  assert.strictEqual(db.folhaFuncionarios.func_existente.salarioBase, 3300, "depois de escolher 'atualizar' o salário deve mudar");
  const historico = Object.values(db["_sub_folhaFuncionarios_func_existente_historicoSalarial"] || {});
  assert.strictEqual(historico.length, 1, "deveria ter gravado 1 entrada no histórico salarial");
  assert.strictEqual(historico[0].salarioAnterior, 3000);
  assert.strictEqual(historico[0].salarioNovo, 3300);

  // --- Idempotência: reimportar o MESMO arquivo não duplica -----------------
  await page.setInputFiles("#folha-import-input", [{ name: "folha-teste.csv", mimeType: "text/csv", buffer: csv }]);
  await page.click("#folha-import-processar");
  // O container é substituído inteiro a cada render — espera o texto NOVO
  // aparecer, em vez de só a existência do elemento (que já existia antes).
  await page.waitForFunction(
    () => (document.querySelector(".folha-avisos") || {}).textContent?.includes("ignorado para não duplicar"),
    { timeout: 10000 }
  );
  const avisoTexto = await page.textContent(".folha-avisos");

  db = await page.evaluate(() => window.__readFakeDb());
  const importacoes = Object.values(db.folhaImportacoes || {});
  const importacoesConcluidasDesteArquivo = importacoes.filter((i) => i.arquivoNome === "folha-teste.csv");
  assert.strictEqual(importacoesConcluidasDesteArquivo.length, 1, "o mesmo arquivo (mesmo hash) não pode gerar uma segunda importação registrada");
  const funcionariosFinal = Object.values(db.folhaFuncionarios || {});
  assert.strictEqual(funcionariosFinal.length, 2, "reimportar o mesmo arquivo não pode duplicar funcionários");

  assert.strictEqual(erros.length, 0, "não deveria haver erros de JS: " + erros.join(" | "));
  await page.close();
}

// --- Teste 3: rollover não repete rubricas variáveis -------------------------

async function testeRolloverNaoRepeteVariaveis(browser) {
  const seed = { empresas: { emp1: { contratante: "EMPRESA ROLLOVER LTDA" } } };
  const { page, erros } = await abrirFolha(browser, seed);

  const resultado = await page.evaluate(async () => {
    const empresaId = "emp1";
    const func = await upsertFuncionario({ empresaId, nome: "ANA PAULA", cpf: "52998224725", salarioBase: 2500, ativo: true });
    const rubricaFixa = await upsertRubrica({ empresaId, codigo: "0001", descricao: "Salário Base", tipo: "fixa", incidencias: { confirmado: true } });
    const rubricaVariavel = await upsertRubrica({ empresaId, codigo: "0002", descricao: "Hora Extra 50%", tipo: "variavel", incidencias: { confirmado: true } });

    const competenciaAnterior = await upsertCompetencia({ empresaId, competencia: "2026-09", status: "aberta" });
    await bulkUpsertApontamentos([
      { empresaId, competenciaId: competenciaAnterior.id, funcionarioId: func.id, rubricaId: rubricaFixa.id, valor: 2500, recorrente: true },
      { empresaId, competenciaId: competenciaAnterior.id, funcionarioId: func.id, rubricaId: rubricaVariavel.id, valor: 180, recorrente: false },
    ]);

    const preparo = await prepararRolloverCompetencia(empresaId, competenciaAnterior.id, "2026-10");
    const confirmado = await confirmarRolloverCompetencia(preparo);
    const apontamentosNovaCompetencia = await getApontamentos(confirmado.competencia.id);

    return {
      recorrentesNoPrepare: preparo.apontamentosRecorrentes.length,
      referenciaHistoricaNoPrepare: preparo.referenciaHistorica.length,
      apontamentosGravados: confirmado.apontamentosGravados,
      rubricasGravadas: apontamentosNovaCompetencia.map((a) => a.rubricaId),
      rubricaFixaId: rubricaFixa.id,
      rubricaVariavelId: rubricaVariavel.id,
    };
  });

  assert.strictEqual(resultado.recorrentesNoPrepare, 1, "só a rubrica fixa+recorrente deveria entrar como recorrente");
  assert.strictEqual(resultado.referenciaHistoricaNoPrepare, 1, "a variável deveria virar referência histórica, não ocorrência efetiva");
  assert.strictEqual(resultado.apontamentosGravados, 1, "só 1 apontamento deveria ser gravado na nova competência");
  assert.ok(resultado.rubricasGravadas.includes(resultado.rubricaFixaId), "a rubrica fixa deveria estar na nova competência");
  assert.ok(!resultado.rubricasGravadas.includes(resultado.rubricaVariavelId), "a rubrica variável NUNCA deveria ser repetida automaticamente");

  assert.strictEqual(erros.length, 0, "não deveria haver erros de JS: " + erros.join(" | "));
  await page.close();
}

module.exports = [
  { nome: "validarCpf rejeita sequências repetidas e aceita CPF real", fn: testeValidarCpf },
  { nome: "importação cria NOVO, não sobrescreve DIVERGÊNCIA em lote, e é idempotente", fn: testeImportarEDivergencia },
  { nome: "rollover copia só rubricas fixas/recorrentes, nunca variáveis", fn: testeRolloverNaoRepeteVariaveis },
];
