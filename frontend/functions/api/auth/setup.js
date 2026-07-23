import {
  compararSegredo,
  criarHashSenha,
} from "../../../server/auth.js";


export async function onRequestPost(
  context
) {

  try {

    if (
      !context.env.SETUP_SECRET ||
      !context.env.AUTH_SECRET
    ) {

      return Response.json(
        {
          erro:
            "Secrets de autenticação não configurados.",
        },
        {
          status: 500,
        }
      );

    }

    const segredo =
      context.request.headers.get(
        "X-Setup-Secret"
      );

    const autorizado =
      compararSegredo(
        segredo,
        context.env.SETUP_SECRET
      );

    if (!autorizado) {

      return Response.json(
        {
          erro:
            "Não autorizado.",
        },
        {
          status: 401,
        }
      );

    }

    const quantidade =
      await context.env.DB
        .prepare(
          `
            SELECT
              COUNT(*) AS total
            FROM users
          `
        )
        .first();

    if (
      Number(
        quantidade?.total || 0
      ) > 0
    ) {

      return Response.json(
        {
          erro:
            "O administrador inicial já foi criado.",
        },
        {
          status: 403,
        }
      );

    }

    const body =
      await context.request.json();

    const nome =
      String(
        body.nome || ""
      ).trim();

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

    if (
      !nome ||
      !email ||
      !senha
    ) {

      return Response.json(
        {
          erro:
            "Nome, e-mail e senha são obrigatórios.",
        },
        {
          status: 400,
        }
      );

    }

    if (
      senha.length < 12
    ) {

      return Response.json(
        {
          erro:
            "A senha deve possuir pelo menos 12 caracteres.",
        },
        {
          status: 400,
        }
      );

    }

    const {
      salt,
      hash,
    } =
      await criarHashSenha(
        senha,
        context.env.AUTH_SECRET
      );

    await context.env.DB
      .prepare(
        `
          INSERT INTO users (
            nome,
            email,
            password_hash,
            password_salt,
            role,
            ativo
          )
          VALUES (
            ?, ?, ?, ?, 'admin', 1
          )
        `
      )
      .bind(
        nome,
        email,
        hash,
        salt
      )
      .run();

    return Response.json(
      {
        sucesso: true,

        mensagem:
          "Administrador criado com sucesso.",
      },
      {
        status: 201,
      }
    );

  } catch (erro) {

    console.error(
      "Erro no setup:",
      erro
    );

    return Response.json(
      {
        erro:
          "Não foi possível criar o administrador.",
      },
      {
        status: 500,
      }
    );

  }

}