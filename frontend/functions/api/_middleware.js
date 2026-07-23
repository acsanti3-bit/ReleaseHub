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
    Login, logout, setup e verificação
    de sessão precisam chegar às
    próprias rotas de autenticação.
  */

  if (
    caminho.startsWith(
      "/api/auth/"
    )
  ) {

    return context.next();

  }

  /*
    Leituras continuam públicas.

    Isso mantém o Modo TV funcionando
    sem necessidade de login.
  */

  if (
    metodo === "GET"
  ) {

    return context.next();

  }

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

  return context.next();

}