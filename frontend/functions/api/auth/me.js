import {
  buscarUsuarioLogado,
} from "../../../server/auth.js";


export async function onRequestGet(
  context
) {

  try {

    const usuario =
      await buscarUsuarioLogado(
        context
      );

    if (!usuario) {

      return Response.json(
        {
          autenticado: false,
        },
        {
          status: 401,

          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );

    }

    return Response.json(
      {
        autenticado: true,

        usuario,
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao validar sessão:",
      erro
    );

    return Response.json(
      {
        autenticado: false,
      },
      {
        status: 500,
      }
    );

  }

}