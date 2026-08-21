import {
  criarHashSenha,
} from "../../server/auth.js";

import {
  registrarAuditoria,
} from "../../server/audit.js";


function respostaErro(
  mensagem,
  status = 500
) {

  return Response.json(
    {
      erro: mensagem,
    },
    {
      status,
    }
  );

}


function normalizarRole(
  role
) {

  const rolesPermitidas = [
    "admin",
    "qualidade",
    "visualizador",
  ];


  return rolesPermitidas.includes(
    role
  )
    ? role
    : "visualizador";

}


async function emailEmUso(
  context,
  email,
  ignorarId = null
) {

  let query = `
    SELECT id
    FROM users
    WHERE email = ?
  `;

  const parametros = [
    email,
  ];


  if (
    ignorarId !== null
  ) {

    query += `
      AND id <> ?
    `;

    parametros.push(
      ignorarId
    );

  }


  query += `
    LIMIT 1
  `;


  const usuario =
    await context.env.DB
      .prepare(query)
      .bind(
        ...parametros
      )
      .first();


  return Boolean(
    usuario
  );

}


export async function onRequestGet(
  context
) {

  try {

    const resultado =
      await context.env.DB
        .prepare(
          `
            SELECT
              id,
              nome,
              email,
              role,
              ativo,
              created_at
            FROM users
            ORDER BY nome COLLATE NOCASE
          `
        )
        .all();


    return Response.json(
      resultado.results
    );

  } catch (erro) {

    console.error(
      "Erro ao listar usuários:",
      erro
    );


    return respostaErro(
      "Não foi possível listar os usuários."
    );

  }

}


export async function onRequestPost(
  context
) {

  try {

    if (
      !context.env.AUTH_SECRET
    ) {

      return respostaErro(
        "AUTH_SECRET não configurado.",
        500
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


    const role =
      normalizarRole(
        body.role
      );


    const usuarioResponsavel =
      context.data.usuario;


    if (
      usuarioResponsavel.role ===
        "qualidade" &&
      role === "admin"
    ) {

      return respostaErro(
        "O perfil Qualidade não pode cadastrar administradores.",
        403
      );

    }


    if (
      !nome ||
      !email ||
      !senha
    ) {

      return respostaErro(
        "Nome, e-mail e senha são obrigatórios.",
        400
      );

    }


    if (
      senha.length < 12
    ) {

      return respostaErro(
        "A senha deve possuir pelo menos 12 caracteres.",
        400
      );

    }


    if (
      await emailEmUso(
        context,
        email
      )
    ) {

      return respostaErro(
        "Já existe um usuário cadastrado com este e-mail.",
        409
      );

    }


    const {
      hash,
      salt,
    } =
      await criarHashSenha(
        senha,
        context.env.AUTH_SECRET
      );


    const resultado =
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
              ?, ?, ?, ?, ?, 1
            )
          `
        )
        .bind(
          nome,
          email,
          hash,
          salt,
          role
        )
        .run();


    const usuarioCriado = {
      id:
        resultado.meta
          ?.last_row_id,
      nome,
      email,
      role,
      ativo: 1,
    };


    await registrarAuditoria(
      context,
      {
        acao: "CRIAR",
        entidade: "usuario",
        entidadeId:
          usuarioCriado.id,
        entidadeNome:
          usuarioCriado.nome,
        dadosNovos:
          usuarioCriado,
      }
    );


    return Response.json(
      usuarioCriado,
      {
        status: 201,
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao criar usuário:",
      erro
    );


    return respostaErro(
      "Não foi possível criar o usuário."
    );

  }

}


export async function onRequestPut(
  context
) {

  try {

    if (
      !context.env.AUTH_SECRET
    ) {

      return respostaErro(
        "AUTH_SECRET não configurado.",
        500
      );

    }


    const body =
      await context.request.json();


    const id =
      Number(
        body.id
      );


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


    const role =
      normalizarRole(
        body.role
      );


    const ativo =
      Number(
        body.ativo
      ) === 0
        ? 0
        : 1;


    const novaSenha =
      String(
        body.novaSenha || ""
      );


    if (
      !id ||
      !nome ||
      !email
    ) {

      return respostaErro(
        "ID, nome e e-mail são obrigatórios.",
        400
      );

    }


    const usuarioAtual =
      context.data.usuario;


    const usuarioAnterior =
      await buscarUsuarioPorId(
        context,
        id
      );


    if (!usuarioAnterior) {

      return respostaErro(
        "Usuário não encontrado.",
        404
      );

    }


    const solicitanteQualidade =
      usuarioAtual.role ===
        "qualidade";


    if (
      solicitanteQualidade &&
      usuarioAnterior.role ===
        "admin"
    ) {

      return respostaErro(
        "O perfil Qualidade não pode alterar usuários administradores.",
        403
      );

    }


    if (
      solicitanteQualidade &&
      (
        nome !== usuarioAnterior.nome ||
        email !== usuarioAnterior.email ||
        role !== usuarioAnterior.role ||
        ativo !==
          Number(usuarioAnterior.ativo)
      )
    ) {

      return respostaErro(
        "O perfil Qualidade pode apenas redefinir a senha do usuário.",
        403
      );

    }


    if (
      solicitanteQualidade &&
      !novaSenha
    ) {

      return respostaErro(
        "Informe a nova senha do usuário.",
        400
      );

    }


    /*
      Impede o administrador de
      desativar o próprio acesso.
    */

    if (
      usuarioAtual.role === "admin" &&
      Number(
        usuarioAtual.id
      ) === id &&
      ativo === 0
    ) {

      return respostaErro(
        "Você não pode desativar o seu próprio usuário.",
        400
      );

    }


    /*
      Impede o administrador de
      remover seu próprio perfil admin.
    */

    if (
      usuarioAtual.role === "admin" &&
      Number(
        usuarioAtual.id
      ) === id &&
      role !== "admin"
    ) {

      return respostaErro(
        "Você não pode remover sua própria permissão de administrador.",
        400
      );

    }


    if (
      await emailEmUso(
        context,
        email,
        id
      )
    ) {

      return respostaErro(
        "Já existe outro usuário com este e-mail.",
        409
      );

    }


    if (
      novaSenha &&
      novaSenha.length < 12
    ) {

      return respostaErro(
        "A nova senha deve possuir pelo menos 12 caracteres.",
        400
      );

    }


    if (!solicitanteQualidade) {

      await context.env.DB
        .prepare(
          `
            UPDATE users

            SET
              nome = ?,
              email = ?,
              role = ?,
              ativo = ?

            WHERE id = ?
          `
        )
        .bind(
          nome,
          email,
          role,
          ativo,
          id
        )
        .run();

    }


    if (
      novaSenha
    ) {

      const {
        hash,
        salt,
      } =
        await criarHashSenha(
          novaSenha,
          context.env.AUTH_SECRET
        );


      await context.env.DB
        .prepare(
          `
            UPDATE users

            SET
              password_hash = ?,
              password_salt = ?

            WHERE id = ?
          `
        )
        .bind(
          hash,
          salt,
          id
        )
        .run();


      /*
        Ao trocar a senha,
        encerra as sessões antigas.
      */

      await context.env.DB
        .prepare(
          `
            DELETE FROM sessions
            WHERE user_id = ?
          `
        )
        .bind(
          id
        )
        .run();

    }


    const usuarioAtualizado = {
      id,

      nome:
        solicitanteQualidade
          ? usuarioAnterior.nome
          : nome,

      email:
        solicitanteQualidade
          ? usuarioAnterior.email
          : email,

      role:
        solicitanteQualidade
          ? usuarioAnterior.role
          : role,

      ativo:
        solicitanteQualidade
          ? Number(
              usuarioAnterior.ativo
            )
          : ativo,

      senhaRedefinida:
        Boolean(novaSenha),
    };


    const alterouSomenteSenha =
      Boolean(novaSenha) &&
      nome === usuarioAnterior.nome &&
      email === usuarioAnterior.email &&
      role === usuarioAnterior.role &&
      ativo ===
        Number(usuarioAnterior.ativo);


    await registrarAuditoria(
      context,
      {
        acao:
          alterouSomenteSenha
            ? "REDEFINIR_SENHA"
            : "EDITAR",
        entidade: "usuario",
        entidadeId: id,
        entidadeNome:
          usuarioAtualizado.nome,
        dadosAnteriores: {
          id:
            usuarioAnterior.id,
          nome:
            usuarioAnterior.nome,
          email:
            usuarioAnterior.email,
          role:
            usuarioAnterior.role,
          ativo:
            Number(
              usuarioAnterior.ativo
            ),
        },
        dadosNovos:
          usuarioAtualizado,
      }
    );


    return Response.json(
      usuarioAtualizado
    );

  } catch (erro) {

    console.error(
      "Erro ao atualizar usuário:",
      erro
    );


    return respostaErro(
      "Não foi possível atualizar o usuário."
    );

  }

}


async function buscarUsuarioPorId(
  context,
  id
) {

  return context.env.DB
    .prepare(
      `
        SELECT
          id,
          nome,
          email,
          role,
          ativo,
          created_at
        FROM users
        WHERE id = ?
        LIMIT 1
      `
    )
    .bind(id)
    .first();

}
