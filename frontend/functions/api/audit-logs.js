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


function converterJson(valor) {
  if (!valor) {
    return null;
  }

  try {
    return JSON.parse(valor);
  } catch {
    return {
      valor,
    };
  }
}


export async function onRequestGet(
  context
) {
  try {
    const url =
      new URL(
        context.request.url
      );

    const limiteSolicitado =
      Number(
        url.searchParams.get(
          "limit"
        )
      );

    const limite =
      Number.isFinite(limiteSolicitado) &&
      limiteSolicitado > 0
        ? Math.min(
            Math.trunc(limiteSolicitado),
            300
          )
        : 100;

    const resultado =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              user_id,
              user_name,
              user_email,
              user_role,
              action,
              entity_type,
              entity_id,
              entity_name,
              previous_data,
              new_data,
              created_at
            FROM audit_logs
            ORDER BY
              created_at DESC,
              id DESC
            LIMIT ?
          `
        )
        .bind(limite)
        .all();

    const historico =
      resultado.results.map(
        registro => ({
          id: registro.id,
          userId: registro.user_id,
          userName: registro.user_name,
          userEmail: registro.user_email,
          userRole: registro.user_role,
          action: registro.action,
          entityType: registro.entity_type,
          entityId: registro.entity_id,
          entityName: registro.entity_name,
          previousData:
            converterJson(
              registro.previous_data
            ),
          newData:
            converterJson(
              registro.new_data
            ),
          createdAt: registro.created_at,
        })
      );

    return Response.json(
      historico
    );
  } catch (erro) {
    console.error(
      "Erro ao carregar histórico:",
      erro
    );

    return respostaErro(
      "Não foi possível carregar o histórico de alterações."
    );
  }
}
