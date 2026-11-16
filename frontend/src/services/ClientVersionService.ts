import type {
  ClientVersionImportRow,
  ClientVersionsResponse,
} from "../types/clientVersions";


const API_BASE_URL =
  "https://releasehub.pages.dev";


async function lerResposta(
  response: Response
) {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  if (
    !contentType.includes(
      "application/json"
    )
  ) {
    throw new Error(
      "A API de versões dos clientes não respondeu corretamente."
    );
  }


  return response.json();
}


export async function listarVersoesClientes():
Promise<ClientVersionsResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/client-versions`,
      {
        method:
          "GET",

        credentials:
          "include",

        cache:
          "no-store",
      }
    );


  const data =
    await lerResposta(
      response
    );


  if (
    !response.ok
  ) {
    throw new Error(
      data.erro ||
      "Não foi possível carregar as versões dos clientes."
    );
  }


  return data as ClientVersionsResponse;
}


export async function importarVersoesClientes(
  fileName: string,
  rows: ClientVersionImportRow[]
): Promise<ClientVersionsResponse> {

  const response =
    await fetch(
      `${API_BASE_URL}/api/client-versions`,
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
            fileName,
            rows,
          }),
      }
    );


  const data =
    await lerResposta(
      response
    );


  if (
    !response.ok
  ) {
    throw new Error(
      data.erro ||
      "Não foi possível importar o arquivo."
    );
  }


  return data as ClientVersionsResponse;
}