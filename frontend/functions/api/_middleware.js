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
    Leituras necessárias para
    o Modo TV continuam públicas.
  */

  const leituraPublica =
    metodo === "GET" &&
    (
      caminho ===
        "/api/projects" ||

      caminho ===
        "/api/environments" ||

      caminho ===
        "/api/release-projects"
    );


  if (
    leituraPublica
  ) {
    return context.next();
  }


  /*
    Todo o restante exige login.
  */

  const usuario =
    await buscarUsuarioLogado(
      context
    );


  if (
    !usuario
  ) {
    return Response.json(
      {
        erro:
          "Sessão inválida ou expirada.",
      },
      {
        status:
          401,
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
    usuario.role !==
      "admin"
  ) {
    return Response.json(
      {
        erro:
          "Você não possui permissão para gerenciar usuários.",
      },
      {
        status:
          403,
      }
    );
  }


  /*
    Sincronização com o Redmine:

    Somente administrador
    ou usuário da Qualidade.
  */

  if (
    caminho ===
      "/api/redmine-sync" &&
    usuario.role !==
      "admin" &&
    usuario.role !==
      "qualidade"
  ) {
    return Response.json(
      {
        erro:
          "Você não possui permissão para sincronizar os dados com o Redmine.",
      },
      {
        status:
          403,
      }
    );
  }


  /*
    Rotas que alteram dados
    operacionais do ReleaseHub.
  */

  const rotaOperacional =
    caminho ===
      "/api/projects" ||

    caminho ===
      "/api/environments" ||

    caminho ===
      "/api/release-projects" ||

    caminho ===
      "/api/redmine-sync";


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
    usuario.role ===
      "visualizador" &&
    rotaOperacional &&
    metodoAlteracao
  ) {
    return Response.json(
      {
        erro:
          "Seu perfil possui acesso somente para visualização.",
      },
      {
        status:
          403,
      }
    );
  }


  return context.next();
}