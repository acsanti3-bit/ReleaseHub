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

function normalizarTexto(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizarChave(valor) {
  const chave = String(valor ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);

  return chave;
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

async function listarSistemasAmbiente(
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

  const mapa =
    new Map();

  for (
    const sistema of
    resultado.results ?? []
  ) {
    const chave =
      normalizarTexto(
        sistema.chave
      );

    const nome =
      normalizarTexto(
        sistema.nome
      );

    if (chave) {
      mapa.set(chave, sistema);
    }

    if (nome) {
      mapa.set(nome, sistema);
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
        chave:
          sistemaCatalogo.chave,
        nome:
          String(
            encontrado?.nome ??
            sistemaCatalogo.nome
          ).trim(),
        versao:
          String(
            encontrado?.versao ??
            obterVersaoLegada(
              ambiente,
              sistemaCatalogo.chave
            )
          ).trim(),
        ordem:
          Number(
            encontrado?.ordem
          ) ||
          sistemaCatalogo.ordem,
      };
    }
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

function sanitizarItem(
  item,
  indice
) {
  const source = [
    "environment",
    "redmine",
    "manual",
  ].includes(item?.source)
    ? item.source
    : "manual";

  const versionSource = [
    "environment",
    "redmine",
    "manual",
  ].includes(item?.versionSource)
    ? item.versionSource
    : source === "environment"
      ? "environment"
      : source;

  const key =
    normalizarChave(
      item?.key
    );

  if (!key) {
    return null;
  }

  const displayName =
    String(
      item?.displayName ?? ""
    )
      .trim()
      .slice(0, 120);

  if (!displayName) {
    return null;
  }

  const redmineProjectId =
    Number(
      item?.redmineProjectId
    );

  return {
    key,
    source,
    originalName:
      String(
        item?.originalName ?? ""
      )
        .trim()
        .slice(0, 120),
    displayName,
    environmentVersion:
      String(
        item?.environmentVersion ?? ""
      )
        .trim()
        .slice(0, 120),
    selectedVersion:
      String(
        item?.selectedVersion ?? ""
      )
        .trim()
        .slice(0, 120),
    versionSource,
    redmineProjectId:
      Number.isInteger(
        redmineProjectId
      ) &&
      redmineProjectId > 0
        ? redmineProjectId
        : null,
    redmineProjectName:
      String(
        item?.redmineProjectName ?? ""
      )
        .trim()
        .slice(0, 160),
    visible:
      item?.visible !== false,
    order:
      Number.isFinite(
        Number(item?.order)
      )
        ? Number(item.order)
        : indice + 1,
    relatedTo:
      Array.isArray(
        item?.relatedTo
      )
        ? item.relatedTo
            .map(normalizarChave)
            .filter(Boolean)
            .slice(0, 50)
        : [],
  };
}

function sanitizarItens(
  itens
) {
  const resultado = [];
  const chaves = new Set();

  for (
    let indice = 0;
    indice < itens.length;
    indice++
  ) {
    const item =
      sanitizarItem(
        itens[indice],
        indice
      );

    if (
      !item ||
      chaves.has(item.key)
    ) {
      continue;
    }

    chaves.add(item.key);
    resultado.push(item);
  }

  return resultado.map(
    item => ({
      ...item,
      relatedTo:
        item.relatedTo.filter(
          key =>
            key !== item.key &&
            chaves.has(key)
        ),
    })
  );
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

  return {
    configured: Boolean(row),
    items:
      sanitizarItens(
        parseItens(
          row?.items_json
        )
      ),
  };
}

function criarItensPadrao(
  sistemas
) {
  return sistemas.map(
    sistema => ({
      key:
        `env:${sistema.chave}`,
      source:
        "environment",
      originalName:
        sistema.nome,
      displayName:
        sistema.nome,
      environmentVersion:
        sistema.versao,
      selectedVersion:
        sistema.versao,
      versionSource:
        "environment",
      redmineProjectId:
        null,
      redmineProjectName:
        "",
      visible:
        true,
      order:
        sistema.ordem,
      relatedTo: [],
    })
  );
}

function mesclarItens(
  sistemas,
  itensSalvos
) {
  const padrao =
    criarItensPadrao(
      sistemas
    );

  const salvosPorChave =
    new Map(
      itensSalvos.map(
        item => [
          item.key,
          item,
        ]
      )
    );

  const chavesBase =
    new Set(
      padrao.map(
        item => item.key
      )
    );

  const itensBase =
    padrao.map(
      item => {
        const salvo =
          salvosPorChave.get(
            item.key
          );

        if (!salvo) {
          return item;
        }

        const usaAmbiente =
          salvo.versionSource ===
          "environment";

        return {
          ...salvo,
          source:
            "environment",
          originalName:
            item.originalName,
          environmentVersion:
            item.environmentVersion,
          selectedVersion:
            usaAmbiente
              ? item.environmentVersion
              : salvo.selectedVersion,
          order:
            Number.isFinite(
              Number(salvo.order)
            )
              ? Number(salvo.order)
              : item.order,
        };
      }
    );

  const extras =
    itensSalvos.filter(
      item =>
        !chavesBase.has(
          item.key
        )
    );

  return [
    ...itensBase,
    ...extras,
  ].sort(
    (a, b) =>
      a.order - b.order ||
      a.displayName.localeCompare(
        b.displayName,
        "pt-BR",
        {
          sensitivity: "base",
        }
      )
  );
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

  const sistemas =
    await listarSistemasAmbiente(
      context,
      ambiente
    );

  const configuracao =
    await buscarConfiguracaoSalva(
      context,
      environmentId
    );

  const items =
    mesclarItens(
      sistemas,
      configuracao.items
    );

  const manualVersions =
    await listarVersoesManuais(
      context
    );

  return {
    environmentId:
      Number(ambiente.id),
    environmentName:
      String(ambiente.nome ?? ""),
    configured:
      configuracao.configured,
    items,
    manualVersions,
  };
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

    const items =
      sanitizarItens(
        body.items
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
        JSON.stringify(items)
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
