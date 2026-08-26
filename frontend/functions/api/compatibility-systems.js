import {
  registrarAuditoria,
} from "../../server/audit.js";

export const SISTEMAS_FIXOS = [
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
    { erro: mensagem },
    { status }
  );
}

function normalizarChave(valor) {
  return String(valor ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 160);
}

function parseLista(valor) {
  if (!valor) {
    return [];
  }

  try {
    const lista = JSON.parse(valor);
    return Array.isArray(lista)
      ? lista
      : [];
  } catch {
    return [];
  }
}

function sanitizarDefinicao(
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
        item?.originalName ??
        displayName
      )
        .trim()
        .slice(0, 120),
    displayName,
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
    defaultVisible:
      item?.defaultVisible !== false &&
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

function sanitizarDefinicoes(
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
      sanitizarDefinicao(
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

  return resultado
    .map(item => ({
      ...item,
      relatedTo:
        item.relatedTo.filter(
          key =>
            key !== item.key &&
            chaves.has(key)
        ),
    }))
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.displayName.localeCompare(
          b.displayName,
          "pt-BR",
          { sensitivity: "base" }
        )
    )
    .map(
      (item, indice) => ({
        ...item,
        order: indice + 1,
      })
    );
}

async function garantirTabelas(
  context
) {
  await context.env.DB
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS compatibility_systems (
          system_key TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          original_name TEXT NOT NULL DEFAULT '',
          display_name TEXT NOT NULL,
          redmine_project_id INTEGER,
          redmine_project_name TEXT NOT NULL DEFAULT '',
          default_visible INTEGER NOT NULL DEFAULT 1,
          display_order INTEGER NOT NULL DEFAULT 0,
          related_to_json TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    )
    .run();

  // A tabela antiga também é garantida aqui para permitir
  // a migração mesmo se o primeiro acesso for ao cadastro geral.
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
}

async function inserirDefinicao(
  context,
  item
) {
  await context.env.DB
    .prepare(
      `
        INSERT INTO compatibility_systems (
          system_key,
          source,
          original_name,
          display_name,
          redmine_project_id,
          redmine_project_name,
          default_visible,
          display_order,
          related_to_json,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(system_key)
        DO UPDATE SET
          source = excluded.source,
          original_name = excluded.original_name,
          display_name = excluded.display_name,
          redmine_project_id = excluded.redmine_project_id,
          redmine_project_name = excluded.redmine_project_name,
          default_visible = excluded.default_visible,
          display_order = excluded.display_order,
          related_to_json = excluded.related_to_json,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .bind(
      item.key,
      item.source,
      item.originalName,
      item.displayName,
      item.redmineProjectId,
      item.redmineProjectName,
      item.defaultVisible ? 1 : 0,
      item.order,
      JSON.stringify(item.relatedTo)
    )
    .run();
}

async function migrarConfiguracaoAtual(
  context
) {
  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT items_json
          FROM release_compatibility
          ORDER BY updated_at DESC
        `
      )
      .all();

  const vistos = new Set();
  const migrados = [];

  for (
    const row of
    resultado.results ?? []
  ) {
    const itens =
      parseLista(
        row.items_json
      );

    for (
      let indice = 0;
      indice < itens.length;
      indice++
    ) {
      const item =
        sanitizarDefinicao(
          itens[indice],
          indice
        );

      if (
        !item ||
        vistos.has(item.key)
      ) {
        continue;
      }

      vistos.add(item.key);
      migrados.push(item);
    }
  }

  return migrados;
}

export async function garantirCatalogoGlobal(
  context
) {
  await garantirTabelas(
    context
  );

  const quantidade =
    await context.env.DB
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM compatibility_systems
        `
      )
      .first();

  if (
    Number(
      quantidade?.total ?? 0
    ) > 0
  ) {
    return;
  }

  const base =
    SISTEMAS_FIXOS.map(
      sistema => ({
        key:
          `env:${sistema.chave}`,
        source: "environment",
        originalName:
          sistema.nome,
        displayName:
          sistema.nome,
        redmineProjectId:
          null,
        redmineProjectName:
          "",
        defaultVisible:
          true,
        order:
          sistema.ordem,
        relatedTo: [],
      })
    );

  // Se já existiam ajustes por release, usa a configuração
  // mais recente de cada sistema como ponto de partida global.
  const migrados =
    await migrarConfiguracaoAtual(
      context
    );

  const mapa = new Map(
    base.map(item => [
      item.key,
      item,
    ])
  );

  for (const item of migrados) {
    mapa.set(
      item.key,
      item
    );
  }

  const itens =
    sanitizarDefinicoes(
      [...mapa.values()]
    );

  for (const item of itens) {
    await inserirDefinicao(
      context,
      item
    );
  }
}

export async function listarCatalogoGlobal(
  context
) {
  await garantirCatalogoGlobal(
    context
  );

  const resultado =
    await context.env.DB
      .prepare(
        `
          SELECT
            system_key,
            source,
            original_name,
            display_name,
            redmine_project_id,
            redmine_project_name,
            default_visible,
            display_order,
            related_to_json
          FROM compatibility_systems
          ORDER BY display_order, display_name
        `
      )
      .all();

  return (
    resultado.results ?? []
  ).map(row => ({
    key:
      String(
        row.system_key ?? ""
      ),
    source:
      [
        "environment",
        "redmine",
        "manual",
      ].includes(row.source)
        ? row.source
        : "manual",
    originalName:
      String(
        row.original_name ?? ""
      ),
    displayName:
      String(
        row.display_name ?? ""
      ),
    redmineProjectId:
      Number(
        row.redmine_project_id
      ) || null,
    redmineProjectName:
      String(
        row.redmine_project_name ?? ""
      ),
    defaultVisible:
      Number(
        row.default_visible
      ) !== 0,
    order:
      Number(
        row.display_order
      ) || 0,
    relatedTo:
      parseLista(
        row.related_to_json
      )
        .map(normalizarChave)
        .filter(Boolean),
  }));
}

async function salvarCatalogo(
  context,
  itensRecebidos
) {
  const anteriores =
    await listarCatalogoGlobal(
      context
    );

  const existentesPorChave =
    new Map(
      anteriores.map(item => [
        item.key,
        item,
      ])
    );

  const recebidos =
    sanitizarDefinicoes(
      itensRecebidos
    );

  const recebidosPorChave =
    new Map(
      recebidos.map(item => [
        item.key,
        item,
      ])
    );

  // Sistemas originados do Ambiente nunca são apagados
  // do cadastro geral; no máximo ficam ocultos por padrão.
  for (
    const existente of
    anteriores
  ) {
    if (
      existente.source ===
        "environment" &&
      !recebidosPorChave.has(
        existente.key
      )
    ) {
      recebidos.push(
        existente
      );
      recebidosPorChave.set(
        existente.key,
        existente
      );
    }
  }

  const normalizados =
    sanitizarDefinicoes(
      recebidos
    );

  for (
    const existente of
    anteriores
  ) {
    if (
      existente.source !==
        "environment" &&
      !recebidosPorChave.has(
        existente.key
      )
    ) {
      await context.env.DB
        .prepare(
          `
            DELETE FROM compatibility_systems
            WHERE system_key = ?
          `
        )
        .bind(
          existente.key
        )
        .run();
    }
  }

  for (const item of normalizados) {
    const existente =
      existentesPorChave.get(
        item.key
      );

    // A origem de um sistema já existente não muda.
    const paraSalvar =
      existente
        ? {
            ...item,
            source:
              existente.source,
            originalName:
              existente.originalName ||
              item.originalName,
          }
        : item;

    await inserirDefinicao(
      context,
      paraSalvar
    );
  }

  return listarCatalogoGlobal(
    context
  );
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
    return Response.json({
      items:
        await listarCatalogoGlobal(
          context
        ),
    });
  } catch (erro) {
    console.error(
      "Erro ao carregar cadastro geral da compatibilidade:",
      erro
    );

    return respostaErro(
      "Não foi possível carregar o cadastro geral dos sistemas."
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

    const body =
      await context.request.json();

    if (!Array.isArray(body.items)) {
      return respostaErro(
        "A lista de sistemas é inválida.",
        400
      );
    }

    const anterior =
      await listarCatalogoGlobal(
        context
      );

    const atual =
      await salvarCatalogo(
        context,
        body.items
      );

    await registrarAuditoria(
      context,
      {
        acao: "EDITAR",
        entidade:
          "catalogo_compatibilidade",
        entidadeId:
          "global",
        entidadeNome:
          "Sistemas da compatibilidade",
        dadosAnteriores: {
          items: anterior,
        },
        dadosNovos: {
          items: atual,
        },
      }
    );

    return Response.json({
      items: atual,
    });
  } catch (erro) {
    console.error(
      "Erro ao salvar cadastro geral da compatibilidade:",
      erro
    );

    return respostaErro(
      "Não foi possível salvar o cadastro geral dos sistemas."
    );
  }
}
