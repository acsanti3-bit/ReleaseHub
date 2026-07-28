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


/*
  Normaliza textos para facilitar
  comparação entre nomes de projetos.
*/

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


/*
  Gera a chave interna de
  um novo sistema.

  Exemplo:
  "BI" -> "bi"
  "Intelli Food" -> "intellifood"
*/

function criarChave(
  nome
) {

  return normalizarTexto(
    nome
  );

}


/*
  Sistemas antigos.

  Esse fallback garante que
  ambientes antigos continuem
  funcionando normalmente.
*/

function obterSistemasPadrao(
  versoes = {}
) {

  return [

    {
      chave:
        "intellicash",

      nome:
        "Intellicash",

      versao:
        versoes.intellicash ?? "",

      ordem: 1,
    },

    {
      chave:
        "easycash",

      nome:
        "EasyCash",

      versao:
        versoes.easycash ?? "",

      ordem: 2,
    },

    {
      chave:
        "easycheckout",

      nome:
        "EasyCheckout",

      versao:
        versoes.easycheckout ?? "",

      ordem: 3,
    },

    {
      chave:
        "easypdv",

      nome:
        "EasyPDV",

      versao:
        versoes.easypdv ?? "",

      ordem: 4,
    },

    {
      chave:
        "intellistock",

      nome:
        "IntelliStock",

      versao:
        versoes.intellistock ?? "",

      ordem: 5,
    },

    {
      chave:
        "iwbserver",

      nome:
        "IWB Server",

      versao:
        versoes.iwbserver ?? "",

      ordem: 6,
    },

  ];

}


/*
  Normaliza os sistemas recebidos
  pelo frontend.

  Sistemas novos chegam inicialmente
  com chave "novo-123456...".

  Aqui transformamos, por exemplo:

  novo-123456
  nome: BI

  em:

  chave: bi
*/

function normalizarSistemas(
  sistemas,
  versoes
) {

  const origem =
    Array.isArray(
      sistemas
    ) &&
    sistemas.length > 0

      ? sistemas

      : obterSistemasPadrao(
          versoes
        );


  const chavesUsadas =
    new Set();


  return origem
    .map(
      (
        sistema,
        index
      ) => {

        const nome =
          String(
            sistema.nome ?? ""
          ).trim();


        let chave =
          String(
            sistema.chave ?? ""
          ).trim();


        if (
          !chave ||
          chave.startsWith(
            "novo-"
          )
        ) {

          chave =
            criarChave(
              nome
            );

        }


        if (
          !nome ||
          !chave
        ) {

          return null;

        }


        /*
          Evita duas chaves iguais
          dentro do mesmo ambiente.
        */

        let chaveFinal =
          chave;

        let contador =
          2;


        while (
          chavesUsadas.has(
            chaveFinal
          )
        ) {

          chaveFinal =
            `${chave}${contador}`;

          contador++;

        }


        chavesUsadas.add(
          chaveFinal
        );


        return {

          chave:
            chaveFinal,

          nome,

          versao:
            String(
              sistema.versao ?? ""
            ).trim(),

          ordem:
            Number(
              sistema.ordem
            ) ||
            index + 1,

        };

      }
    )
    .filter(Boolean);

}


/*
  Obtém a versão de um sistema
  dentro da lista dinâmica.
*/

function obterVersaoSistema(
  sistemas,
  chave
) {

  return (
    sistemas.find(
      sistema =>
        sistema.chave ===
        chave
    )?.versao ??
    ""
  );

}


/*
  Converte o registro do banco
  para o formato utilizado
  pelo frontend.
*/

function transformarAmbiente(
  row,
  sistemas
) {

  return {

    id:
      row.id,

    nome:
      row.nome,

    /*
      Estrutura antiga mantida
      por compatibilidade.
    */

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


    /*
      Estrutura nova e dinâmica.
    */

    sistemas,

  };

}


/*
  Busca todos os sistemas
  cadastrados por ambiente.
*/

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
            ordem

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


  for (
    const row of
    resultado.results
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


    mapa
      .get(
        row.environment_id
      )
      .push(
        {

          chave:
            row.chave,

          nome:
            row.nome,

          versao:
            row.versao ?? "",

          ordem:
            Number(
              row.ordem
            ) || 0,

        }
      );

  }


  return mapa;

}


/*
  Salva os sistemas de
  um ambiente.

  Primeiro removemos a configuração
  anterior daquele ambiente.

  Depois gravamos exatamente
  a configuração atual do Drawer.
*/

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
    .bind(
      environmentId
    )
    .run();


  for (
    const sistema of
    sistemas
  ) {

    await context.env.DB
      .prepare(
        `
          INSERT INTO release_environment_versions (
            environment_id,
            chave,
            nome,
            versao,
            ordem
          )

          VALUES (
            ?, ?, ?, ?, ?
          )
        `
      )
      .bind(
        environmentId,
        sistema.chave,
        sistema.nome,
        sistema.versao,
        sistema.ordem
      )
      .run();

  }

}


/*
  Descobre qual versão do ambiente
  pertence a determinado projeto.
*/

function obterVersaoProjeto(
  nome,
  sistemas
) {

  const projeto =
    normalizarTexto(
      nome
    );


  /*
    Projetos já conhecidos.
  */

  const conhecidos = [

    {
      termos: [
        "intellicash",
        "intelicash",
      ],

      chave:
        "intellicash",
    },

    {
      termos: [
        "easycash",
      ],

      chave:
        "easycash",
    },

    {
      termos: [
        "easycheckout",
      ],

      chave:
        "easycheckout",
    },

    {
      termos: [
        "easypdv",
      ],

      chave:
        "easypdv",
    },

    {
      termos: [
        "intellistock",
        "isa",
      ],

      chave:
        "intellistock",
    },

    {
      termos: [
        "iwbserver",
        "iwb",
      ],

      chave:
        "iwbserver",
    },

  ];


  for (
    const conhecido of
    conhecidos
  ) {

    const encontrou =
      conhecido.termos.some(
        termo =>
          projeto.includes(
            termo
          )
      );


    if (
      encontrou
    ) {

      return obterVersaoSistema(
        sistemas,
        conhecido.chave
      );

    }

  }


  /*
    Sistemas futuros.

    Exemplo:
    BI
    DW
    Enterprise
    IntelliFood

    Tentamos associar automaticamente
    utilizando nome ou chave.
  */

  const encontrado =
    sistemas.find(
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


        /*
          Para nomes muito pequenos
          como BI e DW, exigimos
          igualdade para não gerar
          associações incorretas.
        */

        if (
          chave.length <= 2 ||
          nomeSistema.length <= 2
        ) {

          return (
            projeto === chave ||
            projeto === nomeSistema
          );

        }


        return (
          projeto === chave ||
          projeto === nomeSistema ||
          projeto.includes(
            chave
          ) ||
          projeto.includes(
            nomeSistema
          )
        );

      }
    );


  return (
    encontrado?.versao ??
    ""
  );

}


/*
  Sincroniza somente a versão
  dos projetos existentes
  dentro da release.

  NÃO altera:
  - tarefas
  - prazo
  - executável
*/

async function sincronizarProjetos(
  context,
  environmentId,
  sistemas
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


    await context.env.DB
      .prepare(
        `
          INSERT INTO release_projects (
            environment_id,
            project_id,
            versao
          )

          VALUES (
            ?, ?, ?
          )

          ON CONFLICT (
            environment_id,
            project_id
          )

          DO UPDATE SET

            versao =
              excluded.versao,

            updated_at =
              CURRENT_TIMESTAMP
        `
      )
      .bind(
        environmentId,
        projeto.id,
        versao
      )
      .run();

  }

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

          const sistemas =
            sistemasPorAmbiente.get(
              row.id
            ) ??
            obterSistemasPadrao(
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


    if (
      !body.nome?.trim()
    ) {

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


    if (
      !intellicash
    ) {

      return respostaErro(
        "A versão do Intellicash é obrigatória.",
        400
      );

    }


    const id =
      body.id ??
      Date.now();


    await context.env.DB
      .prepare(
        `
          INSERT INTO release_environments (
            id,
            nome,
            intellicash,
            easycash,
            easycheckout,
            easypdv,
            intellistock,
            iwbserver
          )

          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?
          )
        `
      )
      .bind(
        id,

        body.nome.trim(),

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
      sistemas
    );


    return Response.json(
      {

        id,

        nome:
          body.nome.trim(),

        versoes: {

          intellicash,

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

      },
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


    if (
      !body.id
    ) {

      return respostaErro(
        "O ID do ambiente é obrigatório.",
        400
      );

    }


    if (
      !body.nome?.trim()
    ) {

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


    if (
      !intellicash
    ) {

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


    /*
      AQUI estava faltando no seu arquivo.

      Agora TODOS os sistemas
      são persistidos no D1.
    */

    await salvarSistemas(
      context,
      body.id,
      sistemas
    );


    /*
      Depois sincronizamos as versões
      dos projetos da release.
    */

    await sincronizarProjetos(
      context,
      body.id,
      sistemas
    );


    return Response.json(
      {

        id:
          body.id,

        nome:
          body.nome.trim(),

        versoes: {

          intellicash,

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

      }
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


    if (
      !id
    ) {

      return respostaErro(
        "O ID do ambiente é obrigatório.",
        400
      );

    }


    /*
      Remove sistemas dinâmicos.
    */

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_environment_versions

          WHERE environment_id = ?
        `
      )
      .bind(
        id
      )
      .run();


    /*
      Remove os dados dos projetos
      daquela release.
    */

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_projects

          WHERE environment_id = ?
        `
      )
      .bind(
        id
      )
      .run();


    /*
      Finalmente remove o ambiente.
    */

    await context.env.DB
      .prepare(
        `
          DELETE FROM release_environments

          WHERE id = ?
        `
      )
      .bind(
        id
      )
      .run();


    return Response.json(
      {
        sucesso:
          true,
      }
    );

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