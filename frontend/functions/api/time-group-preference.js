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


function obterUsuario(
  context
) {

  return (
    context.data?.usuario ||
    null
  );

}


export async function onRequestGet(
  context
) {

  try {

    const usuario =
      obterUsuario(
        context
      );

    if (!usuario) {

      return respostaErro(
        "Usuário não autenticado.",
        401
      );

    }

    const preferencia =
      await context.env.DB
        .prepare(
          `
            SELECT
              ultimo_time_group_id
            FROM user_preferences
            WHERE user_id = ?
            LIMIT 1
          `
        )
        .bind(
          Number(
            usuario.id
          )
        )
        .first();

    return Response.json({
      ultimoGrupoId:
        preferencia
          ?.ultimo_time_group_id ??
        null,
    });

  } catch (erro) {

    console.error(
      "Erro ao carregar preferência de grupo:",
      erro
    );

    return respostaErro(
      "Não foi possível carregar a preferência de grupo."
    );

  }

}


export async function onRequestPut(
  context
) {

  try {

    const usuario =
      obterUsuario(
        context
      );

    if (!usuario) {

      return respostaErro(
        "Usuário não autenticado.",
        401
      );

    }

    const body =
      await context.request.json();

    const grupoIdBruto =
      body.grupoId;

    const grupoId =
      grupoIdBruto === null ||
      grupoIdBruto === "" ||
      grupoIdBruto === undefined
        ? null
        : Number(
            grupoIdBruto
          );

    if (
      grupoId !== null &&
      (
        !Number.isFinite(
          grupoId
        ) ||
        grupoId <= 0
      )
    ) {

      return respostaErro(
        "Grupo inválido.",
        400
      );

    }

    if (
      grupoId !== null
    ) {

      const grupo =
        await context.env.DB
          .prepare(
            `
              SELECT id
              FROM time_groups
              WHERE id = ?
              LIMIT 1
            `
          )
          .bind(
            grupoId
          )
          .first();

      if (!grupo) {

        return respostaErro(
          "Grupo não encontrado.",
          404
        );

      }

    }

    await context.env.DB
      .prepare(
        `
          INSERT INTO user_preferences (
            user_id,
            ultimo_time_group_id
          )
          VALUES (?, ?)
          ON CONFLICT(user_id)
          DO UPDATE SET
            ultimo_time_group_id =
              excluded.ultimo_time_group_id
        `
      )
      .bind(
        Number(
          usuario.id
        ),
        grupoId
      )
      .run();

    return Response.json({
      sucesso: true,
      ultimoGrupoId:
        grupoId,
    });

  } catch (erro) {

    console.error(
      "Erro ao salvar preferência de grupo:",
      erro
    );

    return respostaErro(
      "Não foi possível salvar a preferência de grupo."
    );

  }

}