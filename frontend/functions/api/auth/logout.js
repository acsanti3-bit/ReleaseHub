import {
  hashToken,
  obterTokenSessao,
  removerCookieSessao,
} from "../../../server/auth.js";


export async function onRequestPost(
  context
) {

  try {

    const token =
      obterTokenSessao(
        context.request
      );

    if (token) {

      const tokenHash =
        await hashToken(
          token
        );

      await context.env.DB
        .prepare(
          `
            DELETE FROM sessions
            WHERE token_hash = ?
          `
        )
        .bind(
          tokenHash
        )
        .run();

    }

    const headers =
      new Headers();

    headers.set(
      "Content-Type",
      "application/json"
    );

    headers.set(
      "Cache-Control",
      "no-store"
    );

    headers.append(
      "Set-Cookie",
      removerCookieSessao()
    );

    return new Response(
      JSON.stringify(
        {
          sucesso: true,
        }
      ),
      {
        status: 200,
        headers,
      }
    );

  } catch (erro) {

    console.error(
      "Erro no logout:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível encerrar a sessão.",
      },
      {
        status: 500,
      }
    );

  }

}