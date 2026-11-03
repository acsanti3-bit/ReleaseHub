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

  let paginas =
    0;

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

    paginas +=
      1;

    if (
      paginas > 500
    ) {
      throw new Error(
        "A consulta de apontamentos ultrapassou o limite de segurança."
      );
    }
  }

  return entradas;
}


async function executarBatchEmLotes(
  context,
  comandos,
  tamanho = 70
) {
  for (
    let inicio = 0;
    inicio < comandos.length;
    inicio += tamanho
  ) {
    const lote =
      comandos.slice(
        inicio,
        inicio + tamanho
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

    await executarBatchEmLotes(
      context,
      comandos
    );

  } catch (erro) {
    console.error(
      "Erro ao atualizar cache de usuários do Redmine:",
      erro
    );
  }
}


function obterUpdatedOn(
  entrada
) {
  return (
    entrada.updated_on ??
    entrada.created_on ??
    null
  );
}


async function salvarTimeEntriesCache(
  context,
  entradas
) {
  if (
    !Array.isArray(
      entradas
    ) ||
    entradas.length === 0
  ) {
    return;
  }

  const agora =
    new Date()
      .toISOString();

  const comandos =
    entradas
      .map(
        entrada => {

          const id =
            Number(
              entrada.id
            );

          if (
            !Number.isFinite(id) ||
            id <= 0
          ) {
            return null;
          }

          return context.env.DB
            .prepare(
              `
                INSERT INTO redmine_time_entries_cache (
                  time_entry_id,
                  spent_on,
                  hours,

                  user_id,
                  user_name,

                  project_id,
                  project_name,

                  issue_id,

                  activity_id,
                  activity_name,

                  comments,
                  updated_on,
                  cached_at
                )

                VALUES (
                  ?, ?, ?,
                  ?, ?,
                  ?, ?,
                  ?,
                  ?, ?,
                  ?, ?, ?
                )

                ON CONFLICT(time_entry_id)

                DO UPDATE SET
                  spent_on =
                    excluded.spent_on,

                  hours =
                    excluded.hours,

                  user_id =
                    excluded.user_id,

                  user_name =
                    excluded.user_name,

                  project_id =
                    excluded.project_id,

                  project_name =
                    excluded.project_name,

                  issue_id =
                    excluded.issue_id,

                  activity_id =
                    excluded.activity_id,

                  activity_name =
                    excluded.activity_name,

                  comments =
                    excluded.comments,

                  updated_on =
                    excluded.updated_on,

                  cached_at =
                    excluded.cached_at
              `
            )
            .bind(
              id,

              String(
                entrada.spent_on ??
                ""
              ),

              Number(
                entrada.hours ??
                0
              ),

              entrada.user?.id ??
                null,

              entrada.user?.name ??
                "",

              entrada.project?.id ??
                null,

              entrada.project?.name ??
                "",

              entrada.issue?.id ??
                null,

              entrada.activity?.id ??
                null,

              entrada.activity?.name ??
                "",

              entrada.comments ??
                "",

              obterUpdatedOn(
                entrada
              ),

              agora
            );
        }
      )
      .filter(Boolean);

  await executarBatchEmLotes(
    context,
    comandos
  );
}


async function obterUltimaSincronizacao(
  context
) {
  const estado =
    await context.env.DB
      .prepare(
        `
          SELECT
            last_synced_at

          FROM redmine_time_entries_sync

          WHERE id = 1

          LIMIT 1
        `
      )
      .first();

  return estado?.last_synced_at ??
    null;
}


async function salvarUltimaSincronizacao(
  context,
  valor
) {
  await context.env.DB
    .prepare(
      `
        INSERT INTO redmine_time_entries_sync (
          id,
          last_synced_at
        )

        VALUES (
          1,
          ?
        )

        ON CONFLICT(id)

        DO UPDATE SET
          last_synced_at =
            excluded.last_synced_at
      `
    )
    .bind(
      valor
    )
    .run();
}


function dataComMargem(
  valor,
  minutos = 2
) {
  const timestamp =
    Date.parse(
      String(
        valor ??
        ""
      )
    );

  if (
    Number.isNaN(
      timestamp
    )
  ) {
    return null;
  }

  return new Date(
    timestamp -
    minutos * 60 * 1000
  ).toISOString();
}


async function sincronizarIncremental(
  context,
  ultimaSincronizacao,
  sincronizacaoIniciadaEm
) {
  if (
    !ultimaSincronizacao
  ) {
    return {
      executado:
        false,

      entradas:
        [],
    };
  }

  const desde =
    dataComMargem(
      ultimaSincronizacao,
      2
    ) ??
    ultimaSincronizacao;

  const entradas =
    await listarTimeEntries(
      context,
      {
        updated_on:
          `>=${desde}`,
      }
    );

  await salvarTimeEntriesCache(
    context,
    entradas
  );

  await atualizarCacheUsuarios(
    context,
    entradas
  );

  await salvarUltimaSincronizacao(
    context,
    sincronizacaoIniciadaEm
  );

  return {
    executado:
      true,

    desde,

    entradas,
  };
}


function criarChavePeriodo(
  from,
  to
) {
  return `${from}|${to}`;
}


async function obterPeriodoCache(
  context,
  from,
  to
) {
  const chave =
    criarChavePeriodo(
      from,
      to
    );

  return await context.env.DB
    .prepare(
      `
        SELECT
          range_key,
          from_date,
          to_date,
          loaded_at

        FROM redmine_time_entries_ranges

        WHERE range_key = ?

        LIMIT 1
      `
    )
    .bind(
      chave
    )
    .first();
}


function periodoPrecisaCargaCompleta(
  periodo
) {
  if (
    !periodo?.loaded_at
  ) {
    return true;
  }

  const timestamp =
    Date.parse(
      String(
        periodo.loaded_at
      )
    );

  if (
    Number.isNaN(
      timestamp
    )
  ) {
    return true;
  }

  const vinteQuatroHoras =
    24 *
    60 *
    60 *
    1000;

  return (
    Date.now() -
    timestamp
  ) >= vinteQuatroHoras;
}


async function salvarPeriodoCache(
  context,
  from,
  to,
  carregadoEm
) {
  const chave =
    criarChavePeriodo(
      from,
      to
    );

  await context.env.DB
    .prepare(
      `
        INSERT INTO redmine_time_entries_ranges (
          range_key,
          from_date,
          to_date,
          loaded_at
        )

        VALUES (
          ?, ?, ?, ?
        )

        ON CONFLICT(range_key)

        DO UPDATE SET
          from_date =
            excluded.from_date,

          to_date =
            excluded.to_date,

          loaded_at =
            excluded.loaded_at
      `
    )
    .bind(
      chave,
      from,
      to,
      carregadoEm
    )
    .run();
}


async function carregarPeriodoCompleto(
  context,
  from,
  to
) {
  const entradas =
    await listarTimeEntries(
      context,
      {
        from,
        to,
      }
    );

  /*
    Como esta é uma carga completa do período,
    removemos primeiro os itens daquele intervalo.

    Isso também corrige um eventual apontamento
    que tenha sido excluído do Redmine.
  */

  await context.env.DB
    .prepare(
      `
        DELETE FROM redmine_time_entries_cache

        WHERE
          spent_on >= ?
          AND spent_on <= ?
      `
    )
    .bind(
      from,
      to
    )
    .run();

  await salvarTimeEntriesCache(
    context,
    entradas
  );

  await atualizarCacheUsuarios(
    context,
    entradas
  );

  const carregadoEm =
    new Date()
      .toISOString();

  await salvarPeriodoCache(
    context,
    from,
    to,
    carregadoEm
  );

  return entradas;
}


async function consultarCachePeriodo(
  context,
  from,
  to
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            time_entry_id,
            spent_on,
            hours,

            user_id,
            user_name,

            project_id,
            project_name,

            issue_id,

            activity_id,
            activity_name,

            comments,
            updated_on

          FROM redmine_time_entries_cache

          WHERE
            spent_on >= ?
            AND spent_on <= ?

          ORDER BY
            spent_on DESC,
            time_entry_id DESC
        `
      )
      .bind(
        from,
        to
      )
      .all();

  return resultado.results ??
    [];
}


function dataValida(
  valor
) {
  return /^\d{4}-\d{2}-\d{2}$/
    .test(
      String(
        valor ??
        ""
      )
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

    const from =
      String(
        url.searchParams.get(
          "from"
        ) ??
        ""
      ).trim();

    const to =
      String(
        url.searchParams.get(
          "to"
        ) ??
        ""
      ).trim();


    if (
      !from ||
      !to
    ) {
      return respostaErro(
        "Informe a data inicial e a data final.",
        400
      );
    }


    if (
      !dataValida(
        from
      ) ||
      !dataValida(
        to
      )
    ) {
      return respostaErro(
        "As datas informadas são inválidas.",
        400
      );
    }


    if (
      from > to
    ) {
      return respostaErro(
        "A data inicial não pode ser maior que a data final.",
        400
      );
    }


    /*
      Guardamos o horário em que a sincronização começou.

      A próxima consulta parte daqui, com uma margem
      de 2 minutos, evitando perder uma alteração
      que tenha acontecido durante esta execução.
    */

    const sincronizacaoIniciadaEm =
      new Date()
        .toISOString();


    const ultimaSincronizacao =
      await obterUltimaSincronizacao(
        context
      );


    /*
      Se já existe uma sincronização anterior,
      buscamos APENAS registros criados/alterados
      depois dela usando updated_on.
    */

    const incremental =
      await sincronizarIncremental(
        context,
        ultimaSincronizacao,
        sincronizacaoIniciadaEm
      );


    /*
      Cada período consultado recebe uma carga completa
      apenas na primeira vez.

      Depois disso, as consultas usam o cache atualizado
      incrementalmente.

      A cada 24 horas fazemos novamente uma carga completa
      daquele período para corrigir inclusive exclusões.
    */

    const periodo =
      await obterPeriodoCache(
        context,
        from,
        to
      );


    const precisaCargaCompleta =
      periodoPrecisaCargaCompleta(
        periodo
      );


    let quantidadeCargaCompleta =
      0;


    if (
      precisaCargaCompleta
    ) {
      const entradasPeriodo =
        await carregarPeriodoCompleto(
          context,
          from,
          to
        );

      quantidadeCargaCompleta =
        entradasPeriodo.length;
    }


    /*
      Se esta foi a primeira utilização do cache,
      ainda não existia last_synced_at.

      Após a carga inicial salvamos o ponto de partida
      para que as próximas chamadas sejam incrementais.
    */

    if (
      !ultimaSincronizacao
    ) {
      await salvarUltimaSincronizacao(
        context,
        sincronizacaoIniciadaEm
      );
    }


    const entradasCache =
      await consultarCachePeriodo(
        context,
        from,
        to
      );


    const dados =
      entradasCache.map(
        entrada => ({
          id:
            entrada.time_entry_id,

          data:
            entrada.spent_on,

          horas:
            Number(
              entrada.hours ??
              0
            ),

          usuario: {
            id:
              entrada.user_id ??
              null,

            nome:
              entrada.user_name ??
              "",
          },

          projeto: {
            id:
              entrada.project_id ??
              null,

            nome:
              entrada.project_name ??
              "",
          },

          tarefa: {
            id:
              entrada.issue_id ??
              null,
          },

          atividade: {
            id:
              entrada.activity_id ??
              null,

            nome:
              entrada.activity_name ??
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

        sincronizacao: {
          incremental:
            incremental.executado,

          alteracoesEncontradas:
            incremental.entradas.length,

          cargaCompleta:
            precisaCargaCompleta,

          registrosCargaCompleta:
            quantidadeCargaCompleta,

          ultimaSincronizacao:
            sincronizacaoIniciadaEm,
        },
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