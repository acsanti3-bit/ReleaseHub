function corsHeaders(context) {
  return {
    "Access-Control-Allow-Origin":
      context.env.FRONTEND_ORIGIN ||
      "https://releasehub.iws.com.br",

    "Access-Control-Allow-Credentials":
      "true",

    "Access-Control-Allow-Headers":
      "Content-Type",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Content-Type":
      "application/json; charset=UTF-8",
  };
}


function respostaJson(
  context,
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers:
        corsHeaders(context),
    }
  );
}


function sanitizarTexto(
  valor,
  tamanho = 300
) {
  return String(
    valor ?? ""
  )
    .trim()
    .slice(
      0,
      tamanho
    );
}


function sanitizarDocumento(
  valor
) {
  return String(
    valor ?? ""
  )
    .replace(
      /\D/g,
      ""
    )
    .slice(
      0,
      20
    );
}


function sanitizarVersao(
  valor
) {
  const versao =
    sanitizarTexto(
      valor,
      120
    );


  if (
    !versao ||
    versao
      .toLowerCase()
      .includes(
        "undefined.undefined"
      )
  ) {
    return "";
  }


  return versao;
}


function sanitizarLicencas(
  valor
) {
  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    ) ||
    numero < 0
  ) {
    return 0;
  }


  return Math.trunc(
    numero
  );
}


async function garantirTabelas(
  context
) {
  await context.env.DB
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS client_version_imports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,

          file_name TEXT NOT NULL,

          total_rows INTEGER NOT NULL DEFAULT 0,

          total_active_licenses INTEGER NOT NULL DEFAULT 0,

          imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
    )
    .run();


  await context.env.DB
    .prepare(
      `
        CREATE TABLE IF NOT EXISTS client_versions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,

          import_id INTEGER NOT NULL,

          fantasy_name TEXT NOT NULL,

          document TEXT NOT NULL DEFAULT '',

          state TEXT NOT NULL DEFAULT '',

          partner TEXT NOT NULL DEFAULT '',

          version TEXT NOT NULL DEFAULT '',

          active_licenses INTEGER NOT NULL DEFAULT 0,

          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

          FOREIGN KEY (
            import_id
          )
          REFERENCES client_version_imports(id)
        )
      `
    )
    .run();


  await context.env.DB
    .prepare(
      `
        CREATE INDEX IF NOT EXISTS idx_client_versions_import
        ON client_versions (
          import_id
        )
      `
    )
    .run();


  await context.env.DB
    .prepare(
      `
        CREATE INDEX IF NOT EXISTS idx_client_versions_document
        ON client_versions (
          document
        )
      `
    )
    .run();


  await context.env.DB
    .prepare(
      `
        CREATE INDEX IF NOT EXISTS idx_client_versions_version
        ON client_versions (
          version
        )
      `
    )
    .run();
}


async function buscarUltimaImportacao(
  context
) {
  return context.env.DB
    .prepare(
      `
        SELECT
          id,
          file_name,
          total_rows,
          total_active_licenses,
          imported_at

        FROM client_version_imports

        ORDER BY id DESC

        LIMIT 1
      `
    )
    .first();
}


async function montarResposta(
  context
) {
  const ultimaImportacao =
    await buscarUltimaImportacao(
      context
    );


  if (
    !ultimaImportacao
  ) {
    return {
      clients: [],

      lastImport: null,
    };
  }


  const resultadoClientes =
    await context.env.DB
      .prepare(
        `
          SELECT
            id,
            import_id,
            fantasy_name,
            document,
            state,
            partner,
            version,
            active_licenses

          FROM client_versions

          WHERE import_id = ?

          ORDER BY
            fantasy_name COLLATE NOCASE
        `
      )
      .bind(
        ultimaImportacao.id
      )
      .all();


  return {
    clients:
      (
        resultadoClientes.results ??
        []
      )
        .map(
          item => ({
            id:
              Number(
                item.id
              ),

            importId:
              Number(
                item.import_id
              ),

            fantasyName:
              item.fantasy_name ??
              "",

            document:
              item.document ??
              "",

            state:
              item.state ??
              "",

            partner:
              item.partner ??
              "",

            version:
              item.version ??
              "",

            activeLicenses:
              Number(
                item.active_licenses ??
                0
              ),
          })
        ),

    lastImport: {
      id:
        Number(
          ultimaImportacao.id
        ),

      fileName:
        ultimaImportacao.file_name,

      totalRows:
        Number(
          ultimaImportacao.total_rows ??
          0
        ),

      totalActiveLicenses:
        Number(
          ultimaImportacao.total_active_licenses ??
          0
        ),

      importedAt:
        ultimaImportacao.imported_at,
    },
  };
}


export async function onRequestOptions(
  context
) {
  return new Response(
    null,
    {
      status: 204,

      headers:
        corsHeaders(
          context
        ),
    }
  );
}


export async function onRequestGet(
  context
) {
  try {

    await garantirTabelas(
      context
    );


    const resultado =
      await montarResposta(
        context
      );


    return respostaJson(
      context,
      resultado
    );

  } catch (
    erro
  ) {

    console.error(
      "Erro ao consultar versões dos clientes:",
      erro
    );


    return respostaJson(
      context,
      {
        erro:
          "Não foi possível consultar as versões dos clientes.",
      },
      500
    );

  }
}


export async function onRequestPost(
  context
) {
  try {

    await garantirTabelas(
      context
    );


    const body =
      await context.request.json();


    const fileName =
      sanitizarTexto(
        body?.fileName,
        300
      ) ||
      "importacao.xlsx";


    if (
      !Array.isArray(
        body?.rows
      )
    ) {
      return respostaJson(
        context,
        {
          erro:
            "Nenhuma linha foi enviada para importação.",
        },
        400
      );
    }


    const linhas =
      body.rows
        .map(
          item => ({
            fantasyName:
              sanitizarTexto(
                item?.fantasyName,
                300
              ),

            document:
              sanitizarDocumento(
                item?.document
              ),

            state:
              sanitizarTexto(
                item?.state,
                10
              ),

            partner:
              sanitizarTexto(
                item?.partner,
                250
              ),

            version:
              sanitizarVersao(
                item?.version
              ),

            activeLicenses:
              sanitizarLicencas(
                item?.activeLicenses
              ),
          })
        )
        .filter(
          item =>
            item.fantasyName
        );


    if (
      linhas.length ===
      0
    ) {
      return respostaJson(
        context,
        {
          erro:
            "O arquivo não possui clientes válidos para importação.",
        },
        400
      );
    }


    const totalActiveLicenses =
      linhas.reduce(
        (
          total,
          item
        ) =>
          total +
          item.activeLicenses,
        0
      );


    const resultadoImportacao =
      await context.env.DB
        .prepare(
          `
            INSERT INTO client_version_imports (
              file_name,
              total_rows,
              total_active_licenses
            )
            VALUES (?, ?, ?)
          `
        )
        .bind(
          fileName,
          linhas.length,
          totalActiveLicenses
        )
        .run();


    const importId =
      Number(
        resultadoImportacao
          .meta
          ?.last_row_id
      );


    if (
      !importId
    ) {
      throw new Error(
        "Não foi possível identificar a importação criada."
      );
    }


    const tamanhoLote =
      50;


    for (
      let inicio = 0;
      inicio < linhas.length;
      inicio += tamanhoLote
    ) {
      const lote =
        linhas.slice(
          inicio,
          inicio +
            tamanhoLote
        );


      const statements =
        lote.map(
          item =>
            context.env.DB
              .prepare(
                `
                  INSERT INTO client_versions (
                    import_id,
                    fantasy_name,
                    document,
                    state,
                    partner,
                    version,
                    active_licenses
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `
              )
              .bind(
                importId,
                item.fantasyName,
                item.document,
                item.state,
                item.partner,
                item.version,
                item.activeLicenses
              )
        );


      await context.env.DB
        .batch(
          statements
        );
    }


    const resultado =
      await montarResposta(
        context
      );


    return respostaJson(
      context,
      resultado,
      201
    );

  } catch (
    erro
  ) {

    console.error(
      "Erro ao importar versões dos clientes:",
      erro
    );


    return respostaJson(
      context,
      {
        erro:
          erro instanceof Error
            ? erro.message
            : "Não foi possível importar as versões dos clientes.",
      },
      500
    );

  }
}