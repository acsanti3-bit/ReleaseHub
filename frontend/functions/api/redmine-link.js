function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function codificarBase64(valor) {
  const bytes = new TextEncoder().encode(valor);

  let binario = "";

  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }

  return btoa(binario);
}

function respostaErro(mensagem, status = 500) {
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
  const configuracao = obterConfiguracao(
    context
  );

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

  const response = await fetch(
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

  const texto = await response.text();

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

async function listarProjetosRedmine(
  context
) {
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

    const itens = Array.isArray(
      resultado.projects
    )
      ? resultado.projects
      : [];

    projetos.push(...itens);

    const totalRetornado = Number(
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

async function listarVersoesProjeto(
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

function encontrarProjetoRedmine(
  nomeReleaseHub,
  projetosRedmine
) {
  const nomeNormalizado =
    normalizarTexto(
      nomeReleaseHub
    );

  const exatos =
    projetosRedmine.filter(
      projeto =>
        normalizarTexto(
          projeto.name
        ) === nomeNormalizado
    );

  if (exatos.length === 1) {
    return exatos[0];
  }

  if (exatos.length > 1) {
    return (
      exatos.find(
        projeto =>
          Number(
            projeto.status
          ) === 1
      ) ?? exatos[0]
    );
  }

  const aproximados =
    projetosRedmine.filter(
      projeto => {
        const redmine =
          normalizarTexto(
            projeto.name
          );

        return (
          redmine.includes(
            nomeNormalizado
          ) ||
          nomeNormalizado.includes(
            redmine
          )
        );
      }
    );

  if (aproximados.length === 1) {
    return aproximados[0];
  }

  return null;
}

function encontrarVersaoRedmine(
  versaoReleaseHub,
  versoesRedmine
) {
  const versaoNormalizada =
    normalizarTexto(
      versaoReleaseHub
    );

  return (
    versoesRedmine.find(
      versao =>
        normalizarTexto(
          versao.name
        ) === versaoNormalizada
    ) ?? null
  );
}

function montarUrlIssues(
  configuracao,
  projeto,
  versaoId,
  statusId
) {
  const identifier = String(
    projeto.identifier ??
    projeto.id
  );

  const url = new URL(
    `${configuracao.url}/projects/${encodeURIComponent(identifier)}/issues`
  );

  url.searchParams.append("utf8", "✓");
  url.searchParams.append(
    "set_filter",
    "1"
  );

  url.searchParams.append(
    "f[]",
    "status_id"
  );

  url.searchParams.append(
    "op[status_id]",
    "="
  );

  url.searchParams.append(
    "v[status_id][]",
    String(statusId)
  );

  url.searchParams.append(
    "f[]",
    "fixed_version_id"
  );

  url.searchParams.append(
    "op[fixed_version_id]",
    "="
  );

  url.searchParams.append(
    "v[fixed_version_id][]",
    String(versaoId)
  );

  url.searchParams.append(
    "f[]",
    ""
  );

  [
    "tracker",
    "status",
    "priority",
    "subject",
    "assigned_to",
    "created_on",
    "updated_on",
    "parent",
    "due_date",
    "estimated_hours",
  ].forEach(coluna => {
    url.searchParams.append(
      "c[]",
      coluna
    );
  });

  url.searchParams.append(
    "group_by",
    ""
  );

  url.searchParams.append(
    "t[]",
    ""
  );

  return url.toString();
}

export async function onRequestGet(
  context
) {
  try {
    const requestUrl =
      new URL(
        context.request.url
      );

    const nomeProjeto = String(
      requestUrl.searchParams.get(
        "projeto"
      ) ?? ""
    ).trim();

    const versaoProjeto = String(
      requestUrl.searchParams.get(
        "versao"
      ) ?? ""
    ).trim();

    const statusId = Number(
      requestUrl.searchParams.get(
        "statusId"
      )
    );

    if (!nomeProjeto) {
      return respostaErro(
        "O projeto é obrigatório.",
        400
      );
    }

    if (
      !versaoProjeto ||
      versaoProjeto === "-"
    ) {
      return respostaErro(
        "A versão do projeto é obrigatória.",
        400
      );
    }

    if (
      !Number.isInteger(
        statusId
      ) ||
      statusId <= 0
    ) {
      return respostaErro(
        "O status do Redmine é inválido.",
        400
      );
    }

    const configuracao =
      obterConfiguracao(
        context
      );

    const projetosRedmine =
      await listarProjetosRedmine(
        context
      );

    const projetoRedmine =
      encontrarProjetoRedmine(
        nomeProjeto,
        projetosRedmine
      );

    if (!projetoRedmine) {
      return respostaErro(
        `Não foi localizado no Redmine um projeto correspondente a ${nomeProjeto}.`,
        404
      );
    }

    const versoesRedmine =
      await listarVersoesProjeto(
        context,
        projetoRedmine.id
      );

    const versaoRedmine =
      encontrarVersaoRedmine(
        versaoProjeto,
        versoesRedmine
      );

    if (!versaoRedmine) {
      return respostaErro(
        `A versão ${versaoProjeto} não foi localizada no projeto ${projetoRedmine.name} do Redmine.`,
        404
      );
    }

    return Response.json({
      url: montarUrlIssues(
        configuracao,
        projetoRedmine,
        versaoRedmine.id,
        statusId
      ),

      projeto: {
        id: projetoRedmine.id,
        identifier:
          projetoRedmine.identifier,
        nome:
          projetoRedmine.name,
      },

      versao: {
        id: versaoRedmine.id,
        nome: versaoRedmine.name,
      },

      statusId,
    });
  } catch (erro) {
    console.error(
      "Erro ao montar link do Redmine:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível montar o link do Redmine."
    );
  }
}