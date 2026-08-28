// Sincroniza uma empresa da Ficha Cadastral com a planilha "Cadastro Geral
// de Empresas" (Google Sheets) já usada pela AEA. Escreve as colunas que a
// Ficha tem dado confiável pra preencher (Nº, Competência, Nome,
// Administrador, Regime Fiscal, CNPJ, IE, IM), Movimento/Atividade/DP/
// Contábil quando preenchidos na Ficha, e recalcula as colunas de fórmula
// da planilha (PENDÊNCIAS, flag_busca, rank_busca, pendencias_raw) pra
// continuar funcionando com a busca e o dashboard. Não mexe nas colunas
// preenchidas manualmente (Contrato, Plano) nem em Movimento/Atividade/DP/
// Contábil quando a Ficha não tem esse dado — nem ao atualizar uma linha
// existente.
//
// Usa o Nº como chave: se já existir uma linha com esse número na coluna A,
// atualiza ela; senão, cria uma linha nova no final.

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

let sheetsTokenClient = null;
let sheetsAccessToken = null;

function sheetsConfigured() {
  return !!(
    typeof SHEETS_CONFIG !== "undefined" &&
    SHEETS_CONFIG.spreadsheetId &&
    typeof DRIVE_CONFIG !== "undefined" &&
    DRIVE_CONFIG.clientId
  );
}

let combinedTokenClient = null;

// Pede Drive + Sheets numa autorização só. Precisa disso porque dois
// pop-ups em sequência (um pro Drive, outro pra planilha) fazem o navegador
// fechar o segundo sozinho — só reconhece o primeiro como resposta direta
// ao clique do usuário. Preenche o token cacheado dos dois lados
// (driveAccessToken vem de drive-upload.js, carregado antes deste arquivo).
function requestDriveAndSheetsAccessToken() {
  return new Promise((resolve, reject) => {
    if (!combinedTokenClient) {
      combinedTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: DRIVE_CONFIG.clientId,
        scope: `${DRIVE_SCOPE} ${SHEETS_SCOPE}`,
        callback: () => {},
        error_callback: () => {},
      });
    }
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(
        "Tempo esgotado aguardando a autorização do Google. Verifique se o navegador bloqueou um pop-up " +
        "e permita pop-ups para este site."
      ));
    }, 45000);

    combinedTokenClient.callback = (resp) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (resp.error) { reject(new Error(resp.error)); return; }
      driveAccessToken = resp.access_token;
      sheetsAccessToken = resp.access_token;
      resolve(resp.access_token);
    };

    combinedTokenClient.error_callback = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(new Error(
        "Não foi possível abrir a janela de autorização do Google (" + (err && err.type ? err.type : "erro desconhecido") + "). " +
        "Verifique se pop-ups estão bloqueados para este site."
      ));
    };

    combinedTokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// Usa o token já cacheado de qualquer um dos dois lados se existir; senão
// pede os dois juntos numa autorização só.
async function ensureDriveAndSheetsAccessToken() {
  if (driveAccessToken && sheetsAccessToken) return driveAccessToken;
  return requestDriveAndSheetsAccessToken();
}

function ensureSheetsTokenClient() {
  if (!sheetsTokenClient) {
    sheetsTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: DRIVE_CONFIG.clientId,
      scope: SHEETS_SCOPE,
      callback: () => {}, // sobrescrito a cada chamada de requestSheetsAccessToken
      error_callback: () => {},
    });
  }
  return sheetsTokenClient;
}

// Mesmo cuidado com timeout/pop-up bloqueado explicado em drive-upload.js:
// sem isso a promise fica pendurada pra sempre se o navegador bloquear o
// pop-up de autorização.
function requestSheetsAccessToken() {
  return new Promise((resolve, reject) => {
    const client = ensureSheetsTokenClient();
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(
        "Tempo esgotado aguardando a autorização do Google. Verifique se o navegador bloqueou um pop-up " +
        "e permita pop-ups para este site."
      ));
    }, 45000);

    client.callback = (resp) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      if (resp.error) { reject(new Error(resp.error)); return; }
      sheetsAccessToken = resp.access_token;
      resolve(sheetsAccessToken);
    };

    client.error_callback = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(new Error(
        "Não foi possível abrir a janela de autorização do Google (" + (err && err.type ? err.type : "erro desconhecido") + "). " +
        "Verifique se pop-ups estão bloqueados para este site."
      ));
    };

    client.requestAccessToken({ prompt: "consent" });
  });
}

async function ensureSheetsAccessToken() {
  if (sheetsAccessToken) return sheetsAccessToken;
  // Mesma ideia do lado do Drive: se a página também tem Drive configurado,
  // pede as duas permissões juntas, pra nunca precisar de um segundo pop-up.
  if (typeof driveConfigured === "function" && driveConfigured()) {
    return ensureDriveAndSheetsAccessToken();
  }
  return requestSheetsAccessToken();
}

function handleSheetsAuthExpired() {
  sheetsAccessToken = null;
}

async function sheetsFetch(url, options) {
  options = options || {};
  options.headers = Object.assign({}, options.headers, {
    Authorization: `Bearer ${sheetsAccessToken}`,
    "Content-Type": "application/json",
  });
  const res = await fetch(url, options);
  if (res.status === 401) {
    handleSheetsAuthExpired();
    throw new Error("Sessão da planilha expirou. Clique de novo para autorizar.");
  }
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${await res.text()}`);
  return res;
}

// Recria as mesmas fórmulas já usadas nas linhas existentes da planilha,
// só trocando o número da linha — pra uma empresa nova continuar aparecendo
// certinho na busca (flag_busca/rank_busca) e no cálculo de pendências.
function pendenciasFormulas(row) {
  return {
    O: `=IF($B${row}="","",IF(R${row}="","Completo",IF(RIGHT(R${row},2)="; ",LEFT(R${row},LEN(R${row})-2),R${row})))`,
    P: `=IF(BUSCA!$B$3="",0,IF(OR(ISNUMBER(SEARCH(BUSCA!$B$3,B${row})),ISNUMBER(SEARCH(BUSCA!$B$3,F${row})),ISNUMBER(SEARCH(BUSCA!$B$3,L${row}))),1,0))`,
    Q: `=IF(P${row}=1,SUM($P$2:P${row}),"")`,
    R: `=IF($B${row}="","",IF($L${row}="","CNPJ; ","")&IF($F${row}="","Administrador; ","")&IF($G${row}="","Regime Fiscal; ","")&IF($I${row}="","Atividade; ","")&IF($J${row}="","DP; ",""))`,
  };
}

// Lê as colunas A (Nº) e B (Nome) de uma vez: acha a linha já existente com
// esse número (se houver) e também a próxima linha livre pra caso precise
// criar uma nova.
async function findOrNextRowByNumero(numero) {
  const sheet = SHEETS_CONFIG.sheetName;
  const range = `${sheet}!A2:B1000`;
  const res = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(range)}`
  );
  const data = await res.json();
  const rows = data.values || [];
  const alvo = String(numero || "").trim();

  let lastUsed = 0;
  let matchRow = null;
  rows.forEach((r, i) => {
    const a = (r[0] || "").toString().trim();
    const b = (r[1] || "").toString().trim();
    if (a || b) lastUsed = i + 1;
    if (alvo && a === alvo) matchRow = i + 2;
  });

  if (matchRow) return { row: matchRow, isNew: false };
  return { row: lastUsed + 2, isNew: true };
}

// O campo Competência na Ficha é um <input type="month"> (ex: "2026-09").
// Converte pro primeiro dia daquele mês em formato ISO, que a planilha
// entende como data e mostra formatado (ex: "set.-26"), igual às linhas já
// existentes.
function competenciaParaData(competencia) {
  return competencia ? `${competencia}-01` : "";
}

async function syncEmpresaToSheet(empresa) {
  if (!sheetsConfigured()) throw new Error("Integração com a planilha ainda não foi configurada.");
  if (!empresa.numero) throw new Error('Preencha o campo "Nº" antes de enviar para a planilha (é usado pra identificar a empresa lá).');

  await ensureSheetsAccessToken();

  const { row, isNew } = await findOrNextRowByNumero(empresa.numero);
  const sheet = SHEETS_CONFIG.sheetName;
  const f = pendenciasFormulas(row);

  const data = [
    { range: `${sheet}!A${row}`, values: [[empresa.numero || ""]] },
    { range: `${sheet}!B${row}`, values: [[empresa.contratante || ""]] },
    { range: `${sheet}!F${row}`, values: [[empresa.administracao || empresa.contatoPrincipal || ""]] },
    { range: `${sheet}!G${row}`, values: [[(empresa.tributacao || "").toUpperCase()]] },
    { range: `${sheet}!L${row}`, values: [[empresa.cnpj || ""]] },
    { range: `${sheet}!M${row}`, values: [[empresa.inscEstadual || ""]] },
    { range: `${sheet}!N${row}`, values: [[empresa.inscMunicipal || ""]] },
    { range: `${sheet}!O${row}`, values: [[f.O]] },
    { range: `${sheet}!P${row}`, values: [[f.P]] },
    { range: `${sheet}!Q${row}`, values: [[f.Q]] },
    { range: `${sheet}!R${row}`, values: [[f.R]] },
  ];

  // Essas colunas são escolhidas manualmente na Ficha (não têm um valor
  // "padrão" certo) e a planilha já tem a maioria preenchida à mão há
  // tempos. Só escreve quando a Ficha realmente tem o dado — senão pula a
  // coluna inteira, pra não apagar por cima do que já estava lá.
  const classificacao = [
    ["C", competenciaParaData(empresa.competencia)],
    ["H", (empresa.movimento || "").toUpperCase()],
    ["I", (empresa.atividade || "").toUpperCase()],
    ["J", (empresa.dp || "").toUpperCase()],
    ["K", (empresa.contabil || "").toUpperCase()],
  ];
  classificacao.forEach(([coluna, valor]) => {
    if (valor) data.push({ range: `${sheet}!${coluna}${row}`, values: [[valor]] });
  });

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
    }
  );

  return { row, isNew };
}
