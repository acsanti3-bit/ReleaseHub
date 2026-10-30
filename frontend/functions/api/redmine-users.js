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
      "O usuário configurado no Redmine não possui permissão para listar usuários."
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


async function listarUsuariosRedmine(
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
          status: 1,
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


export async function onRequestGet(
  context
) {
  try {
    const usuarios =
      await listarUsuariosRedmine(
        context
      );

    const dados =
      usuarios
        .map(
          usuario => ({
            id:
              Number(
                usuario.id
              ),

            nome:
              [
                usuario.firstname,
                usuario.lastname,
              ]
                .filter(Boolean)
                .join(" ")
                .trim() ||
              usuario.login ||
              `Usuário ${usuario.id}`,
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
      dados
    );

  } catch (erro) {
    console.error(
      "Erro ao listar usuários do Redmine:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível listar os usuários do Redmine."
    );
  }
}