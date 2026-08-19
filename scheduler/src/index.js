const RELEASEHUB_URL =
  "https://releasehub.pages.dev";


async function listarAmbientes(
  secret
) {
  const response =
    await fetch(
      `${RELEASEHUB_URL}/api/environments`,
      {
        headers: {
          Accept:
            "application/json",

          "X-Scheduler-Secret":
            secret,
        },
      }
    );

  if (
    !response.ok
  ) {
    throw new Error(
      `Erro ${response.status} ao buscar os ambientes do ReleaseHub.`
    );
  }

  const ambientes =
    await response.json();

  if (
    !Array.isArray(
      ambientes
    )
  ) {
    throw new Error(
      "A API de ambientes retornou um formato inesperado."
    );
  }

  return ambientes;
}


async function sincronizarProjeto(
  ambiente,
  secret,
  projectOffset,
  issueOffset
) {
  const response =
    await fetch(
      `${RELEASEHUB_URL}/api/redmine-sync`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          "X-Scheduler-Secret":
            secret,
        },

        body:
          JSON.stringify({
            environmentId:
              ambiente.id,

            schedulerMode:
              true,

            projectOffset,

            issueOffset,
          }),
      }
    );

  const texto =
    await response.text();

  let resultado =
    null;

  try {
    resultado =
      texto
        ? JSON.parse(
            texto
          )
        : null;
  } catch {
    resultado =
      null;
  }

  if (
    !response.ok
  ) {
    throw new Error(
      resultado?.erro ??
      `Erro ${response.status} ao sincronizar o projeto ${projectOffset} do ambiente ${ambiente.id}.`
    );
  }

  return resultado;
}


async function sincronizarAmbiente(
  ambiente,
  secret
) {
  let projectOffset =
    0;

  let totalProjetos =
    null;

  let issueOffset =
    0;

  let projetosAtualizados =
    0;

  let tarefasEncontradas =
    0;

  let tarefasSincronizadas =
    0;

  let projetosIgnorados =
    0;

  let errosProjetos =
    0;

  let iteracoes =
    0;

  while (
    totalProjetos === null ||
    projectOffset <
      totalProjetos
  ) {
    iteracoes +=
      1;

    if (
      iteracoes > 200
    ) {
      throw new Error(
        `O ambiente ${ambiente.id} ultrapassou o limite de segurança de projetos.`
      );
    }

    try {
      const resultado =
        await sincronizarProjeto(
          ambiente,
          secret,
          projectOffset,
          issueOffset
        );

      totalProjetos =
        Number(
          resultado
            ?.totalProjetos ??
          0
        );

      projetosAtualizados +=
        Number(
          resultado
            ?.projetosAtualizados ??
          0
        );

      tarefasEncontradas +=
        Number(
          resultado
            ?.tarefasEncontradas ??
          0
        );

      tarefasSincronizadas +=
        Number(
          resultado
            ?.tarefasSincronizadas ??
          0
        );

      projetosIgnorados +=
        Array.isArray(
          resultado
            ?.projetosIgnorados
        )
          ? resultado
              .projetosIgnorados
              .length
          : 0;

      console.log(
        `[ReleaseHub] Projeto ${projectOffset + 1}/${totalProjetos} processado no ambiente ${ambiente.id}.`,
        {
          ambiente:
            ambiente.nome,

          projeto:
            resultado
              ?.projeto
              ?.nome ??
            null,

          paginaOffset:
            issueOffset,

          projetoConcluido:
            Boolean(
              resultado
                ?.projectDone
            ),

          atualizados:
            resultado
              ?.projetosAtualizados ??
            0,

          tarefasEncontradas:
            resultado
              ?.tarefasEncontradas ??
            0,

          tarefasSincronizadas:
            resultado
              ?.tarefasSincronizadas ??
            0,
        }
      );

      if (
        !resultado?.projectDone
      ) {
        issueOffset =
          Number(
            resultado
              ?.nextIssueOffset
          );

        if (
          !Number.isInteger(
            issueOffset
          ) ||
          issueOffset < 0
        ) {
          throw new Error(
            "A API retornou um deslocamento de tarefas inválido."
          );
        }

        continue;
      }

      issueOffset =
        0;

      if (
        !resultado?.hasMore
      ) {
        break;
      }

      projectOffset =
        Number(
          resultado
            ?.nextProjectOffset
        );

      if (
        !Number.isInteger(
          projectOffset
        ) ||
        projectOffset < 0
      ) {
        throw new Error(
          "A API retornou um deslocamento de projeto inválido."
        );
      }
    } catch (erro) {
      errosProjetos +=
        1;

      console.error(
        `[ReleaseHub] Erro no projeto ${projectOffset + 1} do ambiente ${ambiente.id} - ${ambiente.nome}:`,
        erro
      );

      if (
        totalProjetos === null
      ) {
        throw erro;
      }

      projectOffset +=
        1;

      issueOffset =
        0;
    }
  }

  return {
    totalProjetos:
      totalProjetos ??
      0,

    projetosAtualizados,

    tarefasEncontradas,

    tarefasSincronizadas,

    projetosIgnorados,

    errosProjetos,
  };
}


async function executarSincronizacao(
  secret
) {
  if (
    !secret
  ) {
    throw new Error(
      "O segredo SCHEDULER_SECRET não está configurado no Worker."
    );
  }

  const inicio =
    new Date();

  console.log(
    `[ReleaseHub] Sincronização automática iniciada em ${inicio.toISOString()}.`
  );

  const ambientes =
    await listarAmbientes(
      secret
    );

  const ambientesAtivos =
    ambientes.filter(
      ambiente =>
        !ambiente.concluido
    );

  console.log(
    `[ReleaseHub] ${ambientes.length} ambiente(s) encontrado(s), ${ambientesAtivos.length} ativo(s).`
  );

  if (
    ambientesAtivos.length === 0
  ) {
    console.log(
      "[ReleaseHub] Nenhum ambiente ativo para sincronizar."
    );

    return;
  }

  /*
   * No plano Free, cada execução do Worker possui limites de CPU
   * e de subrequisições. Para evitar processar todas as releases
   * na mesma execução, o scheduler alterna um ambiente ativo por ciclo.
   */
  const ciclo =
    Math.floor(
      Date.now() /
      120000
    );

  const indiceAmbiente =
    ciclo %
    ambientesAtivos.length;

  const ambiente =
    ambientesAtivos[
      indiceAmbiente
    ];

  console.log(
    `[ReleaseHub] Ambiente selecionado neste ciclo: ${ambiente.id} - ${ambiente.nome}.`
  );

  let resultado =
    null;

  let erroAmbiente =
    null;

  try {
    resultado =
      await sincronizarAmbiente(
        ambiente,
        secret
      );

    console.log(
      `[ReleaseHub] Ambiente ${ambiente.id} sincronizado.`,
      {
        nome:
          ambiente.nome,

        totalProjetos:
          resultado
            .totalProjetos,

        projetosAtualizados:
          resultado
            .projetosAtualizados,

        projetosIgnorados:
          resultado
            .projetosIgnorados,

        errosProjetos:
          resultado
            .errosProjetos,

        tarefasEncontradas:
          resultado
            .tarefasEncontradas,

        tarefasSincronizadas:
          resultado
            .tarefasSincronizadas,
      }
    );
  } catch (erro) {
    erroAmbiente =
      erro;

    console.error(
      `[ReleaseHub] Erro no ambiente ${ambiente.id} - ${ambiente.nome}:`,
      erro
    );
  }

  const fim =
    new Date();

  console.log(
    "[ReleaseHub] Sincronização automática finalizada.",
    {
      ambientes:
        ambientes.length,

      ambientesAtivos:
        ambientesAtivos.length,

      ambienteProcessado:
        ambiente.id,

      sucesso:
        !erroAmbiente,

      inicio:
        inicio.toISOString(),

      fim:
        fim.toISOString(),
    }
  );
}


export default {
  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      executarSincronizacao(
        env.SCHEDULER_SECRET
      )
    );
  },


  async fetch(
    request,
    env
  ) {
    return Response.json({
      servico:
        "IWS ReleaseHub Scheduler",

      status:
        "ativo",

      atualizacao:
        "automática",

      intervalo:
        "2 minutos",

      estrategia:
        "1 ambiente ativo por ciclo, projeto a projeto",

      releaseHub:
        RELEASEHUB_URL,

      segredoConfigurado:
        Boolean(
          env.SCHEDULER_SECRET
        ),
    });
  },
};
