import {
  apiUrl,
} from "./ApiConfig";


export interface RedmineOpenStatus {
  id: number | null;
  nome: string;
  quantidade: number;
  url: string;
}


export interface RedmineOpenProject {
  id: number;
  identifier: string;
  nome: string;
  totalAbertas: number;
  cadastradoNoReleaseHub: boolean;
  urlProjeto: string;
  urlTarefasAbertas: string;
  situacoes: RedmineOpenStatus[];
}


export interface RedmineOpenProjectsSummary {
  atualizadoEm: string;
  totalProjetos: number;
  totalProjetosComTarefas: number;
  totalProjetosForaReleaseHub: number;
  totalTarefasAbertas: number;
  projetos: RedmineOpenProject[];
}


async function obterMensagemErro(
  response: Response
): Promise<string> {
  try {
    const data =
      await response.json();

    return (
      data.erro ||
      "Não foi possível consultar os projetos do Redmine."
    );
  } catch {
    return "Não foi possível consultar os projetos do Redmine.";
  }
}


export async function listarProjetosAbertosRedmine(
  forcarAtualizacao = false
): Promise<RedmineOpenProjectsSummary> {
  const caminho =
    forcarAtualizacao
      ? "/api/redmine-open-projects?refresh=1"
      : "/api/redmine-open-projects";

  const response =
    await fetch(
      apiUrl(
        caminho
      ),
      {
        method:
          "GET",

        credentials:
          "include",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",
        },
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
