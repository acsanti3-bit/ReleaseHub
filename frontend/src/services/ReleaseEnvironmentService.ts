import {
  criarSistemasFixos,
} from "../types/releaseEnvironment";

import type {
  ReleaseEnvironment,
} from "../types/releaseEnvironment";


const API_URL =
  "/api/environments";


async function requisicao<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response =
    await fetch(
      url,
      {
        credentials: "include",
        ...options,
      }
    );

  if (!response.ok) {
    const texto =
      await response.text();

    throw new Error(
      texto ||
      "Erro ao comunicar com a API."
    );
  }

  return response.json();
}


export async function listarAmbientes():
  Promise<ReleaseEnvironment[]> {
  return requisicao<
    ReleaseEnvironment[]
  >(API_URL);
}


export async function buscarAmbientePorId(
  id: number
): Promise<
  ReleaseEnvironment | undefined
> {
  const ambientes =
    await listarAmbientes();

  return ambientes.find(
    ambiente =>
      ambiente.id === id
  );
}


export async function buscarAmbientePorIntellicash(
  versaoIntellicash: string
): Promise<
  ReleaseEnvironment | undefined
> {
  const ambientes =
    await listarAmbientes();

  return ambientes.find(
    ambiente =>
      ambiente
        .versoes
        .intellicash ===
      versaoIntellicash
  );
}


function compararVersoes(
  versaoA: string,
  versaoB: string
): number {
  const partesA =
    versaoA
      .split(".")
      .map(
        parte =>
          Number(parte) || 0
      );

  const partesB =
    versaoB
      .split(".")
      .map(
        parte =>
          Number(parte) || 0
      );

  const tamanho =
    Math.max(
      partesA.length,
      partesB.length
    );

  for (
    let index = 0;
    index < tamanho;
    index++
  ) {
    const valorA =
      partesA[index] ?? 0;

    const valorB =
      partesB[index] ?? 0;

    if (valorA !== valorB) {
      return valorA - valorB;
    }
  }

  return 0;
}


export function ordenarAmbientesPorVersao(
  ambientes: ReleaseEnvironment[]
): ReleaseEnvironment[] {
  return [...ambientes].sort(
    (a, b) =>
      compararVersoes(
        b.versoes.intellicash,
        a.versoes.intellicash
      )
  );
}


export function obterAmbienteMaisRecente(
  ambientes: ReleaseEnvironment[]
): ReleaseEnvironment | undefined {
  return ordenarAmbientesPorVersao(
    ambientes
  )[0];
}


export async function adicionarAmbiente(
  ambiente: ReleaseEnvironment
): Promise<ReleaseEnvironment> {
  return requisicao<ReleaseEnvironment>(
    API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          ambiente
        ),
    }
  );
}


export async function editarAmbiente(
  ambiente: ReleaseEnvironment
): Promise<ReleaseEnvironment> {
  return requisicao<ReleaseEnvironment>(
    API_URL,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          ambiente
        ),
    }
  );
}


export async function excluirAmbiente(
  id: number
): Promise<void> {
  await requisicao(
    `${API_URL}?id=${id}`,
    {
      method: "DELETE",
    }
  );
}


export function criarAmbiente():
  ReleaseEnvironment {
  const versoes = {
    intellicash: "",
    easycash: "",
    easycheckout: "",
    easypdv: "",
    intellistock: "",
    iwbserver: "",
  };

  return {
    id: Date.now(),
    nome: "",
    prazo: "",
    versoes,
    sistemas:
      criarSistemasFixos(
        [],
        versoes
      ),
  };
}