export interface TimeGroupMember {
  id?: number;
  redmine_user_id: number;
  redmine_user_name: string;
}

export interface TimeGroup {
  id: number;
  nome: string;
  criado_por: number;
  criado_por_nome?: string;
  created_at?: string;
  membros: TimeGroupMember[];
  podeEditar: boolean;
  podeExcluir: boolean;
}

interface PreferenceResponse {
  ultimoGrupoId:
    number |
    null;
}


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


export async function listarGruposHoras():
  Promise<TimeGroup[]> {

  const response =
    await fetch(
      "/api/time-groups",
      {
        method:
          "GET",

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


export async function criarGrupoHoras(
  nome: string,
  membros: TimeGroupMember[]
): Promise<void> {

  const response =
    await fetch(
      "/api/time-groups",
      {
        method:
          "POST",

        credentials:
          "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            nome,
            membros,
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

}


export async function editarGrupoHoras(
  id: number,
  nome: string,
  membros: TimeGroupMember[]
): Promise<void> {

  const response =
    await fetch(
      "/api/time-groups",
      {
        method:
          "PUT",

        credentials:
          "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            id,
            nome,
            membros,
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

}


export async function excluirGrupoHoras(
  id: number
): Promise<void> {

  const parametros =
    new URLSearchParams({
      id:
        String(id),
    });

  const response =
    await fetch(
      `/api/time-groups?${parametros.toString()}`,
      {
        method:
          "DELETE",

        credentials:
          "include",
      }
    );

  if (!response.ok) {

    throw new Error(
      await obterErro(
        response
      )
    );

  }

}


export async function obterPreferenciaGrupoHoras():
  Promise<number | null> {

  const response =
    await fetch(
      "/api/time-group-preference",
      {
        method:
          "GET",

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

  const data:
    PreferenceResponse =
      await response.json();

  return (
    data.ultimoGrupoId ??
    null
  );

}


export async function salvarPreferenciaGrupoHoras(
  grupoId:
    number |
    null
): Promise<void> {

  const response =
    await fetch(
      "/api/time-group-preference",
      {
        method:
          "PUT",

        credentials:
          "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            grupoId,
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

}