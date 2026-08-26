function codificarBase64(valor) {
  const bytes =
    new TextEncoder().encode(valor);

  let binario = "";

  for (const byte of bytes) {
    binario +=
      String.fromCharCode(byte);
  }

  return btoa(binario);
}

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

function obterConfiguracao(context) {
  const url = String(
    context.env.REDMINE_URL ?? ""
  )
    .trim()
    .replace(/\/+$/, "");

  const usuario = String(
    context.env.REDMINE_USERNAME ?? ""
  ).trim();

  const senha = String(
    context.env.REDMINE_PASSWORD ?? ""
  );

  if (!url || !usuario || !senha) {
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
    obterConfiguracao(context);

  const url = new URL(
    `${configuracao.url}${caminho}`
  );

  Object.entries(parametros).forEach(
    ([chave, valor]) => {
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

  const token = codificarBase64(
    `${configuracao.usuario}:${configuracao.senha}`
  );

  const response =
    await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${token}`,
        },
        redirect: "manual",
      }
    );

  const texto =
    await response.text();

  if (
    response.status >= 300 &&
    response.status < 400
  ) {
    throw new Error(
      `O Redmine redirecionou a chamada da rota ${caminho} para uma tela de login.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `O Redmine retornou o erro ${response.status} ao consultar ${caminho}.`
    );
  }

  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(
      `A rota ${caminho} não retornou um JSON válido.`
    );
  }
}

async function listarProjetos(context) {
  const projetos = [];
  const limite = 100;

  let offset = 0;
  let total = null;

  while (
    total === null ||
    projetos.length < total
  ) {
    const resultado =
      await buscarJsonRedmine(
        context,
        "/projects.json",
        {
          limit: limite,
          offset,
        }
      );

    const itens =
      Array.isArray(
        resultado.projects
      )
        ? resultado.projects
        : [];

    projetos.push(...itens);

    const totalRetornado =
      Number(
        resultado.total_count
      );

    total = Number.isFinite(
      totalRetornado
    )
      ? totalRetornado
      : projetos.length;

    if (
      itens.length === 0 ||
      itens.length < limite
    ) {
      break;
    }

    offset += itens.length;
  }

  return projetos;
}

async function listarVersoes(
  context,
  projectId
) {
  const resultado =
    await buscarJsonRedmine(
      context,
      `/projects/${projectId}/versions.json`
    );

  return Array.isArray(
    resultado.versions
  )
    ? resultado.versions
    : [];
}

function compararVersoes(
  a,
  b
) {
  return String(b.name ?? "")
    .localeCompare(
      String(a.name ?? ""),
      "pt-BR",
      {
        numeric: true,
        sensitivity: "base",
      }
    );
}

export async function onRequestGet(
  context
) {
  try {
    const url =
      new URL(
        context.request.url
      );

    const projectId =
      Number(
        url.searchParams.get(
          "project_id"
        )
      );

    if (projectId) {
      const versoes =
        await listarVersoes(
          context,
          projectId
        );

      return Response.json({
        versions: versoes
          .map(versao => ({
            id: Number(versao.id),
            name: String(
              versao.name ?? ""
            ),
            status:
              versao.status ?? "",
          }))
          .filter(
            versao =>
              versao.id &&
              versao.name
          )
          .sort(compararVersoes),
      });
    }

    const projetos =
      await listarProjetos(
        context
      );

    return Response.json({
      projects: projetos
        .map(projeto => ({
          id: Number(projeto.id),
          name: String(
            projeto.name ?? ""
          ),
          identifier: String(
            projeto.identifier ?? ""
          ),
          status:
            Number(projeto.status) || 0,
        }))
        .filter(
          projeto =>
            projeto.id &&
            projeto.name
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "pt-BR",
              {
                sensitivity: "base",
              }
            ) ||
            a.id - b.id
        ),
    });
  } catch (erro) {
    console.error(
      "Erro ao consultar catálogo do Redmine:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível consultar o Redmine."
    );
  }
}
