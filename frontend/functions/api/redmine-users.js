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


function formatarDataIso(
  data
) {
  const ano =
    data.getUTCFullYear();

  const mes =
    String(
      data.getUTCMonth() + 1
    )
      .padStart(
        2,
        "0"
      );

  const dia =
    String(
      data.getUTCDate()
    )
      .padStart(
        2,
        "0"
      );

  return `${ano}-${mes}-${dia}`;
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
      "O Redmine bloqueou a consulta dos apontamentos."
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      `O Redmine retornou o erro ${response.status}.`
    );
  }

  try {
    return JSON.parse(
      texto
    );
  } catch {
    throw new Error(
      "O Redmine não retornou um JSON válido."
    );
  }
}


async function buscarUsuariosCache(
  context
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            redmine_user_id,
            redmine_user_name

          FROM redmine_users_cache

          ORDER BY
            redmine_user_name
            COLLATE NOCASE
        `
      )
      .all();

  return (
    resultado.results ||
    []
  )
    .map(
      usuario => ({
        id:
          Number(
            usuario.redmine_user_id
          ),

        nome:
          String(
            usuario.redmine_user_name ||
            ""
          ),
      })
    );
}


async function atualizarCacheUsuarios(
  context
) {
  const hoje =
    new Date();

  const inicio =
    new Date();


  /*
    Busca usuários que tiveram apontamentos
    nos últimos 365 dias.
  */

  inicio.setUTCDate(
    inicio.getUTCDate() - 365
  );


  const from =
    formatarDataIso(
      inicio
    );

  const to =
    formatarDataIso(
      hoje
    );


  const limite =
    100;

  let offset =
    0;

  let total =
    null;

  const usuarios =
    new Map();


  while (
    total === null ||
    offset < total
  ) {
    const resultado =
      await buscarJsonRedmine(
        context,
        "/time_entries.json",
        {
          from,
          to,

          limit:
            limite,

          offset,
        }
      );


    const entradas =
      Array.isArray(
        resultado.time_entries
      )
        ? resultado.time_entries
        : [];


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
          !Number.isFinite(
            id
          ) ||
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


    const totalRetornado =
      Number(
        resultado.total_count
      );


    total =
      Number.isFinite(
        totalRetornado
      )
        ? totalRetornado
        : offset +
          entradas.length;


    if (
      entradas.length === 0 ||
      entradas.length < limite
    ) {
      break;
    }


    offset +=
      entradas.length;
  }


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

                VALUES (
                  ?,
                  ?,
                  CURRENT_TIMESTAMP
                )

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


  const tamanhoLote =
    70;


  for (
    let inicioLote = 0;
    inicioLote < comandos.length;
    inicioLote += tamanhoLote
  ) {
    const lote =
      comandos.slice(
        inicioLote,
        inicioLote + tamanhoLote
      );

    if (
      lote.length > 0
    ) {
      await context.env.DB.batch(
        lote
      );
    }
  }
}


export async function onRequestGet(
  context
) {
  try {

    /*
      Atualizamos primeiro o cache usando
      os apontamentos dos últimos 365 dias.

      Assim, usuários novos encontrados
      também entram na lista.
    */

    await atualizarCacheUsuarios(
      context
    );


    const usuarios =
      await buscarUsuariosCache(
        context
      );


    return Response.json(
      usuarios
    );

  } catch (erro) {

    console.error(
      "Erro ao carregar usuários do Redmine:",
      erro
    );


    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível carregar os usuários do Redmine."
    );

  }
}