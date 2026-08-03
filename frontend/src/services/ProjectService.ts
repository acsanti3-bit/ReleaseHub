import type {
  Project,
} from "../types/project";

import type {
  ReleaseEnvironment,
} from "../types/releaseEnvironment";

import {
  buscarAmbientePorIntellicash,
} from "./ReleaseEnvironmentService";


const API_URL =
  "/api/projects";


type ChaveVersao =
  keyof ReleaseEnvironment["versoes"];


async function requisicao<T>(
  url: string,
  options?: RequestInit
): Promise<T> {

  const response =
    await fetch(
      url,
      {
        credentials:
          "include",

        ...options,
      }
    );


  if (
    !response.ok
  ) {

    let mensagem =
      "Erro ao comunicar com a API.";


    try {

      const data =
        await response.json();


      mensagem =
        data.erro ??
        mensagem;

    } catch {

      const texto =
        await response.text();


      if (
        texto
      ) {

        mensagem =
          texto;

      }

    }


    throw new Error(
      mensagem
    );

  }


  return response.json();

}


function obterChaveProjeto(
  nome: string
): ChaveVersao | null {

  const projeto =
    nome
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );


  if (
    projeto.includes(
      "intellicash"
    ) ||
    projeto.includes(
      "intelicash"
    )
  ) {

    return "intellicash";

  }


  if (
    projeto.includes(
      "easycash"
    )
  ) {

    return "easycash";

  }


  if (
    projeto.includes(
      "easycheckout"
    )
  ) {

    return "easycheckout";

  }


  if (
    projeto.includes(
      "easypdv"
    )
  ) {

    return "easypdv";

  }


  if (
    projeto.includes(
      "intellistock"
    ) ||
    projeto.includes(
      "isa"
    )
  ) {

    return "intellistock";

  }


  if (
    projeto.includes(
      "iwbserver"
    ) ||
    projeto.includes(
      "iwb"
    )
  ) {

    return "iwbserver";

  }


  return null;

}


async function atualizarProjetoNaApi(
  project: Project
): Promise<Project> {

  return requisicao<Project>(
    API_URL,
    {
      method:
        "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          project
        ),
    }
  );

}


export async function listarProjetos():
  Promise<Project[]> {

  return requisicao<
    Project[]
  >(
    API_URL,
    {
      method:
        "GET",

      cache:
        "no-store",
    }
  );

}


export async function editarProjeto(
  project: Project
): Promise<Project> {

  const projetoAtualizado =
    await atualizarProjetoNaApi(
      project
    );


  const chave =
    obterChaveProjeto(
      project.nome
    );


  /*
    Se o IntelliCash mudar de versão,
    os projetos vinculados ao ambiente
    são atualizados automaticamente.
  */

  if (
    chave ===
      "intellicash" &&
    project.versao
  ) {

    await sincronizarProjetosComAmbienteAtual(
      project.versao
    );

  }


  return projetoAtualizado;

}


export async function adicionarProjeto(
  project: Project
): Promise<Project> {

  let projetoParaSalvar:
    Project = {
      ...project,

      situacoes: {
        ...project.situacoes,

        validacaoCliente:
          project
            .situacoes
            .validacaoCliente ??
          0,

        resolvidas:
          project
            .situacoes
            .resolvidas ??
          0,
      },
    };


  const chave =
    obterChaveProjeto(
      project.nome
    );


  /*
    Quando o projeto pertence
    ao ambiente da release,
    tenta localizar sua versão
    automaticamente.
  */

  if (
    chave &&
    chave !==
      "intellicash"
  ) {

    const projetos =
      await listarProjetos();


    const intellicash =
      projetos.find(
        item =>
          obterChaveProjeto(
            item.nome
          ) ===
          "intellicash"
      );


    if (
      intellicash?.versao
    ) {

      const ambiente =
        await buscarAmbientePorIntellicash(
          intellicash.versao
        );


      if (
        ambiente
      ) {

        projetoParaSalvar = {
          ...projetoParaSalvar,

          versao:
            ambiente
              .versoes[
                chave
              ] ??
            projetoParaSalvar
              .versao,
        };

      }

    }

  }


  const novoProjeto =
    await requisicao<Project>(
      API_URL,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            projetoParaSalvar
          ),
      }
    );


  if (
    chave ===
      "intellicash" &&
    novoProjeto.versao
  ) {

    await sincronizarProjetosComAmbienteAtual(
      novoProjeto.versao
    );

  }


  return novoProjeto;

}


export async function excluirProjeto(
  id: number
): Promise<void> {

  await requisicao(
    `${API_URL}?id=${id}`,
    {
      method:
        "DELETE",
    }
  );

}


export async function removerProjeto(
  id: number
): Promise<void> {

  await excluirProjeto(
    id
  );

}


export function criarProjeto():
  Project {

  return {
    id:
      Date.now(),

    nome:
      "",

    versao:
      "",

    executavel:
      "",

    prazo:
      "",

    situacoes: {
      qualidade:
        0,

      testes:
        0,

      desenvolvido:
        0,

      aguardandoCompilacao:
        0,

      emProgresso:
        0,

      nova:
        0,

      reaberta:
        0,

      validacaoCliente:
        0,

      resolvidas:
        0,

      rejeitada:
        0,

      interrompida:
        0,
    },
  };

}


export async function sincronizarProjetosComAmbienteAtual(
  versaoIntellicash?: string
): Promise<Project[]> {

  const projetos =
    await listarProjetos();


  const intellicash =
    projetos.find(
      project =>
        obterChaveProjeto(
          project.nome
        ) ===
        "intellicash"
    );


  const versao =
    versaoIntellicash ||
    intellicash?.versao;


  if (
    !versao
  ) {

    return projetos;

  }


  const ambiente =
    await buscarAmbientePorIntellicash(
      versao
    );


  if (
    !ambiente
  ) {

    return projetos;

  }


  const projetosAtualizados =
    projetos.map(
      project => {

        const chave =
          obterChaveProjeto(
            project.nome
          );


        if (
          !chave
        ) {

          return project;

        }


        const novaVersao =
          ambiente
            .versoes[
              chave
            ];


        if (
          novaVersao ===
            undefined
        ) {

          return project;

        }


        return {
          ...project,

          versao:
            novaVersao,
        };

      }
    );


  const alterados =
    projetosAtualizados.filter(
      projetoAtualizado => {

        const original =
          projetos.find(
            projeto =>
              projeto.id ===
              projetoAtualizado.id
          );


        return (
          original &&
          original.versao !==
            projetoAtualizado.versao
        );

      }
    );


  await Promise.all(
    alterados.map(
      project =>
        atualizarProjetoNaApi(
          project
        )
    )
  );


  return projetosAtualizados;

}