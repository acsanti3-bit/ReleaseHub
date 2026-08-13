import { buscarUsuarioLogado } from "../../server/auth.js";

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
  sistemas
) {
  return {
    id: row.id,
    nome: row.nome,
    prazo: row.prazo ?? "",

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

  const mapa =
    new Map();

  for (const row of resultado.results) {
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

    mapa
      .get(row.environment_id)
      .push({
        chave: row.chave,
        nome: row.nome,
        versao:
          row.versao ?? "",
        executavel:
          row.executavel ?? "",
        ordem:
          Number(row.ordem) || 0,

        mostrarNaTv:
          Number(
            row.mostrar_na_tv
          ) !== 0,
      });
  }

  return mapa;
}


async function salvarSistemas(
  context,
  environmentId,
  sistemas
) {
  await context.env.DB
    .prepare(
      `
        DELETE FROM release_environment_versions
        WHERE environment_id = ?
      `
    )
    .bind(environmentId)
    .run();

  for (const sistema of sistemas) {
    await context.env.DB
      .prepare(
        `
          INSERT INTO release_environment_versions (
            environment_id,
            chave,
            nome,
            versao,
            executavel,
            ordem,
            mostrar_na_tv
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        environmentId,
        sistema.chave,
        sistema.nome,
        sistema.versao,
        sistema.executavel ?? "",
        sistema.ordem,
        sistema.mostrarNaTv
          ? 1
          : 0
      )
      .run();
  }
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
  prazo
) {
  return {
    id,
    nome,
    prazo: prazo ?? "",

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


/*
  GET /api/environments
*/
export async function onRequestGet(
  context
) {
  try {
    const resultado =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              nome,
              prazo,
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

    const sistemasPorAmbiente =
      await listarSistemas(
        context
      );

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
            sistemas
          );
        }
      );

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
    const body =
      await context.request.json();

    if (!body.nome?.trim()) {
      return respostaErro(
        "O nome do ambiente é obrigatório.",
        400
      );
    }

    const sistemas =
      normalizarSistemas(
        body.sistemas,
        body.versoes
      );

    const intellicash =
      obterVersaoSistema(
        sistemas,
        "intellicash"
      );

    if (!intellicash) {
      return respostaErro(
        "A versão do Intellicash é obrigatória.",
        400
      );
    }

    const id =
      body.id ?? Date.now();

    await context.env.DB
      .prepare(
        `
          INSERT INTO release_environments (
            id,
            nome,
            prazo,
            intellicash,
            easycash,
            easycheckout,
            easypdv,
            intellistock,
            iwbserver
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        id,
        body.nome.trim(),
        String(
          body.prazo ?? ""
        ).trim(),
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

    await salvarSistemas(
      context,
      id,
      sistemas
    );

    await sincronizarProjetos(
      context,
      id,
      sistemas,
      String(
        body.prazo ?? ""
      ).trim()
    );

    return Response.json(
      criarRespostaAmbiente(
        id,
        body.nome.trim(),
        sistemas,
        String(
          body.prazo ?? ""
        ).trim()
      ),
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

    const sistemas =
      normalizarSistemas(
        body.sistemas,
        body.versoes
      );

    const intellicash =
      obterVersaoSistema(
        sistemas,
        "intellicash"
      );

    if (!intellicash) {
      return respostaErro(
        "A versão do Intellicash é obrigatória.",
        400
      );
    }

    await context.env.DB
      .prepare(
        `
          UPDATE release_environments
          SET
            nome = ?,
            prazo = ?,
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

    await salvarSistemas(
      context,
      body.id,
      sistemas
    );

    await sincronizarProjetos(
      context,
      body.id,
      sistemas,
      String(
        body.prazo ?? ""
      ).trim()
    );

    return Response.json(
      criarRespostaAmbiente(
        body.id,
        body.nome.trim(),
        sistemas,
        String(
          body.prazo ?? ""
        ).trim()
      )
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