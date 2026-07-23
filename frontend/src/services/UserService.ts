export type UserRole =
  | "admin"
  | "qualidade"
  | "visualizador";


export interface User {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  ativo: number;
  created_at?: string;
}


export interface CreateUserData {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
}


export interface UpdateUserData {
  id: number;
  nome: string;
  email: string;
  role: UserRole;
  ativo: number;
  novaSenha?: string;
}


const API_URL =
  "/api/users";


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


export async function listarUsuarios():
  Promise<User[]> {

  const response =
    await fetch(
      API_URL,
      {
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


export async function adicionarUsuario(
  dados: CreateUserData
): Promise<User> {

  const response =
    await fetch(
      API_URL,
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
          JSON.stringify(
            dados
          ),
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


export async function editarUsuario(
  dados: UpdateUserData
): Promise<User> {

  const response =
    await fetch(
      API_URL,
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
          JSON.stringify(
            dados
          ),
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