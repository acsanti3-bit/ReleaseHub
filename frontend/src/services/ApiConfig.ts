const configurada =
  String(
    import.meta.env
      .VITE_API_BASE_URL ??
      ""
  ).trim();


export const API_BASE_URL =
  configurada.replace(
    /\/+$/,
    ""
  );


export function apiUrl(
  caminho: string
): string {

  const caminhoNormalizado =
    caminho.startsWith("/")
      ? caminho
      : `/${caminho}`;

  return `${API_BASE_URL}${caminhoNormalizado}`;

}
