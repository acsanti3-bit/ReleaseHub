import type { ReleaseEnvironment } from "../types/releaseEnvironment";

import {
  releaseEnvironments as mockEnvironments,
} from "../mock/releaseEnvironments";

const STORAGE_KEY =
  "iws-releasehub-environments";

export function listarAmbientes(): ReleaseEnvironment[] {

  const dados =
    localStorage.getItem(STORAGE_KEY);

  if (!dados) {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(mockEnvironments)
    );

    return mockEnvironments;

  }

  return JSON.parse(dados);

}

export function salvarAmbientes(
  ambientes: ReleaseEnvironment[]
) {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(ambientes)
  );

}

export function buscarAmbientePorIntellicash(
  versaoIntellicash: string
): ReleaseEnvironment | undefined {

  return listarAmbientes().find(

    ambiente =>
      ambiente.versoes.intellicash ===
      versaoIntellicash

  );

}

export function adicionarAmbiente(
  ambiente: ReleaseEnvironment
) {

  const lista = listarAmbientes();

  lista.push(ambiente);

  salvarAmbientes(lista);

}

export function editarAmbiente(
  ambiente: ReleaseEnvironment
) {

  const lista = listarAmbientes();

  const novaLista = lista.map(item =>

    item.id === ambiente.id
      ? ambiente
      : item

  );

  salvarAmbientes(novaLista);

}

export function excluirAmbiente(
  id: number
) {

  const lista = listarAmbientes().filter(

    ambiente =>
      ambiente.id !== id

  );

  salvarAmbientes(lista);

}

export function criarAmbiente(): ReleaseEnvironment {

  return {

    id: Date.now(),

    nome: "",

    versoes: {

      intellicash: "",

      easycash: "",

      easycheckout: "",

      easypdv: "",

      intellistock: "",

      iwbserver: "",

    },

  };

}