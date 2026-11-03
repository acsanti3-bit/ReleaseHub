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
      "O usuário configurado no Redmine não possui permissão para listar os usuários."
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


async function listarTodosUsuariosRedmine(
  context
) {
  const usuarios =
    [];

  const limite =
    100;

  let offset =
    0;

  let total =
    null;


  while (
    total === null ||
    usuarios.length < total
  ) {

    const resultado =
      await buscarJsonRedmine(
        context,
        "/users.json",
        {
          status:
            1,

          limit:
            limite,

          offset,
        }
      );


    const itens =
      Array.isArray(
        resultado.users
      )
        ? resultado.users
        : [];


    usuarios.push(
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
        : usuarios.length;


    if (
      itens.length === 0 ||
      itens.length < limite
    ) {
      break;
    }


    offset +=
      itens.length;
  }


  return usuarios;
}


function montarNomeUsuario(
  usuario
) {
  const primeiroNome =
    String(
      usuario.firstname ??
      ""
    ).trim();

  const ultimoNome =
    String(
      usuario.lastname ??
      ""
    ).trim();

  const nomeCompleto =
    `${primeiroNome} ${ultimoNome}`
      .trim();


  if (
    nomeCompleto
  ) {
    return nomeCompleto;
  }


  return String(
    usuario.login ??
    ""
  ).trim();
}


async function atualizarCacheUsuarios(
  context,
  usuarios
) {
  if (
    !Array.isArray(
      usuarios
    ) ||
    usuarios.length === 0
  ) {
    return;
  }


  const comandos =
    usuarios
      .map(
        usuario => {

          const id =
            Number(
              usuario.id
            );

          const nome =
            montarNomeUsuario(
              usuario
            );


          if (
            !Number.isFinite(
              id
            ) ||
            id <= 0 ||
            !nome
          ) {
            return null;
          }


          return context.env.DB
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
            );
        }
      )
      .filter(Boolean);


  const tamanhoLote =
    70;


  for (
    let inicio = 0;
    inicio < comandos.length;
    inicio += tamanhoLote
  ) {

    const lote =
      comandos.slice(
        inicio,
        inicio + tamanhoLote
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
      Aqui buscamos diretamente todos os usuários
      ativos cadastrados no Redmine.

      Não dependemos mais de apontamentos de horas
      para descobrir quem existe.
    */

    const usuariosRedmine =
      await listarTodosUsuariosRedmine(
        context
      );


    await atualizarCacheUsuarios(
      context,
      usuariosRedmine
    );


    const usuarios =
      usuariosRedmine
        .map(
          usuario => ({

            id:
              Number(
                usuario.id
              ),

            nome:
              montarNomeUsuario(
                usuario
              ),

          })
        )
        .filter(
          usuario =>
            Number.isFinite(
              usuario.id
            ) &&
            usuario.id > 0 &&
            usuario.nome
        )
        .sort(
          (
            a,
            b
          ) =>
            a.nome.localeCompare(
              b.nome,
              "pt-BR"
            )
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