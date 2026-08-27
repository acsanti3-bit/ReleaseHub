import {
  registrarAuditoria,
} from "../../server/audit.js";

import {
  garantirCatalogoGlobal,
  listarCatalogoGlobal,
} from "./compatibility-systems.js";

function respostaErro(
  mensagem,
  status = 500
) {
  return Response.json(
    { erro: mensagem },
    { status }
  );
}

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizarChave(valor) {
  return String(valor ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
}

async function garantirEstrutura(
  context
) {
  await context.env.DB
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS release_compatibility (
          environment_id INTEGER PRIMARY KEY,
          items_json TEXT NOT NULL DEFAULT '[]',
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    )
    .run();

  await context.env.DB
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS compatibility_manual_versions (
          system_key TEXT NOT NULL,
          system_name TEXT NOT NULL,
          version TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (system_key, version)
        )
      `
    )
    .run();

  await garantirCatalogoGlobal(
    context
  );
}

async function buscarAmbiente(
  context,
  environmentId
) {
  const row =
    await context.env.DB
      .prepare(
        `
          SELECT
            id,
            nome,
            intellicash,
            easycash,
            easycheckout,
            easypdv,
            intellistock,
            iwbserver
          FROM release_environments
          WHERE id = ?
        `
      )
      .bind(environmentId)
      .first();

  return row ?? null;
}

function obterVersaoLegada(
  ambiente,
  chave
) {
  const mapa = {
    intellicash:
      ambiente?.intellicash ?? "",
    easycash:
      ambiente?.easycash ?? "",
    easycheckout:
      ambiente?.easycheckout ?? "",
    easypdv:
      ambiente?.easypdv ?? "",
    intellistock:
      ambiente?.intellistock ?? "",
    iwbserver:
      ambiente?.iwbserver ?? "",
  };

  return String(
    mapa[chave] ?? ""
  ).trim();
}

async function listarVersoesAmbiente(
  context,
  ambiente
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            chave,
            nome,
            versao,
            ordem
          FROM release_environment_versions
          WHERE environment_id = ?
          ORDER BY ordem, nome
        `
      )
      .bind(ambiente.id)
      .all();

  const mapa = new Map();

  for (
    const sistema of
    resultado.results ?? []
  ) {
    const porChave =
      normalizarTexto(
        sistema.chave
      );

    const porNome =
      normalizarTexto(
        sistema.nome
      );

    if (porChave) {
      mapa.set(
        porChave,
        sistema
      );
    }

    if (porNome) {
      mapa.set(
        porNome,
        sistema
      );
    }
  }

  return mapa;
}

function obterVersaoDoAmbiente(
  definicao,
  mapaAmbiente,
  ambiente
) {
  if (
    definicao.source !==
    "environment"
  ) {
    return "";
  }

  const chaveSemPrefixo =
    definicao.key.startsWith(
      "env:"
    )
      ? definicao.key.slice(4)
      : definicao.key;

  const candidatos = [
    chaveSemPrefixo,
    definicao.originalName,
    definicao.displayName,
  ]
    .map(normalizarTexto)
    .filter(Boolean);

  for (const candidato of candidatos) {
    const sistema =
      mapaAmbiente.get(
        candidato
      );

    if (sistema) {
      return String(
        sistema.versao ?? ""
      ).trim();
    }
  }

  return obterVersaoLegada(
    ambiente,
    chaveSemPrefixo
  );
}

function parseItens(valor) {
  if (!valor) {
    return [];
  }

  try {
    const itens =
      JSON.parse(valor);

    return Array.isArray(itens)
      ? itens
      : [];
  } catch {
    return [];
  }
}

function sanitizarOverride(
  item
) {
  const key =
    normalizarChave(
      item?.key
    );

  if (!key) {
    return null;
  }

  const versionSource = [
    "environment",
    "redmine",
    "manual",
  ].includes(item?.versionSource)
    ? item.versionSource
    : "manual";

  return {
    key,
    selectedVersion:
      String(
        item?.selectedVersion ?? ""
      )
        .trim()
        .slice(0, 120),
    versionSource,
    visible:
      item?.visible !== false,
  };
}

function sanitizarOverrides(
  itens,
  chavesPermitidas = null
) {
  const resultado = [];
  const chaves = new Set();

  for (const recebido of itens) {
    const item =
      sanitizarOverride(
        recebido
      );

    if (
      !item ||
      chaves.has(item.key) ||
      (
        chavesPermitidas &&
        !chavesPermitidas.has(
          item.key
        )
      )
    ) {
      continue;
    }

    chaves.add(item.key);
    resultado.push(item);
  }

  return resultado;
}

async function buscarConfiguracaoSalva(
  context,
  environmentId
) {
  const row =
    await context.env.DB
      .prepare(
        `
          SELECT items_json
          FROM release_compatibility
          WHERE environment_id = ?
        `
      )
      .bind(environmentId)
      .first();

  const itens =
    sanitizarOverrides(
      parseItens(
        row?.items_json
      )
    );

  return {
    configured: Boolean(row),
    items: itens,
  };
}

async function listarVersoesManuais(
  context
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            system_key,
            version
          FROM compatibility_manual_versions
          ORDER BY created_at DESC, version DESC
        `
      )
      .all();

  const mapa = {};

  for (
    const row of
    resultado.results ?? []
  ) {
    const chave =
      String(
        row.system_key ?? ""
      );

    if (!chave) {
      continue;
    }

    if (!mapa[chave]) {
      mapa[chave] = [];
    }

    const versao =
      String(
        row.version ?? ""
      );

    if (
      versao &&
      !mapa[chave].includes(
        versao
      )
    ) {
      mapa[chave].push(
        versao
      );
    }
  }

  return mapa;
}

async function montarResposta(
  context,
  environmentId
) {
  const ambiente =
    await buscarAmbiente(
      context,
      environmentId
    );

  if (!ambiente) {
    return null;
  }

  const [
    catalogo,
    mapaAmbiente,
    configuracao,
    manualVersions,
  ] = await Promise.all([
    listarCatalogoGlobal(
      context
    ),
    listarVersoesAmbiente(
      context,
      ambiente
    ),
    buscarConfiguracaoSalva(
      context,
      environmentId
    ),
    listarVersoesManuais(
      context
    ),
  ]);

  const overrides =
    new Map(
      configuracao.items.map(
        item => [
          item.key,
          item,
        ]
      )
    );

  const items =
    catalogo
      .map(definicao => {
        const ambienteVersao =
          obterVersaoDoAmbiente(
            definicao,
            mapaAmbiente,
            ambiente
          );

        const override =
          overrides.get(
            definicao.key
          );

        const versionSource =
          override?.versionSource ??
          (
            definicao.source ===
              "environment"
              ? "environment"
              : definicao.source
          );

        const selectedVersion =
          versionSource ===
            "environment"
            ? ambienteVersao
            : String(
                override?.selectedVersion ??
                ""
              ).trim();

        return {
          key:
            definicao.key,
          source:
            definicao.source,
          originalName:
            definicao.originalName,
          displayName:
            definicao.displayName,
          environmentVersion:
            ambienteVersao,
          selectedVersion,
          versionSource,
          redmineProjectId:
            definicao.redmineProjectId,
          redmineProjectName:
            definicao.redmineProjectName,
          visible:
            override
              ? override.visible
              : definicao.defaultVisible,
          order:
            definicao.order,
          relatedTo: [
            ...definicao.relatedTo,
          ],
        };
      })
      .sort(
        (a, b) =>
          a.order - b.order ||
          a.displayName.localeCompare(
            b.displayName,
            "pt-BR",
            { sensitivity: "base" }
          )
      );

  return {
    environmentId:
      Number(ambiente.id),
    environmentName:
      String(
        ambiente.nome ?? ""
      ),
    configured:
      configuracao.configured,
    items,
    manualVersions,
  };
}

const COLUNAS_LEGADAS_AMBIENTE = {
  intellicash: "intellicash",
  easycash: "easycash",
  easycheckout: "easycheckout",
  easypdv: "easypdv",
  intellistock: "intellistock",
  iwbserver: "iwbserver",
};


function chaveAmbienteDaDefinicao(
  definicao
) {
  if (
    definicao?.source !==
    "environment"
  ) {
    return null;
  }

  return definicao.key.startsWith(
    "env:"
  )
    ? definicao.key.slice(4)
    : definicao.key;
}


function termosProjetoPorChave(
  chave
) {
  const conhecidos = {
    intellicash: [
      "intellicash",
      "intelicash",
    ],
    easycash: ["easycash"],
    easycheckout: [
      "easycheckout",
    ],
    easypdv: ["easypdv"],
    intellistock: [
      "intellistock",
      "isa",
    ],
    iwbserver: [
      "iwbserver",
      "iwb",
    ],
  };

  return conhecidos[chave] ?? [
    normalizarTexto(chave),
  ];
}


async function atualizarVersaoNoAmbiente(
  context,
  environmentId,
  definicao,
  versao
) {
  const chave =
    chaveAmbienteDaDefinicao(
      definicao
    );

  if (!chave) {
    return;
  }

  const versaoNormalizada =
    String(versao ?? "")
      .trim()
      .slice(0, 120);

  await context.env.DB
    .prepare(
      `
        UPDATE release_environment_versions
        SET versao = ?
        WHERE environment_id = ?
          AND chave = ?
      `
    )
    .bind(
      versaoNormalizada,
      environmentId,
      chave
    )
    .run();

  const colunaLegada =
    COLUNAS_LEGADAS_AMBIENTE[
      chave
    ];

  if (colunaLegada) {
    await context.env.DB
      .prepare(
        `
          UPDATE release_environments
          SET ${colunaLegada} = ?
          WHERE id = ?
        `
      )
      .bind(
        versaoNormalizada,
        environmentId
      )
      .run();
  }

  const projetos =
    await context.env.DB
      .prepare(
        `
          SELECT id, nome
          FROM projects
        `
      )
      .all();

  const termos =
    termosProjetoPorChave(
      chave
    );

  for (
    const projeto of
    projetos.results ?? []
  ) {
    const nomeProjeto =
      normalizarTexto(
        projeto.nome
      );

    const corresponde =
      termos.some(termo => {
        const normalizado =
          normalizarTexto(termo);

        if (
          !normalizado ||
          !nomeProjeto
        ) {
          return false;
        }

        if (
          normalizado.length <= 3
        ) {
          return (
            nomeProjeto ===
            normalizado
          );
        }

        return (
          nomeProjeto ===
            normalizado ||
          nomeProjeto.includes(
            normalizado
          )
        );
      });

    if (!corresponde) {
      continue;
    }

    await context.env.DB
      .prepare(
        `
          UPDATE release_projects
          SET
            versao = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE environment_id = ?
            AND project_id = ?
        `
      )
      .bind(
        versaoNormalizada,
        environmentId,
        projeto.id
      )
      .run();
  }
}


async function aplicarVersoesDaCompatibilidade(
  context,
  environmentId,
  catalogo,
  overrides
) {
  const porChave =
    new Map(
      catalogo.map(
        item => [
          item.key,
          item,
        ]
      )
    );

  for (const override of overrides) {
    const definicao =
      porChave.get(
        override.key
      );

    if (
      definicao?.source !==
      "environment"
    ) {
      continue;
    }

    await atualizarVersaoNoAmbiente(
      context,
      environmentId,
      definicao,
      override.selectedVersion
    );
  }
}


function usuarioPodeEditar(
  context
) {
  return [
    "admin",
    "qualidade",
  ].includes(
    context.data?.usuario?.role
  );
}

export async function onRequestGet(
  context
) {
  try {
    await garantirEstrutura(
      context
    );

    const url =
      new URL(
        context.request.url
      );

    const environmentId =
      Number(
        url.searchParams.get(
          "environment_id"
        )
      );

    if (!environmentId) {
      return respostaErro(
        "O ambiente é obrigatório.",
        400
      );
    }

    const resposta =
      await montarResposta(
        context,
        environmentId
      );

    if (!resposta) {
      return respostaErro(
        "Ambiente da release não encontrado.",
        404
      );
    }

    return Response.json(
      resposta
    );
  } catch (erro) {
    console.error(
      "Erro ao carregar compatibilidade:",
      erro
    );

    return respostaErro(
      "Não foi possível carregar a compatibilidade."
    );
  }
}

export async function onRequestPut(
  context
) {
  try {
    if (!usuarioPodeEditar(context)) {
      return respostaErro(
        "Seu perfil possui acesso somente para visualização.",
        403
      );
    }

    await garantirEstrutura(
      context
    );

    const body =
      await context.request.json();

    const environmentId =
      Number(
        body.environmentId
      );

    if (!environmentId) {
      return respostaErro(
        "O ambiente é obrigatório.",
        400
      );
    }

    if (!Array.isArray(body.items)) {
      return respostaErro(
        "A lista de compatibilidade é inválida.",
        400
      );
    }

    const ambiente =
      await buscarAmbiente(
        context,
        environmentId
      );

    if (!ambiente) {
      return respostaErro(
        "Ambiente da release não encontrado.",
        404
      );
    }

    const anterior =
      await montarResposta(
        context,
        environmentId
      );

    const catalogo =
      await listarCatalogoGlobal(
        context
      );

    const chavesPermitidas =
      new Set(
        catalogo.map(
          item => item.key
        )
      );

    const overrides =
      sanitizarOverrides(
        body.items,
        chavesPermitidas
      );

    await aplicarVersoesDaCompatibilidade(
      context,
      environmentId,
      catalogo,
      overrides
    );

    await context.env.DB
      .prepare(
        `
          INSERT INTO release_compatibility (
            environment_id,
            items_json,
            updated_at
          )
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(environment_id)
          DO UPDATE SET
            items_json = excluded.items_json,
            updated_at = CURRENT_TIMESTAMP
        `
      )
      .bind(
        environmentId,
        JSON.stringify(overrides)
      )
      .run();

    const atual =
      await montarResposta(
        context,
        environmentId
      );

    await registrarAuditoria(
      context,
      {
        acao: "EDITAR",
        entidade:
          "compatibilidade",
        entidadeId:
          environmentId,
        entidadeNome:
          String(
            ambiente.nome ?? ""
          ),
        dadosAnteriores:
          anterior,
        dadosNovos:
          atual,
      }
    );

    return Response.json(
      atual
    );
  } catch (erro) {
    console.error(
      "Erro ao salvar compatibilidade:",
      erro
    );

    return respostaErro(
      "Não foi possível salvar a compatibilidade."
    );
  }
}

export async function onRequestPost(
  context
) {
  try {
    if (!usuarioPodeEditar(context)) {
      return respostaErro(
        "Seu perfil possui acesso somente para visualização.",
        403
      );
    }

    await garantirEstrutura(
      context
    );

    const body =
      await context.request.json();

    if (
      body.action !==
      "add_version"
    ) {
      return respostaErro(
        "Ação inválida.",
        400
      );
    }

    const systemKey =
      normalizarChave(
        body.systemKey
      );

    const systemName =
      String(
        body.systemName ?? ""
      )
        .trim()
        .slice(0, 120);

    const version =
      String(
        body.version ?? ""
      )
        .trim()
        .slice(0, 120);

    if (
      !systemKey ||
      !systemName ||
      !version
    ) {
      return respostaErro(
        "Sistema e versão são obrigatórios.",
        400
      );
    }

    const catalogo =
      await listarCatalogoGlobal(
        context
      );

    if (
      !catalogo.some(
        item =>
          item.key === systemKey
      )
    ) {
      return respostaErro(
        "O sistema não está no cadastro geral da compatibilidade.",
        404
      );
    }

    await context.env.DB
      .prepare(
        `
          INSERT OR IGNORE INTO compatibility_manual_versions (
            system_key,
            system_name,
            version
          )
          VALUES (?, ?, ?)
        `
      )
      .bind(
        systemKey,
        systemName,
        version
      )
      .run();

    const manualVersions =
      await listarVersoesManuais(
        context
      );

    await registrarAuditoria(
      context,
      {
        acao: "CRIAR",
        entidade:
          "versao_compatibilidade",
        entidadeId:
          systemKey,
        entidadeNome:
          `${systemName} ${version}`,
        dadosNovos: {
          systemKey,
          systemName,
          version,
        },
      }
    );

    return Response.json({
      versions:
        manualVersions[
          systemKey
        ] ?? [version],
    });
  } catch (erro) {
    console.error(
      "Erro ao adicionar versão manual:",
      erro
    );

    return respostaErro(
      "Não foi possível adicionar a versão."
    );
  }
}
