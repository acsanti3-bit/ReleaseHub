import {
  buscarUsuarioLogado,
} from "../../server/auth.js";


function normalizarOrigem(
  valor
) {

  if (!valor) {

    return null;

  }

  try {

    return new URL(
      valor
    ).origin;

  } catch {

    return null;

  }

}


function obterOrigemPermitida(
  context
) {

  const origemRecebida =
    normalizarOrigem(
      context.request.headers.get(
        "Origin"
      )
    );


  if (!origemRecebida) {

    return {
      recebida:
        null,

      permitida:
        null,
    };

  }


  const origemApi =
    new URL(
      context.request.url
    ).origin;


  const origemFrontend =
    normalizarOrigem(
      context.env
        .FRONTEND_ORIGIN
    );


  const permitidas =
    new Set(
      [
        origemApi,
        origemFrontend,
      ].filter(Boolean)
    );


  return {
    recebida:
      origemRecebida,

    permitida:
      permitidas.has(
        origemRecebida
      )
        ? origemRecebida
        : null,
  };

}


function adicionarVaryOrigin(
  headers
) {

  const atual =
    headers.get(
      "Vary"
    );


  const valores =
    atual
      ? atual
          .split(",")
          .map(
            item =>
              item.trim()
          )
          .filter(Boolean)
      : [];


  if (
    !valores.some(
      item =>
        item.toLowerCase() ===
        "origin"
    )
  ) {

    valores.push(
      "Origin"
    );

  }


  headers.set(
    "Vary",
    valores.join(", ")
  );

}


function aplicarCors(
  response,
  origem
) {

  if (!origem) {

    return response;

  }


  const headers =
    new Headers(
      response.headers
    );


  headers.set(
    "Access-Control-Allow-Origin",
    origem
  );

  headers.set(
    "Access-Control-Allow-Credentials",
    "true"
  );

  adicionarVaryOrigin(
    headers
  );


  return new Response(
    response.body,
    {
      status:
        response.status,

      statusText:
        response.statusText,

      headers,
    }
  );

}


function respostaJson(
  body,
  init,
  origem
) {

  return aplicarCors(
    Response.json(
      body,
      init
    ),
    origem
  );

}


function respostaPreflight(
  origem
) {

  const headers =
    new Headers();


  headers.set(
    "Access-Control-Allow-Origin",
    origem
  );

  headers.set(
    "Access-Control-Allow-Credentials",
    "true"
  );

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );

  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Scheduler-Secret, X-Setup-Secret"
  );

  headers.set(
    "Access-Control-Max-Age",
    "86400"
  );

  adicionarVaryOrigin(
    headers
  );


  return new Response(
    null,
    {
      status: 204,
      headers,
    }
  );

}


export async function onRequest(
  context
) {

  const url =
    new URL(
      context.request.url
    );


  const caminho =
    url.pathname;


  const metodo =
    context.request.method
      .toUpperCase();


  const {
    recebida:
      origemRecebida,

    permitida:
      origemPermitida,
  } =
    obterOrigemPermitida(
      context
    );


  /*
    Requisições de navegador vindas
    de outra origem só são aceitas
    quando a origem estiver explicitamente
    configurada em FRONTEND_ORIGIN.

    Chamadas servidor-servidor, como
    o Scheduler, normalmente não possuem
    o cabeçalho Origin e seguem normalmente.
  */

  if (
    origemRecebida &&
    !origemPermitida
  ) {

    return Response.json(
      {
        erro:
          "Origem não permitida.",
      },
      {
        status: 403,
      }
    );

  }


  /*
    Preflight CORS.
  */

  if (
    metodo === "OPTIONS"
  ) {

    if (!origemPermitida) {

      return new Response(
        null,
        {
          status: 403,
        }
      );

    }


    return respostaPreflight(
      origemPermitida
    );

  }


  /*
    Rotas de autenticação.

    Continuam públicas quanto à sessão,
    mas a origem já foi validada acima.
  */

  if (
    caminho.startsWith(
      "/api/auth/"
    )
  ) {

    return aplicarCors(
      await context.next(),
      origemPermitida
    );

  }


  /*
    Worker Scheduler.

    O Scheduler precisa:
    - listar os ambientes;
    - executar a sincronização do Redmine.

    Essas chamadas só são liberadas
    quando X-Scheduler-Secret for igual
    ao secret configurado na Cloudflare.
  */

  const rotaScheduler =
    (
      metodo === "GET" &&
      caminho === "/api/environments"
    ) ||
    (
      metodo === "POST" &&
      caminho === "/api/redmine-sync"
    );


  if (rotaScheduler) {

    const segredoRecebido =
      context.request.headers.get(
        "X-Scheduler-Secret"
      );


    const segredoConfigurado =
      context.env
        .SCHEDULER_SECRET;


    if (
      segredoConfigurado &&
      segredoRecebido &&
      segredoRecebido ===
        segredoConfigurado
    ) {

      return aplicarCors(
        await context.next(),
        origemPermitida
      );

    }

  }


  /*
    Todo o restante exige login.
  */

  const usuario =
    await buscarUsuarioLogado(
      context
    );


  if (!usuario) {

    return respostaJson(
      {
        erro:
          "Sessão inválida ou expirada.",
      },
      {
        status: 401,
      },
      origemPermitida
    );

  }


  context.data.usuario =
    usuario;


  /*
    Gestão de usuários:
    administrador e Qualidade.

    As limitações específicas das
    alterações são validadas também
    pelo próprio endpoint de usuários.
  */

  if (
    caminho.startsWith(
      "/api/users"
    ) &&
    ![
      "admin",
      "qualidade",
    ].includes(
      usuario.role
    )
  ) {

    return respostaJson(
      {
        erro:
          "Você não possui permissão para gerenciar usuários.",
      },
      {
        status: 403,
      },
      origemPermitida
    );

  }


  if (
    caminho.startsWith(
      "/api/users"
    ) &&
    usuario.role === "qualidade" &&
    metodo === "DELETE"
  ) {
    return respostaJson(
      {
        erro:
          "O perfil Qualidade não possui permissão para excluir usuários.",
      },
      {
        status: 403,
      },
      origemPermitida
    );
  }


  /*
    Histórico de alterações:
    administrador e Qualidade.
  */

  if (
    caminho.startsWith(
      "/api/audit-logs"
    ) &&
    ![
      "admin",
      "qualidade",
    ].includes(
      usuario.role
    )
  ) {
    return respostaJson(
      {
        erro:
          "Você não possui permissão para consultar o histórico de alterações.",
      },
      {
        status: 403,
      },
      origemPermitida
    );
  }


  /*
    Monitoramento geral do Redmine:
    informação exclusiva dos perfis
    Administrador e Qualidade.
  */

  if (
    caminho.startsWith(
      "/api/redmine-open-projects"
    ) &&
    ![
      "admin",
      "qualidade",
    ].includes(
      usuario.role
    )
  ) {
    return respostaJson(
      {
        erro:
          "Você não possui permissão para consultar o monitoramento geral do Redmine.",
      },
      {
        status: 403,
      },
      origemPermitida
    );
  }


  /*
    Rotas que alteram dados
    operacionais do ReleaseHub.
  */

  const rotaOperacional =
    caminho === "/api/projects" ||
    caminho === "/api/environments" ||
    caminho === "/api/release-projects";


  const metodoAlteracao =
    [
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ].includes(
      metodo
    );


  /*
    Visualizador possui
    acesso somente leitura.
  */

  if (
    usuario.role === "visualizador" &&
    rotaOperacional &&
    metodoAlteracao
  ) {

    return respostaJson(
      {
        erro:
          "Seu perfil possui acesso somente para visualização.",
      },
      {
        status: 403,
      },
      origemPermitida
    );

  }


  return aplicarCors(
    await context.next(),
    origemPermitida
  );

}
