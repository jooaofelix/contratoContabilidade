const FIELD_IDS_FICHA = [
  "f_contratante", "f_numero", "f_cnpj", "f_endereco", "f_bairro", "f_cidade", "f_estado", "f_cep",
  "f_email", "f_contatoPrincipal", "f_administracao", "f_socio1", "f_capitalSocio1", "f_socio2", "f_capitalSocio2",
  "f_vigencia", "f_plano",
  "f_cnaePrincipal", "f_cnaeSecundario", "f_tributacao", "f_valorCapital",
  "f_proLabore", "f_funcionarios",
  "f_emissaoNota", "f_situacao", "f_anexoSimples", "f_inscEstadual", "f_inscMunicipal",
  "f_observacoes",
];

function getF(id) { return document.getElementById(id).value; }

function collectFichaData() {
  const f = {};
  FIELD_IDS_FICHA.forEach((id) => { f[id.replace(/^f_/, "")] = getF(id); });
  return { f };
}

function updateFichaPreview() {
  const data = collectFichaData();
  document.getElementById("ficha-preview").innerHTML = renderFicha(data);
}

function setupLiveUpdateFicha() {
  FIELD_IDS_FICHA.forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updateFichaPreview);
    el.addEventListener("change", updateFichaPreview);
  });
}

function setupPanelTogglesFicha() {
  document.querySelectorAll(".panel-toggle").forEach((h2) => {
    h2.addEventListener("click", () => {
      const body = document.getElementById(h2.dataset.target);
      body.classList.toggle("collapsed");
    });
  });
}

async function autoCadastrarEmpresa(status, contratanteNome, origemLabel) {
  status.textContent = `Cadastrando empresa ${origemLabel}...`;
  status.className = "pdf-status";
  try {
    const data = collectEmpresaFromForm("f_");
    const empresaSelect = document.getElementById("empresa-select");
    const record = await upsertEmpresa(data, null);
    await populateEmpresaSelect(empresaSelect, "— Nova empresa —");
    empresaSelect.value = record.id;
    status.textContent = `Empresa "${contratanteNome}" cadastrada ${origemLabel}. Confira e complete os demais dados.`;
    status.className = "pdf-status ok";
    await saveFichaPdfToDrive(false);
  } catch (err) {
    console.error(err);
    status.textContent = `Dados preenchidos, mas houve erro ao cadastrar. Clique em "Salvar/Atualizar".`;
    status.className = "pdf-status error";
  }
}

// Gera o PDF da ficha em tela e sobe para a subpasta da empresa no Drive.
// Não faz nada se a integração ainda não foi configurada (rootFolderId vazio).
async function saveFichaPdfToDrive(showBusy) {
  if (!driveConfigured()) return;
  const status = document.getElementById("empresa-status");
  const empresaId = document.getElementById("empresa-select").value;
  const nome = getF("f_contratante");
  if (!empresaId || !nome) return;

  if (showBusy) {
    status.textContent = "Enviando PDF para o Drive...";
    status.className = "pdf-status";
  }
  try {
    await saveDocumentToDrive({
      elementId: "ficha-preview",
      empresaId,
      empresaNome: nome,
      cnpj: getF("f_cnpj"),
      tipoLabel: "Ficha Cadastral",
      tipoKey: "fichaCadastral",
    });
    status.textContent = "Ficha salva e PDF enviado para o Drive.";
    status.className = "pdf-status ok";
  } catch (err) {
    console.error(err);
    status.textContent = "Dados salvos, mas houve erro ao enviar o PDF para o Drive: " + err.message;
    status.className = "pdf-status error";
  }
}

function setupCnpjLookupFicha() {
  const input = document.getElementById("cnpj-lookup-input");
  const btn = document.getElementById("cnpj-lookup-btn");
  const status = document.getElementById("cnpj-lookup-status");

  const buscar = async () => {
    status.textContent = "Consultando a Receita Federal...";
    status.className = "pdf-status";

    try {
      const parsed = await fetchCnpjFromApi(input.value);

      const setIfFound = (id, value) => {
        if (value) document.getElementById(id).value = value;
      };

      setIfFound("f_contratante", parsed.razaoSocial);
      setIfFound("f_cnpj", parsed.cnpj);
      setIfFound("f_endereco", parsed.endereco);
      setIfFound("f_bairro", parsed.bairro);
      setIfFound("f_cidade", parsed.cidade);
      setIfFound("f_estado", parsed.estado);
      setIfFound("f_cep", parsed.cep);
      setIfFound("f_email", parsed.email);
      setIfFound("f_cnaePrincipal", parsed.cnaePrincipal);
      setIfFound("f_cnaeSecundario", parsed.cnaeSecundario);
      setIfFound("f_tributacao", parsed.tributacao);
      setIfFound("f_valorCapital", parsed.valorCapital);
      setIfFound("f_situacao", parsed.situacao);
      setIfFound("f_socio1", parsed.socio1);
      setIfFound("f_capitalSocio1", parsed.capitalSocio1);
      setIfFound("f_socio2", parsed.socio2);
      setIfFound("f_capitalSocio2", parsed.capitalSocio2);

      updateFichaPreview();

      if (!parsed.razaoSocial) {
        status.textContent = "CNPJ encontrado, mas sem razão social retornada. Confira os dados e salve manualmente.";
        status.className = "pdf-status error";
        return;
      }

      await autoCadastrarEmpresa(status, parsed.razaoSocial, "via consulta à Receita");
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Erro ao consultar o CNPJ.";
      status.className = "pdf-status error";
    }
  };

  btn.addEventListener("click", buscar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      buscar();
    }
  });
}

function setupPdfImportFicha() {
  const input = document.getElementById("pdf-input");
  const status = document.getElementById("pdf-status");

  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;

    status.textContent = "Lendo PDF...";
    status.className = "pdf-status";

    try {
      const text = await extractTextFromPdf(file);
      const parsed = parseCnpjCardText(text);

      let foundCount = 0;
      const setIfFound = (id, value) => {
        if (value) {
          document.getElementById(id).value = value;
          foundCount++;
        }
      };

      setIfFound("f_contratante", parsed.razaoSocial);
      setIfFound("f_cnpj", parsed.cnpj);
      setIfFound("f_bairro", parsed.bairro);
      setIfFound("f_cidade", parsed.cidade);
      setIfFound("f_estado", parsed.estado);
      setIfFound("f_cep", parsed.cep);
      setIfFound("f_cnaePrincipal", parsed.cnaePrincipal);
      setIfFound("f_cnaeSecundario", parsed.cnaeSecundario);

      const enderecoPartes = [parsed.endereco].filter(Boolean).join(", ");
      if (enderecoPartes) {
        document.getElementById("f_endereco").value = enderecoPartes;
        foundCount++;
      }

      if (foundCount === 0) {
        status.textContent = "Não foi possível reconhecer os dados neste PDF. Preencha manualmente.";
        status.className = "pdf-status error";
        updateFichaPreview();
        return;
      }

      updateFichaPreview();

      if (!parsed.razaoSocial) {
        status.textContent = `${foundCount} campo(s) preenchido(s) automaticamente, mas não achei a razão social. Confira e clique em "Salvar/Atualizar".`;
        status.className = "pdf-status error";
        return;
      }

      await autoCadastrarEmpresa(status, parsed.razaoSocial, "a partir do PDF");
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao ler o PDF. Preencha manualmente.";
      status.className = "pdf-status error";
    }
  });
}

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

// Mesma lógica do enrichFichaFromApi, mas sobre um objeto (não sobre os
// campos do formulário) — só preenche o que estiver vazio na empresa.
function mergeCnpjEnrichment(empresa, parsed) {
  const merged = Object.assign({}, empresa);
  const fillIfEmpty = (key, value) => { if (value && !merged[key]) merged[key] = value; };
  fillIfEmpty("endereco", parsed.endereco);
  fillIfEmpty("bairro", parsed.bairro);
  fillIfEmpty("cidade", parsed.cidade);
  fillIfEmpty("estado", parsed.estado);
  fillIfEmpty("cep", parsed.cep);
  fillIfEmpty("email", parsed.email);
  fillIfEmpty("cnaePrincipal", parsed.cnaePrincipal);
  fillIfEmpty("cnaeSecundario", parsed.cnaeSecundario);
  fillIfEmpty("tributacao", parsed.tributacao);
  fillIfEmpty("valorCapital", parsed.valorCapital);
  fillIfEmpty("situacao", parsed.situacao);
  fillIfEmpty("socio1", parsed.socio1);
  fillIfEmpty("capitalSocio1", parsed.capitalSocio1);
  fillIfEmpty("socio2", parsed.socio2);
  fillIfEmpty("capitalSocio2", parsed.capitalSocio2);
  return merged;
}

// Percorre todas as empresas já cadastradas no banco, consulta a Receita
// (BrasilAPI) por CNPJ pra completar os dados que faltarem, gera o PDF da
// ficha de cada uma e sobe pra pasta de Ficha Cadastral no Drive (uma
// subpasta por cliente, criada/reaproveitada automaticamente).
async function gerarTodasFichas() {
  const status = document.getElementById("bulk-status");

  if (!driveConfigured()) {
    status.textContent = "A integração com o Google Drive ainda não foi configurada.";
    status.className = "pdf-status error";
    return;
  }

  // Pede a autorização do Drive já na hora do clique, antes de qualquer outra
  // espera (busca no banco, confirm()) — deixar essa chamada acontecer só lá
  // na frente é o que faz o navegador (principalmente Safari) bloquear o
  // pop-up por não reconhecer mais como resposta direta ao clique do usuário.
  status.textContent = "Aguardando autorização do Google (confira se abriu um pop-up)...";
  status.className = "pdf-status";
  try {
    await ensureDriveAccessToken();
  } catch (err) {
    console.error(err);
    status.textContent = err.message;
    status.className = "pdf-status error";
    return;
  }

  const empresas = await getEmpresas();
  if (!confirm(`Gerar e salvar no Drive a ficha de ${empresas.length} empresas cadastradas? Isso pode levar alguns minutos.`)) return;

  const formSnapshot = collectFichaData();
  let ok = 0;
  let enriquecidas = 0;
  const falhas = [];

  for (let i = 0; i < empresas.length; i++) {
    const empresa = empresas[i];
    const nome = empresa.contratante || "";

    if (!nome) {
      falhas.push(`Empresa sem nome (id ${empresa.id})`);
      continue;
    }

    let dadosFicha = empresa;
    if (empresa.cnpj) {
      status.textContent = `Consultando Receita ${i + 1}/${empresas.length}: ${nome}...`;
      status.className = "pdf-status";
      try {
        const parsed = await fetchCnpjFromApi(empresa.cnpj);
        dadosFicha = mergeCnpjEnrichment(empresa, parsed);
        await upsertEmpresa(dadosFicha, empresa.id);
        enriquecidas++;
      } catch (apiErr) {
        console.error(apiErr);
        // segue com os dados que já tinha no banco, sem travar a geração
      }
      await sleep(300); // pausa curta pra não estourar limite da API pública
    }

    status.textContent = `Gerando ${i + 1}/${empresas.length}: ${nome}...`;
    status.className = "pdf-status";

    try {
      document.getElementById("ficha-preview").innerHTML = renderFicha({ f: dadosFicha });
      await saveDocumentToDrive({
        elementId: "ficha-preview",
        empresaId: empresa.id,
        empresaNome: nome,
        cnpj: empresa.cnpj,
        tipoLabel: "Ficha Cadastral",
        tipoKey: "fichaCadastral",
      });
      ok++;
    } catch (err) {
      console.error(err);
      falhas.push(`${nome} (${err.message})`);
    }
  }

  document.getElementById("ficha-preview").innerHTML = renderFicha(formSnapshot);

  status.textContent = `Concluído: ${ok} ficha(s) salvas no Drive (${enriquecidas} completadas com dados da Receita).` +
    (falhas.length ? ` ${falhas.length} falha(s): ${falhas.join("; ")}` : "");
  status.className = falhas.length > 0 ? "pdf-status error" : "pdf-status ok";
}

function setupActionsFicha() {
  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
  });

  document.getElementById("btn-clear").addEventListener("click", () => {
    if (!confirm("Limpar todos os campos da ficha?")) return;
    FIELD_IDS_FICHA.forEach((id) => {
      document.getElementById(id).value = "";
    });
    document.getElementById("pdf-input").value = "";
    document.getElementById("pdf-status").textContent = "";
    document.getElementById("empresa-select").value = "";
    updateFichaPreview();
  });
}

async function enrichFichaFromApi(empresaCnpj) {
  const parsed = await fetchCnpjFromApi(empresaCnpj);
  const fillIfEmpty = (id, value) => {
    const el = document.getElementById(id);
    if (value && !el.value) el.value = value;
  };
  fillIfEmpty("f_endereco", parsed.endereco);
  fillIfEmpty("f_bairro", parsed.bairro);
  fillIfEmpty("f_cidade", parsed.cidade);
  fillIfEmpty("f_estado", parsed.estado);
  fillIfEmpty("f_cep", parsed.cep);
  fillIfEmpty("f_email", parsed.email);
  fillIfEmpty("f_cnaePrincipal", parsed.cnaePrincipal);
  fillIfEmpty("f_cnaeSecundario", parsed.cnaeSecundario);
  fillIfEmpty("f_tributacao", parsed.tributacao);
  fillIfEmpty("f_valorCapital", parsed.valorCapital);
  fillIfEmpty("f_situacao", parsed.situacao);
  fillIfEmpty("f_socio1", parsed.socio1);
  fillIfEmpty("f_capitalSocio1", parsed.capitalSocio1);
  fillIfEmpty("f_socio2", parsed.socio2);
  fillIfEmpty("f_capitalSocio2", parsed.capitalSocio2);
}

async function setupEmpresasFicha() {
  const select = document.getElementById("empresa-select");
  const search = document.getElementById("empresa-search");
  const status = document.getElementById("empresa-status");

  let picker = { refresh: async () => {} };
  status.textContent = "Carregando empresas...";
  status.className = "pdf-status";
  try {
    picker = await initEmpresaPicker(search, select, "— Nova empresa —");
    status.textContent = "";
  } catch (err) {
    console.error(err);
    status.textContent = "Não foi possível conectar ao banco de empresas.";
    status.className = "pdf-status error";
  }

  select.addEventListener("change", async () => {
    if (!select.value) return;
    status.textContent = "Carregando...";
    status.className = "pdf-status";
    try {
      const empresa = await getEmpresa(select.value);
      if (!empresa) return;

      applyEmpresaToForm(empresa, "f_");
      updateFichaPreview();

      if (!empresa.cnpj) {
        status.textContent = "Dados carregados.";
        status.className = "pdf-status ok";
        return;
      }

      status.textContent = "Dados carregados. Buscando informações complementares na Receita...";
      try {
        await enrichFichaFromApi(empresa.cnpj);
        updateFichaPreview();
        const enriched = collectEmpresaFromForm("f_");
        await upsertEmpresa(enriched, select.value);
        await picker.refresh();
        status.textContent = "Dados complementares preenchidos e salvos automaticamente.";
        status.className = "pdf-status ok";
      } catch (apiErr) {
        console.error(apiErr);
        status.textContent = "Dados carregados. Não consegui buscar informações complementares na Receita agora.";
        status.className = "pdf-status ok";
      }
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao carregar a empresa.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("empresa-save").addEventListener("click", async () => {
    const data = collectEmpresaFromForm("f_");
    if (!data.contratante) {
      status.textContent = "Informe ao menos o nome do Contratante antes de salvar.";
      status.className = "pdf-status error";
      return;
    }
    status.textContent = "Salvando...";
    status.className = "pdf-status";
    try {
      const record = await upsertEmpresa(data, select.value || null);
      await picker.refresh();
      select.value = record.id;
      status.textContent = "Empresa salva.";
      status.className = "pdf-status ok";
      await saveFichaPdfToDrive(false);
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao salvar a empresa.";
      status.className = "pdf-status error";
    }
  });

  document.getElementById("empresa-drive").addEventListener("click", async () => {
    if (!driveConfigured()) {
      status.textContent = "A integração com o Google Drive ainda não foi configurada.";
      status.className = "pdf-status error";
      return;
    }
    if (!select.value) {
      status.textContent = 'Salve a empresa (botão "Salvar/Atualizar") antes de enviar para o Drive.';
      status.className = "pdf-status error";
      return;
    }
    await saveFichaPdfToDrive(true);
  });

  document.getElementById("empresa-new").addEventListener("click", () => {
    select.value = "";
    FIELD_IDS_FICHA.forEach((id) => { document.getElementById(id).value = ""; });
    status.textContent = "";
    updateFichaPreview();
  });

  document.getElementById("empresa-delete").addEventListener("click", async () => {
    if (!select.value) {
      status.textContent = "Selecione uma empresa salva para excluir.";
      status.className = "pdf-status error";
      return;
    }
    if (!confirm("Excluir esta empresa da lista salva? Isso não afeta os campos preenchidos agora.")) return;
    status.textContent = "Excluindo...";
    status.className = "pdf-status";
    try {
      await deleteEmpresa(select.value);
      await picker.refresh();
      status.textContent = "Empresa excluída.";
      status.className = "pdf-status ok";
    } catch (err) {
      console.error(err);
      status.textContent = "Erro ao excluir a empresa.";
      status.className = "pdf-status error";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupPanelTogglesFicha();
  setupLiveUpdateFicha();
  setupCnpjLookupFicha();
  setupPdfImportFicha();
  setupActionsFicha();
  setupEmpresasFicha();
  document.getElementById("gerar-todas-fichas").addEventListener("click", gerarTodasFichas);
  updateFichaPreview();
});
