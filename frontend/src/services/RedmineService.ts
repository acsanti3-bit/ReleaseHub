import {
  apiUrl,
} from "./ApiConfig";


interface ObterLinkRedmineParams {
  projeto: string;
  versao: string;
  statusId: number;
}


export async function obterLinkRedmine({
  projeto,
  versao,
  statusId,
}: ObterLinkRedmineParams) {

  const parametros =
    new URLSearchParams({
      projeto,
      versao,
      statusId:
        String(statusId),
    });


  const response =
    await fetch(
      apiUrl(
        `/api/redmine-link?${parametros.toString()}`
      ),
      {
        credentials:
          "include",
      }
    );


  const data =
    await response.json() as {
      url?: string;
      erro?: string;
    };


  if (
    !response.ok ||
    !data.url
  ) {

    throw new Error(
      data.erro ??
      "Não foi possível montar o link do Redmine."
    );

  }


  return data.url;
}