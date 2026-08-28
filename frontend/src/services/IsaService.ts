import {
  apiUrl,
} from "./ApiConfig";

import type {
  IsaApplication,
  IsaEnvironmentData,
  UpdateIsaVersionResponse,
} from "../types/isa";


const API_URL =
  apiUrl("/api/isa");


async function requisicao<T>(
  url: string,
  options?: RequestInit
): Promise<T> {

  const response =
    await fetch(
      url,
      {
        credentials:
          "include",

        ...options,
      }
    );


  if (!response.ok) {

    let mensagem =
      "Erro ao comunicar com a API.";


    try {

      const dados =
        await response.json();


      mensagem =
        dados?.erro ||
        mensagem;

    } catch {

      try {

        const texto =
          await response.text();


        if (texto) {

          mensagem =
            texto;

        }

      } catch {

        /*
          Mantém a mensagem padrão.
        */

      }

    }


    throw new Error(
      mensagem
    );

  }


  return response.json();

}


export async function buscarIsaPorAmbiente(
  environmentId: number
): Promise<IsaEnvironmentData> {

  return requisicao<
    IsaEnvironmentData
  >(
    `${API_URL}?environmentId=${environmentId}`
  );

}


export async function atualizarVersaoIsa(
  environmentId: number,
  applicationId: number,
  version: string
): Promise<UpdateIsaVersionResponse> {

  return requisicao<
    UpdateIsaVersionResponse
  >(
    API_URL,
    {
      method:
        "PUT",

      headers: {
        "Content-Type":
          "application/json",
      },

      body:
        JSON.stringify(
          {
            environmentId,
            applicationId,
            version,
          }
        ),
    }
  );

}


export function ordenarAplicativosIsa(
  applications: IsaApplication[]
): IsaApplication[] {

  return [
    ...applications,
  ].sort(
    (a, b) =>
      a.display_order -
      b.display_order
  );

}
