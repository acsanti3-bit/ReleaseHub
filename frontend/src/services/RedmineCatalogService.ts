import {
  apiUrl,
} from "./ApiConfig";

import type {
  RedmineProjectOption,
  RedmineVersionOption,
} from "../types/compatibility";

const API_URL =
  apiUrl("/api/redmine-catalog");

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
      "Não foi possível consultar o Redmine."
    );
  } catch {
    return "Não foi possível consultar o Redmine.";
  }
}

export async function listarProjetosRedmineCatalogo():
  Promise<RedmineProjectOption[]> {
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

  const data =
    await response.json() as {
      projects: RedmineProjectOption[];
    };

  return data.projects;
}

export async function listarVersoesProjetoRedmine(
  projectId: number
): Promise<RedmineVersionOption[]> {
  const response =
    await fetch(
      `${API_URL}?project_id=${projectId}`,
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

  const data =
    await response.json() as {
      versions: RedmineVersionOption[];
    };

  return data.versions;
}
