import {
  buscarUsuarioLogado,
} from "../../server/auth.js";

import {
  registrarAuditoria,
} from "../../server/audit.js";


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

    const entityType =
      String(
        url.searchParams.get(
          "entityType"
        ) ?? ""
      )
        .trim()
        .toLowerCase();

    const entityId =
      String(
        url.searchParams.get(
          "entityId"
        ) ?? ""
      ).trim();

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
            WHERE
              (? = '' OR entity_type = ?) AND
              (? = '' OR entity_id = ?)
            ORDER BY
              created_at DESC,
              id DESC
            LIMIT ?
          `
        )
        .bind(
          entityType,
          entityType,
          entityId,
          entityId,
          limite
        )
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


export async function onRequestPost(
  context
) {
  try {
    const usuario =
      await buscarUsuarioLogado(
        context
      );

    if (!usuario) {
      return respostaErro(
        "Sessão inválida ou expirada.",
        401
      );
    }

    if (
      usuario.role !== "admin" &&
      usuario.role !== "qualidade"
    ) {
      return respostaErro(
        "Você não possui permissão para adicionar observações.",
        403
      );
    }

    const body =
      await context.request.json();

    const entityType =
      String(
        body.entityType ?? ""
      )
        .trim()
        .toLowerCase();

    const entityId =
      String(
        body.entityId ?? ""
      ).trim();

    const entityName =
      String(
        body.entityName ?? ""
      ).trim();

    const observacao =
      String(
        body.observacao ?? ""
      ).trim();

    if (
      entityType !== "ambiente" ||
      !entityId
    ) {
      return respostaErro(
        "O ambiente da release é obrigatório.",
        400
      );
    }

    if (!observacao) {
      return respostaErro(
        "A observação não pode ficar vazia.",
        400
      );
    }

    if (observacao.length > 1000) {
      return respostaErro(
        "A observação deve ter no máximo 1000 caracteres.",
        400
      );
    }

    const ambiente =
      await context.env.DB
        .prepare(
          `
            SELECT id, nome
            FROM release_environments
            WHERE id = ?
            LIMIT 1
          `
        )
        .bind(entityId)
        .first();

    if (!ambiente) {
      return respostaErro(
        "Ambiente da release não encontrado.",
        404
      );
    }

    const registrado =
      await registrarAuditoria(
        context,
        {
          acao: "OBSERVACAO",
          entidade: "ambiente",
          entidadeId: ambiente.id,
          entidadeNome:
            entityName || ambiente.nome,
          dadosNovos: {
            observacao,
          },
          usuario,
        }
      );

    if (!registrado) {
      return respostaErro(
        "Não foi possível salvar a observação."
      );
    }

    return Response.json(
      {
        sucesso: true,
      },
      {
        status: 201,
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao salvar observação:",
      erro
    );

    return respostaErro(
      "Não foi possível salvar a observação."
    );
  }
}
