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

  validacaonocliente:
    "validacao_cliente",

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

    validacao_cliente: 0,

    resolvidas: 0,

    rejeitada: 0,

    interrompida: 0,
  };
}


function numero(
  valor
) {
  const convertido =
    Number(valor);

  return Number.isFinite(
    convertido
  )
    ? convertido
    : 0;
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


function obterUltimaMovimentacao(
  issues
) {
  let ultima =
    null;

  let ultimoTimestamp =
    -1;

  for (
    const issue
    of issues
  ) {
    const valor =
      issue.updated_on ??
      issue.created_on ??
      null;

    if (
      !valor
    ) {
      continue;
    }

    const timestamp =
      Date.parse(
        String(valor)
      );

    if (
      Number.isNaN(
        timestamp
      ) ||
      timestamp <=
      ultimoTimestamp
    ) {
      continue;
    }

    ultimoTimestamp =
      timestamp;

    ultima =
      new Date(
        timestamp
      ).toISOString();
  }

  return ultima;
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


  const limparAcumuladorProjeto =
    async () => {

      await context.env.DB
        .prepare(
          `
            DELETE FROM redmine_sync_accumulator

            WHERE
              environment_id = ?
              AND project_id = ?
          `
        )
        .bind(
          environmentId,
          projetoRelease.project_id
        )
        .run();

    };


  const respostaIgnorado =
    async (
      motivo
    ) => {

      await limparAcumuladorProjeto();


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

    };


  if (
    !versaoProjeto ||
    versaoProjeto === "-"
  ) {
    return await respostaIgnorado(
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
    return await respostaIgnorado(
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
    return await respostaIgnorado(
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


  const ultimaMovimentacaoPagina =
    obterUltimaMovimentacao(
      pagina.issues
    );


  if (
    issueOffset === 0
  ) {
    await context.env.DB
      .prepare(
        `
          INSERT INTO redmine_sync_accumulator (
            environment_id,
            project_id,
            qualidade,
            testes,
            desenvolvido,
            aguardando_compilacao,
            em_progresso,
            nova,
            reaberta,
            validacao_cliente,
            resolvidas,
            rejeitada,
            interrompida,
            ultima_movimentacao,
            updated_at
          )

          VALUES (
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?,
            CURRENT_TIMESTAMP
          )

          ON CONFLICT(
            environment_id,
            project_id
          )

          DO UPDATE SET

            qualidade =
              excluded.qualidade,

            testes =
              excluded.testes,

            desenvolvido =
              excluded.desenvolvido,

            aguardando_compilacao =
              excluded.aguardando_compilacao,

            em_progresso =
              excluded.em_progresso,

            nova =
              excluded.nova,

            reaberta =
              excluded.reaberta,

            validacao_cliente =
              excluded.validacao_cliente,

            resolvidas =
              excluded.resolvidas,

            rejeitada =
              excluded.rejeitada,

            interrompida =
              excluded.interrompida,

            ultima_movimentacao =
              excluded.ultima_movimentacao,

            updated_at =
              CURRENT_TIMESTAMP
        `
      )
      .bind(
        environmentId,
        projetoRelease.project_id,

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

        ultimaMovimentacaoPagina
      )
      .run();

  } else {

    await context.env.DB
      .prepare(
        `
          INSERT INTO redmine_sync_accumulator (
            environment_id,
            project_id,
            qualidade,
            testes,
            desenvolvido,
            aguardando_compilacao,
            em_progresso,
            nova,
            reaberta,
            validacao_cliente,
            resolvidas,
            rejeitada,
            interrompida,
            ultima_movimentacao,
            updated_at
          )

          VALUES (
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?,
            CURRENT_TIMESTAMP
          )

          ON CONFLICT(
            environment_id,
            project_id
          )

          DO UPDATE SET

            qualidade =
              redmine_sync_accumulator.qualidade +
              excluded.qualidade,

            testes =
              redmine_sync_accumulator.testes +
              excluded.testes,

            desenvolvido =
              redmine_sync_accumulator.desenvolvido +
              excluded.desenvolvido,

            aguardando_compilacao =
              redmine_sync_accumulator.aguardando_compilacao +
              excluded.aguardando_compilacao,

            em_progresso =
              redmine_sync_accumulator.em_progresso +
              excluded.em_progresso,

            nova =
              redmine_sync_accumulator.nova +
              excluded.nova,

            reaberta =
              redmine_sync_accumulator.reaberta +
              excluded.reaberta,

            validacao_cliente =
              redmine_sync_accumulator.validacao_cliente +
              excluded.validacao_cliente,

            resolvidas =
              redmine_sync_accumulator.resolvidas +
              excluded.resolvidas,

            rejeitada =
              redmine_sync_accumulator.rejeitada +
              excluded.rejeitada,

            interrompida =
              redmine_sync_accumulator.interrompida +
              excluded.interrompida,

            ultima_movimentacao =
              CASE
                WHEN excluded.ultima_movimentacao IS NULL
                  THEN redmine_sync_accumulator.ultima_movimentacao

                WHEN redmine_sync_accumulator.ultima_movimentacao IS NULL
                  THEN excluded.ultima_movimentacao

                WHEN datetime(excluded.ultima_movimentacao) >
                     datetime(redmine_sync_accumulator.ultima_movimentacao)
                  THEN excluded.ultima_movimentacao

                ELSE redmine_sync_accumulator.ultima_movimentacao
              END,

            updated_at =
              CURRENT_TIMESTAMP
        `
      )
      .bind(
        environmentId,
        projetoRelease.project_id,

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

        ultimaMovimentacaoPagina
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


  if (
    projectDone
  ) {
    const acumulado =
      await context.env.DB
        .prepare(
          `
            SELECT
              qualidade,
              testes,
              desenvolvido,
              aguardando_compilacao,
              em_progresso,
              nova,
              reaberta,
              validacao_cliente,
              resolvidas,
              rejeitada,
              interrompida,
              ultima_movimentacao

            FROM redmine_sync_accumulator

            WHERE
              environment_id = ?
              AND project_id = ?

            LIMIT 1
          `
        )
        .bind(
          environmentId,
          projetoRelease.project_id
        )
        .first();


    if (
      acumulado
    ) {
      const atualizarProjeto =
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
                validacao_cliente = ?,
                resolvidas = ?,
                rejeitada = ?,
                interrompida = ?,

                updated_at =
                  CASE
                    WHEN ? IS NULL
                      THEN updated_at

                    WHEN updated_at IS NULL
                      THEN ?

                    WHEN datetime(?) >
                         datetime(updated_at)
                      THEN ?

                    ELSE updated_at
                  END

              WHERE
                environment_id = ?
                AND project_id = ?
            `
          )
          .bind(
            numero(
              acumulado.qualidade
            ),

            numero(
              acumulado.testes
            ),

            numero(
              acumulado.desenvolvido
            ),

            numero(
              acumulado.aguardando_compilacao
            ),

            numero(
              acumulado.em_progresso
            ),

            numero(
              acumulado.nova
            ),

            numero(
              acumulado.reaberta
            ),

            numero(
              acumulado.validacao_cliente
            ),

            numero(
              acumulado.resolvidas
            ),

            numero(
              acumulado.rejeitada
            ),

            numero(
              acumulado.interrompida
            ),

            acumulado.ultima_movimentacao,
            acumulado.ultima_movimentacao,
            acumulado.ultima_movimentacao,
            acumulado.ultima_movimentacao,

            environmentId,
            projetoRelease.project_id
          );


      const limparAcumulador =
        context.env.DB
          .prepare(
            `
              DELETE FROM redmine_sync_accumulator

              WHERE
                environment_id = ?
                AND project_id = ?
            `
          )
          .bind(
            environmentId,
            projetoRelease.project_id
          );


      await context.env.DB.batch([
        atualizarProjeto,
        limparAcumulador,
      ]);
    }
  }


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
            quantidadeAtual +
            1
          );

          continue;
        }

        contagens[
          campo
        ] +=
          1;
      }

      tarefasSincronizadas +=
        somarContagens(
          contagens
        );

      const ultimaMovimentacao =
        obterUltimaMovimentacao(
          issues
        );

      atualizacoes.push({
        projectId:
          projetoRelease.project_id,

        nome:
          projetoRelease.nome,

        versao:
          versaoProjeto,

        contagens,

        ultimaMovimentacao,
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
                    validacao_cliente = ?,
                    resolvidas = ?,
                    rejeitada = ?,
                    interrompida = ?,
                    updated_at = CASE
                      WHEN ? IS NULL THEN updated_at
                      ELSE ?
                    END

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
                  .validacao_cliente,

                atualizacao
                  .contagens
                  .resolvidas,

                atualizacao
                  .contagens
                  .rejeitada,

                atualizacao
                  .contagens
                  .interrompida,

                atualizacao
                  .ultimaMovimentacao,

                atualizacao
                  .ultimaMovimentacao,

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