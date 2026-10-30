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


  return JSON.parse(
    texto
  );

}


async function listarUsuariosPorApontamentos(
  context
) {

  const usuarios =
    new Map();


  const limite =
    100;


  let offset =
    0;


  let total =
    null;


  while (
    total === null ||
    offset < total
  ) {

    const resultado =
      await buscarJsonRedmine(
        context,
        "/time_entries.json",
        {
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
          !Number.isFinite(id) ||
          id <= 0 ||
          !nome
        ) {

          return;

        }


        usuarios.set(
          id,
          {
            id,
            nome,
          }
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


  return Array.from(
    usuarios.values()
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

}


export async function onRequestGet(
  context
) {

  try {

    const usuarios =
      await listarUsuariosPorApontamentos(
        context
      );


    return Response.json(
      usuarios
    );

  } catch (erro) {

    console.error(
      "Erro ao listar usuários pelos apontamentos do Redmine:",
      erro
    );


    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível listar os usuários do Redmine."
    );

  }

}