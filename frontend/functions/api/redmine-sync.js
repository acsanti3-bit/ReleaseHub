const STATUS_PARA_CAMPO = {
  qualidade:
    "qualidade",

  testes:
    "testes",

  desenvolvido:
    "desenvolvido",

  aguardandocompilacao:
    "aguardando_compilacao",

  emprogresso:
    "em_progresso",

  nova:
    "nova",

  novo:
    "nova",

  reaberta:
    "reaberta",

  reaberto:
    "reaberta",

  resolvida:
    "resolvidas",

  resolvido:
    "resolvidas",

  resolvidas:
    "resolvidas",

  resolvidos:
    "resolvidas",

  rejeitada:
    "rejeitada",

  rejeitado:
    "rejeitada",

  interrompida:
    "interrompida",

  interrompido:
    "interrompida",
};


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


function criarContagens() {
  return {
    qualidade: 0,

    testes: 0,

    desenvolvido: 0,

    aguardando_compilacao: 0,

    em_progresso: 0,

    nova: 0,

    reaberta: 0,

    resolvidas: 0,

    rejeitada: 0,

    interrompida: 0,
  };
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
      `O Redmine redirecionou a chamada da rota ${caminho} para uma tela de login. Verifique o Basic Auth.`
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
      `A rota ${caminho} foi bloqueada pelo Redmine ou pelo desafio de bot da Cloudflare.`
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
      `A rota ${caminho} não retornou um JSON válido. Ela pode ter direcionado para uma página de login ou desafio.`
    );
  }
}


async function listarProjetosRedmine(
  context
) {
  const projetos =
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
    projetos.length < total
  ) {
    const resultado =
      await buscarJsonRedmine(
        context,
        "/projects.json",
        {
          limit:
            limite,

          offset,
        }
      );

    const itens =
      Array.isArray(
        resultado.projects
      )
        ? resultado.projects
        : [];

    projetos.push(
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
        : projetos.length;

    if (
      itens.length === 0 ||
      itens.length < limite
    ) {
      break;
    }

    offset +=
      itens.length;

    pagina +=
      1;

    if (
      pagina > 200
    ) {
      throw new Error(
        "A listagem de projetos do Redmine ultrapassou o limite de segurança."
      );
    }
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


async function listarIssues(
  context,
  projectId,
  versionId
) {
  const issues =
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
    issues.length < total
  ) {
    const resultado =
      await buscarJsonRedmine(
        context,
        "/issues.json",
        {
          project_id:
            projectId,

          subproject_id:
            "!*",

          fixed_version_id:
            versionId,

          status_id:
            "*",

          limit:
            limite,

          offset,

          sort:
            "id:asc",
        }
      );

    const itens =
      Array.isArray(
        resultado.issues
      )
        ? resultado.issues
        : [];

    issues.push(
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
        : issues.length;

    if (
      itens.length === 0 ||
      itens.length < limite
    ) {
      break;
    }

    offset +=
      itens.length;

    pagina +=
      1;

    if (
      pagina > 200
    ) {
      throw new Error(
        `A listagem de tarefas do projeto ${projectId} ultrapassou o limite de segurança.`
      );
    }
  }

  return issues;
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
        ) ===
        nomeNormalizado
    );

  if (
    exatos.length === 1
  ) {
    return exatos[0];
  }

  if (
    exatos.length > 1
  ) {
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

  if (
    aproximados.length === 1
  ) {
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
        ) ===
        versaoNormalizada
    ) ??
    null
  );
}


function somarContagens(
  contagens
) {
  return Object.values(
    contagens
  ).reduce(
    (
      total,
      quantidade
    ) =>
      total +
      Number(
        quantidade
      ),
    0
  );
}



async function buscarPaginaIssues(
  context,
  projectId,
  versionId,
  issueOffset
) {
  const limite =
    100;

  const resultado =
    await buscarJsonRedmine(
      context,
      "/issues.json",
      {
        project_id:
          projectId,

        subproject_id:
          "!*",

        fixed_version_id:
          versionId,

        status_id:
          "*",

        limit:
          limite,

        offset:
          issueOffset,

        sort:
          "id:asc",
      }
    );

  const issues =
    Array.isArray(
      resultado.issues
    )
      ? resultado.issues
      : [];

  const totalRetornado =
    Number(
      resultado.total_count
    );

  const total =
    Number.isFinite(
      totalRetornado
    )
      ? totalRetornado
      : issueOffset +
        issues.length;

  return {
    issues,
    total,
    limite,
  };
}


async function sincronizarProjetoScheduler(
  context,
  ambiente,
  environmentId,
  projectOffset,
  issueOffset
) {
  const totalRow =
    await context.env.DB
      .prepare(
        `
          SELECT
            COUNT(*) AS total

          FROM release_projects

          WHERE environment_id = ?
        `
      )
      .bind(
        environmentId
      )
      .first();

  const totalProjetos =
    Number(
      totalRow?.total ??
      0
    );

  const resultadoProjeto =
    await context.env.DB
      .prepare(
        `
          SELECT
            rp.project_id,
            p.nome,
            rp.versao

          FROM release_projects rp

          INNER JOIN projects p
            ON p.id = rp.project_id

          WHERE rp.environment_id = ?

          ORDER BY p.id

          LIMIT 1
          OFFSET ?
        `
      )
      .bind(
        environmentId,
        projectOffset
      )
      .first();

  const nextProjectOffset =
    projectOffset + 1;

  const hasMoreProjects =
    nextProjectOffset <
    totalProjetos;

  if (
    !resultadoProjeto
  ) {
    return Response.json({
      sucesso:
        true,

      ambiente: {
        id:
          ambiente.id,

        nome:
          ambiente.nome,
      },

      projetosAtualizados:
        0,

      tarefasEncontradas:
        0,

      tarefasSincronizadas:
        0,

      projetosIgnorados:
        [],

      statusIgnorados:
        [],

      sincronizadoEm:
        new Date()
          .toISOString(),

      schedulerMode:
        true,

      projectOffset,

      issueOffset,

      nextProjectOffset,

      nextIssueOffset:
        0,

      totalProjetos,

      projectDone:
        true,

      hasMore:
        false,
    });
  }

  const projetoRelease =
    resultadoProjeto;

  const versaoProjeto =
    String(
      projetoRelease.versao ??
      ""
    ).trim();

  const projetoInfo = {
    projectId:
      projetoRelease.project_id,

    nome:
      projetoRelease.nome,

    versao:
      versaoProjeto,
  };

  const respostaIgnorado = (
    motivo
  ) =>
    Response.json({
      sucesso:
        true,

      ambiente: {
        id:
          ambiente.id,

        nome:
          ambiente.nome,
      },

      projetosAtualizados:
        0,

      tarefasEncontradas:
        0,

      tarefasSincronizadas:
        0,

      projetosIgnorados: [
        {
          projeto:
            projetoRelease.nome,

          motivo,
        },
      ],

      statusIgnorados:
        [],

      sincronizadoEm:
        new Date()
          .toISOString(),

      schedulerMode:
        true,

      projeto:
        projetoInfo,

      projectOffset,

      issueOffset,

      nextProjectOffset,

      nextIssueOffset:
        0,

      totalProjetos,

      projectDone:
        true,

      hasMore:
        hasMoreProjects,
    });

  if (
    !versaoProjeto ||
    versaoProjeto === "-"
  ) {
    return respostaIgnorado(
      "O projeto não possui versão informada neste ambiente."
    );
  }

  const projetosRedmine =
    await listarProjetosRedmine(
      context
    );

  const projetoRedmine =
    encontrarProjetoRedmine(
      projetoRelease.nome,
      projetosRedmine
    );

  if (
    !projetoRedmine
  ) {
    return respostaIgnorado(
      "Não foi localizado um projeto correspondente no Redmine."
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

  if (
    !versaoRedmine
  ) {
    return respostaIgnorado(
      `A versão ${versaoProjeto} não foi localizada no Redmine.`
    );
  }

  const pagina =
    await buscarPaginaIssues(
      context,
      projetoRedmine.id,
      versaoRedmine.id,
      issueOffset
    );

  const contagens =
    criarContagens();

  const statusIgnoradosMap =
    new Map();

  let tarefasSincronizadas =
    0;

  for (
    const issue
    of pagina.issues
  ) {
    const nomeStatus =
      String(
        issue.status?.name ??
        ""
      );

    const chaveStatus =
      normalizarTexto(
        nomeStatus
      );

    const campo =
      STATUS_PARA_CAMPO[
        chaveStatus
      ];

    if (
      !campo
    ) {
      const chave =
        nomeStatus ||
        "Sem situação";

      statusIgnoradosMap.set(
        chave,
        (
          statusIgnoradosMap.get(
            chave
          ) ??
          0
        ) +
        1
      );

      continue;
    }

    contagens[
      campo
    ] +=
      1;

    tarefasSincronizadas +=
      1;
  }

  const statusIgnorados =
    Array.from(
      statusIgnoradosMap.entries()
    ).map(
      (
        [
          status,
          quantidade,
        ]
      ) => ({
        status,
        quantidade,
      })
    );

  if (
    issueOffset === 0
  ) {
    await context.env.DB
      .prepare(
        `
          UPDATE release_projects

          SET
            qualidade = ?,
            testes = ?,
            desenvolvido = ?,
            aguardando_compilacao = ?,
            em_progresso = ?,
            nova = ?,
            reaberta = ?,
            validacao_cliente = ?,
            resolvidas = ?,
            rejeitada = ?,
            interrompida = ?,
            updated_at = CURRENT_TIMESTAMP

          WHERE
            environment_id = ?
            AND project_id = ?
        `
      )
      .bind(
        contagens.qualidade,
        contagens.testes,
        contagens.desenvolvido,
        contagens.aguardando_compilacao,
        contagens.em_progresso,
        contagens.nova,
        contagens.reaberta,
        contagens.validacao_cliente,
        contagens.resolvidas,
        contagens.rejeitada,
        contagens.interrompida,
        environmentId,
        projetoRelease.project_id
      )
      .run();
  } else {
    await context.env.DB
      .prepare(
        `
          UPDATE release_projects

          SET
            qualidade = qualidade + ?,
            testes = testes + ?,
            desenvolvido = desenvolvido + ?,
            aguardando_compilacao = aguardando_compilacao + ?,
            em_progresso = em_progresso + ?,
            nova = nova + ?,
            reaberta = reaberta + ?,
            validacao_cliente = validacao_cliente + ?,
            resolvidas = resolvidas + ?,
            rejeitada = rejeitada + ?,
            interrompida = interrompida + ?,
            updated_at = CURRENT_TIMESTAMP

          WHERE
            environment_id = ?
            AND project_id = ?
        `
      )
      .bind(
        contagens.qualidade,
        contagens.testes,
        contagens.desenvolvido,
        contagens.aguardando_compilacao,
        contagens.em_progresso,
        contagens.nova,
        contagens.reaberta,
        contagens.validacao_cliente,
        contagens.resolvidas,
        contagens.rejeitada,
        contagens.interrompida,
        environmentId,
        projetoRelease.project_id
      )
      .run();
  }

  const nextIssueOffset =
    issueOffset +
    pagina.issues.length;

  const projectDone =
    nextIssueOffset >=
      pagina.total ||
    pagina.issues.length ===
      0;

  return Response.json({
    sucesso:
      true,

    ambiente: {
      id:
        ambiente.id,

      nome:
        ambiente.nome,
    },

    projetosAtualizados:
      projectDone
        ? 1
        : 0,

    tarefasEncontradas:
      pagina.issues.length,

    tarefasSincronizadas,

    projetosIgnorados:
      [],

    statusIgnorados,

    sincronizadoEm:
      new Date()
        .toISOString(),

    schedulerMode:
      true,

    projeto:
      projetoInfo,

    projectOffset,

    issueOffset,

    nextProjectOffset,

    nextIssueOffset:
      projectDone
        ? 0
        : nextIssueOffset,

    totalProjetos,

    totalIssuesProjeto:
      pagina.total,

    projectDone,

    hasMore:
      projectDone
        ? hasMoreProjects
        : true,
  });
}


export async function onRequestPost(
  context
) {
  try {
    const body =
      await context.request.json();

    const environmentId =
      Number(
        body.environmentId
      );

    const schedulerMode =
      body.schedulerMode ===
      true;

    const projectOffsetValor =
      Number(
        body.projectOffset ??
        0
      );

    const projectOffset =
      Number.isInteger(
        projectOffsetValor
      ) &&
      projectOffsetValor >= 0
        ? projectOffsetValor
        : 0;

    const issueOffsetValor =
      Number(
        body.issueOffset ??
        0
      );

    const issueOffset =
      Number.isInteger(
        issueOffsetValor
      ) &&
      issueOffsetValor >= 0
        ? issueOffsetValor
        : 0;

    if (
      !environmentId
    ) {
      return respostaErro(
        "O ambiente da release é obrigatório.",
        400
      );
    }

    const ambiente =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              nome

            FROM release_environments

            WHERE id = ?

            LIMIT 1
          `
        )
        .bind(
          environmentId
        )
        .first();

    if (
      !ambiente
    ) {
      return respostaErro(
        "Ambiente da release não encontrado.",
        404
      );
    }

    if (
      schedulerMode
    ) {
      return await sincronizarProjetoScheduler(
        context,
        ambiente,
        environmentId,
        projectOffset,
        issueOffset
      );
    }

    const resultadoProjetos =
      await context.env.DB
        .prepare(
          `
            SELECT
              rp.project_id,
              p.nome,
              rp.versao

            FROM release_projects rp

            INNER JOIN projects p
              ON p.id = rp.project_id

            WHERE rp.environment_id = ?

            ORDER BY p.id
          `
        )
        .bind(
          environmentId
        )
        .all();

    const projetosRelease =
      resultadoProjetos.results ??
      [];

    const projetosRedmine =
      await listarProjetosRedmine(
        context
      );

    const atualizacoes =
      [];

    const projetosIgnorados =
      [];

    const statusIgnorados =
      new Map();

    let tarefasEncontradas =
      0;

    let tarefasSincronizadas =
      0;

    for (
      const projetoRelease
      of projetosRelease
    ) {
      const versaoProjeto =
        String(
          projetoRelease.versao ??
          ""
        ).trim();

      if (
        !versaoProjeto ||
        versaoProjeto === "-"
      ) {
        projetosIgnorados.push({
          projeto:
            projetoRelease.nome,

          motivo:
            "O projeto não possui versão informada neste ambiente.",
        });

        continue;
      }

      const projetoRedmine =
        encontrarProjetoRedmine(
          projetoRelease.nome,
          projetosRedmine
        );

      if (
        !projetoRedmine
      ) {
        projetosIgnorados.push({
          projeto:
            projetoRelease.nome,

          motivo:
            "Não foi localizado um projeto correspondente no Redmine.",
        });

        continue;
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

      if (
        !versaoRedmine
      ) {
        projetosIgnorados.push({
          projeto:
            projetoRelease.nome,

          motivo:
            `A versão ${versaoProjeto} não foi localizada no Redmine.`,
        });

        continue;
      }

      const issues =
        await listarIssues(
          context,
          projetoRedmine.id,
          versaoRedmine.id
        );

      const contagens =
        criarContagens();

      tarefasEncontradas +=
        issues.length;

      for (
        const issue
        of issues
      ) {
        const nomeStatus =
          String(
            issue.status?.name ??
            ""
          );

        const chaveStatus =
          normalizarTexto(
            nomeStatus
          );

        const campo =
          STATUS_PARA_CAMPO[
            chaveStatus
          ];

        if (
          !campo
        ) {
          const quantidadeAtual =
            statusIgnorados.get(
              nomeStatus ||
              "Sem situação"
            ) ??
            0;

          statusIgnorados.set(
            nomeStatus ||
            "Sem situação",
            quantidadeAtual + 1
          );

          continue;
        }

        contagens[
          campo
        ] += 1;
      }

      tarefasSincronizadas +=
        somarContagens(
          contagens
        );

      atualizacoes.push({
        projectId:
          projetoRelease.project_id,

        nome:
          projetoRelease.nome,

        versao:
          versaoProjeto,

        contagens,
      });
    }

    if (
      atualizacoes.length > 0
    ) {
      const comandos =
        atualizacoes.map(
          atualizacao =>
            context.env.DB
              .prepare(
                `
                  UPDATE release_projects

                  SET
                    qualidade = ?,
                    testes = ?,
                    desenvolvido = ?,
                    aguardando_compilacao = ?,
                    em_progresso = ?,
                    nova = ?,
                    reaberta = ?,
                    resolvidas = ?,
                    rejeitada = ?,
                    interrompida = ?,
                    updated_at = CURRENT_TIMESTAMP

                  WHERE
                    environment_id = ?
                    AND project_id = ?
                `
              )
              .bind(
                atualizacao
                  .contagens
                  .qualidade,

                atualizacao
                  .contagens
                  .testes,

                atualizacao
                  .contagens
                  .desenvolvido,

                atualizacao
                  .contagens
                  .aguardando_compilacao,

                atualizacao
                  .contagens
                  .em_progresso,

                atualizacao
                  .contagens
                  .nova,

                atualizacao
                  .contagens
                  .reaberta,

                atualizacao
                  .contagens
                  .resolvidas,

                atualizacao
                  .contagens
                  .rejeitada,

                atualizacao
                  .contagens
                  .interrompida,

                environmentId,

                atualizacao
                  .projectId
              )
        );

      await context.env.DB.batch(
        comandos
      );
    }

    const statusIgnoradosLista =
      Array.from(
        statusIgnorados.entries()
      ).map(
        (
          [
            status,
            quantidade,
          ]
        ) => ({
          status,
          quantidade,
        })
      );

    return Response.json({
      sucesso:
        true,

      ambiente: {
        id:
          ambiente.id,

        nome:
          ambiente.nome,
      },

      projetosAtualizados:
        atualizacoes.length,

      tarefasEncontradas,

      tarefasSincronizadas,

      projetosIgnorados,

      statusIgnorados:
        statusIgnoradosLista,

      sincronizadoEm:
        new Date()
          .toISOString(),
    });
  } catch (erro) {
    console.error(
      "Erro ao sincronizar Redmine:",
      erro
    );

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível sincronizar os dados com o Redmine."
    );
  }
}