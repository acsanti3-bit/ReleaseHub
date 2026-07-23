import type {
  Project,
} from "../types/project";

const API_URL =
  "/api/release-projects";

async function obterErro(
  response: Response
): Promise<string> {
  try {
    const data =
      await response.json();

    return (
      data.erro ||
      "Não foi possível concluir a operação."
    );
  } catch {
    return "Não foi possível concluir a operação.";
  }
}

export async function listarProjetosPorAmbiente(
  environmentId: number
): Promise<Project[]> {
  const response =
    await fetch(
      `${API_URL}?environmentId=${environmentId}`,
      {
        method: "GET",

        credentials:
          "include",

        cache:
          "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterErro(
        response
      )
    );
  }

  return response.json();
}

export async function salvarProjetoNoAmbiente(
  environmentId: number,
  project: Project
): Promise<Project> {
  const response =
    await fetch(
      API_URL,
      {
        method: "PUT",

        credentials:
          "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            environmentId,
            project,
          }),
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterErro(
        response
      )
    );
  }

  return response.json();
}