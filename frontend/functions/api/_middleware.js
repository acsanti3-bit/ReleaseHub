import {
  buscarUsuarioLogado,
} from "../../server/auth.js";


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


  /*
    Rotas de autenticação.
  */

  if (
    caminho.startsWith(
      "/api/auth/"
    )
  ) {

    return context.next();

  }


  /*
    Todas as rotas de dados exigem
    sessão autenticada.

    Exceções técnicas do Worker
    Scheduler são permitidas somente
    com SCHEDULER_SECRET válido.
  */


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

      return context.next();

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

    return Response.json(
      {
        erro:
          "Sessão inválida ou expirada.",
      },
      {
        status: 401,
      }
    );

  }


  context.data.usuario =
    usuario;


  /*
    Gestão de usuários:
    somente administrador.
  */

  if (
    caminho.startsWith(
      "/api/users"
    ) &&
    usuario.role !== "admin"
  ) {

    return Response.json(
      {
        erro:
          "Você não possui permissão para gerenciar usuários.",
      },
      {
        status: 403,
      }
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

    Mesmo tentando alterar pela API,
    a requisição será bloqueada.
  */

  if (
    usuario.role === "visualizador" &&
    rotaOperacional &&
    metodoAlteracao
  ) {

    return Response.json(
      {
        erro:
          "Seu perfil possui acesso somente para visualização.",
      },
      {
        status: 403,
      }
    );

  }


  return context.next();

}