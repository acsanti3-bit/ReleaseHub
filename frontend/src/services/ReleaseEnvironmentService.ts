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
      options
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

export async function buscarAmbientePorIntellicash(
  versaoIntellicash: string
): Promise<
  ReleaseEnvironment | undefined
> {

  const ambientes =
    await listarAmbientes();

  return ambientes.find(
    ambiente =>
      ambiente.versoes.intellicash ===
      versaoIntellicash
  );

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