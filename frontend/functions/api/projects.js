import {
  registrarAuditoria,
} from "../../server/audit.js";


function numero(valor) {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}

function transformarProjeto(row) {

  return {

    id: row.id,

    nome: row.nome,

    versao: row.versao,

    executavel: row.executavel,

    prazo: row.prazo,

    situacoes: {

      qualidade: row.qualidade,

      testes: row.testes,

      desenvolvido: row.desenvolvido,

      emProgresso: row.em_progresso,

      aguardandoCompilacao:
        row.aguardando_compilacao,

      nova: row.nova,

      reaberta: row.reaberta,

      validacaoCliente:
        numero(row.validacao_cliente),

      resolvidas:
        numero(row.resolvidas),

      rejeitada: row.rejeitada,

      interrompida: row.interrompida,

    },

  };

}

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


async function buscarProjetoPorId(
  context,
  id
) {

  const projeto =
    await context.env.DB
      .prepare(
        `
          SELECT
            id,
            nome,
            versao,
            executavel,
            prazo,
            qualidade,
            testes,
            desenvolvido,
            em_progresso,
            aguardando_compilacao,
            nova,
            reaberta,
            validacao_cliente,
            resolvidas,
            rejeitada,
            interrompida
          FROM projects
          WHERE id = ?
          LIMIT 1
        `
      )
      .bind(id)
      .first();

  return projeto
    ? transformarProjeto(projeto)
    : null;

}

/*
  GET /api/projects

  Retorna todos os projetos.
*/

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
              versao,
              executavel,
              prazo,
              qualidade,
              testes,
              desenvolvido,
              em_progresso,
              aguardando_compilacao,
              nova,
              reaberta,
              validacao_cliente,
              resolvidas,
              rejeitada,
              interrompida
            FROM projects
            ORDER BY id
          `
        )
        .all();

    const projetos =
      resultado.results.map(
        transformarProjeto
      );

    return Response.json(
      projetos
    );

  } catch (erro) {

    console.error(
      "Erro ao listar projetos:",
      erro
    );

    return respostaErro(
      "Não foi possível listar os projetos."
    );

  }

}

/*
  POST /api/projects

  Cria um novo projeto.
*/

export async function onRequestPost(
  context
) {

  try {

    const body =
      await context.request.json();

    if (!body.nome?.trim()) {

      return respostaErro(
        "O nome do projeto é obrigatório.",
        400
      );

    }

    const id =
      body.id ?? Date.now();

    const situacoes =
      body.situacoes ?? {};

    await context.env.DB
      .prepare(
        `
          INSERT INTO projects (
            id,
            nome,
            versao,
            executavel,
            prazo,
            qualidade,
            testes,
            desenvolvido,
            em_progresso,
            aguardando_compilacao,
            nova,
            reaberta,
            validacao_cliente,
            resolvidas,
            rejeitada,
            interrompida
          )
          VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
          )
        `
      )
      .bind(

        id,

        body.nome.trim(),

        body.versao ?? "",

        body.executavel ?? "",

        body.prazo ?? "",

        numero(
          situacoes.qualidade
        ),

        numero(
          situacoes.testes
        ),

        numero(
          situacoes.desenvolvido
        ),

        numero(
          situacoes.emProgresso
        ),

        numero(
          situacoes.aguardandoCompilacao
        ),

        numero(
          situacoes.nova
        ),

        numero(
          situacoes.reaberta
        ),

        numero(
          situacoes.validacaoCliente
        ),

        numero(
          situacoes.resolvidas
        ),

        numero(
          situacoes.rejeitada
        ),

        numero(
          situacoes.interrompida
        )

      )
      .run();

    const projetoCriado = {
      ...body,
      id,
      nome:
        body.nome.trim(),
    };


    await registrarAuditoria(
      context,
      {
        acao: "CRIAR",
        entidade: "projeto",
        entidadeId: id,
        entidadeNome:
          projetoCriado.nome,
        dadosNovos:
          projetoCriado,
      }
    );


    return Response.json(
      projetoCriado,
      {
        status: 201,
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao criar projeto:",
      erro
    );

    return respostaErro(
      "Não foi possível criar o projeto."
    );

  }

}

/*
  PUT /api/projects

  Atualiza um projeto existente.
*/

export async function onRequestPut(
  context
) {

  try {

    const body =
      await context.request.json();

    if (!body.id) {

      return respostaErro(
        "O ID do projeto é obrigatório.",
        400
      );

    }

    if (!body.nome?.trim()) {

      return respostaErro(
        "O nome do projeto é obrigatório.",
        400
      );

    }

    const situacoes =
      body.situacoes ?? {};


    const projetoAnterior =
      await buscarProjetoPorId(
        context,
        body.id
      );


    if (!projetoAnterior) {

      return respostaErro(
        "Projeto não encontrado.",
        404
      );

    }

    await context.env.DB
      .prepare(
        `
          UPDATE projects

          SET
            nome = ?,
            versao = ?,
            executavel = ?,
            prazo = ?,
            qualidade = ?,
            testes = ?,
            desenvolvido = ?,
            em_progresso = ?,
            aguardando_compilacao = ?,
            nova = ?,
            reaberta = ?,
            validacao_cliente = ?,
            resolvidas = ?,
            rejeitada = ?,
            interrompida = ?

          WHERE id = ?
        `
      )
      .bind(

        body.nome.trim(),

        body.versao ?? "",

        body.executavel ?? "",

        body.prazo ?? "",

        numero(
          situacoes.qualidade
        ),

        numero(
          situacoes.testes
        ),

        numero(
          situacoes.desenvolvido
        ),

        numero(
          situacoes.emProgresso
        ),

        numero(
          situacoes.aguardandoCompilacao
        ),

        numero(
          situacoes.nova
        ),

        numero(
          situacoes.reaberta
        ),

        numero(
          situacoes.validacaoCliente
        ),

        numero(
          situacoes.resolvidas
        ),

        numero(
          situacoes.rejeitada
        ),

        numero(
          situacoes.interrompida
        ),

        body.id

      )
      .run();

    const projetoAtualizado = {
      ...body,
      nome:
        body.nome.trim(),
    };


    await registrarAuditoria(
      context,
      {
        acao: "EDITAR",
        entidade: "projeto",
        entidadeId:
          projetoAtualizado.id,
        entidadeNome:
          projetoAtualizado.nome,
        dadosAnteriores:
          projetoAnterior,
        dadosNovos:
          projetoAtualizado,
      }
    );


    return Response.json(
      projetoAtualizado
    );

  } catch (erro) {

    console.error(
      "Erro ao atualizar projeto:",
      erro
    );

    return respostaErro(
      "Não foi possível atualizar o projeto."
    );

  }

}

/*
  DELETE /api/projects?id=123
*/

export async function onRequestDelete(
  context
) {

  try {

    const url =
      new URL(
        context.request.url
      );

    const id =
      Number(
        url.searchParams.get(
          "id"
        )
      );

    if (!id) {

      return respostaErro(
        "O ID do projeto é obrigatório.",
        400
      );

    }


    const projetoExcluido =
      await buscarProjetoPorId(
        context,
        id
      );


    if (!projetoExcluido) {

      return respostaErro(
        "Projeto não encontrado.",
        404
      );

    }

    await context.env.DB
      .prepare(
        `
          DELETE FROM projects
          WHERE id = ?
        `
      )
      .bind(id)
      .run();


    await registrarAuditoria(
      context,
      {
        acao: "EXCLUIR",
        entidade: "projeto",
        entidadeId: id,
        entidadeNome:
          projetoExcluido.nome,
        dadosAnteriores:
          projetoExcluido,
      }
    );

    return Response.json(
      {
        sucesso: true,
      }
    );

  } catch (erro) {

    console.error(
      "Erro ao excluir projeto:",
      erro
    );

    return respostaErro(
      "Não foi possível excluir o projeto."
    );

  }

}
