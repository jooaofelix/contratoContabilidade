// Motor de rollover — itens 5 e 6 da especificação ("Gerar nova folha a
// partir da anterior" + comparação de funcionários entre competências).
//
// O que SEMPRE é copiado: funcionários ativos (conferidos no cadastro atual,
// não no retrato congelado da competência antiga), salários vigentes,
// rubricas fixas e adicionais/descontos marcados como recorrentes.
//
// O que NUNCA é copiado como ocorrência efetiva: horas extras, faltas,
// atrasos, comissões, adiantamentos (variáveis) e rubricas calculadas que
// dependem de condição do mês (DSR, adicional noturno, INSS/IRRF/FGTS) — elas
// só aparecem como referência histórica, esperando apontamento novo.

// Compara a lista de funcionários de duas competências (item 6). Nunca
// interpreta uma ausência como desligamento — só sinaliza pra conferência.
function compararFuncionariosEntreCompetencias(idsAnteriores, idsAtuais) {
  const setAnterior = new Set(idsAnteriores);
  const setAtual = new Set(idsAtuais);

  return {
    novos: idsAtuais.filter((id) => !setAnterior.has(id)),
    ausentes: idsAnteriores.filter((id) => !setAtual.has(id)),
    emComum: idsAtuais.filter((id) => setAnterior.has(id)),
  };
}

// Monta o conteúdo da nova competência sem gravar nada ainda — a tela de
// comparação (item 8) decide o que realmente é aprovado antes de persistir.
async function prepararRolloverCompetencia(empresaId, competenciaAnteriorId, novaCompetenciaChave) {
  const [competenciaAnterior, funcionariosAtivos, apontamentosAnteriores, rubricas] = await Promise.all([
    getCompetencia(competenciaAnteriorId),
    getFuncionarios(empresaId).then((lista) => lista.filter((f) => f.ativo !== false)),
    getApontamentos(competenciaAnteriorId),
    getRubricas(empresaId),
  ]);

  if (!competenciaAnterior) throw new Error("Competência de origem não encontrada.");

  const rubricaPorId = {};
  rubricas.forEach((r) => { rubricaPorId[r.id] = r; });

  const idsFuncionariosAnteriores = [...new Set(apontamentosAnteriores.map((a) => a.funcionarioId))];
  const idsFuncionariosAtuais = funcionariosAtivos.map((f) => f.id);
  const comparacaoFuncionarios = compararFuncionariosEntreCompetencias(idsFuncionariosAnteriores, idsFuncionariosAtuais);

  const apontamentosRecorrentes = [];
  const referenciaHistorica = [];

  apontamentosAnteriores.forEach((a) => {
    const rubrica = rubricaPorId[a.rubricaId];
    const aindaAtivo = idsFuncionariosAtuais.includes(a.funcionarioId);
    if (!aindaAtivo) return; // funcionário não está mais ativo — não repete nada pra ele

    if (a.recorrente && rubrica && rubrica.tipo === "fixa") {
      apontamentosRecorrentes.push({
        funcionarioId: a.funcionarioId,
        rubricaId: a.rubricaId,
        quantidade: a.quantidade != null ? a.quantidade : null,
        percentual: a.percentual != null ? a.percentual : null,
        valor: a.valor,
        tipoEvento: "fixo",
        recorrente: true,
        origemImportacaoId: null,
        origemRollover: competenciaAnteriorId,
      });
    } else {
      // Variável, calculada ou fixa não marcada como recorrente — só
      // referência, nunca lançada de novo sozinha.
      referenciaHistorica.push({ funcionarioId: a.funcionarioId, rubricaId: a.rubricaId, valorAnterior: a.valor, tipo: rubrica ? rubrica.tipo : "desconhecida" });
    }
  });

  return {
    empresaId,
    competenciaAnteriorId,
    novaCompetenciaChave,
    funcionariosAtivos,
    apontamentosRecorrentes,
    referenciaHistorica,
    novosFuncionarios: comparacaoFuncionarios.novos,
    funcionariosAusentes: comparacaoFuncionarios.ausentes,
  };
}

// Só depois de conferido na tela (item 8) isso grava de verdade — cria a
// competência nova e já insere os apontamentos recorrentes aprovados.
async function confirmarRolloverCompetencia(preparo) {
  const nova = await upsertCompetencia({
    empresaId: preparo.empresaId,
    competencia: preparo.novaCompetenciaChave,
    status: "aberta",
    geradaDeCompetenciaId: preparo.competenciaAnteriorId,
  });

  const apontamentosParaGravar = preparo.apontamentosRecorrentes.map((a) => Object.assign({}, a, {
    empresaId: preparo.empresaId,
    competenciaId: nova.id,
  }));

  const resultado = apontamentosParaGravar.length
    ? await bulkUpsertApontamentos(apontamentosParaGravar)
    : { gravados: 0, ignoradosPorDuplicidade: 0 };

  return { competencia: nova, apontamentosGravados: resultado.gravados };
}
