export interface ReleaseSystemVersion {
  chave: string;
  nome: string;
  versao: string;
  ordem: number;
}

export interface ReleaseEnvironment {
  id: number;
  nome: string;

  /* Estrutura antiga mantida para compatibilidade. */
  versoes: {
    intellicash: string;
    easycash: string;
    easycheckout: string;
    easypdv: string;
    intellistock: string;
    iwbserver: string;
  };

  sistemas?: ReleaseSystemVersion[];
}

export const RELEASE_SYSTEM_CATALOG:
  Array<Omit<ReleaseSystemVersion, "versao">> = [
    { chave: "intellicash", nome: "IntelliCash", ordem: 1 },
    { chave: "easycash", nome: "EasyCash", ordem: 2 },
    { chave: "easycheckout", nome: "EasyCheckOut", ordem: 3 },
    { chave: "easypdv", nome: "EasyPDV", ordem: 4 },
    { chave: "intellistock", nome: "IntelliStock", ordem: 5 },
    { chave: "iwbserver", nome: "IWB Server", ordem: 6 },
    { chave: "enterpriseserver", nome: "Enterprise Server", ordem: 7 },
    { chave: "nfedestinadas", nome: "NF-e Destinadas", ordem: 8 },
    { chave: "intellifood", nome: "IntelliFood", ordem: 9 },
    { chave: "pcp", nome: "PCP", ordem: 10 },
    { chave: "gerenciadordepromocoes", nome: "Gerenciador de Promoções", ordem: 11 },
    { chave: "sincmatrizxfilial", nome: "Sinc. Matriz X Filial", ordem: 12 },
    { chave: "sinclabfiscal", nome: "Sinc. Lab. Fiscal", ordem: 13 },
    { chave: "sincecommerce", nome: "Sinc. E-Commerce", ordem: 14 },
    { chave: "pesocerto", nome: "Peso Certo", ordem: 15 },
    { chave: "notify", nome: "Notify", ordem: 16 },
    { chave: "vendaassistida", nome: "Venda Assistida", ordem: 17 },
    { chave: "cotacao", nome: "Cotação", ordem: 18 },
    { chave: "bi", nome: "BI", ordem: 19 },
  ];

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function aliases(chave: string, nome: string): string[] {
  const valores = new Set<string>();
  const add = (v: string) => {
    const n = normalizarTexto(v);
    if (n) valores.add(n);
  };

  add(chave);
  add(nome);

  const atual = normalizarTexto(chave);

  if (atual === "sincmatrizxfilial") add("sincronizadormatrizxfilial");
  if (atual === "sinclabfiscal") add("sincronizadorlabfiscal");
  if (atual === "sincecommerce") add("sincronizadorecommerce");

  return [...valores];
}

export function criarSistemasFixos(
  sistemas: ReleaseSystemVersion[] = [],
  versoes?: ReleaseEnvironment["versoes"]
): ReleaseSystemVersion[] {
  const salvos = new Map<string, ReleaseSystemVersion>();

  for (const sistema of sistemas) {
    for (const chave of aliases(sistema.chave, sistema.nome)) {
      salvos.set(chave, sistema);
    }
  }

  const legadas: Record<string, string> = {
    intellicash: versoes?.intellicash ?? "",
    easycash: versoes?.easycash ?? "",
    easycheckout: versoes?.easycheckout ?? "",
    easypdv: versoes?.easypdv ?? "",
    intellistock: versoes?.intellistock ?? "",
    iwbserver: versoes?.iwbserver ?? "",
  };

  return RELEASE_SYSTEM_CATALOG.map(catalogo => {
    let salvo: ReleaseSystemVersion | undefined;

    for (const chave of aliases(catalogo.chave, catalogo.nome)) {
      salvo = salvos.get(chave);
      if (salvo) break;
    }

    return {
      ...catalogo,
      versao: salvo?.versao ?? legadas[catalogo.chave] ?? "",
    };
  });
}
