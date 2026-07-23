function numero(valor) {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

function transformarProjeto(row) {

  return {

    id: row.id,

    nome: row.nome,

    versao: row.versao,

    executavel: row.executavel,

    prazo: row.prazo,

    situacoes: {

      qualidade: row.qualidade,

      testes: row.testes,

      desenvolvido: row.desenvolvido,

      emProgresso: row.em_progresso,

      aguardandoCompilacao:
        row.aguardando_compilacao,

      nova: row.nova,

      reaberta: row.reaberta,

      rejeitada: row.rejeitada,

      interrompida: row.interrompida,

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
  GET /api/projects

  Retorna todos os projetos.
*/

export async function onRequestGet(
  context
) {

  try {

    const resultado =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              nome,
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
            FROM projects
            ORDER BY id
          `
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
      "Erro ao listar projetos:",
      erro
    );

    return respostaErro(
      "Não foi possível listar os projetos."
    );

  }

}

/*
  POST /api/projects

  Cria um novo projeto.
*/

export async function onRequestPost(
  context
) {

  try {

    const body =
      await context.request.json();

    if (!body.nome?.trim()) {

      return respostaErro(
        "O nome do projeto é obrigatório.",
        400
      );

    }

    const id =
      body.id ?? Date.now();

    const situacoes =
      body.situacoes ?? {};

    await context.env.DB
      .prepare(
        `
          INSERT INTO projects (
            id,
            nome,
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
        `
      )
      .bind(

        id,

        body.nome.trim(),

        body.versao ?? "",

        body.executavel ?? "",

        body.prazo ?? "",

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
      {
        ...body,
        id,
      },
      {
        status: 201,
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao criar projeto:",
      erro
    );

    return respostaErro(
      "Não foi possível criar o projeto."
    );

  }

}

/*
  PUT /api/projects

  Atualiza um projeto existente.
*/

export async function onRequestPut(
  context
) {

  try {

    const body =
      await context.request.json();

    if (!body.id) {

      return respostaErro(
        "O ID do projeto é obrigatório.",
        400
      );

    }

    if (!body.nome?.trim()) {

      return respostaErro(
        "O nome do projeto é obrigatório.",
        400
      );

    }

    const situacoes =
      body.situacoes ?? {};

    await context.env.DB
      .prepare(
        `
          UPDATE projects

          SET
            nome = ?,
            versao = ?,
            executavel = ?,
            prazo = ?,
            qualidade = ?,
            testes = ?,
            desenvolvido = ?,
            em_progresso = ?,
            aguardando_compilacao = ?,
            nova = ?,
            reaberta = ?,
            rejeitada = ?,
            interrompida = ?

          WHERE id = ?
        `
      )
      .bind(

        body.nome.trim(),

        body.versao ?? "",

        body.executavel ?? "",

        body.prazo ?? "",

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
        ),

        body.id

      )
      .run();

    return Response.json(
      body
    );

  } catch (erro) {

    console.error(
      "Erro ao atualizar projeto:",
      erro
    );

    return respostaErro(
      "Não foi possível atualizar o projeto."
    );

  }

}

/*
  DELETE /api/projects?id=123
*/

export async function onRequestDelete(
  context
) {

  try {

    const url =
      new URL(
        context.request.url
      );

    const id =
      Number(
        url.searchParams.get(
          "id"
        )
      );

    if (!id) {

      return respostaErro(
        "O ID do projeto é obrigatório.",
        400
      );

    }

    await context.env.DB
      .prepare(
        `
          DELETE FROM projects
          WHERE id = ?
        `
      )
      .bind(id)
      .run();

    return Response.json(
      {
        sucesso: true,
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao excluir projeto:",
      erro
    );

    return respostaErro(
      "Não foi possível excluir o projeto."
    );

  }

}