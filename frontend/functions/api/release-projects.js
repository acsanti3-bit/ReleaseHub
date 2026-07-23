function numero(valor) {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

function transformarProjeto(row) {
  return {
    id: row.project_id,

    nome: row.nome,

    versao: row.versao ?? "",

    executavel: row.executavel ?? "",

    prazo: row.prazo ?? "",

    situacoes: {
      qualidade:
        numero(row.qualidade),

      testes:
        numero(row.testes),

      desenvolvido:
        numero(row.desenvolvido),

      emProgresso:
        numero(row.em_progresso),

      aguardandoCompilacao:
        numero(
          row.aguardando_compilacao
        ),

      nova:
        numero(row.nova),

      reaberta:
        numero(row.reaberta),

      rejeitada:
        numero(row.rejeitada),

      interrompida:
        numero(row.interrompida),
    },
  };
}

function respostaErro(
  mensagem,
  status = 500
) {
  return Response.json(
    {
      erro: mensagem,
    },
    {
      status,
    }
  );
}


/*
  GET

  /api/release-projects?environmentId=1
*/

export async function onRequestGet(
  context
) {
  try {
    const url =
      new URL(
        context.request.url
      );

    const environmentId =
      Number(
        url.searchParams.get(
          "environmentId"
        )
      );

    if (!environmentId) {
      return respostaErro(
        "O ambiente da release é obrigatório.",
        400
      );
    }

    const ambiente =
      await context.env.DB
        .prepare(
          `
            SELECT id
            FROM release_environments
            WHERE id = ?
            LIMIT 1
          `
        )
        .bind(
          environmentId
        )
        .first();

    if (!ambiente) {
      return respostaErro(
        "Ambiente da release não encontrado.",
        404
      );
    }

    const resultado =
      await context.env.DB
        .prepare(
          `
            SELECT
              rp.project_id,
              p.nome,

              rp.versao,
              rp.executavel,
              rp.prazo,

              rp.qualidade,
              rp.testes,
              rp.desenvolvido,
              rp.em_progresso,
              rp.aguardando_compilacao,
              rp.nova,
              rp.reaberta,
              rp.rejeitada,
              rp.interrompida

            FROM release_projects rp

            INNER JOIN projects p
              ON p.id = rp.project_id

            WHERE rp.environment_id = ?

            ORDER BY p.id
          `
        )
        .bind(
          environmentId
        )
        .all();

    const projetos =
      resultado.results.map(
        transformarProjeto
      );

    return Response.json(
      projetos
    );
  } catch (erro) {
    console.error(
      "Erro ao listar projetos da release:",
      erro
    );

    return respostaErro(
      "Não foi possível carregar os projetos da release."
    );
  }
}


/*
  PUT

  Salva o estado de um projeto
  dentro de uma release específica.
*/

export async function onRequestPut(
  context
) {
  try {
    const body =
      await context.request.json();

    const environmentId =
      Number(
        body.environmentId
      );

    const project =
      body.project;

    if (!environmentId) {
      return respostaErro(
        "O ambiente da release é obrigatório.",
        400
      );
    }

    if (!project?.id) {
      return respostaErro(
        "O projeto é obrigatório.",
        400
      );
    }

    const situacoes =
      project.situacoes ?? {};

    await context.env.DB
      .prepare(
        `
          INSERT INTO release_projects (
            environment_id,
            project_id,
            versao,
            executavel,
            prazo,
            qualidade,
            testes,
            desenvolvido,
            em_progresso,
            aguardando_compilacao,
            nova,
            reaberta,
            rejeitada,
            interrompida
          )

          VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?
          )

          ON CONFLICT(
            environment_id,
            project_id
          )

          DO UPDATE SET
            versao =
              excluded.versao,

            executavel =
              excluded.executavel,

            prazo =
              excluded.prazo,

            qualidade =
              excluded.qualidade,

            testes =
              excluded.testes,

            desenvolvido =
              excluded.desenvolvido,

            em_progresso =
              excluded.em_progresso,

            aguardando_compilacao =
              excluded.aguardando_compilacao,

            nova =
              excluded.nova,

            reaberta =
              excluded.reaberta,

            rejeitada =
              excluded.rejeitada,

            interrompida =
              excluded.interrompida,

            updated_at =
              CURRENT_TIMESTAMP
        `
      )
      .bind(
        environmentId,

        project.id,

        project.versao ?? "",

        project.executavel ?? "",

        project.prazo ?? "",

        numero(
          situacoes.qualidade
        ),

        numero(
          situacoes.testes
        ),

        numero(
          situacoes.desenvolvido
        ),

        numero(
          situacoes.emProgresso
        ),

        numero(
          situacoes.aguardandoCompilacao
        ),

        numero(
          situacoes.nova
        ),

        numero(
          situacoes.reaberta
        ),

        numero(
          situacoes.rejeitada
        ),

        numero(
          situacoes.interrompida
        )
      )
      .run();

    return Response.json(
      project
    );
  } catch (erro) {
    console.error(
      "Erro ao salvar projeto da release:",
      erro
    );

    return respostaErro(
      "Não foi possível salvar o projeto da release."
    );
  }
}