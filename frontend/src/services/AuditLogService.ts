import {
  apiUrl,
} from "./ApiConfig";


export interface AuditLog {
  id: number;
  userId: number | null;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityName: string;
  previousData: unknown;
  newData: unknown;
  createdAt: string;
}


const API_URL =
  apiUrl("/api/audit-logs");


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


export async function listarAuditoria(
  limite = 100
): Promise<AuditLog[]> {
  const response =
    await fetch(
      `${API_URL}?limit=${limite}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterErro(response)
    );
  }

  return response.json();
}

export async function listarAuditoriaEntidade(
  entityType: string,
  entityId: number | string,
  limite = 200
): Promise<AuditLog[]> {
  const parametros =
    new URLSearchParams({
      limit: String(limite),
      entityType,
      entityId: String(entityId),
    });

  const response =
    await fetch(
      `${API_URL}?${parametros.toString()}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterErro(response)
    );
  }

  return response.json();
}


export async function adicionarObservacaoAmbiente(
  environmentId: number,
  environmentName: string,
  observacao: string
): Promise<void> {
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
          entityType: "ambiente",
          entityId: environmentId,
          entityName: environmentName,
          observacao,
        }),
      }
    );

  if (!response.ok) {
    throw new Error(
      await obterErro(response)
    );
  }
}
