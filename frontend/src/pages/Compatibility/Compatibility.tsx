import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  MdCheckCircle,
  MdClose,
  MdDeleteOutline,
  MdErrorOutline,
  MdInfoOutline,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdLink,
  MdMenuBook,
  MdRefresh,
  MdSave,
  MdSettings,
  MdTune,
} from "react-icons/md";

import Layout from "../../components/layout/Layout";

import {
  buscarSessao,
} from "../../services/AuthService";

import {
  adicionarVersaoManual,
  buscarCompatibilidade,
  salvarCompatibilidade,
} from "../../services/CompatibilityService";

import {
  buscarCatalogoSistemasCompatibilidade,
  salvarCatalogoSistemasCompatibilidade,
} from "../../services/CompatibilitySystemService";

import {
  listarAmbientes,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";

import {
  listarProjetosRedmineCatalogo,
  listarVersoesProjetoRedmine,
} from "../../services/RedmineCatalogService";

import type {
  CompatibilityItem,
  CompatibilitySystemDefinition,
  EnvironmentCompatibility,
  RedmineProjectOption,
  RedmineVersionOption,
} from "../../types/compatibility";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

import "./Compatibility.css";


type Feedback = {
  tipo: "sucesso" | "erro";
  texto: string;
};


type ReadmeAplicacao = {
  nome: string;
  versao: string;
  caminho: string;
};


type ReadmeInterpretado = {
  titulo: string;
  avisos: string[];
  aplicacoes: ReadmeAplicacao[];
  outros: string[];
};


function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


function copiarItens(
  itens: CompatibilityItem[]
) {
  return itens.map(
    item => ({
      ...item,
      relatedTo: [
        ...item.relatedTo,
      ],
    })
  );
}


function copiarDefinicoes(
  itens: CompatibilitySystemDefinition[]
) {
  return itens.map(
    item => ({
      ...item,
      relatedTo: [
        ...item.relatedTo,
      ],
    })
  );
}


function limparLinhaReadme(
  linha: string
) {
  return linha
    .replace(/^\*+\s*/, "")
    .replace(/\s*\*+$/, "")
    .replace(/^\-\s*/, "")
    .trim();
}


function interpretarReadme(
  conteudo: string
): ReadmeInterpretado {
  const linhas =
    conteudo
      .split(/\r?\n/)
      .map(
        linha =>
          linha.trim()
      )
      .filter(Boolean);

  let titulo = "";

  const avisos: string[] =
    [];

  const aplicacoes: ReadmeAplicacao[] =
    [];

  const outros: string[] =
    [];


  for (
    const linhaOriginal of
    linhas
  ) {
    const linha =
      limparLinhaReadme(
        linhaOriginal
      );

    if (!linha) {
      continue;
    }


    if (
      !titulo &&
      /^vers[aã]o\s+/i.test(
        linha
      )
    ) {
      titulo =
        linha;

      continue;
    }


    if (
      /obrigat[oó]rio/i.test(
        linha
      )
    ) {
      avisos.push(
        linha
      );

      continue;
    }


    const separador =
      linha.indexOf(":");


    if (
      separador > 0
    ) {
      const nome =
        linha
          .slice(
            0,
            separador
          )
          .trim();

      const restante =
        linha
          .slice(
            separador + 1
          )
          .trim();


      let versao = "";
      let caminho = "";


      const indiceCaminho =
        restante.indexOf(
          " - /"
        );


      if (
        indiceCaminho >= 0
      ) {
        versao =
          restante
            .slice(
              0,
              indiceCaminho
            )
            .trim();

        caminho =
          restante
            .slice(
              indiceCaminho + 3
            )
            .trim();

        caminho =
          `/${caminho}`;

      } else if (
        restante.startsWith(
          "/"
        )
      ) {
        caminho =
          restante;

      } else {
        versao =
          restante;
      }


      aplicacoes.push({
        nome,
        versao,
        caminho,
      });

      continue;
    }


    outros.push(
      linha
    );
  }


  return {
    titulo,
    avisos,
    aplicacoes,
    outros,
  };
}


function Compatibility() {
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();


  const [
    ambientes,
    setAmbientes,
  ] =
    useState<
      ReleaseEnvironment[]
    >([]);


  const [
    environmentId,
    setEnvironmentId,
  ] =
    useState<number | null>(
      null
    );


  const [
    compatibilidade,
    setCompatibilidade,
  ] =
    useState<
      EnvironmentCompatibility |
      null
    >(null);


  const [
    catalogo,
    setCatalogo,
  ] =
    useState<
      CompatibilitySystemDefinition[]
    >([]);


  const [
    carregando,
    setCarregando,
  ] =
    useState(true);


  const [
    carregandoCompatibilidade,
    setCarregandoCompatibilidade,
  ] =
    useState(false);


  const [
    podeEditar,
    setPodeEditar,
  ] =
    useState(false);


  const [
    configurandoGeral,
    setConfigurandoGeral,
  ] =
    useState(false);


  const [
    editandoRelease,
    setEditandoRelease,
  ] =
    useState(false);


  const [
    salvando,
    setSalvando,
  ] =
    useState(false);


  const [
    catalogoEdicao,
    setCatalogoEdicao,
  ] =
    useState<
      CompatibilitySystemDefinition[]
    >([]);


  const [
    itensReleaseEdicao,
    setItensReleaseEdicao,
  ] =
    useState<
      CompatibilityItem[]
    >([]);


  const [
    projetosRedmine,
    setProjetosRedmine,
  ] =
    useState<
      RedmineProjectOption[]
    >([]);


  const [
    carregandoRedmine,
    setCarregandoRedmine,
  ] =
    useState(false);


  const [
    erroRedmine,
    setErroRedmine,
  ] =
    useState("");


  const [
    versoesRedmine,
    setVersoesRedmine,
  ] =
    useState<
      Record<
        number,
        RedmineVersionOption[]
      >
    >({});


  const [
    carregandoVersoes,
    setCarregandoVersoes,
  ] =
    useState<
      Record<
        number,
        boolean
      >
    >({});


  const [
    versoesManuais,
    setVersoesManuais,
  ] =
    useState<
      Record<
        string,
        string[]
      >
    >({});


  const [
    adicionandoVersaoPara,
    setAdicionandoVersaoPara,
  ] =
    useState<
      string |
      null
    >(null);


  const [
    novaVersao,
    setNovaVersao,
  ] =
    useState("");


  const [
    feedback,
    setFeedback,
  ] =
    useState<
      Feedback |
      null
    >(null);


  const [
    readmeAberto,
    setReadmeAberto,
  ] =
    useState(false);


  const [
    readmeEdicao,
    setReadmeEdicao,
  ] =
    useState("");


  const ambienteSelecionado =
    useMemo(
      () =>
        ambientes.find(
          ambiente =>
            ambiente.id ===
            environmentId
        ) ?? null,

      [
        ambientes,
        environmentId,
      ]
    );


  const wikiIntellicashUrl =
    ambienteSelecionado
      ?.versoes
      .intellicash
      ? `https://wiki.iws.com.br/doku.php?id=intellicash:atualizacoes:${encodeURIComponent(
          ambienteSelecionado
            .versoes
            .intellicash
        )}`
      : "https://wiki.iws.com.br/doku.php?id=intellicash:atualizacoes";


  const itensVisiveis =
    useMemo(
      () =>
        (
          compatibilidade
            ?.items ??
          []
        )
          .filter(
            item =>
              item.visible
          )
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              a.order -
              b.order
          ),

      [
        compatibilidade,
      ]
    );


  const readmeInterpretado =
    useMemo(
      () =>
        interpretarReadme(
          compatibilidade
            ?.readme ??
          ""
        ),

      [
        compatibilidade
          ?.readme,
      ]
    );


  useEffect(
    () => {
      let ativo =
        true;


      async function carregarPagina() {
        try {
          setCarregando(
            true
          );


          const [
            lista,
            usuario,
            dadosCatalogo,
          ] =
            await Promise.all([
              listarAmbientes(),
              buscarSessao(),
              buscarCatalogoSistemasCompatibilidade(),
            ]);


          if (
            !ativo
          ) {
            return;
          }


          const ordenados =
            ordenarAmbientesPorVersao(
              lista
            );


          setAmbientes(
            ordenados
          );


          setCatalogo(
            dadosCatalogo
              .items ??
            []
          );


          setPodeEditar(
            usuario?.role ===
              "admin" ||
            usuario?.role ===
              "qualidade"
          );


          const idUrl =
            Number(
              searchParams.get(
                "environment"
              )
            );


          const existeUrl =
            ordenados.some(
              ambiente =>
                ambiente.id ===
                idUrl
            );


          const ambienteInicial =
            existeUrl
              ? idUrl
              : (
                  ordenados.find(
                    ambiente =>
                      !ambiente
                        .concluido
                  )?.id ??
                  ordenados[0]
                    ?.id ??
                  null
                );


          setEnvironmentId(
            ambienteInicial
          );

        } catch (
          erro
        ) {
          console.error(
            "Erro ao carregar página de compatibilidade:",
            erro
          );


          if (
            ativo
          ) {
            setFeedback(
              {
                tipo:
                  "erro",

                texto:
                  erro instanceof
                    Error
                    ? erro.message
                    : "Não foi possível carregar a compatibilidade.",
              }
            );
          }

        } finally {

          if (
            ativo
          ) {
            setCarregando(
              false
            );
          }

        }
      }


      void carregarPagina();


      return () => {
        ativo =
          false;
      };

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    []
  );


  useEffect(
    () => {

      setReadmeAberto(
        false
      );


      if (
        !environmentId
      ) {
        setCompatibilidade(
          null
        );

        return;
      }


      let ativo =
        true;


      async function carregarCompatibilidade() {
        try {

          setCarregandoCompatibilidade(
            true
          );


          const dados =
            await buscarCompatibilidade(
              environmentId as number
            );


          if (
            !ativo
          ) {
            return;
          }


          setCompatibilidade(
            dados
          );


          setVersoesManuais(
            dados.manualVersions ??
            {}
          );

        } catch (
          erro
        ) {

          console.error(
            "Erro ao carregar compatibilidade:",
            erro
          );


          if (
            ativo
          ) {
            setCompatibilidade(
              null
            );


            setFeedback(
              {
                tipo:
                  "erro",

                texto:
                  erro instanceof
                    Error
                    ? erro.message
                    : "Não foi possível carregar a compatibilidade.",
              }
            );
          }

        } finally {

          if (
            ativo
          ) {
            setCarregandoCompatibilidade(
              false
            );
          }

        }
      }


      void carregarCompatibilidade();


      setSearchParams(
        {
          environment:
            String(
              environmentId
            ),
        },
        {
          replace:
            true,
        }
      );


      return () => {
        ativo =
          false;
      };

    },
    [
      environmentId,
      setSearchParams,
    ]
  );


  useEffect(
    () => {

      if (
        !feedback
      ) {
        return;
      }


      const timeout =
        window.setTimeout(
          () =>
            setFeedback(
              null
            ),
          6000
        );


      return () =>
        window.clearTimeout(
          timeout
        );

    },
    [
      feedback,
    ]
  );


  function localizarProjetoAutomatico(
    item:
      CompatibilitySystemDefinition,
    projetos:
      RedmineProjectOption[]
  ) {
    if (
      item.redmineProjectId
    ) {
      return null;
    }


    const candidatos =
      [
        item.originalName ??
          "",
        item.displayName,
      ]
        .map(
          normalizarTexto
        )
        .filter(
          Boolean
        );


    const encontrados =
      projetos.filter(
        projeto =>
          candidatos.includes(
            normalizarTexto(
              projeto.name
            )
          )
      );


    return encontrados
      .length ===
      1
        ? encontrados[0]
        : null;
  }


  async function carregarProjetosRedmine() {
    if (
      projetosRedmine.length >
        0 ||
      carregandoRedmine
    ) {
      return projetosRedmine;
    }


    try {

      setCarregandoRedmine(
        true
      );

      setErroRedmine(
        ""
      );


      const projetos =
        await listarProjetosRedmineCatalogo();


      setProjetosRedmine(
        projetos
      );


      return projetos;

    } catch (
      erro
    ) {

      const mensagem =
        erro instanceof
          Error
          ? erro.message
          : "Não foi possível consultar os projetos do Redmine.";


      setErroRedmine(
        mensagem
      );


      return [];

    } finally {

      setCarregandoRedmine(
        false
      );

    }
  }


  async function garantirVersoesProjeto(
    projectId?:
      number |
      null
  ) {
    if (
      !projectId
    ) {
      return;
    }


    if (
      versoesRedmine[
        projectId
      ] ||
      carregandoVersoes[
        projectId
      ]
    ) {
      return;
    }


    setCarregandoVersoes(
      atual => ({
        ...atual,
        [projectId]:
          true,
      })
    );


    try {

      const versoes =
        await listarVersoesProjetoRedmine(
          projectId
        );


      setVersoesRedmine(
        atual => ({
          ...atual,
          [projectId]:
            versoes,
        })
      );

    } catch (
      erro
    ) {

      console.error(
        "Erro ao consultar versões do Redmine:",
        erro
      );


      setFeedback(
        {
          tipo:
            "erro",

          texto:
            erro instanceof
              Error
              ? erro.message
              : "Não foi possível consultar as versões do Redmine.",
        }
      );

    } finally {

      setCarregandoVersoes(
        atual => ({
          ...atual,
          [projectId]:
            false,
        })
      );

    }
  }


  async function recarregarCompatibilidadeAtual() {
    if (
      !environmentId
    ) {
      return;
    }


    const dados =
      await buscarCompatibilidade(
        environmentId
      );


    setCompatibilidade(
      dados
    );


    setVersoesManuais(
      dados.manualVersions ??
      {}
    );
  }


  async function atualizarAtual() {
    try {

      setCarregandoCompatibilidade(
        true
      );


      const promessas:
        Promise<unknown>[] =
        [
          buscarCatalogoSistemasCompatibilidade()
            .then(
              dados => {

                setCatalogo(
                  dados.items ??
                  []
                );

              }
            ),
        ];


      if (
        environmentId
      ) {
        promessas.push(
          recarregarCompatibilidadeAtual()
        );
      }


      await Promise.all(
        promessas
      );

    } catch (
      erro
    ) {

      setFeedback(
        {
          tipo:
            "erro",

          texto:
            erro instanceof
              Error
              ? erro.message
              : "Não foi possível atualizar a compatibilidade.",
        }
      );

    } finally {

      setCarregandoCompatibilidade(
        false
      );

    }
  }


  async function abrirConfiguracaoGeral() {
    if (
      !podeEditar
    ) {
      return;
    }


    const projetos =
      await carregarProjetosRedmine();


    const itens =
      copiarDefinicoes(
        catalogo
      )
        .map(
          item => {

            const projeto =
              localizarProjetoAutomatico(
                item,
                projetos
              );


            if (
              !projeto
            ) {
              return item;
            }


            return {
              ...item,

              redmineProjectId:
                projeto.id,

              redmineProjectName:
                projeto.name,
            };
          }
        );


    setCatalogoEdicao(
      itens
    );


    setConfigurandoGeral(
      true
    );
  }


  function atualizarCatalogoItem(
    key:
      string,

    alteracoes:
      Partial<
        CompatibilitySystemDefinition
      >
  ) {
    setCatalogoEdicao(
      atual =>
        atual.map(
          item =>
            item.key ===
            key
              ? {
                  ...item,
                  ...alteracoes,
                }
              : item
        )
    );
  }


  function alterarProjetoGlobal(
    item:
      CompatibilitySystemDefinition,

    projectIdTexto:
      string
  ) {
    const projectId =
      Number(
        projectIdTexto
      );


    if (
      !projectId
    ) {
      atualizarCatalogoItem(
        item.key,
        {
          redmineProjectId:
            null,

          redmineProjectName:
            "",
        }
      );

      return;
    }


    const projeto =
      projetosRedmine.find(
        atual =>
          atual.id ===
          projectId
      );


    atualizarCatalogoItem(
      item.key,
      {
        redmineProjectId:
          projectId,

        redmineProjectName:
          projeto?.name ??
          "",
      }
    );
  }


  function moverCatalogoItem(
    itemKey:
      string,

    direcao:
      "up" |
      "down"
  ) {
    setCatalogoEdicao(
      atual => {

        const ordenados =
          atual
            .slice()
            .sort(
              (
                a,
                b
              ) =>
                a.order -
                b.order
            );


        const indiceAtual =
          ordenados.findIndex(
            item =>
              item.key ===
              itemKey
          );


        if (
          indiceAtual <
          0
        ) {
          return atual;
        }


        const indiceDestino =
          direcao ===
          "up"
            ? indiceAtual -
              1
            : indiceAtual +
              1;


        if (
          indiceDestino <
            0 ||
          indiceDestino >=
            ordenados.length
        ) {
          return atual;
        }


        [
          ordenados[
            indiceAtual
          ],
          ordenados[
            indiceDestino
          ],
        ] = [
          ordenados[
            indiceDestino
          ],
          ordenados[
            indiceAtual
          ],
        ];


        return ordenados.map(
          (
            item,
            indice
          ) => ({
            ...item,
            order:
              indice +
              1,
          })
        );
      }
    );
  }


  function removerSistemaGlobal(
    item:
      CompatibilitySystemDefinition
  ) {
    if (
      item.source ===
      "environment"
    ) {
      return;
    }


    setCatalogoEdicao(
      atual =>
        atual
          .filter(
            registro =>
              registro.key !==
              item.key
          )
          .map(
            registro => ({
              ...registro,

              relatedTo:
                registro
                  .relatedTo
                  .filter(
                    key =>
                      key !==
                      item.key
                  ),
            })
          )
    );
  }


  async function salvarConfiguracaoGeral() {
    if (
      salvando
    ) {
      return;
    }


    const nomeVazio =
      catalogoEdicao.find(
        item =>
          !item
            .displayName
            .trim()
      );


    if (
      nomeVazio
    ) {
      setFeedback(
        {
          tipo:
            "erro",

          texto:
            "Todos os sistemas precisam ter um nome de exibição.",
        }
      );

      return;
    }


    try {

      setSalvando(
        true
      );


      const salvo =
        await salvarCatalogoSistemasCompatibilidade(
          catalogoEdicao
        );


      setCatalogo(
        salvo.items ??
        []
      );


      setConfigurandoGeral(
        false
      );


      if (
        environmentId
      ) {
        await recarregarCompatibilidadeAtual();
      }


      setFeedback(
        {
          tipo:
            "sucesso",

          texto:
            "Configuração geral dos sistemas salva.",
        }
      );

    } catch (
      erro
    ) {

      setFeedback(
        {
          tipo:
            "erro",

          texto:
            erro instanceof
              Error
              ? erro.message
              : "Não foi possível salvar a configuração geral.",
        }
      );

    } finally {

      setSalvando(
        false
      );

    }
  }


  function abrirEdicaoRelease() {
    if (
      !podeEditar ||
      !compatibilidade
    ) {
      return;
    }


    setItensReleaseEdicao(
      copiarItens(
        compatibilidade.items
      )
    );


    setReadmeEdicao(
      compatibilidade.readme ??
      ""
    );


    setVersoesManuais(
      compatibilidade.manualVersions ??
      {}
    );


    setAdicionandoVersaoPara(
      null
    );


    setNovaVersao(
      ""
    );


    setEditandoRelease(
      true
    );
  }


  function atualizarItemRelease(
    key:
      string,

    alteracoes:
      Partial<
        CompatibilityItem
      >
  ) {
    setItensReleaseEdicao(
      atual =>
        atual.map(
          item =>
            item.key ===
            key
              ? {
                  ...item,
                  ...alteracoes,
                }
              : item
        )
    );
  }


  function opcoesVersao(
    item:
      CompatibilityItem
  ) {
    const opcoes =
      new Map<
        string,
        string
      >();


    const adicionar =
      (
        versao:
          string,

        origem:
          string
      ) => {

        const valor =
          versao.trim();


        if (
          valor &&
          !opcoes.has(
            valor
          )
        ) {
          opcoes.set(
            valor,
            origem
          );
        }

      };


    adicionar(
      item.environmentVersion ??
        "",
      "Ambiente"
    );


    for (
      const versao of
      versoesRedmine[
        item.redmineProjectId ??
          0
      ] ??
      []
    ) {
      adicionar(
        versao.name,
        "Redmine"
      );
    }


    for (
      const versao of
      versoesManuais[
        item.key
      ] ??
      []
    ) {
      adicionar(
        versao,
        "Manual"
      );
    }


    adicionar(
      item.selectedVersion,

      item.versionSource ===
        "redmine"
        ? "Redmine"
        : item.versionSource ===
            "manual"
          ? "Manual"
          : "Ambiente"
    );


    return [
      ...opcoes.entries(),
    ];
  }


  function alterarVersaoRelease(
    item:
      CompatibilityItem,

    versao:
      string
  ) {
    if (
      !versao
    ) {
      atualizarItemRelease(
        item.key,
        {
          selectedVersion:
            "",

          versionSource:
            item.source ===
              "environment"
              ? "environment"
              : item.source,
        }
      );

      return;
    }


    const ehAmbiente =
      versao ===
      (
        item.environmentVersion ??
        ""
      );


    const ehManual =
      (
        versoesManuais[
          item.key
        ] ??
        []
      )
        .includes(
          versao
        );


    atualizarItemRelease(
      item.key,
      {
        selectedVersion:
          versao,

        versionSource:
          ehAmbiente
            ? "environment"
            : ehManual
              ? "manual"
              : "redmine",
      }
    );
  }


  async function salvarNovaVersao(
    item:
      CompatibilityItem
  ) {
    const versao =
      novaVersao.trim();


    if (
      !versao
    ) {
      setFeedback(
        {
          tipo:
            "erro",

          texto:
            "Informe a versão que deseja adicionar.",
        }
      );

      return;
    }


    try {

      const lista =
        await adicionarVersaoManual(
          item.key,
          item.displayName,
          versao
        );


      setVersoesManuais(
        atual => ({
          ...atual,

          [item.key]:
            lista,
        })
      );


      atualizarItemRelease(
        item.key,
        {
          selectedVersion:
            versao,

          versionSource:
            "manual",
        }
      );


      setAdicionandoVersaoPara(
        null
      );


      setNovaVersao(
        ""
      );

    } catch (
      erro
    ) {

      setFeedback(
        {
          tipo:
            "erro",

          texto:
            erro instanceof
              Error
              ? erro.message
              : "Não foi possível adicionar a versão.",
        }
      );

    }
  }


  async function salvarRelease() {
    if (
      !environmentId ||
      salvando
    ) {
      return;
    }


    try {

      setSalvando(
        true
      );


      const salvo =
        await salvarCompatibilidade(
          environmentId,
          itensReleaseEdicao,
          readmeEdicao
        );


      setCompatibilidade(
        salvo
      );


      setVersoesManuais(
        salvo.manualVersions ??
        {}
      );


      setEditandoRelease(
        false
      );


      setFeedback(
        {
          tipo:
            "sucesso",

          texto:
            `Versões da release "${salvo.environmentName}" salvas com sucesso.`,
        }
      );

    } catch (
      erro
    ) {

      setFeedback(
        {
          tipo:
            "erro",

          texto:
            erro instanceof
              Error
              ? erro.message
              : "Não foi possível salvar as versões da release.",
        }
      );

    } finally {

      setSalvando(
        false
      );

    }
  }


  return (
    <Layout>

      <div className="compatibility-page">

        {feedback && (
          <div
            className={`compatibility-feedback compatibility-feedback-${feedback.tipo}`}
          >
            <div>
              {feedback.tipo ===
                "sucesso" ? (
                <MdCheckCircle size={21} />
              ) : (
                <MdErrorOutline size={21} />
              )}

              <span>
                {feedback.texto}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setFeedback(
                  null
                )
              }
            >
              <MdClose size={18} />
            </button>
          </div>
        )}


        <div className="compatibility-page-header">

          <div>
            <span className="compatibility-page-eyebrow">
              Sistemas
            </span>

            <h1>
              Compatibilidade
            </h1>

            <p>
              Consulte as versões utilizadas em cada release e as orientações necessárias para atualização.
            </p>
          </div>


          <div className="compatibility-header-actions">

            <a
              className="compatibility-wiki-button"
              href={
                wikiIntellicashUrl
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <MdMenuBook size={19} />
              Abrir Wiki do IntelliCash
            </a>


            <button
              type="button"
              className="compatibility-refresh-button"
              onClick={() =>
                void atualizarAtual()
              }
              disabled={
                carregando ||
                carregandoCompatibilidade
              }
            >
              <MdRefresh size={19} />
              Atualizar
            </button>

          </div>

        </div>


        <div className="compatibility-info">

          <MdLink size={22} />

          <div>
            <strong>
              Cadastro geral + versão por release
            </strong>

            <span>
              A ordem, os relacionamentos e os sistemas continuam definidos no cadastro geral.
            </span>
          </div>

        </div>


        <section className="compatibility-global-card">

          <div className="compatibility-global-icon">
            <MdSettings size={24} />
          </div>


          <div className="compatibility-global-content">

            <strong>
              Configuração geral dos sistemas
            </strong>

            <span>
              Define nome, projeto correspondente no Redmine, ordem padrão e sistemas utilizados em conjunto.
            </span>

            <small>
              {catalogo.length}{" "}
              {catalogo.length ===
              1
                ? "sistema cadastrado"
                : "sistemas cadastrados"}
            </small>

          </div>


          {podeEditar && (
            <button
              type="button"
              className="compatibility-global-action"
              onClick={() =>
                void abrirConfiguracaoGeral()
              }
            >
              <MdSettings size={18} />
              Configurar sistemas
            </button>
          )}

        </section>


        <section className="compatibility-release-context">

          <div className="compatibility-release-accent" />


          <div className="compatibility-release-context-main">

            <span className="compatibility-release-context-eyebrow">
              Ambiente da release
            </span>


            <div className="compatibility-release-context-title-row">

              <h2>
                {ambienteSelecionado
                  ?.nome ??
                  "Nenhuma release selecionada"}
              </h2>


              {ambienteSelecionado && (
                <span
                  className={
                    ambienteSelecionado
                      .concluido
                      ? "compatibility-status compatibility-status-closed"
                      : "compatibility-status compatibility-status-active"
                  }
                >
                  {ambienteSelecionado
                    .concluido
                    ? "Concluído"
                    : "Ativo"}
                </span>
              )}

            </div>


            {ambienteSelecionado && (
              <div className="compatibility-release-context-details">

                <span>
                  IntelliCash
                </span>

                <strong>
                  {ambienteSelecionado
                    .versoes
                    .intellicash ||
                    "-"}
                </strong>

                <span>
                  •
                </span>

                <span>
                  {itensVisiveis.length} sistemas exibidos
                </span>

              </div>
            )}

          </div>


          <div className="compatibility-release-switcher">

            <label>
              Trocar release
            </label>

            <select
              value={
                environmentId ??
                ""
              }
              onChange={
                evento =>
                  setEnvironmentId(
                    Number(
                      evento.target.value
                    ) ||
                    null
                  )
              }
            >
              {ambientes.map(
                ambiente => (
                  <option
                    key={ambiente.id}
                    value={ambiente.id}
                  >
                    {ambiente.nome}
                    {ambiente.concluido
                      ? " — Concluído"
                      : " — Ativo"}
                  </option>
                )
              )}
            </select>

          </div>

        </section>


        <section className="compatibility-view-card">

          <div className="compatibility-view-heading-row">

            <div className="compatibility-view-title">
              <h2>
                Compatibilidade da release
              </h2>

              <p>
                Versões utilizadas em{" "}
                {compatibilidade
                  ?.environmentName ??
                  "este ambiente"}.
              </p>
            </div>


            <div className="compatibility-view-actions">

              {compatibilidade
                ?.readme
                ?.trim() && (
                <button
                  type="button"
                  className="compatibility-readme-button"
                  onClick={() =>
                    setReadmeAberto(
                      true
                    )
                  }
                >
                  <MdMenuBook size={18} />
                  LEIA-ME
                </button>
              )}


              {podeEditar &&
                compatibilidade && (
                <button
                  type="button"
                  className="compatibility-edit-button"
                  onClick={
                    abrirEdicaoRelease
                  }
                >
                  <MdTune size={18} />
                  Ajustar versões
                </button>
              )}

            </div>

          </div>


          {carregando ||
          carregandoCompatibilidade ? (

            <div className="compatibility-page-empty">
              Carregando compatibilidade...
            </div>

          ) : (

            <div className="compatibility-view-grid">

              {itensVisiveis.map(
                item => (
                  <div
                    key={item.key}
                    className="compatibility-view-item"
                  >
                    <strong>
                      {item.displayName}
                    </strong>

                    <span>
                      {item.selectedVersion ||
                        "Não informado"}
                    </span>
                  </div>
                )
              )}

            </div>

          )}

        </section>

      </div>


      {readmeAberto &&
        compatibilidade && (

          <div
            className="compatibility-readme-modal-backdrop"
            onMouseDown={
              evento => {
                if (
                  evento.target ===
                  evento.currentTarget
                ) {
                  setReadmeAberto(
                    false
                  );
                }
              }
            }
          >

            <section className="compatibility-readme-modal">

              <header className="compatibility-readme-modal-header">

                <div className="compatibility-readme-modal-title">

                  <div className="compatibility-readme-modal-icon">
                    <MdMenuBook size={22} />
                  </div>

                  <div>
                    <span>
                      LEIA-ME DA RELEASE
                    </span>

                    <h2>
                      {compatibilidade.environmentName}
                    </h2>

                    <p>
                      Orientações importantes para atualização
                    </p>
                  </div>

                </div>


                <button
                  type="button"
                  className="compatibility-readme-modal-close"
                  onClick={() =>
                    setReadmeAberto(
                      false
                    )
                  }
                >
                  <MdClose size={22} />
                </button>

              </header>


              <div className="compatibility-readme-modal-body">

                {readmeInterpretado
                  .titulo && (
                  <div className="compatibility-readme-release-label">
                    {readmeInterpretado.titulo}
                  </div>
                )}


                {readmeInterpretado
                  .avisos
                  .length >
                  0 && (

                  <div className="compatibility-readme-alerts">

                    {readmeInterpretado
                      .avisos
                      .map(
                        (
                          aviso,
                          indice
                        ) => (
                          <div
                            key={indice}
                            className="compatibility-readme-alert"
                          >
                            <MdErrorOutline size={18} />

                            <span>
                              {aviso}
                            </span>
                          </div>
                        )
                      )}

                  </div>
                )}


                <div className="compatibility-readme-section">

                  <h3>
                    Versões e caminhos
                  </h3>


                  <div className="compatibility-readme-table">

                    {readmeInterpretado
                      .aplicacoes
                      .map(
                        (
                          aplicacao,
                          indice
                        ) => (
                          <div
                            className="compatibility-readme-row"
                            key={indice}
                          >

                            <div className="compatibility-readme-app">

                              <strong>
                                {aplicacao.nome}
                              </strong>

                              {aplicacao
                                .versao && (
                                <span>
                                  {aplicacao.versao}
                                </span>
                              )}

                            </div>


                            <div className="compatibility-readme-path">
                              {aplicacao.caminho ||
                                "Sem caminho informado"}
                            </div>

                          </div>
                        )
                      )}

                  </div>

                </div>


                {readmeInterpretado
                  .outros
                  .length >
                  0 && (
                  <div className="compatibility-readme-section">

                    <h3>
                      Observações
                    </h3>

                    <div className="compatibility-readme-notes">

                      {readmeInterpretado
                        .outros
                        .map(
                          (
                            texto,
                            indice
                          ) => (
                            <p key={indice}>
                              {texto}
                            </p>
                          )
                        )}

                    </div>

                  </div>
                )}

              </div>


              <footer className="compatibility-readme-modal-footer">

                <button
                  type="button"
                  onClick={() =>
                    setReadmeAberto(
                      false
                    )
                  }
                >
                  Fechar
                </button>

              </footer>

            </section>

          </div>

        )}


      {configurandoGeral && (

        <div className="compatibility-modal-backdrop">

          <section className="compatibility-modal">

            <header className="compatibility-modal-header">

              <div>
                <h2>
                  Configuração geral dos sistemas
                </h2>

                <p>
                  Estas definições são reaproveitadas automaticamente em todas as releases.
                </p>
              </div>


              <button
                type="button"
                className="compatibility-modal-close"
                onClick={() =>
                  setConfigurandoGeral(
                    false
                  )
                }
              >
                <MdClose size={22} />
              </button>

            </header>


            <div className="compatibility-modal-guidance">

              <MdInfoOutline size={18} />

              <span>
                O vínculo com o Redmine é feito pelo ID do projeto.
              </span>

            </div>


            {erroRedmine && (
              <div className="compatibility-redmine-warning">

                <MdErrorOutline size={19} />

                <span>
                  {erroRedmine}
                </span>

              </div>
            )}


            <div className="compatibility-editor-list">

              {catalogoEdicao
                .slice()
                .sort(
                  (
                    a,
                    b
                  ) =>
                    a.order -
                    b.order
                )
                .map(
                  (
                    item,
                    indice,
                    lista
                  ) => (

                    <article
                      key={item.key}
                      className="compatibility-editor-item"
                    >

                      <div className="compatibility-editor-item-top">

                        <div className="compatibility-editor-heading">

                          <strong className="compatibility-editor-title">
                            {item.displayName}
                          </strong>


                          <label className="compatibility-visibility-toggle">

                            <input
                              type="checkbox"
                              checked={
                                item.defaultVisible
                              }
                              onChange={
                                evento =>
                                  atualizarCatalogoItem(
                                    item.key,
                                    {
                                      defaultVisible:
                                        evento.target.checked,
                                    }
                                  )
                              }
                            />

                            Exibir por padrão

                          </label>

                        </div>


                        <div className="compatibility-order-actions">

                          <button
                            type="button"
                            disabled={
                              indice === 0
                            }
                            onClick={() =>
                              moverCatalogoItem(
                                item.key,
                                "up"
                              )
                            }
                          >
                            <MdKeyboardArrowUp />
                          </button>


                          <button
                            type="button"
                            disabled={
                              indice ===
                              lista.length - 1
                            }
                            onClick={() =>
                              moverCatalogoItem(
                                item.key,
                                "down"
                              )
                            }
                          >
                            <MdKeyboardArrowDown />
                          </button>


                          {item.source !==
                            "environment" && (
                            <button
                              type="button"
                              onClick={() =>
                                removerSistemaGlobal(
                                  item
                                )
                              }
                            >
                              <MdDeleteOutline />
                            </button>
                          )}

                        </div>

                      </div>


                      <div className="compatibility-editor-fields">

                        <label>
                          <span>
                            Nome exibido
                          </span>

                          <input
                            value={item.displayName}
                            onChange={
                              evento =>
                                atualizarCatalogoItem(
                                  item.key,
                                  {
                                    displayName:
                                      evento.target.value,
                                  }
                                )
                            }
                          />
                        </label>


                        <label>
                          <span>
                            Projeto no Redmine
                          </span>

                          <select
                            value={
                              item.redmineProjectId ??
                              ""
                            }
                            onChange={
                              evento =>
                                alterarProjetoGlobal(
                                  item,
                                  evento.target.value
                                )
                            }
                          >
                            <option value="">
                              Sem vínculo
                            </option>

                            {projetosRedmine.map(
                              projeto => (
                                <option
                                  key={projeto.id}
                                  value={projeto.id}
                                >
                                  {projeto.name}
                                </option>
                              )
                            )}

                          </select>

                        </label>

                      </div>

                    </article>

                  )
                )}

            </div>


            <footer className="compatibility-modal-footer">

              <button
                type="button"
                className="compatibility-cancel-button"
                onClick={() =>
                  setConfigurandoGeral(
                    false
                  )
                }
              >
                Cancelar
              </button>


              <button
                type="button"
                className="compatibility-save-button"
                onClick={() =>
                  void salvarConfiguracaoGeral()
                }
              >
                <MdSave />
                Salvar
              </button>

            </footer>

          </section>

        </div>
      )}


      {editandoRelease &&
        compatibilidade && (

          <div className="compatibility-modal-backdrop">

            <section className="compatibility-modal compatibility-release-modal">

              <header className="compatibility-modal-header">

                <div>
                  <h2>
                    Ajustar versões da release
                  </h2>

                  <p>
                    {compatibilidade.environmentName}
                  </p>
                </div>


                <button
                  type="button"
                  className="compatibility-modal-close"
                  onClick={() =>
                    setEditandoRelease(
                      false
                    )
                  }
                >
                  <MdClose size={22} />
                </button>

              </header>


              <div className="compatibility-readme-editor">

                <label>

                  <span>
                    LEIA-ME desta release
                  </span>


                  <textarea
                    value={
                      readmeEdicao
                    }
                    onChange={
                      evento =>
                        setReadmeEdicao(
                          evento.target.value
                        )
                    }
                  />

                </label>

              </div>


              <div className="compatibility-editor-list">

                {itensReleaseEdicao
                  .slice()
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      a.order -
                      b.order
                  )
                  .map(
                    item => (

                      <article
                        key={item.key}
                        className="compatibility-editor-item"
                      >

                        <div className="compatibility-release-item-top">

                          <strong className="compatibility-editor-title">
                            {item.displayName}
                          </strong>


                          <label className="compatibility-visibility-toggle">

                            <input
                              type="checkbox"
                              checked={
                                item.visible
                              }
                              onChange={
                                evento =>
                                  atualizarItemRelease(
                                    item.key,
                                    {
                                      visible:
                                        evento.target.checked,
                                    }
                                  )
                              }
                            />

                            Exibir

                          </label>

                        </div>


                        <label className="compatibility-release-version-field">

                          <span>
                            Versão
                          </span>


                          <select
                            value={
                              item.selectedVersion
                            }
                            onFocus={() =>
                              void garantirVersoesProjeto(
                                item.redmineProjectId
                              )
                            }
                            onChange={
                              evento =>
                                alterarVersaoRelease(
                                  item,
                                  evento.target.value
                                )
                            }
                          >

                            <option value="">
                              Sem versão
                            </option>


                            {opcoesVersao(
                              item
                            ).map(
                              ([
                                versao,
                                origem,
                              ]) => (
                                <option
                                  key={`${versao}-${origem}`}
                                  value={versao}
                                >
                                  {versao} — {origem}
                                </option>
                              )
                            )}

                          </select>


                          <button
                            type="button"
                            className="compatibility-add-version-link"
                            onClick={() => {
                              setAdicionandoVersaoPara(
                                item.key
                              );

                              setNovaVersao(
                                ""
                              );
                            }}
                          >
                            + Adicionar versão
                          </button>


                          {adicionandoVersaoPara ===
                            item.key && (

                            <div className="compatibility-new-version">

                              <input
                                value={
                                  novaVersao
                                }
                                onChange={
                                  evento =>
                                    setNovaVersao(
                                      evento.target.value
                                    )
                                }
                              />


                              <button
                                type="button"
                                onClick={() =>
                                  void salvarNovaVersao(
                                    item
                                  )
                                }
                              >
                                Adicionar
                              </button>

                            </div>

                          )}

                        </label>

                      </article>

                    )
                  )}

              </div>


              <footer className="compatibility-modal-footer">

                <button
                  type="button"
                  className="compatibility-cancel-button"
                  onClick={() =>
                    setEditandoRelease(
                      false
                    )
                  }
                >
                  Cancelar
                </button>


                <button
                  type="button"
                  className="compatibility-save-button"
                  onClick={() =>
                    void salvarRelease()
                  }
                >
                  <MdSave />
                  Salvar
                </button>

              </footer>

            </section>

          </div>

        )}

    </Layout>
  );
}


export default Compatibility;