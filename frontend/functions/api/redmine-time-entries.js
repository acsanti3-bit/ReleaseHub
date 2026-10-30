function codificarBase64(
  valor
) {
  const bytes =
    new TextEncoder()
      .encode(
        valor
      );

  let binario =
    "";

  for (
    const byte
    of bytes
  ) {
    binario +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(
    binario
  );
}


function respostaErro(
  mensagem,
  status = 500
) {
  return Response.json(
    {
      erro:
        mensagem,
    },
    {
      status,
    }
  );
}


function obterConfiguracao(
  context
) {
  const url =
    String(
      context.env.REDMINE_URL ??
      ""
    )
      .trim()
      .replace(
        /\/+$/,
        ""
      );

  const usuario =
    String(
      context.env.REDMINE_USERNAME ??
      ""
    ).trim();

  const senha =
    String(
      context.env.REDMINE_PASSWORD ??
      ""
    );

  if (
    !url ||
    !usuario ||
    !senha
  ) {
    throw new Error(
      "As credenciais do Redmine não estão configuradas na Cloudflare."
    );
  }

  return {
    url,
    usuario,
    senha,
  };
}


async function buscarJsonRedmine(
  context,
  caminho,
  parametros = {}
) {
  const configuracao =
    obterConfiguracao(
      context
    );

  const url =
    new URL(
      `${configuracao.url}${caminho}`
    );

  Object.entries(
    parametros
  ).forEach(
    (
      [
        chave,
        valor,
      ]
    ) => {
      if (
        valor === undefined ||
        valor === null ||
        valor === ""
      ) {
        return;
      }

      url.searchParams.set(
        chave,
        String(valor)
      );
    }
  );

  const token =
    codificarBase64(
      `${configuracao.usuario}:${configuracao.senha}`
    );

  const response =
    await fetch(
      url.toString(),
      {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Basic ${token}`,
        },

        redirect:
          "manual",
      }
    );

  const texto =
    await response.text();

  if (
    response.status >= 300 &&
    response.status < 400
  ) {
    throw new Error(
      "O Redmine redirecionou a chamada."
    );
  }

  if (
    response.status === 401
  ) {
    throw new Error(
      "O Redmine recusou o usuário ou a senha configurados."
    );
  }

  if (
    response.status === 403
  ) {
    throw new Error(
      "A rota de apontamento de horas foi bloqueada."
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      `O Redmine retornou o erro ${response.status}.`
    );
  }

  return JSON.parse(
    texto
  );
}


async function listarTimeEntries(
  context,
  parametros
) {
  const entradas =
    [];

  const limite =
    100;

  let offset =
    0;

  let total =
    null;

  while (
    total === null ||
    entradas.length < total
  ) {
    const resultado =
      await buscarJsonRedmine(
        context,
        "/time_entries.json",
        {
          ...parametros,
          limit:
            limite,
          offset,
        }
      );

    const itens =
      Array.isArray(
        resultado.time_entries
      )
        ? resultado.time_entries
        : [];

    entradas.push(
      ...itens
    );

    const totalRetornado =
      Number(
        resultado.total_count
      );

    total =
      Number.isFinite(
        totalRetornado
      )
        ? totalRetornado
        : entradas.length;

    if (
      itens.length === 0 ||
      itens.length < limite
    ) {
      break;
    }

    offset +=
      itens.length;
  }

  return entradas;
}


async function atualizarCacheUsuarios(
  context,
  entradas
) {
  try {
    const usuarios =
      new Map();

    entradas.forEach(
      entrada => {

        const id =
          Number(
            entrada.user?.id
          );

        const nome =
          String(
            entrada.user?.name ??
            ""
          ).trim();

        if (
          !Number.isFinite(id) ||
          id <= 0 ||
          !nome
        ) {
          return;
        }

        usuarios.set(
          id,
          nome
        );
      }
    );

    if (
      usuarios.size === 0
    ) {
      return;
    }

    const comandos =
      Array.from(
        usuarios.entries()
      )
        .map(
          (
            [
              id,
              nome,
            ]
          ) =>
            context.env.DB
              .prepare(
                `
                  INSERT INTO redmine_users_cache (
                    redmine_user_id,
                    redmine_user_name,
                    last_seen
                  )
                  VALUES (?, ?, CURRENT_TIMESTAMP)

                  ON CONFLICT(redmine_user_id)
                  DO UPDATE SET
                    redmine_user_name =
                      excluded.redmine_user_name,
                    last_seen =
                      CURRENT_TIMESTAMP
                `
              )
              .bind(
                id,
                nome
              )
        );

    await context.env.DB.batch(
      comandos
    );

  } catch (erro) {
    console.error(
      "Erro ao atualizar cache de usuários do Redmine:",
      erro
    );
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

    const from =
      url.searchParams.get(
        "from"
      );

    const to =
      url.searchParams.get(
        "to"
      );

    const entradas =
      await listarTimeEntries(
        context,
        {
          from,
          to,
        }
      );


    await atualizarCacheUsuarios(
      context,
      entradas
    );


    const dados =
      entradas.map(
        entrada => ({
          id:
            entrada.id,

          data:
            entrada.spent_on,

          horas:
            entrada.hours,

          usuario: {
            id:
              entrada.user?.id ??
              null,

            nome:
              entrada.user?.name ??
              "",
          },

          projeto: {
            id:
              entrada.project?.id ??
              null,

            nome:
              entrada.project?.name ??
              "",
          },

          tarefa: {
            id:
              entrada.issue?.id ??
              null,
          },

          atividade: {
            id:
              entrada.activity?.id ??
              null,

            nome:
              entrada.activity?.name ??
              "",
          },

          comentario:
            entrada.comments ??
            "",
        })
      );

    return Response.json(
      {
        total:
          dados.length,

        dados,
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao consultar apontamentos do Redmine:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível consultar os apontamentos."
    );
  }
}