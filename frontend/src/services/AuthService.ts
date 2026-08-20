import {
  apiUrl,
} from "./ApiConfig";

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  role: string;
}

interface LoginResponse {
  usuario: AuthUser;
}

interface SessionResponse {
  autenticado: boolean;
  usuario?: AuthUser;
}

const API_URL =
  apiUrl("/api/auth");

async function obterMensagemErro(
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

export async function login(
  email: string,
  senha: string,
  turnstileToken: string
): Promise<AuthUser> {

  const response =
    await fetch(
      `${API_URL}/login`,
      {
        method: "POST",

        credentials:
          "include",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            email,
            senha,
            turnstileToken,
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

  const data:
    LoginResponse =
      await response.json();

  return data.usuario;

}

export async function buscarSessao():
  Promise<AuthUser | null> {

  const response =
    await fetch(
      `${API_URL}/me`,
      {
        method: "GET",

        credentials:
          "include",

        cache:
          "no-store",
      }
    );

  if (
    response.status === 401
  ) {

    return null;

  }

  if (!response.ok) {

    throw new Error(
      await obterMensagemErro(
        response
      )
    );

  }

  const data:
    SessionResponse =
      await response.json();

  if (
    !data.autenticado ||
    !data.usuario
  ) {

    return null;

  }

  return data.usuario;

}

export async function logout():
  Promise<void> {

  const response =
    await fetch(
      `${API_URL}/logout`,
      {
        method: "POST",

        credentials:
          "include",
      }
    );

  if (!response.ok) {

    throw new Error(
      await obterMensagemErro(
        response
      )
    );

  }

}