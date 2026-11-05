// Executa a suíte de testes do AEA Folha: sobe um servidor estático local,
// abre cada cenário num navegador headless (Playwright/Chromium) e reporta
// o resultado. `npm test` chama este arquivo.
const path = require("path");
const { chromium } = require("playwright");
const { startServer } = require("./helpers/static-server");

const ROOT_DIR = path.join(__dirname, "..");
const PORT = 8321;

async function main() {
  const server = await startServer(ROOT_DIR, PORT);
  const browser = await chromium.launch();

  const suites = [require("./folha.spec.js")];
  const casos = suites.flat();

  let falhas = 0;
  for (const caso of casos) {
    process.stdout.write(`  • ${caso.nome} ... `);
    try {
      await caso.fn(browser);
      console.log("OK");
    } catch (err) {
      falhas++;
      console.log("FALHOU");
      console.error(`    ${err.message}`);
      if (process.env.DEBUG) console.error(err.stack);
    }
  }

  await browser.close();
  server.close();

  console.log(`\n${casos.length - falhas}/${casos.length} teste(s) passaram.`);
  process.exitCode = falhas > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error("Erro ao rodar a suíte:", err);
  process.exitCode = 1;
});
