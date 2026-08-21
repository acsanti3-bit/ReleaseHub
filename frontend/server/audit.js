const CAMPOS_SENSIVEIS = new Set([
  "senha",
  "novasenha",
  "password",
  "passwordhash",
  "passwordsalt",
  "password_hash",
  "password_salt",
  "token",
  "secret",
]);


function normalizarChave(chave) {
  return String(chave ?? "")
    .replace(/[^a-z0-9_]/gi, "")
    .toLowerCase();
}


function serializarSeguro(valor) {
  if (
    valor === undefined ||
    valor === null
  ) {
    return null;
  }

  try {
    return JSON.stringify(
      valor,
      (chave, conteudo) => {
        if (
          chave &&
          CAMPOS_SENSIVEIS.has(
            normalizarChave(chave)
          )
        ) {
          return "[PROTEGIDO]";
        }

        return conteudo;
      }
    );
  } catch (erro) {
    console.error(
      "Erro ao serializar dados da auditoria:",
      erro
    );

    return JSON.stringify({
      erro:
        "Não foi possível registrar os detalhes desta alteração.",
    });
  }
}


export async function registrarAuditoria(
  context,
  {
    acao,
    entidade,
    entidadeId = null,
    entidadeNome = "",
    dadosAnteriores = null,
    dadosNovos = null,
    usuario = null,
  }
) {
  const usuarioResponsavel =
    usuario ??
    context.data?.usuario ??
    null;

  const nomeUsuario =
    usuarioResponsavel?.nome ??
    "Sistema/Redmine";

  const emailUsuario =
    usuarioResponsavel?.email ??
    "";

  const perfilUsuario =
    usuarioResponsavel?.role ??
    "sistema";

  try {
    await context.env.DB
      .prepare(
        `
          INSERT INTO audit_logs (
            user_id,
            user_name,
            user_email,
            user_role,
            action,
            entity_type,
            entity_id,
            entity_name,
            previous_data,
            new_data
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        usuarioResponsavel?.id ?? null,
        nomeUsuario,
        emailUsuario,
        perfilUsuario,
        String(acao ?? "").toUpperCase(),
        String(entidade ?? "").toLowerCase(),
        entidadeId === null
          ? null
          : String(entidadeId),
        String(entidadeNome ?? ""),
        serializarSeguro(dadosAnteriores),
        serializarSeguro(dadosNovos)
      )
      .run();

    return true;
  } catch (erro) {
    console.error(
      "Erro ao registrar auditoria:",
      erro
    );

    /*
      A falha do histórico não repete nem
      desfaz uma alteração já concluída.
    */
    return false;
  }
}
