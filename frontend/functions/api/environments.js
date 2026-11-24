import { buscarUsuarioLogado } from "../../server/auth.js";

import {
  registrarAuditoria,
} from "../../server/audit.js";

const SISTEMAS_FIXOS = [
  { chave: "intellicash", nome: "IntelliCash", ordem: 1 },
  { chave: "easycash", nome: "EasyCash", ordem: 2 },
  { chave: "easycheckout", nome: "EasyCheckOut", ordem: 3 },
  { chave: "easypdv", nome: "EasyPDV", ordem: 4 },
  { chave: "intellistock", nome: "IntelliStock", ordem: 5 },
  { chave: "iwbserver", nome: "IWB Server", ordem: 6 },
  { chave: "enterpriseserver", nome: "Enterprise Server", ordem: 7 },
  { chave: "nfedestinadas", nome: "NF-e Destinadas", ordem: 8 },
  { chave: "intellifood", nome: "IntelliFood", ordem: 9 },
  { chave: "pcp", nome: "PCP", ordem: 10 },
  { chave: "gerenciadordepromocoes", nome: "Gerenciador de Promoções", ordem: 11 },
  { chave: "sincmatrizxfilial", nome: "Sinc. Matriz X Filial", ordem: 12 },
  { chave: "sinclabfiscal", nome: "Sinc. Lab. Fiscal", ordem: 13 },
  { chave: "sincecommerce", nome: "Sinc. E-Commerce", ordem: 14 },
  { chave: "pesocerto", nome: "Peso Certo", ordem: 15 },
  { chave: "notify", nome: "Notify", ordem: 16 },
  { chave: "vendaassistida", nome: "Venda Assistida", ordem: 17 },
  { chave: "cotacao", nome: "Cotação", ordem: 18 },
  { chave: "bi", nome: "BI", ordem: 19 },
];

const SISTEMAS_PRINCIPAIS = new Set([
  "intellicash",
  "easycash",
  "easycheckout",
  "easypdv",
  "intellistock",
]);


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


async function garantirTabelasComplementares(
  context
) {
  await context.env.DB
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS release_environment_metadata (
          environment_id INTEGER PRIMARY KEY,
          liberado_em TEXT NOT NULL DEFAULT ''
        )
      `
    )
    .run();

  await context.env.DB
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS release_environment_remessas (
          id TEXT PRIMARY KEY,
          environment_id INTEGER NOT NULL,
          data TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    )
    .run();

  await context.env.DB
    .prepare(
      `
        CREATE INDEX IF NOT EXISTS idx_release_environment_remessas_environment
        ON release_environment_remessas (environment_id, data)
      `
    )
    .run();
}


function numeroNaoNegativo(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.max(
    0,
    Math.trunc(numero)
  );
}


function normalizarRemessas(
  remessas = []
) {
  if (!Array.isArray(remessas)) {
    return [];
  }

  return remessas
    .map((remessa, indice) => {
      const tarefas = {
        intellicash: numeroNaoNegativo(
          remessa?.tarefas?.intellicash
        ),
        easycash: numeroNaoNegativo(
          remessa?.tarefas?.easycash
        ),
        easycheckout: numeroNaoNegativo(
          remessa?.tarefas?.easycheckout
        ),
        easypdv: numeroNaoNegativo(
          remessa?.tarefas?.easypdv
        ),
        intellistock: numeroNaoNegativo(
          remessa?.tarefas?.intellistock
        ),
      };

      const totalTarefas =
        Object.values(tarefas).reduce(
          (total, quantidade) =>
            total + quantidade,
          0
        );

      return {
        id: String(
          remessa?.id ??
          `${Date.now()}-${indice}`
        ),
        data: String(
          remessa?.data ?? ''
        ).trim(),
        tarefas,
        totalTarefas,
      };
    })
    .filter(remessa =>
      Boolean(remessa.data)
    );
}


async function listarLiberacoes(
  context
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            environment_id,
            liberado_em
          FROM release_environment_metadata
        `
      )
      .all();

  return new Map(
    (resultado.results ?? []).map(
      row => [
        Number(row.environment_id),
        String(row.liberado_em ?? ''),
      ]
    )
  );
}


async function listarRemessasPorAmbiente(
  context
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            id,
            environment_id,
            data,
            payload_json
          FROM release_environment_remessas
          ORDER BY data DESC, created_at DESC
        `
      )
      .all();

  const mapa = new Map();

  for (const row of resultado.results ?? []) {
    let payload = null;

    try {
      payload = JSON.parse(
        String(row.payload_json ?? '{}')
      );
    } catch {
      payload = null;
    }

    const normalizada =
      normalizarRemessas([
        {
          ...(payload ?? {}),
          id: row.id,
          data: row.data,
        },
      ])[0];

    if (!normalizada) {
      continue;
    }

    const environmentId =
      Number(row.environment_id);

    if (!mapa.has(environmentId)) {
      mapa.set(environmentId, []);
    }

    mapa.get(environmentId).push(
      normalizada
    );
  }

  return mapa;
}


async function buscarComplementosAmbiente(
  context,
  environmentId
) {
  const [metadata, remessasResultado] =
    await Promise.all([
      context.env.DB
        .prepare(
          `
            SELECT liberado_em
            FROM release_environment_metadata
            WHERE environment_id = ?
            LIMIT 1
          `
        )
        .bind(environmentId)
        .first(),

      context.env.DB
        .prepare(
          `
            SELECT id, data, payload_json
            FROM release_environment_remessas
            WHERE environment_id = ?
            ORDER BY data DESC, created_at DESC
          `
        )
        .bind(environmentId)
        .all(),
    ]);

  const remessas = [];

  for (const row of remessasResultado.results ?? []) {
    let payload = null;

    try {
      payload = JSON.parse(
        String(row.payload_json ?? '{}')
      );
    } catch {
      payload = null;
    }

    const normalizada =
      normalizarRemessas([
        {
          ...(payload ?? {}),
          id: row.id,
          data: row.data,
        },
      ])[0];

    if (normalizada) {
      remessas.push(normalizada);
    }
  }

  return {
    liberadoEm:
      String(
        metadata?.liberado_em ?? ''
      ) || undefined,
    remessas,
  };
}


async function salvarComplementosAmbiente(
  context,
  environmentId,
  liberadoEm,
  remessas
) {
  await context.env.DB
    .prepare(
      `
        INSERT INTO release_environment_metadata (
          environment_id,
          liberado_em
        )
        VALUES (?, ?)
        ON CONFLICT(environment_id)
        DO UPDATE SET
          liberado_em = excluded.liberado_em
      `
    )
    .bind(
      environmentId,
      String(liberadoEm ?? '').trim()
    )
    .run();

  await context.env.DB
    .prepare(
      `
        DELETE FROM release_environment_remessas
        WHERE environment_id = ?
      `
    )
    .bind(environmentId)
    .run();

  for (const remessa of normalizarRemessas(remessas)) {
    await context.env.DB
      .prepare(
        `
          INSERT INTO release_environment_remessas (
            id,
            environment_id,
            data,
            payload_json
          )
          VALUES (?, ?, ?, ?)
        `
      )
      .bind(
        remessa.id,
        environmentId,
        remessa.data,
        JSON.stringify(remessa)
      )
      .run();
  }
}


function normalizarTexto(valor) {
  return String(valor ?? "")
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


function obterPartesVersao(valor) {
  return (
    String(valor ?? "")
      .match(/\d+/g)
      ?.map(Number) ??
    []
  );
}


function compararVersoes(
  versaoA,
  versaoB
) {
  const partesA =
    obterPartesVersao(versaoA);

  const partesB =
    obterPartesVersao(versaoB);

  const tamanho =
    Math.max(
      partesA.length,
      partesB.length
    );

  for (
    let indice = 0;
    indice < tamanho;
    indice += 1
  ) {
    const parteA =
      partesA[indice] ?? 0;

    const parteB =
      partesB[indice] ?? 0;

    if (parteA !== parteB) {
      return parteA - parteB;
    }
  }

  return 0;
}


function validarVersoesPrincipais(
  sistemas
) {
  return sistemas
    .filter(
      sistema =>
        SISTEMAS_PRINCIPAIS.has(
          sistema.chave
        ) &&
        !String(
          sistema.versao ?? ""
        ).trim()
    )
    .map(
      sistema => sistema.nome
    );
}


function obterVersaoLegada(
  versoes,
  chave
) {
  const mapa = {
    intellicash:
      versoes?.intellicash ?? "",

    easycash:
      versoes?.easycash ?? "",

    easycheckout:
      versoes?.easycheckout ?? "",

    easypdv:
      versoes?.easypdv ?? "",

    intellistock:
      versoes?.intellistock ?? "",

    iwbserver:
      versoes?.iwbserver ?? "",
  };

  return mapa[chave] ?? "";
}


/*
  Sempre retorna exatamente
  os 19 sistemas do catálogo.

  As versões já cadastradas
  são preservadas.
*/
function normalizarSistemas(
  sistemas = [],
  versoes = {}
) {
  const mapa =
    new Map();

  if (Array.isArray(sistemas)) {
    for (const sistema of sistemas) {
      const chave =
        normalizarTexto(
          sistema.chave
        );

      const nome =
        normalizarTexto(
          sistema.nome
        );

      if (chave) {
        mapa.set(
          chave,
          sistema
        );
      }

      if (nome) {
        mapa.set(
          nome,
          sistema
        );
      }
    }
  }

  return SISTEMAS_FIXOS.map(
    sistemaCatalogo => {
      const encontrado =
        mapa.get(
          normalizarTexto(
            sistemaCatalogo.chave
          )
        ) ??
        mapa.get(
          normalizarTexto(
            sistemaCatalogo.nome
          )
        );

      return {
        ...sistemaCatalogo,

        versao:
          String(
            encontrado?.versao ??
            obterVersaoLegada(
              versoes,
              sistemaCatalogo.chave
            ) ??
            ""
          ).trim(),

        executavel:
          String(
            encontrado?.executavel ??
            ""
          ).trim(),

        mostrarNaTv:
          encontrado?.mostrarNaTv ??
          true,
      };
    }
  );
}


function obterVersaoSistema(
  sistemas,
  chave
) {
  return (
    sistemas.find(
      sistema =>
        sistema.chave === chave
    )?.versao ??
    ""
  );
}


function transformarAmbiente(
  row,
  sistemas,
  complementos = {}
) {
  return {
    id: row.id,
    nome: row.nome,
    prazo: row.prazo ?? "",
    concluido:
      Number(row.concluido) !== 0,

    liberadoEm:
      complementos.liberadoEm ||
      undefined,

    remessas:
      complementos.remessas ?? [],

    versoes: {
      intellicash:
        row.intellicash ?? "",

      easycash:
        row.easycash ?? "",

      easycheckout:
        row.easycheckout ?? "",

      easypdv:
        row.easypdv ?? "",

      intellistock:
        row.intellistock ?? "",

      iwbserver:
        row.iwbserver ?? "",
    },

    sistemas,
  };
}


async function listarSistemas(
  context
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            environment_id,
            chave,
            nome,
            versao,
            executavel,
            ordem,
            mostrar_na_tv

          FROM release_environment_versions

          ORDER BY
            environment_id,
            ordem,
            nome
        `
      )
      .all();


  /*
    A data do executável pertence
    ao sistema + versão.

    Primeiro montamos um catálogo
    das datas já conhecidas.
  */
  const executaveisCompartilhados =
    new Map();


  for (
    const row of
    resultado.results ?? []
  ) {
    const chave =
      String(
        row.chave ?? ""
      ).trim();

    const versao =
      String(
        row.versao ?? ""
      ).trim();

    const executavel =
      String(
        row.executavel ?? ""
      ).trim();


    if (
      chave &&
      versao &&
      executavel
    ) {
      const id = `${chave}::${versao}`;
      const anterior = executaveisCompartilhados.get(id);
      executaveisCompartilhados.set(id, anterior === undefined || anterior === executavel ? executavel : "");
    }
  }


  const mapa =
    new Map();


  for (
    const row of
    resultado.results ?? []
  ) {
    if (
      !mapa.has(
        row.environment_id
      )
    ) {
      mapa.set(
        row.environment_id,
        []
      );
    }


    const chave =
      String(
        row.chave ?? ""
      ).trim();

    const versao =
      String(
        row.versao ?? ""
      ).trim();

    const executavelSalvo =
      String(
        row.executavel ?? ""
      ).trim();

    const executavelCompartilhado =
      executaveisCompartilhados.get(
        `${chave}::${versao}`
      ) ??
      "";


    mapa
      .get(
        row.environment_id
      )
      .push({
        chave:
          row.chave,

        nome:
          row.nome,

        versao,

        executavel:
          executavelSalvo ||
          executavelCompartilhado,

        ordem:
          Number(
            row.ordem
          ) || 0,

        mostrarNaTv:
          Number(
            row.mostrar_na_tv
          ) !== 0,
      });
  }


  return mapa;
}


async function buscarExecutavelCompartilhado(
  context,
  chave,
  versao
) {
  const chaveNormalizada =
    String(
      chave ?? ""
    ).trim();

  const versaoNormalizada =
    String(
      versao ?? ""
    ).trim();


  if (
    !chaveNormalizada ||
    !versaoNormalizada
  ) {
    return "";
  }


  const row = await context.env.DB.prepare(`
    SELECT CASE WHEN COUNT(DISTINCT TRIM(executavel)) = 1 THEN MIN(TRIM(executavel)) ELSE '' END AS executavel
    FROM release_environment_versions
    WHERE chave = ? AND versao = ? AND TRIM(COALESCE(executavel, '')) <> ''
  `).bind(chaveNormalizada, versaoNormalizada).first();
  return String(row?.executavel ?? "").trim();
}


async function propagarExecutavelCompartilhado(
  context,
  sistema
) {
  const chave =
    String(
      sistema?.chave ??
      ""
    ).trim();

  const versao =
    String(
      sistema?.versao ??
      ""
    ).trim();

  const executavel =
    String(
      sistema?.executavel ??
      ""
    ).trim();


  if (
    !chave ||
    !versao ||
    !executavel
  ) {
    return;
  }


  /*
    Todas as releases que utilizam
    o mesmo sistema + versão recebem
    a mesma data.
  */
  await context.env.DB
    .prepare(
      `
        UPDATE release_environment_versions

        SET
          executavel = ?

        WHERE
          chave = ?
          AND versao = ?
      `
    )
    .bind(
      executavel,
      chave,
      versao
    )
    .run();


  const ambientesResultado =
    await context.env.DB
      .prepare(
        `
          SELECT DISTINCT
            environment_id

          FROM release_environment_versions

          WHERE
            chave = ?
            AND versao = ?
        `
      )
      .bind(
        chave,
        versao
      )
      .all();


  const projetosResultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            id,
            nome

          FROM projects
        `
      )
      .all();


  const projetosDoSistema =
    (
      projetosResultado.results ??
      []
    ).filter(
      projeto =>
        Boolean(
          obterSistemaProjeto(
            projeto.nome,
            [
              {
                ...sistema,

                chave,

                versao,

                executavel,
              },
            ]
          )
        )
    );


  /*
    Também atualiza release_projects,
    para TV e demais telas não ficarem
    com uma data antiga.
  */
  for (
    const ambiente of
    ambientesResultado.results ??
    []
  ) {
    for (
      const projeto of
      projetosDoSistema
    ) {
      await context.env.DB
        .prepare(
          `
            UPDATE release_projects

            SET
              executavel = ?,
              updated_at =
                CURRENT_TIMESTAMP

            WHERE
              environment_id = ?
              AND project_id = ?
              AND versao = ?
          `
        )
        .bind(
          executavel,
          ambiente.environment_id,
          projeto.id,
          versao
        )
        .run();
    }
  }
}


async function salvarSistemas(context, environmentId, sistemas, anteriores = []) {
  const mapaAnterior = new Map(anteriores.map(sistema => [sistema.chave, sistema]));
  const sistemasResolvidos = [];
  const alterados = [];
  for (const sistema of sistemas) {
    const versao = String(sistema.versao ?? "").trim();
    let executavel = String(sistema.executavel ?? "").trim();
    const anterior = mapaAnterior.get(sistema.chave);
    const compartilhado = versao ? await buscarExecutavelCompartilhado(context, sistema.chave, versao) : "";
    // Só uma data efetivamente informada/alterada pode sobrescrever outras releases.
    const dataAnterior = String(anterior?.executavel ?? "").trim();
    const alterouData = anterior
      ? executavel !== dataAnterior && (anterior.versao === versao || executavel !== compartilhado)
      : executavel !== compartilhado;
    if (versao && executavel && alterouData) {
      alterados.push({ ...sistema, versao, executavel });
    }
    if (!executavel && versao) executavel = compartilhado;
    sistemasResolvidos.push({ ...sistema, versao, executavel });
  }
  await context.env.DB.prepare(`DELETE FROM release_environment_versions WHERE environment_id = ?`).bind(environmentId).run();
  for (const sistema of sistemasResolvidos) {
    await context.env.DB.prepare(`INSERT INTO release_environment_versions (environment_id, chave, nome, versao, executavel, ordem, mostrar_na_tv) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(environmentId, sistema.chave, sistema.nome, sistema.versao, sistema.executavel, sistema.ordem, sistema.mostrarNaTv ? 1 : 0).run();
  }
  for (const sistema of alterados) await propagarExecutavelCompartilhado(context, sistema);
  return sistemasResolvidos;
}

function obterSistemaProjeto(
  nome,
  sistemas
) {
  const projeto =
    normalizarTexto(nome);

  const conhecidos = [
    {
      termos: [
        "intellicash",
        "intelicash",
      ],
      chave: "intellicash",
    },
    {
      termos: ["easycash"],
      chave: "easycash",
    },
    {
      termos: ["easycheckout"],
      chave: "easycheckout",
    },
    {
      termos: ["easypdv"],
      chave: "easypdv",
    },
    {
      termos: [
        "intellistock",
        "isa",
      ],
      chave: "intellistock",
    },
    {
      termos: [
        "iwbserver",
        "iwb",
      ],
      chave: "iwbserver",
    },
  ];

  for (const conhecido of conhecidos) {
    const encontrou =
      conhecido.termos.some(
        termo =>
          projeto.includes(termo)
      );

    if (encontrou) {
      return sistemas.find(
        sistema =>
          sistema.chave ===
          conhecido.chave
      );
    }
  }

  return sistemas.find(
    sistema => {
      const chave =
        normalizarTexto(
          sistema.chave
        );

      const nomeSistema =
        normalizarTexto(
          sistema.nome
        );

      if (
        !chave ||
        !nomeSistema
      ) {
        return false;
      }

      if (
        chave.length <= 3 ||
        nomeSistema.length <= 3
      ) {
        return (
          projeto === chave ||
          projeto === nomeSistema
        );
      }

      return (
        projeto === chave ||
        projeto === nomeSistema ||
        projeto.includes(chave) ||
        projeto.includes(
          nomeSistema
        )
      );
    }
  );
}


function obterVersaoProjeto(
  nome,
  sistemas
) {
  return (
    obterSistemaProjeto(
      nome,
      sistemas
    )?.versao ??
    ""
  );
}


function obterExecutavelProjeto(
  nome,
  sistemas
) {
  return (
    obterSistemaProjeto(
      nome,
      sistemas
    )?.executavel ??
    ""
  );
}


async function sincronizarProjetos(
  context,
  environmentId,
  sistemas,
  prazo
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

  for (
    const projeto of
    resultado.results
  ) {
    const versao =
      obterVersaoProjeto(
        projeto.nome,
        sistemas
      );

    const executavel =
      obterExecutavelProjeto(
        projeto.nome,
        sistemas
      );

    await context.env.DB
      .prepare(
        `
          INSERT INTO release_projects (
            environment_id,
            project_id,
            versao,
            executavel,
            prazo
          )
          VALUES (?, ?, ?, ?, ?)

          ON CONFLICT (
            environment_id,
            project_id
          )
          DO UPDATE SET
            versao = excluded.versao,
            executavel = excluded.executavel,
            prazo = excluded.prazo,
            updated_at = CURRENT_TIMESTAMP
        `
      )
      .bind(
        environmentId,
        projeto.id,
        versao,
        executavel,
        prazo ?? ""
      )
      .run();
  }
}


function criarRespostaAmbiente(
  id,
  nome,
  sistemas,
  prazo,
  concluido = false,
  liberadoEm = "",
  remessas = []
) {
  return {
    id,
    nome,
    prazo: prazo ?? "",
    concluido:
      Boolean(concluido),

    liberadoEm:
      liberadoEm || undefined,

    remessas:
      normalizarRemessas(remessas),

    versoes: {
      intellicash:
        obterVersaoSistema(
          sistemas,
          "intellicash"
        ),

      easycash:
        obterVersaoSistema(
          sistemas,
          "easycash"
        ),

      easycheckout:
        obterVersaoSistema(
          sistemas,
          "easycheckout"
        ),

      easypdv:
        obterVersaoSistema(
          sistemas,
          "easypdv"
        ),

      intellistock:
        obterVersaoSistema(
          sistemas,
          "intellistock"
        ),

      iwbserver:
        obterVersaoSistema(
          sistemas,
          "iwbserver"
        ),
    },

    sistemas,
  };
}


async function buscarAmbientePorId(
  context,
  id
) {
  const row =
    await context.env.DB
      .prepare(
        `
          SELECT
            id,
            nome,
            prazo,
            concluido,
            intellicash,
            easycash,
            easycheckout,
            easypdv,
            intellistock,
            iwbserver
          FROM release_environments
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(id)
      .first();

  if (!row) {
    return null;
  }

  const resultadoSistemas =
    await context.env.DB
      .prepare(
        `
          SELECT
            chave,
            nome,
            versao,
            executavel,
            ordem,
            mostrar_na_tv
          FROM release_environment_versions
          WHERE environment_id = ?
          ORDER BY ordem, nome
        `
      )
      .bind(id)
      .all();

  const sistemasSalvos =
    resultadoSistemas.results.map(
      sistema => ({
        chave: sistema.chave,
        nome: sistema.nome,
        versao:
          sistema.versao ?? "",
        executavel:
          sistema.executavel ?? "",
        ordem:
          Number(sistema.ordem) || 0,
        mostrarNaTv:
          Number(
            sistema.mostrar_na_tv
          ) !== 0,
      })
    );

  const complementos =
    await buscarComplementosAmbiente(
      context,
      id
    );

  return transformarAmbiente(
    row,
    normalizarSistemas(
      sistemasSalvos,
      row
    ),
    complementos
  );
}


export async function listarAmbientesParaHeranca(context) {
  const [resultado, sistemasPorAmbiente] = await Promise.all([
    context.env.DB.prepare(`SELECT id, nome, prazo, concluido, intellicash, easycash, easycheckout, easypdv, intellistock, iwbserver FROM release_environments`).all(),
    listarSistemas(context),
  ]);
  return resolverHerancas((resultado.results ?? []).map(row => transformarAmbiente(
    row, normalizarSistemas(sistemasPorAmbiente.get(row.id) ?? [], row)
  )));
}

function escolherReferencia(ambientes, versao, excluirId = null) {
  if (!versao) return null;
  const candidatos = ambientes.filter(item => item.versoes.intellicash &&
    (excluirId === null || Number(item.id) !== Number(excluirId)));
  const anteriores = candidatos.filter(item => compararVersoes(item.versoes.intellicash, versao) < 0)
    .sort((a, b) => compararVersoes(b.versoes.intellicash, a.versoes.intellicash));
  if (anteriores.length) return anteriores[0];
  return candidatos.filter(item => compararVersoes(item.versoes.intellicash, versao) > 0)
    .sort((a, b) => compararVersoes(a.versoes.intellicash, b.versoes.intellicash))[0] ?? null;
}

function resolverHerancas(ambientes) {
  const ordenados = [...ambientes].sort((a, b) => compararVersoes(a.versoes.intellicash, b.versoes.intellicash));
  for (const ambiente of ordenados) {
    if (!ambiente.versoes.intellicash) continue;
    const referencia = escolherReferencia(ordenados, ambiente.versoes.intellicash, ambiente.id);
    ambiente.sistemas = herdarSistemasSecundarios(ambiente.sistemas, referencia);
    ambiente.versoes.iwbserver = obterVersaoSistema(ambiente.sistemas, "iwbserver");
  }
  return ambientes;
}

async function buscarAmbienteAnterior(context, versaoIntellicash, excluirId = null) {
  return escolherReferencia(await listarAmbientesParaHeranca(context), versaoIntellicash, excluirId);
}

function herdarSistemasSecundarios(
  sistemas,
  ambienteAnterior
) {
  if (!ambienteAnterior) {
    return sistemas;
  }

  const anteriores =
    new Map(
      (
        ambienteAnterior.sistemas ??
        []
      ).map(
        sistema => [
          sistema.chave,
          sistema,
        ]
      )
    );

  return sistemas.map(
    sistema => {
      if (
        SISTEMAS_PRINCIPAIS.has(
          sistema.chave
        )
      ) {
        return sistema;
      }

      const anterior =
        anteriores.get(
          sistema.chave
        );

      if (!anterior) {
        return sistema;
      }

      const versao = String(sistema.versao ?? "").trim() || String(anterior.versao ?? "").trim();
      return {
        ...sistema,
        versao,
        executavel: String(sistema.executavel ?? "").trim() ||
          (versao && versao === String(anterior.versao ?? "").trim() ? String(anterior.executavel ?? "").trim() : ""),
      };
    }
  );
}


/*
  GET /api/environments
*/
export async function onRequestGet(
  context
) {
  try {
    await garantirTabelasComplementares(
      context
    );

    const resultado =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              nome,
              prazo,
              concluido,
              intellicash,
              easycash,
              easycheckout,
              easypdv,
              intellistock,
              iwbserver

            FROM release_environments

            ORDER BY id DESC
          `
        )
        .all();

    const [
      sistemasPorAmbiente,
      liberacoesPorAmbiente,
      remessasPorAmbiente,
    ] =
      await Promise.all([
        listarSistemas(context),
        listarLiberacoes(context),
        listarRemessasPorAmbiente(context),
      ]);

    const ambientes =
      resultado.results.map(
        row => {
          const sistemasSalvos =
            sistemasPorAmbiente.get(
              row.id
            ) ?? [];

          /*
            Mesmo que o ambiente antigo
            possua apenas seis registros,
            a resposta já conterá os 19.
          */
          const sistemas =
            normalizarSistemas(
              sistemasSalvos,
              row
            );

          return transformarAmbiente(
            row,
            sistemas,
            {
              liberadoEm:
                liberacoesPorAmbiente.get(
                  Number(row.id)
                ) || undefined,
              remessas:
                remessasPorAmbiente.get(
                  Number(row.id)
                ) ?? [],
            }
          );
        }
      );

    resolverHerancas(ambientes);

    return Response.json(
      ambientes
    );
  } catch (erro) {
    console.error(
      "Erro ao listar ambientes:",
      erro
    );

    return respostaErro(
      "Não foi possível listar os ambientes."
    );
  }
}


/*
  POST /api/environments
*/
export async function onRequestPost(
  context
) {
  try {
    await garantirTabelasComplementares(
      context
    );

    const body =
      await context.request.json();

    if (!body.nome?.trim()) {
      return respostaErro(
        "O nome do ambiente é obrigatório.",
        400
      );
    }

    let sistemas =
      normalizarSistemas(
        body.sistemas,
        body.versoes
      );

    const faltantes =
      validarVersoesPrincipais(
        sistemas
      );

    if (faltantes.length) {
      return respostaErro(
        `Informe a versão de: ${faltantes.join(", ")}.`,
        400
      );
    }

    const intellicash =
      obterVersaoSistema(
        sistemas,
        "intellicash"
      );

    const ambienteAnterior =
      await buscarAmbienteAnterior(
        context,
        intellicash
      );

    sistemas =
      herdarSistemasSecundarios(
        sistemas,
        ambienteAnterior
      );

    // A criação mantém a configuração de TV anterior quando não há escolha explícita.
    if (ambienteAnterior) {
      sistemas = sistemas.map(sistema => {
        if (SISTEMAS_PRINCIPAIS.has(sistema.chave)) return sistema;
        const informado = Array.isArray(body.sistemas) && body.sistemas.some(item =>
          (normalizarTexto(item.chave) === normalizarTexto(sistema.chave) ||
           normalizarTexto(item.nome) === normalizarTexto(sistema.nome)) &&
          typeof item.mostrarNaTv === "boolean"
        );
        if (informado) return sistema;
        const anterior = ambienteAnterior.sistemas.find(item => item.chave === sistema.chave);
        return { ...sistema, mostrarNaTv: anterior?.mostrarNaTv ?? sistema.mostrarNaTv };
      });
    }

    const id =
      body.id ?? Date.now();

    const liberadoEm =
      String(
        body.liberadoEm ??
        (body.concluido
          ? new Date().toISOString()
          : "")
      ).trim();

    const remessas =
      normalizarRemessas(
        body.remessas
      );

    await context.env.DB
      .prepare(
        `
          INSERT INTO release_environments (
            id,
            nome,
            prazo,
            concluido,
            intellicash,
            easycash,
            easycheckout,
            easypdv,
            intellistock,
            iwbserver
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        id,
        body.nome.trim(),
        String(
          body.prazo ?? ""
        ).trim(),
        body.concluido ? 1 : 0,
        intellicash,
        obterVersaoSistema(
          sistemas,
          "easycash"
        ),
        obterVersaoSistema(
          sistemas,
          "easycheckout"
        ),
        obterVersaoSistema(
          sistemas,
          "easypdv"
        ),
        obterVersaoSistema(
          sistemas,
          "intellistock"
        ),
        obterVersaoSistema(
          sistemas,
          "iwbserver"
        )
      )
      .run();

  sistemas =
  await salvarSistemas(
    context,
    id,
    sistemas,
    (ambienteAnterior?.sistemas ?? []).filter(sistema => !SISTEMAS_PRINCIPAIS.has(sistema.chave))
  );

    await salvarComplementosAmbiente(
      context,
      id,
      liberadoEm,
      remessas
    );

    await sincronizarProjetos(
      context,
      id,
      sistemas,
      String(
        body.prazo ?? ""
      ).trim()
    );

    const ambienteCriado =
      criarRespostaAmbiente(
        id,
        body.nome.trim(),
        sistemas,
        String(
          body.prazo ?? ""
        ).trim(),
        Boolean(body.concluido),
        liberadoEm,
        remessas
      );

    await registrarAuditoria(
      context,
      {
        acao: "CRIAR",
        entidade: "ambiente",
        entidadeId: id,
        entidadeNome:
          ambienteCriado.nome,
        dadosNovos:
          ambienteCriado,
      }
    );

    return Response.json(
      ambienteCriado,
      {
        status: 201,
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao criar ambiente:",
      erro
    );

    return respostaErro(
      "Não foi possível criar o ambiente."
    );
  }
}


/*
  PUT /api/environments
*/
export async function onRequestPut(
  context
) {
  try {
    await garantirTabelasComplementares(
      context
    );

    const body =
      await context.request.json();

    if (!body.id) {
      return respostaErro(
        "O ID do ambiente é obrigatório.",
        400
      );
    }

    if (!body.nome?.trim()) {
      return respostaErro(
        "O nome do ambiente é obrigatório.",
        400
      );
    }

    let sistemas =
      normalizarSistemas(
        body.sistemas,
        body.versoes
      );

    const faltantes =
      validarVersoesPrincipais(
        sistemas
      );

    if (faltantes.length) {
      return respostaErro(
        `Informe a versão de: ${faltantes.join(", ")}.`,
        400
      );
    }

    const intellicash =
      obterVersaoSistema(
        sistemas,
        "intellicash"
      );

    const ambienteAnterior =
      await buscarAmbientePorId(
        context,
        body.id
      );

    if (!ambienteAnterior) {
      return respostaErro(
        "Ambiente da release não encontrado.",
        404
      );
    }

    const ambientesResolvidos = await listarAmbientesParaHeranca(context);
    const referencia = escolherReferencia(ambientesResolvidos, intellicash, body.id);
    const anterioresResolvidos = ambientesResolvidos.find(item => Number(item.id) === Number(body.id))?.sistemas ?? ambienteAnterior.sistemas;
    sistemas = sistemas.map(sistema => {
      if (SISTEMAS_PRINCIPAIS.has(sistema.chave)) return sistema;
      const salvo = ambienteAnterior.sistemas.find(item => item.chave === sistema.chave);
      if (!salvo) return sistema;
      const versao = sistema.versao || salvo.versao;
      return {
        ...sistema,
        versao,
        executavel: sistema.executavel || (versao === salvo.versao ? salvo.executavel : ""),
      };
    });
    sistemas = herdarSistemasSecundarios(sistemas, referencia);

    const vaiConcluir =
      !ambienteAnterior.concluido &&
      Boolean(body.concluido);

    const liberadoInformado =
      Object.prototype.hasOwnProperty.call(
        body,
        "liberadoEm"
      );

    let liberadoEm =
      liberadoInformado
        ? String(
            body.liberadoEm ?? ""
          ).trim()
        : String(
            ambienteAnterior.liberadoEm ?? ""
          ).trim();

    if (vaiConcluir && !liberadoEm) {
      liberadoEm =
        new Date().toISOString();
    }

    const remessas =
      Array.isArray(body.remessas)
        ? normalizarRemessas(
            body.remessas
          )
        : normalizarRemessas(
            ambienteAnterior.remessas
          );

    await context.env.DB
      .prepare(
        `
          UPDATE release_environments
          SET
            nome = ?,
            prazo = ?,
            concluido = ?,
            intellicash = ?,
            easycash = ?,
            easycheckout = ?,
            easypdv = ?,
            intellistock = ?,
            iwbserver = ?
          WHERE id = ?
        `
      )
      .bind(
        body.nome.trim(),
        String(
          body.prazo ?? ""
        ).trim(),
        body.concluido ? 1 : 0,
        intellicash,
        obterVersaoSistema(
          sistemas,
          "easycash"
        ),
        obterVersaoSistema(
          sistemas,
          "easycheckout"
        ),
        obterVersaoSistema(
          sistemas,
          "easypdv"
        ),
        obterVersaoSistema(
          sistemas,
          "intellistock"
        ),
        obterVersaoSistema(
          sistemas,
          "iwbserver"
        ),
        body.id
      )
      .run();

    sistemas =
      await salvarSistemas(
        context,
        body.id,
        sistemas,
        anterioresResolvidos
      );

    await salvarComplementosAmbiente(
      context,
      body.id,
      liberadoEm,
      remessas
    );

    await sincronizarProjetos(
      context,
      body.id,
      sistemas,
      String(
        body.prazo ?? ""
      ).trim()
    );

    const ambienteAtualizado =
      criarRespostaAmbiente(
        body.id,
        body.nome.trim(),
        sistemas,
        String(
          body.prazo ?? ""
        ).trim(),
        Boolean(body.concluido),
        liberadoEm,
        remessas
      );

    let acao = "EDITAR";

    if (
      ambienteAnterior.concluido !==
      ambienteAtualizado.concluido
    ) {
      acao =
        ambienteAtualizado.concluido
          ? "CONCLUIR"
          : "REABRIR";
    }

    await registrarAuditoria(
      context,
      {
        acao,
        entidade: "ambiente",
        entidadeId:
          ambienteAtualizado.id,
        entidadeNome:
          ambienteAtualizado.nome,
        dadosAnteriores:
          ambienteAnterior,
        dadosNovos:
          ambienteAtualizado,
      }
    );

    return Response.json(
      ambienteAtualizado
    );
  } catch (erro) {
    console.error(
      "Erro ao atualizar ambiente:",
      erro
    );

    return respostaErro(
      "Não foi possível atualizar o ambiente."
    );
  }
}


/*
  DELETE /api/environments?id=123
*/
export async function onRequestDelete(
  context
) {
  try {
    await garantirTabelasComplementares(
      context
    );

    const usuario =
      await buscarUsuarioLogado(
        context
      );

    if (!usuario) {
      return respostaErro(
        "Sessão inválida ou expirada.",
        401
      );
    }

    if (usuario.role !== "admin") {
      return respostaErro(
        "Somente administradores podem excluir ambientes da release.",
        403
      );
    }

    const url =
      new URL(
        context.request.url
      );

    const id =
      Number(
        url.searchParams.get(
          "id"
        )
      );

    if (!id) {
      return respostaErro(
        "O ID do ambiente é obrigatório.",
        400
      );
    }

    const ambienteExcluido =
      await buscarAmbientePorId(
        context,
        id
      );

    if (!ambienteExcluido) {
      return respostaErro(
        "Ambiente da release não encontrado.",
        404
      );
    }

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_environment_remessas
          WHERE environment_id = ?
        `
      )
      .bind(id)
      .run();

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_environment_metadata
          WHERE environment_id = ?
        `
      )
      .bind(id)
      .run();

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_environment_versions
          WHERE environment_id = ?
        `
      )
      .bind(id)
      .run();

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_projects
          WHERE environment_id = ?
        `
      )
      .bind(id)
      .run();

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_environments
          WHERE id = ?
        `
      )
      .bind(id)
      .run();

    await registrarAuditoria(
      context,
      {
        acao: "EXCLUIR",
        entidade: "ambiente",
        entidadeId: id,
        entidadeNome:
          ambienteExcluido.nome,
        dadosAnteriores:
          ambienteExcluido,
      }
    );

    return Response.json({
      sucesso: true,
    });
  } catch (erro) {
    console.error(
      "Erro ao excluir ambiente:",
      erro
    );

    return respostaErro(
      "Não foi possível excluir o ambiente."
    );
  }
}
