// Motor de reconciliação — itens 2, 3, 4 e 8 da especificação. Recebe o que
// o parser extraiu de um documento e o que já está cadastrado, e decide (sem
// nunca aplicar nada sozinho) o que fazer com cada registro.
//
// Regra inegociável: identificação por CPF validado tem prioridade; nome
// parecido NUNCA funde dois cadastros sozinho — vira "possível duplicidade"
// pra alguém conferir.

const FOLHA_STATUS = {
  NOVO: "NOVO",
  EXISTENTE: "EXISTENTE",
  POSSIVEL_DUPLICIDADE: "POSSIVEL_DUPLICIDADE",
  DADOS_INSUFICIENTES: "DADOS_INSUFICIENTES",
};

function normalizarNome(nome) {
  return String(nome || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/\s+/g, " ").trim();
}

function nomeParecePronto(nome) {
  return normalizarNome(nome).split(" ").filter(Boolean).length >= 2;
}

// --- Matching de funcionário --------------------------------------------------

function encontrarCorrespondencia(extraido, cadastrados) {
  const cpfExtraido = normalizarCpf(extraido.cpf);
  if (cpfExtraido && validarCpf(cpfExtraido)) {
    const porCpf = cadastrados.find((c) => normalizarCpf(c.cpf) === cpfExtraido);
    if (porCpf) return { funcionario: porCpf, motivo: "cpf" };
  }

  if (extraido.matricula) {
    const porMatricula = cadastrados.find((c) => c.matricula && String(c.matricula).trim() === String(extraido.matricula).trim());
    if (porMatricula) return { funcionario: porMatricula, motivo: "matricula" };
  }

  if (nomeParecePronto(extraido.nome)) {
    const porNome = cadastrados.filter((c) => normalizarNome(c.nome) === normalizarNome(extraido.nome));
    if (porNome.length > 0) return { funcionario: porNome[0], motivo: "nome", ambiguo: porNome.length > 1 };
  }

  return null;
}

// Monta a linha de comparação de UM campo (usado tanto pra complementação
// quanto pra divergência — a diferença é só se já havia valor cadastrado).
function compararCampo(label, campo, valorAtual, valorArquivo, vigenciaDocumento) {
  const atualVazio = valorAtual === null || valorAtual === undefined || valorAtual === "";
  const arquivoVazio = valorArquivo === null || valorArquivo === undefined || valorArquivo === "";
  if (arquivoVazio) return null; // arquivo não trouxe nada pra esse campo — nada a avaliar

  if (atualVazio) {
    return { campo, label, valorAtual, valorArquivo, acaoSugerida: "complementar" };
  }

  const mesmoValor = typeof valorAtual === "number" && typeof valorArquivo === "number"
    ? Math.abs(valorAtual - valorArquivo) < 0.005
    : normalizarNome(String(valorAtual)) === normalizarNome(String(valorArquivo));

  if (mesmoValor) return { campo, label, valorAtual, valorArquivo, acaoSugerida: "sem_alteracao" };

  // Divergência salarial é tratada à parte (ver item 4): nunca sobrescreve
  // sozinha, sempre com as 4 opções e, se o usuário quiser, data de vigência.
  return {
    campo,
    label,
    valorAtual,
    valorArquivo,
    acaoSugerida: "divergencia",
    vigenciaSugerida: campo === "salario" ? vigenciaDocumento || null : null,
  };
}

// Transforma cada funcionário extraído de um documento num item pronto pra
// tela de comparação (item 8) — nunca decide por conta própria quando há
// incerteza (duplicidade, dados insuficientes) ou conflito (divergência).
function reconciliarFuncionarios(extraidos, cadastrados, { competenciaDocumento } = {}) {
  return extraidos.map((extraido) => {
    if (!nomeParecePronto(extraido.nome) && !(extraido.cpf && validarCpf(extraido.cpf))) {
      return {
        tipo: "funcionario",
        status: FOLHA_STATUS.DADOS_INSUFICIENTES,
        extraido,
        funcionarioExistenteId: null,
        campos: [],
        conflito: true,
      };
    }

    const correspondencia = encontrarCorrespondencia(extraido, cadastrados);

    if (!correspondencia) {
      return {
        tipo: "funcionario",
        status: FOLHA_STATUS.NOVO,
        extraido,
        funcionarioExistenteId: null,
        campos: [],
        conflito: false,
      };
    }

    if (correspondencia.motivo === "nome") {
      // Nome bateu, mas CPF/matrícula não confirmaram — nunca é "existente"
      // sozinho; sempre some duplicidade possível, mesmo com só 1 candidato.
      return {
        tipo: "funcionario",
        status: FOLHA_STATUS.POSSIVEL_DUPLICIDADE,
        extraido,
        funcionarioExistenteId: correspondencia.funcionario.id,
        campos: [],
        conflito: true,
      };
    }

    const f = correspondencia.funcionario;
    const campos = [
      compararCampo("Cargo", "cargo", f.cargo, extraido.cargo),
      compararCampo("Salário-base", "salario", f.salarioBase, extraido.salario, competenciaDocumento),
      compararCampo("Data de admissão", "admissao", f.dataAdmissao, extraido.admissao),
      compararCampo("Matrícula", "matricula", f.matricula, extraido.matricula),
    ].filter(Boolean);

    return {
      tipo: "funcionario",
      status: FOLHA_STATUS.EXISTENTE,
      extraido,
      funcionarioExistenteId: f.id,
      campos,
      conflito: campos.some((c) => c.acaoSugerida === "divergencia"),
    };
  });
}

// --- Matching de rubrica/apontamento ------------------------------------------

// Nunca presume incidência (INSS/IRRF/FGTS) por código ou descrição — só
// classifica se a rubrica já é conhecida e já foi conferida, ou se precisa
// de mapeamento/confirmação humana antes de entrar num cálculo (item 7).
function reconciliarApontamentos(apontamentosExtraidos, rubricasCadastradas, apontamentosJaLancados) {
  return apontamentosExtraidos.map((extraido) => {
    const porCodigo = rubricasCadastradas.find((r) =>
      r.codigo === extraido.rubricaCodigo ||
      (r.mapeamentoExterno || []).some((m) => m.codigoOriginal === extraido.rubricaCodigo)
    );

    const jaLancado = (apontamentosJaLancados || []).some((a) =>
      porCodigo && a.rubricaId === porCodigo.id && a.funcionarioCpf === extraido.funcionarioCpf
    );

    if (jaLancado) {
      return { tipo: "apontamento", status: "JA_LANCADO", extraido, rubricaId: porCodigo.id, conflito: true };
    }

    if (!porCodigo) {
      return { tipo: "apontamento", status: "RUBRICA_DESCONHECIDA", extraido, rubricaId: null, conflito: true };
    }

    if (!porCodigo.incidencias || !porCodigo.incidencias.confirmado) {
      return { tipo: "apontamento", status: "RUBRICA_NAO_CONFIRMADA", extraido, rubricaId: porCodigo.id, conflito: true };
    }

    return { tipo: "apontamento", status: "RUBRICA_RECONHECIDA", extraido, rubricaId: porCodigo.id, conflito: false };
  });
}

// --- Aprovação em lote ---------------------------------------------------------

// Regra do item 3/8: aprovação em lote nunca inclui conflito ou incerteza —
// só os itens "limpos" (NOVO claro, ou EXISTENTE sem nenhuma divergência).
function itensElegiveisParaLote(itens) {
  return itens.filter((item) => !item.conflito);
}
