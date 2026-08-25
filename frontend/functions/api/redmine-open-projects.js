const CACHE_TTL_MS =
  90 * 1000;


let cacheAtual =
  null;


function normalizarTexto(
  valor
) {
  return String(
    valor ?? ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}


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

      headers: {
        "Cache-Control":
          "no-store",
      },
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
      `O Redmine redirecionou a consulta ${caminho} para uma tela de login.`
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
      `A consulta ${caminho} foi bloqueada pelo Redmine.`
    );
  }

  if (
    !response.ok
  ) {
    throw new Error(
      `O Redmine retornou o erro ${response.status} ao consultar ${caminho}.`
    );
  }

  try {
    return JSON.parse(
      texto
    );
  } catch {
    throw new Error(
      `A consulta ${caminho} não retornou um JSON válido.`
    );
  }
}


async function listarColecao(
  context,
  caminho,
  chave,
  parametros = {}
) {
  const itens =
    [];

  const limite =
    100;

  let offset =
    0;

  let total =
    null;

  let pagina =
    0;

  while (
    total === null ||
    itens.length < total
  ) {
    const resultado =
      await buscarJsonRedmine(
        context,
        caminho,
        {
          ...parametros,
          limit:
            limite,
          offset,
        }
      );

    const paginaItens =
      Array.isArray(
        resultado[chave]
      )
        ? resultado[chave]
        : [];

    itens.push(
      ...paginaItens
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
        : itens.length;

    if (
      paginaItens.length === 0 ||
      paginaItens.length < limite
    ) {
      break;
    }

    offset +=
      paginaItens.length;

    pagina +=
      1;

    if (
      pagina > 200
    ) {
      throw new Error(
        `A consulta ${caminho} ultrapassou o limite de segurança de paginação.`
      );
    }
  }

  return itens;
}


async function listarProjetosReleaseHub(
  context
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            id,
            nome
          FROM projects
          ORDER BY id
        `
      )
      .all();

  return Array.isArray(
    resultado.results
  )
    ? resultado.results
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

  if (!nomeNormalizado) {
    return null;
  }

  const exatos =
    projetosRedmine.filter(
      projeto =>
        normalizarTexto(
          projeto.name
        ) ===
        nomeNormalizado
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
      ) ??
      exatos[0]
    );
  }

  const aproximados =
    projetosRedmine.filter(
      projeto => {
        const nomeRedmine =
          normalizarTexto(
            projeto.name
          );

        return (
          nomeRedmine.includes(
            nomeNormalizado
          ) ||
          nomeNormalizado.includes(
            nomeRedmine
          )
        );
      }
    );

  return aproximados.length === 1
    ? aproximados[0]
    : null;
}


function adicionarColunasPadrao(
  url
) {
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
  ].forEach(
    coluna => {
      url.searchParams.append(
        "c[]",
        coluna
      );
    }
  );

  url.searchParams.append(
    "group_by",
    ""
  );

  url.searchParams.append(
    "t[]",
    ""
  );
}


function montarUrlIssues(
  configuracao,
  projeto,
  statusId = null
) {
  const identifier =
    String(
      projeto.identifier ??
      projeto.id
    );

  const url =
    new URL(
      `${configuracao.url}/projects/${encodeURIComponent(identifier)}/issues`
    );

  url.searchParams.append(
    "utf8",
    "✓"
  );

  url.searchParams.append(
    "set_filter",
    "1"
  );

  url.searchParams.append(
    "subproject_id",
    "!*"
  );

  url.searchParams.append(
    "f[]",
    "status_id"
  );

  if (
    statusId === null
  ) {
    url.searchParams.append(
      "op[status_id]",
      "o"
    );
  } else {
    url.searchParams.append(
      "op[status_id]",
      "="
    );

    url.searchParams.append(
      "v[status_id][]",
      String(
        statusId
      )
    );
  }

  url.searchParams.append(
    "f[]",
    ""
  );

  adicionarColunasPadrao(
    url
  );

  return url.toString();
}


function montarUrlProjeto(
  configuracao,
  projeto
) {
  const identifier =
    String(
      projeto.identifier ??
      projeto.id
    );

  return new URL(
    `${configuracao.url}/projects/${encodeURIComponent(identifier)}`
  ).toString();
}


function criarResumoProjeto(
  configuracao,
  projeto
) {
  return {
    id:
      Number(
        projeto.id
      ),

    identifier:
      String(
        projeto.identifier ??
        projeto.id
      ),

    nome:
      String(
        projeto.name ??
        `Projeto ${projeto.id}`
      ),

    totalAbertas:
      0,

    urlProjeto:
      montarUrlProjeto(
        configuracao,
        projeto
      ),

    urlTarefasAbertas:
      montarUrlIssues(
        configuracao,
        projeto
      ),

    situacoes:
      new Map(),
  };
}


async function montarMonitoramento(
  context
) {
  const configuracao =
    obterConfiguracao(
      context
    );

  const [
    projetosRecebidos,
    tarefasAbertas,
    projetosReleaseHub,
  ] =
    await Promise.all([
      listarColecao(
        context,
        "/projects.json",
        "projects"
      ),

      listarColecao(
        context,
        "/issues.json",
        "issues",
        {
          status_id:
            "open",

          sort:
            "id:asc",
        }
      ),

      listarProjetosReleaseHub(
        context
      ),
    ]);

  const projetosAtivos =
    projetosRecebidos.filter(
      projeto =>
        projeto.status === undefined ||
        Number(
          projeto.status
        ) === 1
    );

  const idsCadastradosNoReleaseHub =
    new Set();

  projetosReleaseHub.forEach(
    projetoReleaseHub => {
      const projetoRedmine =
        encontrarProjetoRedmine(
          projetoReleaseHub.nome,
          projetosAtivos
        );

      if (projetoRedmine) {
        idsCadastradosNoReleaseHub.add(
          Number(
            projetoRedmine.id
          )
        );
      }
    }
  );

  const porId =
    new Map();

  projetosAtivos.forEach(
    projeto => {
      porId.set(
        Number(
          projeto.id
        ),
        criarResumoProjeto(
          configuracao,
          projeto
        )
      );
    }
  );

  tarefasAbertas.forEach(
    tarefa => {
      const projetoTarefa =
        tarefa.project ??
        {};

      const projetoId =
        Number(
          projetoTarefa.id
        );

      if (
        !Number.isInteger(
          projetoId
        ) ||
        projetoId <= 0
      ) {
        return;
      }

      if (
        !porId.has(
          projetoId
        )
      ) {
        porId.set(
          projetoId,
          criarResumoProjeto(
            configuracao,
            {
              id:
                projetoId,

              name:
                projetoTarefa.name,
            }
          )
        );
      }

      const resumo =
        porId.get(
          projetoId
        );

      const statusId =
        Number(
          tarefa.status?.id
        );

      const statusNome =
        String(
          tarefa.status?.name ??
          "Sem situação"
        );

      const chaveStatus =
        Number.isInteger(
          statusId
        ) &&
        statusId > 0
          ? statusId
          : statusNome;

      const situacaoAtual =
        resumo.situacoes.get(
          chaveStatus
        ) ??
        {
          id:
            Number.isInteger(
              statusId
            ) &&
            statusId > 0
              ? statusId
              : null,

          nome:
            statusNome,

          quantidade:
            0,
        };

      situacaoAtual.quantidade +=
        1;

      resumo.situacoes.set(
        chaveStatus,
        situacaoAtual
      );

      resumo.totalAbertas +=
        1;
    }
  );

  const compararNomes =
    new Intl.Collator(
      "pt-BR",
      {
        sensitivity:
          "base",
      }
    ).compare;

  const projetos =
    Array.from(
      porId.values()
    )
      .map(
        projeto => ({
          ...projeto,

          cadastradoNoReleaseHub:
            idsCadastradosNoReleaseHub.has(
              Number(
                projeto.id
              )
            ),

          situacoes:
            Array.from(
              projeto.situacoes.values()
            )
              .map(
                situacao => ({
                  ...situacao,

                  url:
                    situacao.id === null
                      ? projeto.urlTarefasAbertas
                      : montarUrlIssues(
                          configuracao,
                          projeto,
                          situacao.id
                        ),
                })
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  b.quantidade -
                    a.quantidade ||
                  compararNomes(
                    a.nome,
                    b.nome
                  )
              ),
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.totalAbertas -
            a.totalAbertas ||
          compararNomes(
            a.nome,
            b.nome
          )
      );

  return {
    atualizadoEm:
      new Date()
        .toISOString(),

    totalProjetos:
      projetos.length,

    totalProjetosComTarefas:
      projetos.filter(
        projeto =>
          projeto.totalAbertas > 0
      ).length,

    totalProjetosForaReleaseHub:
      projetos.filter(
        projeto =>
          !projeto.cadastradoNoReleaseHub
      ).length,

    totalTarefasAbertas:
      tarefasAbertas.length,

    projetos,
  };
}


export async function onRequestGet(
  context
) {
  try {
    const usuario =
      context.data?.usuario;

    if (
      !usuario ||
      ![
        "admin",
        "qualidade",
      ].includes(
        usuario.role
      )
    ) {
      return respostaErro(
        "Você não possui permissão para consultar o monitoramento geral do Redmine.",
        403
      );
    }

    const requestUrl =
      new URL(
        context.request.url
      );

    const forcarAtualizacao =
      requestUrl.searchParams.get(
        "refresh"
      ) === "1";

    const agora =
      Date.now();

    if (
      !forcarAtualizacao &&
      cacheAtual &&
      agora - cacheAtual.criadoEm <
        CACHE_TTL_MS
    ) {
      return Response.json(
        cacheAtual.dados,
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const dados =
      await montarMonitoramento(
        context
      );

    cacheAtual = {
      criadoEm:
        agora,

      dados,
    };

    return Response.json(
      dados,
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao carregar o monitoramento geral do Redmine:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível consultar os projetos do Redmine."
    );
  }
}
