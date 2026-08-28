export async function onRequestGet(context) {
  try {
    const url =
      new URL(context.request.url);

    const environmentId =
      Number(
        url.searchParams.get(
          "environmentId"
        )
      );

    if (!environmentId) {
      return Response.json(
        {
          erro:
            "O ambiente da release é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    const ambiente =
      await context.env.DB
        .prepare(
          `
            SELECT id
            FROM release_environments
            WHERE id = ?
          `
        )
        .bind(environmentId)
        .first();

    if (!ambiente) {
      return Response.json(
        {
          erro:
            "Ambiente da release não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const resultado =
      await context.env.DB
        .prepare(
          `
            SELECT
              a.id,
              a.name,
              a.display_order,
              a.active,
              COALESCE(v.version, '') AS version,
              v.updated_at
            FROM isa_applications a

            LEFT JOIN isa_environment_versions v
              ON v.application_id = a.id
             AND v.environment_id = ?

            WHERE a.active = 1

            ORDER BY
              a.display_order ASC,
              a.name ASC
          `
        )
        .bind(environmentId)
        .all();

    return Response.json({
      environmentId,
      applications:
        resultado.results ?? [],
    });
  } catch (error) {
    console.error(
      "Erro ao carregar versões ISA:",
      error
    );

    return Response.json(
      {
        erro:
          "Não foi possível carregar as versões dos aplicativos ISA.",
      },
      {
        status: 500,
      }
    );
  }
}


export async function onRequestPut(context) {
  try {
    const usuario =
      context.data.usuario;

    if (
      !usuario ||
      usuario.role === "visualizador"
    ) {
      return Response.json(
        {
          erro:
            "Seu perfil possui acesso somente para visualização.",
        },
        {
          status: 403,
        }
      );
    }

    const body =
      await context.request.json();

    const environmentId =
      Number(body.environmentId);

    const applicationId =
      Number(body.applicationId);

    const version =
      String(
        body.version ?? ""
      ).trim();

    if (!environmentId) {
      return Response.json(
        {
          erro:
            "O ambiente da release é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    if (!applicationId) {
      return Response.json(
        {
          erro:
            "O aplicativo ISA é obrigatório.",
        },
        {
          status: 400,
        }
      );
    }

    if (!version) {
      return Response.json(
        {
          erro:
            "Informe a versão do aplicativo.",
        },
        {
          status: 400,
        }
      );
    }

    const ambiente =
      await context.env.DB
        .prepare(
          `
            SELECT id
            FROM release_environments
            WHERE id = ?
          `
        )
        .bind(environmentId)
        .first();

    if (!ambiente) {
      return Response.json(
        {
          erro:
            "Ambiente da release não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const aplicacao =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              name,
              active
            FROM isa_applications
            WHERE id = ?
          `
        )
        .bind(applicationId)
        .first();

    if (!aplicacao) {
      return Response.json(
        {
          erro:
            "Aplicativo ISA não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      Number(aplicacao.active) !== 1
    ) {
      return Response.json(
        {
          erro:
            "Este aplicativo ISA está inativo.",
        },
        {
          status: 400,
        }
      );
    }

    const existente =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              version
            FROM isa_environment_versions
            WHERE environment_id = ?
              AND application_id = ?
          `
        )
        .bind(
          environmentId,
          applicationId
        )
        .first();

    const versaoAnterior =
      existente?.version ?? "";

    if (existente) {
      await context.env.DB
        .prepare(
          `
            UPDATE isa_environment_versions

            SET
              version = ?,
              updated_at = CURRENT_TIMESTAMP

            WHERE environment_id = ?
              AND application_id = ?
          `
        )
        .bind(
          version,
          environmentId,
          applicationId
        )
        .run();
    } else {
      await context.env.DB
        .prepare(
          `
            INSERT INTO isa_environment_versions
            (
              environment_id,
              application_id,
              version,
              created_at,
              updated_at
            )
            VALUES
            (
              ?,
              ?,
              ?,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
          `
        )
        .bind(
          environmentId,
          applicationId,
          version
        )
        .run();
    }

    return Response.json({
      sucesso: true,

      application: {
        id:
          applicationId,

        name:
          aplicacao.name,

        version,

        previousVersion:
          versaoAnterior,
      },
    });
  } catch (error) {
    console.error(
      "Erro ao salvar versão ISA:",
      error
    );

    return Response.json(
      {
        erro:
          "Não foi possível salvar a versão do aplicativo ISA.",
      },
      {
        status: 500,
      }
    );
  }
}