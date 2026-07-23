function transformarAmbiente(
  row
) {

  return {

    id: row.id,

    nome: row.nome,

    versoes: {

      intellicash:
        row.intellicash,

      easycash:
        row.easycash,

      easycheckout:
        row.easycheckout,

      easypdv:
        row.easypdv,

      intellistock:
        row.intellistock,

      iwbserver:
        row.iwbserver,

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
  GET /api/environments
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
              intellicash,
              easycash,
              easycheckout,
              easypdv,
              intellistock,
              iwbserver
            FROM release_environments
            ORDER BY id DESC
          `
        )
        .all();

    const ambientes =
      resultado.results.map(
        transformarAmbiente
      );

    return Response.json(
      ambientes
    );

  } catch (erro) {

    console.error(
      "Erro ao listar ambientes:",
      erro
    );

    return respostaErro(
      "Não foi possível listar os ambientes."
    );

  }

}

/*
  POST /api/environments
*/

export async function onRequestPost(
  context
) {

  try {

    const body =
      await context.request.json();

    if (!body.nome?.trim()) {

      return respostaErro(
        "O nome do ambiente é obrigatório.",
        400
      );

    }

    if (
      !body.versoes
        ?.intellicash
        ?.trim()
    ) {

      return respostaErro(
        "A versão do Intellicash é obrigatória.",
        400
      );

    }

    const id =
      body.id ?? Date.now();

    const versoes =
      body.versoes ?? {};

    await context.env.DB
      .prepare(
        `
          INSERT INTO release_environments (
            id,
            nome,
            intellicash,
            easycash,
            easycheckout,
            easypdv,
            intellistock,
            iwbserver
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?
          )
        `
      )
      .bind(

        id,

        body.nome.trim(),

        versoes.intellicash ?? "",

        versoes.easycash ?? "",

        versoes.easycheckout ?? "",

        versoes.easypdv ?? "",

        versoes.intellistock ?? "",

        versoes.iwbserver ?? ""

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
      "Erro ao criar ambiente:",
      erro
    );

    return respostaErro(
      "Não foi possível criar o ambiente."
    );

  }

}

/*
  PUT /api/environments
*/

export async function onRequestPut(
  context
) {

  try {

    const body =
      await context.request.json();

    if (!body.id) {

      return respostaErro(
        "O ID do ambiente é obrigatório.",
        400
      );

    }

    if (!body.nome?.trim()) {

      return respostaErro(
        "O nome do ambiente é obrigatório.",
        400
      );

    }

    const versoes =
      body.versoes ?? {};

    await context.env.DB
      .prepare(
        `
          UPDATE release_environments

          SET
            nome = ?,
            intellicash = ?,
            easycash = ?,
            easycheckout = ?,
            easypdv = ?,
            intellistock = ?,
            iwbserver = ?

          WHERE id = ?
        `
      )
      .bind(

        body.nome.trim(),

        versoes.intellicash ?? "",

        versoes.easycash ?? "",

        versoes.easycheckout ?? "",

        versoes.easypdv ?? "",

        versoes.intellistock ?? "",

        versoes.iwbserver ?? "",

        body.id

      )
      .run();

    return Response.json(
      body
    );

  } catch (erro) {

    console.error(
      "Erro ao atualizar ambiente:",
      erro
    );

    return respostaErro(
      "Não foi possível atualizar o ambiente."
    );

  }

}

/*
  DELETE /api/environments?id=123
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
        "O ID do ambiente é obrigatório.",
        400
      );

    }

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_environments
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
      "Erro ao excluir ambiente:",
      erro
    );

    return respostaErro(
      "Não foi possível excluir o ambiente."
    );

  }

}