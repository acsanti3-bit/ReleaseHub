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
    Rotas responsáveis pelo próprio
    processo de autenticação.
  */

  if (
    caminho.startsWith(
      "/api/auth/"
    )
  ) {

    return context.next();

  }

  /*
    Somente estas consultas GET
    permanecem públicas para que
    o Modo TV funcione sem login.
  */

  const leituraPublica =
    metodo === "GET" &&
    (
      caminho === "/api/projects" ||
      caminho === "/api/environments"
    );

  if (leituraPublica) {

    return context.next();

  }

  /*
    Todo o restante exige sessão.
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

  /*
    Gestão de usuários é exclusiva
    para administradores.
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

  context.data.usuario =
    usuario;

  return context.next();

}