export interface ReleaseSystemVersion {
  chave: string;
  nome: string;
  versao: string;
  executavel?: string;
  ordem: number;

  /*
    Opcional para manter compatibilidade
    com ambientes e mocks antigos.

    Quando não informado, o sistema
    será exibido na TV por padrão.
  */
  mostrarNaTv?: boolean;
}


export interface ReleaseEnvironment {
  id: number;
  nome: string;
  prazo?: string;

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

  sistemas?: ReleaseSystemVersion[];
}


export const RELEASE_SYSTEM_CATALOG:
  Array<
    Omit<
      ReleaseSystemVersion,
      "versao" | "mostrarNaTv"
    >
  > = [

    {
      chave:
        "intellicash",

      nome:
        "IntelliCash",

      ordem:
        1,
    },

    {
      chave:
        "easycash",

      nome:
        "EasyCash",

      ordem:
        2,
    },

    {
      chave:
        "easycheckout",

      nome:
        "EasyCheckOut",

      ordem:
        3,
    },

    {
      chave:
        "easypdv",

      nome:
        "EasyPDV",

      ordem:
        4,
    },

    {
      chave:
        "intellistock",

      nome:
        "IntelliStock",

      ordem:
        5,
    },

    {
      chave:
        "iwbserver",

      nome:
        "IWB Server",

      ordem:
        6,
    },

    {
      chave:
        "enterpriseserver",

      nome:
        "Enterprise Server",

      ordem:
        7,
    },

    {
      chave:
        "nfedestinadas",

      nome:
        "NF-e Destinadas",

      ordem:
        8,
    },

    {
      chave:
        "intellifood",

      nome:
        "IntelliFood",

      ordem:
        9,
    },

    {
      chave:
        "pcp",

      nome:
        "PCP",

      ordem:
        10,
    },

    {
      chave:
        "gerenciadordepromocoes",

      nome:
        "Gerenciador de Promoções",

      ordem:
        11,
    },

    {
      chave:
        "sincmatrizxfilial",

      nome:
        "Sinc. Matriz X Filial",

      ordem:
        12,
    },

    {
      chave:
        "sinclabfiscal",

      nome:
        "Sinc. Lab. Fiscal",

      ordem:
        13,
    },

    {
      chave:
        "sincecommerce",

      nome:
        "Sinc. E-Commerce",

      ordem:
        14,
    },

    {
      chave:
        "pesocerto",

      nome:
        "Peso Certo",

      ordem:
        15,
    },

    {
      chave:
        "notify",

      nome:
        "Notify",

      ordem:
        16,
    },

    {
      chave:
        "vendaassistida",

      nome:
        "Venda Assistida",

      ordem:
        17,
    },

    {
      chave:
        "cotacao",

      nome:
        "Cotação",

      ordem:
        18,
    },

    {
      chave:
        "bi",

      nome:
        "BI",

      ordem:
        19,
    },

  ];


function normalizarTexto(
  valor: string
): string {

  return valor
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );

}


function aliases(
  chave: string,
  nome: string
): string[] {

  const valores =
    new Set<string>();


  const adicionar =
    (
      valor: string
    ) => {

      const normalizado =
        normalizarTexto(
          valor
        );


      if (
        normalizado
      ) {

        valores.add(
          normalizado
        );

      }

    };


  adicionar(
    chave
  );

  adicionar(
    nome
  );


  const chaveAtual =
    normalizarTexto(
      chave
    );


  if (
    chaveAtual ===
      "sincmatrizxfilial"
  ) {

    adicionar(
      "sincronizadormatrizxfilial"
    );

  }


  if (
    chaveAtual ===
      "sinclabfiscal"
  ) {

    adicionar(
      "sincronizadorlabfiscal"
    );

  }


  if (
    chaveAtual ===
      "sincecommerce"
  ) {

    adicionar(
      "sincronizadorecommerce"
    );

  }


  return [
    ...valores,
  ];

}


export function criarSistemasFixos(
  sistemas:
    ReleaseSystemVersion[] = [],

  versoes?:
    ReleaseEnvironment["versoes"]
): ReleaseSystemVersion[] {

  const sistemasSalvos =
    new Map<
      string,
      ReleaseSystemVersion
    >();


  for (
    const sistema of sistemas
  ) {

    for (
      const chave of
      aliases(
        sistema.chave,
        sistema.nome
      )
    ) {

      sistemasSalvos.set(
        chave,
        sistema
      );

    }

  }


  const versoesLegadas:
    Record<string, string> = {

      intellicash:
        versoes?.intellicash ??
        "",

      easycash:
        versoes?.easycash ??
        "",

      easycheckout:
        versoes?.easycheckout ??
        "",

      easypdv:
        versoes?.easypdv ??
        "",

      intellistock:
        versoes?.intellistock ??
        "",

      iwbserver:
        versoes?.iwbserver ??
        "",

    };


  return RELEASE_SYSTEM_CATALOG.map(
    sistemaCatalogo => {

      let sistemaSalvo:
        ReleaseSystemVersion |
        undefined;


      for (
        const chave of
        aliases(
          sistemaCatalogo.chave,
          sistemaCatalogo.nome
        )
      ) {

        sistemaSalvo =
          sistemasSalvos.get(
            chave
          );


        if (
          sistemaSalvo
        ) {

          break;

        }

      }


      return {

        ...sistemaCatalogo,

        versao:
          sistemaSalvo?.versao ??
          versoesLegadas[
            sistemaCatalogo.chave
          ] ??
          "",

        executavel:
          sistemaSalvo
            ?.executavel ??
          "",

        mostrarNaTv:
          sistemaSalvo
            ?.mostrarNaTv ??
          true,

      };

    }
  );

}