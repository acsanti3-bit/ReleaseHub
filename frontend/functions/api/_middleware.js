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

    A única exceção técnica é a
    sincronização automática do
    Worker Scheduler, validada pelo
    SCHEDULER_SECRET.
  */


  /*
    Sincronização automática
    executada pelo Worker Scheduler.

    A rota continua protegida para
    requisições normais.

    Somente o Worker que possuir
    o mesmo SCHEDULER_SECRET
    configurado na Cloudflare
    consegue executar a sincronização.
  */

  const sincronizacaoAutomatica =
    metodo === "POST" &&
    caminho === "/api/redmine-sync";


  if (
    sincronizacaoAutomatica
  ) {

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
    Sincronização manual com o Redmine:
    somente Administrador e Qualidade.

    O Worker Scheduler já foi liberado
    antes desta etapa através do
    SCHEDULER_SECRET.
  */

  if (
    metodo === "POST" &&
    caminho === "/api/redmine-sync" &&
    ![
      "admin",
      "qualidade",
    ].includes(
      usuario.role
    )
  ) {

    return Response.json(
      {
        erro:
          "Você não possui permissão para sincronizar dados com o Redmine.",
      },
      {
        status: 403,
      }
    );

  }


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
    Exclusões estruturais:
    somente administrador.

    Mesmo que um endpoint não possua
    uma validação própria, o middleware
    impede a exclusão por outros perfis.
  */

  const exclusaoEstrutural =
    metodo === "DELETE" &&
    (
      caminho === "/api/projects" ||
      caminho === "/api/environments"
    );


  if (
    exclusaoEstrutural &&
    usuario.role !== "admin"
  ) {

    return Response.json(
      {
        erro:
          "Somente administradores podem excluir dados estruturais do ReleaseHub.",
      },
      {
        status: 403,
      }
    );

  }


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