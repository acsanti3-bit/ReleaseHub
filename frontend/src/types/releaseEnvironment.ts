export interface ReleaseSystemVersion {
  chave: string;
  nome: string;
  versao: string;
  ordem: number;
}

export interface ReleaseEnvironment {
  id: number;
  nome: string;

  /*
    Estrutura antiga mantida
    para compatibilidade.
  */
  versoes: {
    intellicash: string;
    easycash: string;
    easycheckout: string;
    easypdv: string;
    intellistock: string;
    iwbserver: string;
  };

  /*
    Lista completa dos sistemas
    pertencentes ao ambiente.
  */
  sistemas?: ReleaseSystemVersion[];
}


/*
  Catálogo global.

  Estes sistemas estarão presentes
  em todos os ambientes da release.
*/
export const RELEASE_SYSTEM_CATALOG:
  Array<Omit<ReleaseSystemVersion, "versao">> = [
    {
      chave: "intellicash",
      nome: "Intellicash",
      ordem: 1,
    },
    {
      chave: "easycash",
      nome: "EasyCash",
      ordem: 2,
    },
    {
      chave: "easycheckout",
      nome: "EasyCheckout",
      ordem: 3,
    },
    {
      chave: "easypdv",
      nome: "EasyPDV",
      ordem: 4,
    },
    {
      chave: "intellistock",
      nome: "IntelliStock",
      ordem: 5,
    },
    {
      chave: "iwbserver",
      nome: "IWB Server",
      ordem: 6,
    },
    {
      chave: "enterpriseserver",
      nome: "Enterprise Server",
      ordem: 7,
    },
    {
      chave: "nfedestinadas",
      nome: "NFeDestinadas",
      ordem: 8,
    },
    {
      chave: "intellifood",
      nome: "IntelliFood",
      ordem: 9,
    },
    {
      chave: "pcp",
      nome: "PCP",
      ordem: 10,
    },
    {
      chave: "gerenciadordepromocoes",
      nome: "Gerenciador de promoções",
      ordem: 11,
    },
    {
      chave: "sincronizadormatrizxfilial",
      nome: "Sincronizador Matriz X Filial",
      ordem: 12,
    },
    {
      chave: "sincronizadorlabfiscal",
      nome: "Sincronizador Lab Fiscal",
      ordem: 13,
    },
    {
      chave: "sincronizadorecommerce",
      nome: "Sincronizador E-Commerce",
      ordem: 14,
    },
    {
      chave: "bi",
      nome: "BI",
      ordem: 15,
    },
  ];


function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


/*
  Combina o catálogo fixo com as
  versões já salvas no ambiente.

  Sistemas ausentes entram com
  a versão vazia.
*/
export function criarSistemasFixos(
  sistemas: ReleaseSystemVersion[] = [],
  versoes?: ReleaseEnvironment["versoes"]
): ReleaseSystemVersion[] {
  const sistemasSalvos =
    new Map<string, ReleaseSystemVersion>();

  for (const sistema of sistemas) {
    sistemasSalvos.set(
      normalizarTexto(sistema.chave),
      sistema
    );

    sistemasSalvos.set(
      normalizarTexto(sistema.nome),
      sistema
    );
  }

  const versoesLegadas: Record<string, string> = {
    intellicash:
      versoes?.intellicash ?? "",
    easycash:
      versoes?.easycash ?? "",
    easycheckout:
      versoes?.easycheckout ?? "",
    easypdv:
      versoes?.easypdv ?? "",
    intellistock:
      versoes?.intellistock ?? "",
    iwbserver:
      versoes?.iwbserver ?? "",
  };

  return RELEASE_SYSTEM_CATALOG.map(
    sistemaCatalogo => {
      const sistemaSalvo =
        sistemasSalvos.get(
          normalizarTexto(
            sistemaCatalogo.chave
          )
        ) ??
        sistemasSalvos.get(
          normalizarTexto(
            sistemaCatalogo.nome
          )
        );

      return {
        ...sistemaCatalogo,
        versao:
          sistemaSalvo?.versao ??
          versoesLegadas[
            sistemaCatalogo.chave
          ] ??
          "",
      };
    }
  );
}