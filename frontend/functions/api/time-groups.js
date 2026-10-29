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


function obterUsuario(
  context
) {

  const usuario =
    context.data?.usuario;

  if (!usuario) {

    return null;

  }

  return usuario;

}


function podeAcessar(
  usuario
) {

  return (
    usuario?.role === "admin" ||
    usuario?.role === "gestor"
  );

}


function normalizarMembros(
  membros
) {

  if (!Array.isArray(membros)) {

    return [];

  }

  const mapa =
    new Map();

  membros.forEach(
    membro => {

      const id =
        Number(
          membro?.redmine_user_id
        );

      const nome =
        String(
          membro?.redmine_user_name ??
          ""
        ).trim();

      if (
        !Number.isFinite(id) ||
        id <= 0 ||
        !nome
      ) {

        return;

      }

      mapa.set(
        id,
        {
          redmine_user_id:
            id,

          redmine_user_name:
            nome,
        }
      );

    }
  );

  return Array.from(
    mapa.values()
  );

}


async function buscarGrupo(
  context,
  id
) {

  return context.env.DB
    .prepare(
      `
        SELECT
          tg.id,
          tg.nome,
          tg.criado_por,
          tg.created_at,
          u.nome AS criado_por_nome
        FROM time_groups tg
        LEFT JOIN users u
          ON u.id = tg.criado_por
        WHERE tg.id = ?
        LIMIT 1
      `
    )
    .bind(id)
    .first();

}


async function nomeEmUso(
  context,
  nome,
  ignorarId = null
) {

  let query = `
    SELECT id
    FROM time_groups
    WHERE LOWER(nome) = LOWER(?)
  `;

  const parametros = [
    nome,
  ];

  if (
    ignorarId !== null
  ) {

    query += `
      AND id <> ?
    `;

    parametros.push(
      ignorarId
    );

  }

  query += `
    LIMIT 1
  `;

  const grupo =
    await context.env.DB
      .prepare(query)
      .bind(
        ...parametros
      )
      .first();

  return Boolean(
    grupo
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

    if (
      !podeAcessar(
        usuario
      )
    ) {

      return respostaErro(
        "Você não possui permissão para acessar os grupos.",
        403
      );

    }

    const [
      gruposResultado,
      membrosResultado,
    ] =
      await Promise.all([
        context.env.DB
          .prepare(
            `
              SELECT
                tg.id,
                tg.nome,
                tg.criado_por,
                tg.created_at,
                u.nome AS criado_por_nome
              FROM time_groups tg
              LEFT JOIN users u
                ON u.id = tg.criado_por
              ORDER BY tg.nome COLLATE NOCASE
            `
          )
          .all(),

        context.env.DB
          .prepare(
            `
              SELECT
                id,
                grupo_id,
                redmine_user_id,
                redmine_user_name
              FROM time_group_members
              ORDER BY redmine_user_name COLLATE NOCASE
            `
          )
          .all(),
      ]);

    const membrosPorGrupo =
      new Map();

    (
      membrosResultado.results ||
      []
    ).forEach(
      membro => {

        const grupoId =
          Number(
            membro.grupo_id
          );

        if (
          !membrosPorGrupo.has(
            grupoId
          )
        ) {

          membrosPorGrupo.set(
            grupoId,
            []
          );

        }

        membrosPorGrupo
          .get(grupoId)
          .push({
            id:
              Number(
                membro.id
              ),

            redmine_user_id:
              Number(
                membro.redmine_user_id
              ),

            redmine_user_name:
              String(
                membro.redmine_user_name ||
                ""
              ),
          });

      }
    );

    const grupos =
      (
        gruposResultado.results ||
        []
      ).map(
        grupo => {

          const dono =
            Number(
              grupo.criado_por
            ) ===
            Number(
              usuario.id
            );

          const administrador =
            usuario.role ===
            "admin";

          return {
            id:
              Number(
                grupo.id
              ),

            nome:
              grupo.nome,

            criado_por:
              Number(
                grupo.criado_por
              ),

            criado_por_nome:
              grupo.criado_por_nome ||
              "",

            created_at:
              grupo.created_at,

            membros:
              membrosPorGrupo.get(
                Number(
                  grupo.id
                )
              ) ||
              [],

            podeEditar:
              administrador ||
              dono,

            podeExcluir:
              administrador ||
              dono,
          };

        }
      );

    return Response.json(
      grupos
    );

  } catch (erro) {

    console.error(
      "Erro ao listar grupos de horas:",
      erro
    );

    return respostaErro(
      "Não foi possível listar os grupos."
    );

  }

}


export async function onRequestPost(
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

    if (
      !podeAcessar(
        usuario
      )
    ) {

      return respostaErro(
        "Você não possui permissão para criar grupos.",
        403
      );

    }

    const body =
      await context.request.json();

    const nome =
      String(
        body.nome ??
        ""
      ).trim();

    const membros =
      normalizarMembros(
        body.membros
      );

    if (!nome) {

      return respostaErro(
        "Informe o nome do grupo.",
        400
      );

    }

    if (
      membros.length === 0
    ) {

      return respostaErro(
        "Selecione pelo menos um usuário para o grupo.",
        400
      );

    }

    if (
      await nomeEmUso(
        context,
        nome
      )
    ) {

      return respostaErro(
        "Já existe um grupo com este nome.",
        409
      );

    }

    const resultado =
      await context.env.DB
        .prepare(
          `
            INSERT INTO time_groups (
              nome,
              criado_por
            )
            VALUES (?, ?)
          `
        )
        .bind(
          nome,
          Number(
            usuario.id
          )
        )
        .run();

    const grupoId =
      Number(
        resultado.meta
          ?.last_row_id
      );

    if (
      !grupoId
    ) {

      throw new Error(
        "Não foi possível identificar o grupo criado."
      );

    }

    const comandosMembros =
      membros.map(
        membro =>
          context.env.DB
            .prepare(
              `
                INSERT INTO time_group_members (
                  grupo_id,
                  redmine_user_id,
                  redmine_user_name
                )
                VALUES (?, ?, ?)
              `
            )
            .bind(
              grupoId,
              membro.redmine_user_id,
              membro.redmine_user_name
            )
      );

    if (
      comandosMembros.length > 0
    ) {

      await context.env.DB.batch(
        comandosMembros
      );

    }

    const grupoCriado = {
      id:
        grupoId,

      nome,

      criado_por:
        Number(
          usuario.id
        ),

      membros,
    };

    await registrarAuditoria(
      context,
      {
        acao:
          "CRIAR",

        entidade:
          "grupo_horas",

        entidadeId:
          grupoId,

        entidadeNome:
          nome,

        dadosNovos:
          grupoCriado,
      }
    );

    return Response.json(
      grupoCriado,
      {
        status: 201,
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao criar grupo de horas:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível criar o grupo."
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

    if (
      !podeAcessar(
        usuario
      )
    ) {

      return respostaErro(
        "Você não possui permissão para editar grupos.",
        403
      );

    }

    const body =
      await context.request.json();

    const id =
      Number(
        body.id
      );

    const nome =
      String(
        body.nome ??
        ""
      ).trim();

    const membros =
      normalizarMembros(
        body.membros
      );

    if (
      !id ||
      !nome
    ) {

      return respostaErro(
        "ID e nome do grupo são obrigatórios.",
        400
      );

    }

    if (
      membros.length === 0
    ) {

      return respostaErro(
        "Selecione pelo menos um usuário para o grupo.",
        400
      );

    }

    const grupoAnterior =
      await buscarGrupo(
        context,
        id
      );

    if (
      !grupoAnterior
    ) {

      return respostaErro(
        "Grupo não encontrado.",
        404
      );

    }

    const podeEditar =
      usuario.role ===
        "admin" ||
      Number(
        grupoAnterior.criado_por
      ) ===
        Number(
          usuario.id
        );

    if (
      !podeEditar
    ) {

      return respostaErro(
        "Somente o criador do grupo ou um administrador pode alterá-lo.",
        403
      );

    }

    if (
      await nomeEmUso(
        context,
        nome,
        id
      )
    ) {

      return respostaErro(
        "Já existe outro grupo com este nome.",
        409
      );

    }

    const membrosAnteriores =
      await context.env.DB
        .prepare(
          `
            SELECT
              redmine_user_id,
              redmine_user_name
            FROM time_group_members
            WHERE grupo_id = ?
            ORDER BY redmine_user_name COLLATE NOCASE
          `
        )
        .bind(id)
        .all();

    const comandos = [
      context.env.DB
        .prepare(
          `
            UPDATE time_groups
            SET nome = ?
            WHERE id = ?
          `
        )
        .bind(
          nome,
          id
        ),

      context.env.DB
        .prepare(
          `
            DELETE FROM time_group_members
            WHERE grupo_id = ?
          `
        )
        .bind(id),

      ...membros.map(
        membro =>
          context.env.DB
            .prepare(
              `
                INSERT INTO time_group_members (
                  grupo_id,
                  redmine_user_id,
                  redmine_user_name
                )
                VALUES (?, ?, ?)
              `
            )
            .bind(
              id,
              membro.redmine_user_id,
              membro.redmine_user_name
            )
      ),
    ];

    await context.env.DB.batch(
      comandos
    );

    await registrarAuditoria(
      context,
      {
        acao:
          "EDITAR",

        entidade:
          "grupo_horas",

        entidadeId:
          id,

        entidadeNome:
          nome,

        dadosAnteriores: {
          id,
          nome:
            grupoAnterior.nome,

          membros:
            membrosAnteriores.results ||
            [],
        },

        dadosNovos: {
          id,
          nome,
          membros,
        },
      }
    );

    return Response.json({
      id,
      nome,
      membros,
    });

  } catch (erro) {

    console.error(
      "Erro ao editar grupo de horas:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível editar o grupo."
    );

  }

}


export async function onRequestDelete(
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

    if (
      !podeAcessar(
        usuario
      )
    ) {

      return respostaErro(
        "Você não possui permissão para excluir grupos.",
        403
      );

    }

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
        "Informe o grupo que deseja excluir.",
        400
      );

    }

    const grupo =
      await buscarGrupo(
        context,
        id
      );

    if (!grupo) {

      return respostaErro(
        "Grupo não encontrado.",
        404
      );

    }

    const podeExcluir =
      usuario.role ===
        "admin" ||
      Number(
        grupo.criado_por
      ) ===
        Number(
          usuario.id
        );

    if (
      !podeExcluir
    ) {

      return respostaErro(
        "Somente o criador do grupo ou um administrador pode excluí-lo.",
        403
      );

    }

    await context.env.DB.batch([
      context.env.DB
        .prepare(
          `
            UPDATE user_preferences
            SET ultimo_time_group_id = NULL
            WHERE ultimo_time_group_id = ?
          `
        )
        .bind(id),

      context.env.DB
        .prepare(
          `
            DELETE FROM time_group_members
            WHERE grupo_id = ?
          `
        )
        .bind(id),

      context.env.DB
        .prepare(
          `
            DELETE FROM time_groups
            WHERE id = ?
          `
        )
        .bind(id),
    ]);

    await registrarAuditoria(
      context,
      {
        acao:
          "EXCLUIR",

        entidade:
          "grupo_horas",

        entidadeId:
          id,

        entidadeNome:
          grupo.nome,

        dadosAnteriores:
          grupo,
      }
    );

    return Response.json({
      sucesso: true,
    });

  } catch (erro) {

    console.error(
      "Erro ao excluir grupo de horas:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível excluir o grupo."
    );

  }

}