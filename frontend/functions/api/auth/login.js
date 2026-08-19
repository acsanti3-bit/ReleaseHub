import {
  criarCookieSessao,
  expiracaoSessao,
  gerarTokenSessao,
  hashToken,
  verificarSenha,
} from "../../../server/auth.js";


const FAKE_SALT =
  "00000000000000000000000000000000";

const FAKE_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";


async function validarTurnstile(
  context,
  token
) {

  const secret =
    context.env
      .TURNSTILE_SECRET;

  if (!secret) {

    throw new Error(
      "TURNSTILE_SECRET não configurado."
    );

  }

  const formData =
    new FormData();

  formData.append(
    "secret",
    secret
  );

  formData.append(
    "response",
    token
  );

  const ip =
    context.request.headers.get(
      "CF-Connecting-IP"
    );

  if (ip) {

    formData.append(
      "remoteip",
      ip
    );

  }

  const response =
    await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

  if (!response.ok) {

    throw new Error(
      `Falha ao consultar o Turnstile: HTTP ${response.status}.`
    );

  }

  const resultado =
    await response.json();

  return (
    resultado?.success === true &&
    resultado?.action === "login"
  );

}


export async function onRequestPost(
  context
) {

  try {

    if (
      !context.env.AUTH_SECRET
    ) {

      return Response.json(
        {
          erro:
            "AUTH_SECRET não configurado.",
        },
        {
          status: 500,
        }
      );

    }

    const body =
      await context.request.json();

    const email =
      String(
        body.email || ""
      )
        .trim()
        .toLowerCase();

    const senha =
      String(
        body.senha || ""
      );

    const turnstileToken =
      String(
        body.turnstileToken || ""
      );

    if (
      !email ||
      !senha
    ) {

      return Response.json(
        {
          erro:
            "Informe e-mail e senha.",
        },
        {
          status: 400,
        }
      );

    }

    if (
      !turnstileToken
    ) {

      return Response.json(
        {
          erro:
            "Conclua a verificação de segurança.",
        },
        {
          status: 400,
        }
      );

    }

    const turnstileValido =
      await validarTurnstile(
        context,
        turnstileToken
      );

    if (!turnstileValido) {

      return Response.json(
        {
          erro:
            "Não foi possível validar a verificação de segurança. Tente novamente.",
        },
        {
          status: 403,
        }
      );

    }

    const usuario =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              nome,
              email,
              role,
              ativo,
              password_hash,
              password_salt
            FROM users
            WHERE email = ?
            LIMIT 1
          `
        )
        .bind(
          email
        )
        .first();

    let senhaValida =
      false;

    if (
      usuario &&
      Number(
        usuario.ativo
      ) === 1
    ) {

      senhaValida =
        await verificarSenha(
          senha,
          usuario.password_hash,
          usuario.password_salt,
          context.env.AUTH_SECRET
        );

    } else {

      await verificarSenha(
        senha,
        FAKE_HASH,
        FAKE_SALT,
        context.env.AUTH_SECRET
      );

    }

    if (
      !usuario ||
      Number(
        usuario.ativo
      ) !== 1 ||
      !senhaValida
    ) {

      return Response.json(
        {
          erro:
            "E-mail ou senha inválidos.",
        },
        {
          status: 401,
        }
      );

    }

    const token =
      gerarTokenSessao();

    const tokenHash =
      await hashToken(
        token
      );

    const expiracao =
      expiracaoSessao();

    await context.env.DB
      .prepare(
        `
          DELETE FROM sessions
          WHERE expires_at <= ?
        `
      )
      .bind(
        new Date()
          .toISOString()
      )
      .run();

    await context.env.DB
      .prepare(
        `
          INSERT INTO sessions (
            token_hash,
            user_id,
            expires_at
          )
          VALUES (?, ?, ?)
        `
      )
      .bind(
        tokenHash,
        usuario.id,
        expiracao
      )
      .run();

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
      criarCookieSessao(
        token
      )
    );

    return new Response(
      JSON.stringify(
        {
          usuario: {

            id:
              usuario.id,

            nome:
              usuario.nome,

            email:
              usuario.email,

            role:
              usuario.role,

          },
        }
      ),
      {
        status: 200,
        headers,
      }
    );

  } catch (erro) {

    console.error(
      "Erro no login:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível realizar o login.",
      },
      {
        status: 500,
      }
    );

  }

}