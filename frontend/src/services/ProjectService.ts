import type { Project } from "../types/project";

import type {
  ReleaseEnvironment,
} from "../types/releaseEnvironment";

import {
  projects as mockProjects,
} from "../mock/projects";

import {
  buscarAmbientePorIntellicash,
} from "./ReleaseEnvironmentService";

const STORAGE_KEY =
  "iws-qualityhub-projects";

type ChaveVersao =
  keyof ReleaseEnvironment["versoes"];

function obterChaveProjeto(
  nome: string
): ChaveVersao | null {

  const projeto =
    nome
      .toLowerCase()
      .replace(/\s/g, "");

  if (
    projeto.includes("intellicash") ||
    projeto.includes("intelicash")
  ) {
    return "intellicash";
  }

  if (
    projeto.includes("easycash")
  ) {
    return "easycash";
  }

  if (
    projeto.includes("easycheckout")
  ) {
    return "easycheckout";
  }

  if (
    projeto.includes("easypdv")
  ) {
    return "easypdv";
  }

  if (
    projeto.includes("intellistock") ||
    projeto.includes("isa")
  ) {
    return "intellistock";
  }

  if (
    projeto.includes("iwb")
  ) {
    return "iwbserver";
  }

  return null;

}

function aplicarAmbiente(
  projetos: Project[],
  ambiente: ReleaseEnvironment
): Project[] {

  return projetos.map(project => {

    const chave =
      obterChaveProjeto(
        project.nome
      );

    if (!chave) {

      return project;

    }

    return {

      ...project,

      versao:
        ambiente.versoes[chave],

    };

  });

}

function sincronizarLista(
  projetos: Project[]
): Project[] {

  const intellicash =
    projetos.find(project => {

      return (
        obterChaveProjeto(
          project.nome
        ) === "intellicash"
      );

    });

  if (!intellicash) {

    return projetos;

  }

  if (!intellicash.versao) {

    return projetos;

  }

  const ambiente =
    buscarAmbientePorIntellicash(
      intellicash.versao
    );

  if (!ambiente) {

    return projetos;

  }

  return aplicarAmbiente(
    projetos,
    ambiente
  );

}

export function listarProjetos():
  Project[] {

  const dados =
    localStorage.getItem(
      STORAGE_KEY
    );

  if (!dados) {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        mockProjects
      )
    );

    return mockProjects;

  }

  return JSON.parse(dados);

}

export function salvarProjetos(
  projects: Project[]
) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(projects)
  );

}

export function editarProjeto(
  project: Project
) {

  const lista =
    listarProjetos();

  const novaLista =
    lista.map(item =>

      item.id === project.id
        ? project
        : item

    );

  const listaSincronizada =
    sincronizarLista(
      novaLista
    );

  salvarProjetos(
    listaSincronizada
  );

}

export function adicionarProjeto(
  project: Project
) {

  const lista =
    listarProjetos();

  lista.push(project);

  const listaSincronizada =
    sincronizarLista(
      lista
    );

  salvarProjetos(
    listaSincronizada
  );

}

export function excluirProjeto(
  id: number
) {

  salvarProjetos(

    listarProjetos().filter(

      project =>
        project.id !== id

    )

  );

}

export function criarProjeto():
  Project {

  return {

    id: Date.now(),

    nome: "",

    versao: "",

    executavel: "",

    prazo: "",

    situacoes: {

      qualidade: 0,

      testes: 0,

      desenvolvido: 0,

      emProgresso: 0,

      aguardandoCompilacao: 0,

      nova: 0,

      reaberta: 0,

      rejeitada: 0,

      interrompida: 0,

    },

  };

}

export function removerProjeto(
  id: number
) {

  const lista =
    listarProjetos().filter(

      project =>
        project.id !== id

    );

  salvarProjetos(lista);

}

/*
  Pode ser chamada quando um
  Ambiente da Release for alterado.

  Ela pega a versão atual do Intellicash
  e atualiza automaticamente todos
  os projetos vinculados.
*/

export function sincronizarProjetosComAmbienteAtual() {

  const projetos =
    listarProjetos();

  const sincronizados =
    sincronizarLista(
      projetos
    );

  salvarProjetos(
    sincronizados
  );

}