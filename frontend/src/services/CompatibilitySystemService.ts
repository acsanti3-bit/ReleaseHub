import {
  apiUrl,
} from "./ApiConfig";

import type {
  CompatibilitySystemCatalog,
  CompatibilitySystemDefinition,
} from "../types/compatibility";

const API_URL =
  apiUrl("/api/compatibility-systems");

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

export async function buscarCatalogoSistemasCompatibilidade():
  Promise<CompatibilitySystemCatalog> {
  const response =
    await fetch(
      API_URL,
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

export async function salvarCatalogoSistemasCompatibilidade(
  items: CompatibilitySystemDefinition[]
): Promise<CompatibilitySystemCatalog> {
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
