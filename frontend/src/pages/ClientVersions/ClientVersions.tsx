import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  MouseEvent as ReactMouseEvent,
} from "react";

import {
  readSheet,
} from "read-excel-file/browser";

import {
  MdCheckCircle,
  MdCloudUpload,
  MdErrorOutline,
  MdRefresh,
  MdSearch,
  MdUnfoldMore,
} from "react-icons/md";

import Layout from "../../components/layout/Layout";

import {
  buscarSessao,
} from "../../services/AuthService";

import {
  importarVersoesClientes,
  listarVersoesClientes,
} from "../../services/ClientVersionService";

import {
  listarAmbientes,
} from "../../services/ReleaseEnvironmentService";

import type {
  ClientVersion,
  ClientVersionImport,
  ClientVersionImportRow,
} from "../../types/clientVersions";

import {
  criarSistemasFixos,
} from "../../types/releaseEnvironment";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

import "./ClientVersions.css";


type Feedback = {
  tipo:
    | "sucesso"
    | "erro";

  texto: string;
};


type CampoOrdenacao =
  | "cliente"
  | "documento"
  | "uf"
  | "parceiro"
  | "produto"
  | "versao"
  | "atualizacao"
  | "licencas";


type DirecaoOrdenacao =
  | "asc"
  | "desc";


type ColunaTabela =
  CampoOrdenacao;


type LargurasColunas = {
  [key in ColunaTabela]:
    number;
};


type StatusAtualizacao =
  | "atualizado"
  | "atencao"
  | "atualizar"
  | "acima"
  | "sem-versao"
  | "sem-referencia";


type ResultadoAtualizacao = {
  status:
    StatusAtualizacao;

  texto:
    string;

  versaoReferencia?:
    string;

  releasesAtras?:
    number;

  detalhe?:
    string;
};


const LARGURAS_INICIAIS:
  LargurasColunas = {

  cliente:
    340,

  documento:
    180,

  uf:
    75,

  parceiro:
    170,

  produto:
    190,

  versao:
    130,

  atualizacao:
    150,

  licencas:
    135,
};


const LARGURAS_MINIMAS:
  LargurasColunas = {

  cliente:
    160,

  documento:
    125,

  uf:
    55,

  parceiro:
    100,

  produto:
    120,

  versao:
    90,

  atualizacao:
    120,

  licencas:
    100,
};


const COLUNAS:
  Array<{
    campo:
      CampoOrdenacao;

    titulo:
      string;
  }> = [

    {
      campo:
        "cliente",

      titulo:
        "Cliente",
    },

    {
      campo:
        "documento",

      titulo:
        "CPF/CNPJ",
    },

    {
      campo:
        "uf",

      titulo:
        "UF",
    },

    {
      campo:
        "parceiro",

      titulo:
        "Parceiro",
    },

    {
      campo:
        "produto",

      titulo:
        "Produto",
    },

    {
      campo:
        "versao",

      titulo:
        "Versão",
    },

    {
      campo:
        "atualizacao",

      titulo:
        "Atualização",
    },

    {
      campo:
        "licencas",

      titulo:
        "Licenças ativas",
    },

  ];


function normalizarTexto(
  valor:
    unknown
) {

  return String(
    valor ??
      ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toLowerCase();

}


function normalizarProduto(
  valor:
    string
) {

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


function textoCelula(
  valor:
    unknown
) {

  return String(
    valor ??
      ""
  ).trim();

}


function documentoCelula(
  valor:
    unknown
) {

  return textoCelula(
    valor
  ).replace(
    /\D/g,
    ""
  );

}


function versaoCelula(
  valor:
    unknown
) {

  const versao =
    textoCelula(
      valor
    );


  if (
    !versao ||
    versao
      .toLowerCase()
      .includes(
        "undefined.undefined"
      )
  ) {

    return "";

  }


  return versao;

}


function licencasCelula(
  valor:
    unknown
) {

  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    ) ||
    numero <
      0
  ) {

    return 0;

  }


  return Math.trunc(
    numero
  );

}


function formatarDocumento(
  documento:
    string
) {

  const numeros =
    documento.replace(
      /\D/g,
      ""
    );


  if (
    numeros.length ===
    14
  ) {

    return numeros.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );

  }


  if (
    numeros.length ===
    11
  ) {

    return numeros.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      "$1.$2.$3-$4"
    );

  }


  return documento;

}


function formatarData(
  data:
    string
) {

  if (
    !data
  ) {

    return "-";

  }


  const normalizada =
    data.includes(
      "T"
    )
      ? data
      : `${
          data.replace(
            " ",
            "T"
          )
        }Z`;


  const valor =
    new Date(
      normalizada
    );


  if (
    Number.isNaN(
      valor.getTime()
    )
  ) {

    return data;

  }


  return valor.toLocaleString(
    "pt-BR"
  );

}


function obterPartesVersao(
  versao:
    string
) {

  return (
    versao
      .match(
        /\d+/g
      )
      ?.map(
        parte =>
          Number(
            parte
          )
      ) ??
    []
  );

}


function compararVersoes(
  versaoA:
    string,

  versaoB:
    string
) {

  const partesA =
    obterPartesVersao(
      versaoA
    );


  const partesB =
    obterPartesVersao(
      versaoB
    );


  const quantidade =
    Math.max(
      partesA.length,
      partesB.length
    );


  for (
    let indice = 0;
    indice <
      quantidade;
    indice += 1
  ) {

    const parteA =
      partesA[
        indice
      ] ??
      0;


    const parteB =
      partesB[
        indice
      ] ??
      0;


    if (
      parteA >
      parteB
    ) {

      return 1;

    }


    if (
      parteA <
      parteB
    ) {

      return -1;

    }

  }


  return 0;

}


function localizarSistemaNaRelease(
  ambiente:
    ReleaseEnvironment,

  produto:
    string
) {

  const produtoNormalizado =
    normalizarProduto(
      produto
    );


  if (
    !produtoNormalizado
  ) {

    return undefined;

  }


  const sistemas =
    criarSistemasFixos(
      ambiente.sistemas,
      ambiente.versoes
    );


  return sistemas.find(
    sistema => {

      const chave =
        normalizarProduto(
          sistema.chave
        );


      const nome =
        normalizarProduto(
          sistema.nome
        );


      if (
        produtoNormalizado ===
          chave ||
        produtoNormalizado ===
          nome
      ) {

        return true;

      }


      /*
       * ISA é o nome usado
       * no relatório de clientes
       * para o IntelliStock.
       */
      if (
        produtoNormalizado ===
          "isa" &&
        chave ===
          "intellistock"
      ) {

        return true;

      }


      return (
        produtoNormalizado.length >=
          4 &&
        (
          produtoNormalizado.includes(
            chave
          ) ||
          produtoNormalizado.includes(
            nome
          ) ||
          chave.includes(
            produtoNormalizado
          ) ||
          nome.includes(
            produtoNormalizado
          )
        )
      );

    }
  );

}


function obterVersaoBaseRelease(
  ambiente:
    ReleaseEnvironment
) {

  const sistemas =
    criarSistemasFixos(
      ambiente.sistemas,
      ambiente.versoes
    );


  const intellicash =
    sistemas.find(
      sistema =>
        normalizarProduto(
          sistema.chave
        ) ===
          "intellicash" ||
        normalizarProduto(
          sistema.nome
        ) ===
          "intellicash"
    );


  return (
    intellicash
      ?.versao
      ?.trim() ||
    ambiente
      .versoes
      .intellicash
      ?.trim() ||
    ambiente
      .nome
      ?.trim() ||
    ""
  );

}


function ordenarReleasesConcluidas(
  ambientes:
    ReleaseEnvironment[]
) {

  return ambientes
    .filter(
      ambiente =>
        ambiente.concluido ===
          true
    )
    .slice()
    .sort(
      (
        ambienteA,
        ambienteB
      ) => {

        const versaoA =
          obterVersaoBaseRelease(
            ambienteA
          );


        const versaoB =
          obterVersaoBaseRelease(
            ambienteB
          );


        const comparacao =
          compararVersoes(
            versaoB,
            versaoA
          );


        if (
          comparacao !==
          0
        ) {

          return comparacao;

        }


        return (
          ambienteB.id -
          ambienteA.id
        );

      }
    );

}


function obterVersaoProdutoNaRelease(
  ambiente:
    ReleaseEnvironment,

  produto:
    string
) {

  return (
    localizarSistemaNaRelease(
      ambiente,
      produto
    )
      ?.versao
      ?.trim() ||
    ""
  );

}


function calcularDistanciaReleases(
  cliente:
    ClientVersion,

  releases:
    ReleaseEnvironment[]
) {

  if (
    releases.length ===
    0
  ) {

    return null;

  }


  const versaoCliente =
    cliente.version.trim();


  if (
    !versaoCliente
  ) {

    return null;

  }


  /*
   * Primeiro procuramos uma release
   * que possua exatamente a versão
   * instalada no cliente.
   *
   * O índice representa diretamente
   * quantas releases ele está atrás.
   */
  for (
    let indice = 0;
    indice <
      releases.length;
    indice += 1
  ) {

    const versaoRelease =
      obterVersaoProdutoNaRelease(
        releases[
          indice
        ],
        cliente.product
      );


    if (
      !versaoRelease
    ) {

      continue;

    }


    if (
      compararVersoes(
        versaoCliente,
        versaoRelease
      ) ===
      0
    ) {

      return indice;

    }

  }


  /*
   * Caso a versão do cliente
   * não exista exatamente no histórico,
   * calculamos onde ela entraria
   * cronologicamente.
   *
   * Exemplo:
   *
   * 21
   * 20.3
   * 20.2
   * 20.1
   * 19.4
   *
   * Uma versão abaixo de 20.1
   * já entra na faixa de 4 releases.
   */
  for (
    let indice = 1;
    indice <
      releases.length;
    indice += 1
  ) {

    const versaoRelease =
      obterVersaoProdutoNaRelease(
        releases[
          indice
        ],
        cliente.product
      );


    if (
      !versaoRelease
    ) {

      continue;

    }


    if (
      compararVersoes(
        versaoCliente,
        versaoRelease
      ) >=
      0
    ) {

      return indice;

    }

  }


  /*
   * Se é ainda mais antiga
   * que todo o histórico conhecido,
   * consideramos que está além
   * da última release cadastrada.
   */
  return releases.length;

}


function verificarAtualizacao(
  cliente:
    ClientVersion,

  releases:
    ReleaseEnvironment[]
): ResultadoAtualizacao {

  if (
    !cliente.version
      ?.trim()
  ) {

    return {
      status:
        "sem-versao",

      texto:
        "Sem versão",

      detalhe:
        "O cliente não possui versão informada.",
    };

  }


  if (
    releases.length ===
    0
  ) {

    return {
      status:
        "sem-referencia",

      texto:
        "Sem referência",

      detalhe:
        "Nenhuma release concluída foi encontrada.",
    };

  }


  const releaseAtual =
    releases[
      0
    ];


  const versaoReferencia =
    obterVersaoProdutoNaRelease(
      releaseAtual,
      cliente.product
    );


  if (
    !versaoReferencia
  ) {

    return {
      status:
        "sem-referencia",

      texto:
        "Sem referência",

      detalhe:
        "O produto não possui uma versão cadastrada na última release concluída.",
    };

  }


  const comparacaoAtual =
    compararVersoes(
      cliente.version,
      versaoReferencia
    );


  if (
    comparacaoAtual >
    0
  ) {

    return {
      status:
        "acima",

      texto:
        "Acima da release",

      versaoReferencia,

      detalhe:
        `Versão atual da release: ${versaoReferencia}`,
    };

  }


  if (
    comparacaoAtual ===
    0
  ) {

    return {
      status:
        "atualizado",

      texto:
        "Atualizado",

      versaoReferencia,

      releasesAtras:
        0,

      detalhe:
        `Versão atual da release: ${versaoReferencia}`,
    };

  }


  const distancia =
    calcularDistanciaReleases(
      cliente,
      releases
    );


  if (
    distancia ===
    null
  ) {

    return {
      status:
        "sem-referencia",

      texto:
        "Sem referência",

      versaoReferencia,
    };

  }


  if (
    distancia >=
    4
  ) {

    return {
      status:
        "atualizar",

      texto:
        "Atualizar",

      versaoReferencia,

      releasesAtras:
        distancia,

      detalhe:
        distancia ===
          1
          ? "1 release atrás da atual"
          : `${distancia} releases atrás da atual`,
    };

  }


  return {
    status:
      "atencao",

    texto:
      "Atenção",

    versaoReferencia,

    releasesAtras:
      distancia,

    detalhe:
      distancia ===
        1
        ? "1 release atrás da atual"
        : `${distancia} releases atrás da atual`,
  };

}


function pesoStatusAtualizacao(
  resultado:
    ResultadoAtualizacao
) {

  switch (
    resultado.status
  ) {

    case "atualizar":

      return 0;


    case "atencao":

      return 1;


    case "sem-versao":

      return 2;


    case "sem-referencia":

      return 3;


    case "atualizado":

      return 4;


    case "acima":

      return 5;

  }

}


function ClientVersions() {

  const inputArquivoRef =
    useRef<HTMLInputElement>(
      null
    );


  const [
    clientes,
    setClientes,
  ] =
    useState<
      ClientVersion[]
    >(
      []
    );


  const [
    releasesConcluidas,
    setReleasesConcluidas,
  ] =
    useState<
      ReleaseEnvironment[]
    >(
      []
    );


  const [
    ultimaImportacao,
    setUltimaImportacao,
  ] =
    useState<
      ClientVersionImport |
      null
    >(
      null
    );


  const [
    carregando,
    setCarregando,
  ] =
    useState(
      true
    );


  const [
    importando,
    setImportando,
  ] =
    useState(
      false
    );


  const [
    podeImportar,
    setPodeImportar,
  ] =
    useState(
      false
    );


  const [
    busca,
    setBusca,
  ] =
    useState(
      ""
    );


  const [
    uf,
    setUf,
  ] =
    useState(
      ""
    );


  const [
    parceiro,
    setParceiro,
  ] =
    useState(
      ""
    );


  const [
    produto,
    setProduto,
  ] =
    useState(
      ""
    );


  const [
    versao,
    setVersao,
  ] =
    useState(
      ""
    );


  const [
    campoOrdenacao,
    setCampoOrdenacao,
  ] =
    useState<
      CampoOrdenacao
    >(
      "cliente"
    );


  const [
    direcaoOrdenacao,
    setDirecaoOrdenacao,
  ] =
    useState<
      DirecaoOrdenacao
    >(
      "asc"
    );


  const [
    largurasColunas,
    setLargurasColunas,
  ] =
    useState<
      LargurasColunas
    >(
      LARGURAS_INICIAIS
    );


  const [
    feedback,
    setFeedback,
  ] =
    useState<
      Feedback |
      null
    >(
      null
    );


  async function carregar() {

    try {

      setCarregando(
        true
      );


      const [
        resultadoClientes,
        ambientes,
      ] =
        await Promise.all(
          [
            listarVersoesClientes(),
            listarAmbientes(),
          ]
        );


      setClientes(
        resultadoClientes.clients
      );


      setUltimaImportacao(
        resultadoClientes.lastImport
      );


      setReleasesConcluidas(
        ordenarReleasesConcluidas(
          ambientes
        )
      );

    } catch (
      erro
    ) {

      setFeedback({
        tipo:
          "erro",

        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível carregar os clientes.",
      });

    } finally {

      setCarregando(
        false
      );

    }

  }


  useEffect(
    () => {

      let ativo =
        true;


      async function iniciar() {

        try {

          const usuario =
            await buscarSessao();


          if (
            ativo
          ) {

            setPodeImportar(
              usuario?.role ===
                "admin" ||
              usuario?.role ===
                "qualidade"
            );

          }

        } catch (
          erro
        ) {

          console.error(
            "Erro ao consultar sessão:",
            erro
          );

        }


        if (
          ativo
        ) {

          await carregar();

        }

      }


      void iniciar();


      return () => {

        ativo =
          false;

      };

    },
    []
  );


  const ufs =
    useMemo(
      () =>
        Array.from(
          new Set(
            clientes
              .map(
                item =>
                  item.state.trim()
              )
              .filter(
                Boolean
              )
          )
        ).sort(),

      [
        clientes,
      ]
    );


  const parceiros =
    useMemo(
      () =>
        Array.from(
          new Set(
            clientes
              .map(
                item =>
                  item.partner.trim()
              )
              .filter(
                Boolean
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        ),

      [
        clientes,
      ]
    );


  const produtos =
    useMemo(
      () =>
        Array.from(
          new Set(
            clientes
              .map(
                item =>
                  item.product.trim()
              )
              .filter(
                Boolean
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        ),

      [
        clientes,
      ]
    );


  const versoes =
    useMemo(
      () =>
        Array.from(
          new Set(
            clientes
              .map(
                item =>
                  item.version.trim()
              )
              .filter(
                Boolean
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            b.localeCompare(
              a,
              undefined,
              {
                numeric:
                  true,
              }
            )
        ),

      [
        clientes,
      ]
    );


  const totalClientes =
    useMemo(
      () => {

        const documentos =
          new Set<string>();


        clientes.forEach(
          item => {

            const documento =
              item.document.replace(
                /\D/g,
                ""
              );


            if (
              documento
            ) {

              documentos.add(
                documento
              );

            }

          }
        );


        return documentos.size;

      },
      [
        clientes,
      ]
    );


  const clientesFiltrados =
    useMemo(
      () => {

        const termo =
          normalizarTexto(
            busca
          );


        const termoNumerico =
          busca.replace(
            /\D/g,
            ""
          );


        const filtrados =
          clientes.filter(
            item => {

              const nomeCliente =
                normalizarTexto(
                  item.fantasyName
                );


              const documentoCliente =
                item.document.replace(
                  /\D/g,
                  ""
                );


              const correspondeBusca =
                !termo ||
                nomeCliente.includes(
                  termo
                ) ||
                (
                  Boolean(
                    termoNumerico
                  ) &&
                  documentoCliente.includes(
                    termoNumerico
                  )
                );


              const correspondeUf =
                !uf ||
                item.state ===
                  uf;


              const correspondeParceiro =
                !parceiro ||
                item.partner ===
                  parceiro;


              const correspondeProduto =
                !produto ||
                item.product ===
                  produto;


              const correspondeVersao =
                !versao ||
                item.version ===
                  versao;


              return (
                correspondeBusca &&
                correspondeUf &&
                correspondeParceiro &&
                correspondeProduto &&
                correspondeVersao
              );

            }
          );


        return filtrados
          .slice()
          .sort(
            (
              a,
              b
            ) => {

              let comparacao =
                0;


              switch (
                campoOrdenacao
              ) {

                case "cliente":

                  comparacao =
                    a.fantasyName
                      .localeCompare(
                        b.fantasyName,
                        "pt-BR",
                        {
                          numeric:
                            true,
                        }
                      );

                  break;


                case "documento":

                  comparacao =
                    a.document
                      .localeCompare(
                        b.document,
                        "pt-BR",
                        {
                          numeric:
                            true,
                        }
                      );

                  break;


                case "uf":

                  comparacao =
                    a.state
                      .localeCompare(
                        b.state,
                        "pt-BR"
                      );

                  break;


                case "parceiro":

                  comparacao =
                    a.partner
                      .localeCompare(
                        b.partner,
                        "pt-BR"
                      );

                  break;


                case "produto":

                  comparacao =
                    a.product
                      .localeCompare(
                        b.product,
                        "pt-BR"
                      );

                  break;


                case "versao":

                  comparacao =
                    compararVersoes(
                      a.version,
                      b.version
                    );

                  break;


                case "atualizacao":

                  comparacao =
                    pesoStatusAtualizacao(
                      verificarAtualizacao(
                        a,
                        releasesConcluidas
                      )
                    ) -
                    pesoStatusAtualizacao(
                      verificarAtualizacao(
                        b,
                        releasesConcluidas
                      )
                    );

                  break;


                case "licencas":

                  comparacao =
                    a.activeLicenses -
                    b.activeLicenses;

                  break;

              }


              return direcaoOrdenacao ===
                "asc"
                ? comparacao
                : -comparacao;

            }
          );

      },
      [
        clientes,
        busca,
        uf,
        parceiro,
        produto,
        versao,
        releasesConcluidas,
        campoOrdenacao,
        direcaoOrdenacao,
      ]
    );


  const totalLicencasFiltradas =
    useMemo(
      () =>
        clientesFiltrados.reduce(
          (
            total,
            item
          ) =>
            total +
            item.activeLicenses,
          0
        ),

      [
        clientesFiltrados,
      ]
    );


  function ordenarPor(
    campo:
      CampoOrdenacao
  ) {

    if (
      campoOrdenacao ===
      campo
    ) {

      setDirecaoOrdenacao(
        atual =>
          atual ===
            "asc"
            ? "desc"
            : "asc"
      );


      return;

    }


    setCampoOrdenacao(
      campo
    );


    setDirecaoOrdenacao(
      "asc"
    );

  }


  function simboloOrdenacao(
    campo:
      CampoOrdenacao
  ) {

    if (
      campoOrdenacao !==
      campo
    ) {

      return (
        <MdUnfoldMore
          size={
            15
          }
        />
      );

    }


    return direcaoOrdenacao ===
      "asc"
      ? "↑"
      : "↓";

  }


  function iniciarRedimensionamento(
    evento:
      ReactMouseEvent<HTMLDivElement>,

    coluna:
      ColunaTabela
  ) {

    evento.preventDefault();

    evento.stopPropagation();


    const xInicial =
      evento.clientX;


    const larguraInicial =
      largurasColunas[
        coluna
      ];


    document.body.classList.add(
      "client-versions-resizing"
    );


    function mover(
      eventoMouse:
        MouseEvent
    ) {

      const diferenca =
        eventoMouse.clientX -
        xInicial;


      const novaLargura =
        Math.max(
          LARGURAS_MINIMAS[
            coluna
          ],
          larguraInicial +
            diferenca
        );


      setLargurasColunas(
        atual => ({
          ...atual,

          [coluna]:
            novaLargura,
        })
      );

    }


    function finalizar() {

      window.removeEventListener(
        "mousemove",
        mover
      );


      window.removeEventListener(
        "mouseup",
        finalizar
      );


      document.body.classList.remove(
        "client-versions-resizing"
      );

    }


    window.addEventListener(
      "mousemove",
      mover
    );


    window.addEventListener(
      "mouseup",
      finalizar
    );

  }


  async function importarArquivo(
    arquivo:
      File
  ) {

    try {

      setImportando(
        true
      );


      setFeedback(
        null
      );


      const linhas =
        await readSheet(
          arquivo
        );


      if (
        linhas.length <
        2
      ) {

        throw new Error(
          "O Excel não possui dados para importar."
        );

      }


      const cabecalho =
        linhas[
          0
        ].map(
          valor =>
            textoCelula(
              valor
            )
        );


      const indiceFantasia =
        cabecalho.indexOf(
          "Fantasia"
        );


      const indiceDocumento =
        cabecalho.indexOf(
          "CPF/CNPJ"
        );


      const indiceProduto =
        cabecalho.indexOf(
          "Produto"
        );


      const indiceUf =
        cabecalho.indexOf(
          "U.F."
        );


      const indiceParceiro =
        cabecalho.indexOf(
          "Parceiro"
        );


      const indiceVersao =
        cabecalho.indexOf(
          "Version"
        );


      const indiceTotal =
        cabecalho.indexOf(
          "Total"
        );


      if (
        indiceFantasia <
          0 ||
        indiceDocumento <
          0 ||
        indiceProduto <
          0
      ) {

        throw new Error(
          "O Excel precisa possuir as colunas Fantasia, CPF/CNPJ e Produto."
        );

      }


      const registros:
        ClientVersionImportRow[] =
        linhas
          .slice(
            1
          )
          .map(
            linha => ({

              fantasyName:
                textoCelula(
                  linha[
                    indiceFantasia
                  ]
                ),

              document:
                documentoCelula(
                  linha[
                    indiceDocumento
                  ]
                ),

              product:
                textoCelula(
                  linha[
                    indiceProduto
                  ]
                ),

              state:
                indiceUf >=
                  0
                  ? textoCelula(
                      linha[
                        indiceUf
                      ]
                    )
                  : "",

              partner:
                indiceParceiro >=
                  0
                  ? textoCelula(
                      linha[
                        indiceParceiro
                      ]
                    )
                  : "",

              version:
                indiceVersao >=
                  0
                  ? versaoCelula(
                      linha[
                        indiceVersao
                      ]
                    )
                  : "",

              activeLicenses:
                indiceTotal >=
                  0
                  ? licencasCelula(
                      linha[
                        indiceTotal
                      ]
                    )
                  : 0,

            })
          )
          .filter(
            item =>
              item.fantasyName
          );


      if (
        registros.length ===
        0
      ) {

        throw new Error(
          "Nenhum cliente válido foi encontrado no Excel."
        );

      }


      const resultado =
        await importarVersoesClientes(
          arquivo.name,
          registros
        );


      setClientes(
        resultado.clients
      );


      setUltimaImportacao(
        resultado.lastImport
      );


      setBusca(
        ""
      );

      setUf(
        ""
      );

      setParceiro(
        ""
      );

      setProduto(
        ""
      );

      setVersao(
        ""
      );


      setCampoOrdenacao(
        "cliente"
      );


      setDirecaoOrdenacao(
        "asc"
      );


      setFeedback({
        tipo:
          "sucesso",

        texto:
          `${resultado.clients.length} registros importados com sucesso.`,
      });

    } catch (
      erro
    ) {

      setFeedback({
        tipo:
          "erro",

        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível importar o Excel.",
      });

    } finally {

      setImportando(
        false
      );


      if (
        inputArquivoRef.current
      ) {

        inputArquivoRef.current.value =
          "";

      }

    }

  }


  return (

    <Layout>

      <div className="client-versions-page">

        <header className="client-versions-header">

          <div>

            <span className="client-versions-eyebrow">
              Clientes
            </span>


            <h1>
              Versões dos Clientes
            </h1>


            <p>
              Consulte versões, produtos e quantidade de licenças ativas a partir do relatório importado.
            </p>

          </div>


          <div className="client-versions-header-actions">

            <button
              type="button"
              className="client-versions-refresh"
              onClick={
                () =>
                  void carregar()
              }
              disabled={
                carregando ||
                importando
              }
            >

              <MdRefresh
                size={
                  19
                }
              />

              Atualizar

            </button>


            {podeImportar && (

              <>

                <input
                  ref={
                    inputArquivoRef
                  }
                  type="file"
                  accept=".xlsx"
                  hidden
                  onChange={
                    evento => {

                      const arquivo =
                        evento
                          .target
                          .files?.[
                            0
                          ];


                      if (
                        arquivo
                      ) {

                        void importarArquivo(
                          arquivo
                        );

                      }

                    }
                  }
                />


                <button
                  type="button"
                  className="client-versions-import"
                  onClick={
                    () =>
                      inputArquivoRef
                        .current
                        ?.click()
                  }
                  disabled={
                    importando
                  }
                >

                  <MdCloudUpload
                    size={
                      19
                    }
                  />


                  {importando
                    ? "Importando..."
                    : "Importar Excel"}

                </button>

              </>

            )}

          </div>

        </header>


        {feedback && (

          <div
            className={
              `client-versions-feedback client-versions-feedback-${feedback.tipo}`
            }
          >

            {feedback.tipo ===
              "sucesso" ? (

              <MdCheckCircle
                size={
                  20
                }
              />

            ) : (

              <MdErrorOutline
                size={
                  20
                }
              />

            )}


            <span>
              {feedback.texto}
            </span>

          </div>

        )}


        <section className="client-versions-summary">

          <div>

            <span>
              Clientes
            </span>


            <strong>
              {totalClientes}
            </strong>

          </div>


          <div>

            <span>
              Licenças ativas
            </span>


            <strong>

              {ultimaImportacao
                ?.totalActiveLicenses ??
                0}

            </strong>

          </div>


          <div>

            <span>
              Última importação
            </span>


            <strong className="client-versions-summary-date">

              {ultimaImportacao
                ? formatarData(
                    ultimaImportacao.importedAt
                  )
                : "Nenhuma"}

            </strong>

          </div>

        </section>


        {ultimaImportacao && (

          <div className="client-versions-import-info">

            <span>

              Arquivo:
              {" "}

              <strong>
                {ultimaImportacao.fileName}
              </strong>

            </span>


            <span>

              {ultimaImportacao.totalRows}
              {" "}
              registros importados

            </span>

          </div>

        )}


        <section className="client-versions-filters">

          <label className="client-versions-search">

            <MdSearch
              size={
                19
              }
            />


            <input
              type="search"
              value={
                busca
              }
              placeholder="Buscar cliente ou CPF/CNPJ..."
              autoComplete="off"
              onChange={
                evento =>
                  setBusca(
                    evento
                      .currentTarget
                      .value
                  )
              }
            />

          </label>


          <select
            value={
              uf
            }
            onChange={
              evento =>
                setUf(
                  evento
                    .target
                    .value
                )
            }
          >

            <option value="">
              Todas as UFs
            </option>


            {ufs.map(
              item => (

                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>

              )
            )}

          </select>


          <select
            value={
              parceiro
            }
            onChange={
              evento =>
                setParceiro(
                  evento
                    .target
                    .value
                )
            }
          >

            <option value="">
              Todos os parceiros
            </option>


            {parceiros.map(
              item => (

                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>

              )
            )}

          </select>


          <select
            value={
              produto
            }
            onChange={
              evento =>
                setProduto(
                  evento
                    .target
                    .value
                )
            }
          >

            <option value="">
              Todos os produtos
            </option>


            {produtos.map(
              item => (

                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>

              )
            )}

          </select>


          <select
            value={
              versao
            }
            onChange={
              evento =>
                setVersao(
                  evento
                    .target
                    .value
                )
            }
          >

            <option value="">
              Todas as versões
            </option>


            {versoes.map(
              item => (

                <option
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </option>

              )
            )}

          </select>

        </section>


        <div className="client-versions-filter-summary">

          <span>

            {clientesFiltrados.length}
            {" "}
            registros encontrados

          </span>


          <strong>

            {totalLicencasFiltradas}
            {" "}
            licenças ativas nos filtros atuais

          </strong>

        </div>


        <section className="client-versions-card">

          {carregando ? (

            <div className="client-versions-empty">
              Carregando clientes...
            </div>

          ) : clientesFiltrados.length ===
            0 ? (

            <div className="client-versions-empty">

              {clientes.length ===
                0
                ? "Nenhum Excel foi importado ainda."
                : "Nenhum cliente encontrado com esses filtros."}

            </div>

          ) : (

            <div className="client-versions-table-wrapper">

              <table className="client-versions-table">

                <colgroup>

                  {(
                    Object.keys(
                      largurasColunas
                    ) as ColunaTabela[]
                  ).map(
                    coluna => (

                      <col
                        key={
                          coluna
                        }
                        style={{
                          width:
                            `${largurasColunas[coluna]}px`,
                        }}
                      />

                    )
                  )}

                </colgroup>


                <thead>

                  <tr>

                    {COLUNAS.map(
                      ({
                        campo,
                        titulo,
                      }) => (

                        <th
                          key={
                            campo
                          }
                          style={{
                            width:
                              `${largurasColunas[campo]}px`,
                          }}
                        >

                          <button
                            type="button"
                            className="client-versions-sort-button"
                            onClick={
                              () =>
                                ordenarPor(
                                  campo
                                )
                            }
                          >

                            {titulo}


                            <span>

                              {simboloOrdenacao(
                                campo
                              )}

                            </span>

                          </button>


                          <div
                            className="client-versions-resizer"
                            role="separator"
                            aria-label={
                              `Redimensionar coluna ${titulo}`
                            }
                            onMouseDown={
                              evento =>
                                iniciarRedimensionamento(
                                  evento,
                                  campo
                                )
                            }
                          />

                        </th>

                      )
                    )}

                  </tr>

                </thead>


                <tbody>

                  {clientesFiltrados.map(
                    cliente => {

                      const atualizacao =
                        verificarAtualizacao(
                          cliente,
                          releasesConcluidas
                        );


                      return (

                        <tr
                          key={
                            cliente.id
                          }
                        >

                          <td>

                            <span className="client-versions-name">
                              {cliente.fantasyName}
                            </span>

                          </td>


                          <td>

                            {formatarDocumento(
                              cliente.document
                            )}

                          </td>


                          <td>

                            {cliente.state ||
                              "-"}

                          </td>


                          <td>

                            {cliente.partner ||
                              "-"}

                          </td>


                          <td>

                            <span className="client-versions-product">

                              {cliente.product ||
                                "Não informado"}

                            </span>

                          </td>


                          <td>

                            {cliente.version ? (

                              <span className="client-versions-version">
                                {cliente.version}
                              </span>

                            ) : (

                              <span className="client-versions-version-empty">
                                Não informado
                              </span>

                            )}

                          </td>


                          <td>

                            <span
                              className={
                                `client-versions-update-status client-versions-update-status-${atualizacao.status}`
                              }
                              title={
                                atualizacao.detalhe
                              }
                            >

                              <span
                                className="client-versions-update-dot"
                                aria-hidden="true"
                              />


                              {atualizacao.texto}

                            </span>

                          </td>


                          <td className="client-versions-licenses">

                            {cliente.activeLicenses}

                          </td>

                        </tr>

                      );

                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </div>

    </Layout>

  );

}


export default ClientVersions;