import {
  apiUrl,
} from "./ApiConfig";

import type {
  CompatibilityItem,
  EnvironmentCompatibility,
} from "../types/compatibility";

const API_URL =
  apiUrl("/api/compatibility");

async function obterMensagemErro(
  response: Response
): Promise<string> {
  try {
    const data =
      await response.json() as {
        erro?: string;
      };

    return (
      data.erro ??
      "Não foi possível concluir a operação."
    );
  } catch {
    return "Não foi possível concluir a operação.";
  }
}

export async function buscarCompatibilidade(
  environmentId: number
): Promise<EnvironmentCompatibility> {
  const response =
    await fetch(
      `${API_URL}?environment_id=${environmentId}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterMensagemErro(
        response
      )
    );
  }

  return response.json();
}

export async function salvarCompatibilidade(
  environmentId: number,
  items: CompatibilityItem[]
): Promise<EnvironmentCompatibility> {
  const response =
    await fetch(
      API_URL,
      {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          environmentId,
          items,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterMensagemErro(
        response
      )
    );
  }

  return response.json();
}

export async function adicionarVersaoManual(
  systemKey: string,
  systemName: string,
  version: string
): Promise<string[]> {
  const response =
    await fetch(
      API_URL,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_version",
          systemKey,
          systemName,
          version,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterMensagemErro(
        response
      )
    );
  }

  const data =
    await response.json() as {
      versions: string[];
    };

  return data.versions;
}
