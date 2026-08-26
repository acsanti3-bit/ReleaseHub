import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  MdAdd,
  MdCheckCircle,
  MdClose,
  MdDeleteOutline,
  MdErrorOutline,
  MdInfoOutline,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdLink,
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


type AddSource =
  | "redmine"
  | "manual";


function normalizarTexto(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}


function criarChaveManual(
  nome: string
) {
  const slug =
    nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return `manual:${slug || "sistema"}`;
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


function Compatibility() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [ambientes, setAmbientes] =
    useState<ReleaseEnvironment[]>([]);

  const [environmentId, setEnvironmentId] =
    useState<number | null>(null);

  const [compatibilidade, setCompatibilidade] =
    useState<EnvironmentCompatibility | null>(null);

  const [catalogo, setCatalogo] =
    useState<CompatibilitySystemDefinition[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [carregandoCompatibilidade, setCarregandoCompatibilidade] =
    useState(false);

  const [podeEditar, setPodeEditar] =
    useState(false);

  const [configurandoGeral, setConfigurandoGeral] =
    useState(false);

  const [editandoRelease, setEditandoRelease] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  const [catalogoEdicao, setCatalogoEdicao] =
    useState<CompatibilitySystemDefinition[]>([]);

  const [itensReleaseEdicao, setItensReleaseEdicao] =
    useState<CompatibilityItem[]>([]);

  const [projetosRedmine, setProjetosRedmine] =
    useState<RedmineProjectOption[]>([]);

  const [carregandoRedmine, setCarregandoRedmine] =
    useState(false);

  const [erroRedmine, setErroRedmine] =
    useState("");

  const [versoesRedmine, setVersoesRedmine] =
    useState<Record<number, RedmineVersionOption[]>>({});

  const [carregandoVersoes, setCarregandoVersoes] =
    useState<Record<number, boolean>>({});

  const [versoesManuais, setVersoesManuais] =
    useState<Record<string, string[]>>({});

  const [adicionandoVersaoPara, setAdicionandoVersaoPara] =
    useState<string | null>(null);

  const [novaVersao, setNovaVersao] =
    useState("");

  const [addSource, setAddSource] =
    useState<AddSource>("redmine");

  const [novoProjetoRedmineId, setNovoProjetoRedmineId] =
    useState("");

  const [novoSistemaManual, setNovoSistemaManual] =
    useState("");

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);


  const ambienteSelecionado =
    useMemo(
      () =>
        ambientes.find(
          ambiente =>
            ambiente.id === environmentId
        ) ?? null,
      [ambientes, environmentId]
    );


  const itensVisiveis =
    useMemo(
      () =>
        (compatibilidade?.items ?? [])
          .filter(item => item.visible)
          .slice()
          .sort(
            (a, b) =>
              a.order - b.order
          ),
      [compatibilidade]
    );


  useEffect(() => {
    let ativo = true;

    async function carregarPagina() {
      try {
        setCarregando(true);

        const [
          lista,
          usuario,
          dadosCatalogo,
        ] = await Promise.all([
          listarAmbientes(),
          buscarSessao(),
          buscarCatalogoSistemasCompatibilidade(),
        ]);

        if (!ativo) {
          return;
        }

        const ordenados =
          ordenarAmbientesPorVersao(
            lista
          );

        setAmbientes(ordenados);
        setCatalogo(
          dadosCatalogo.items ?? []
        );

        setPodeEditar(
          usuario?.role === "admin" ||
          usuario?.role === "qualidade"
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
              ambiente.id === idUrl
          );

        const ambienteInicial =
          existeUrl
            ? idUrl
            : (
                ordenados.find(
                  ambiente =>
                    !ambiente.concluido
                )?.id ??
                ordenados[0]?.id ??
                null
              );

        setEnvironmentId(
          ambienteInicial
        );
      } catch (erro) {
        console.error(
          "Erro ao carregar página de compatibilidade:",
          erro
        );

        if (ativo) {
          setFeedback({
            tipo: "erro",
            texto:
              erro instanceof Error
                ? erro.message
                : "Não foi possível carregar a compatibilidade.",
          });
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarPagina();

    return () => {
      ativo = false;
    };
    // O ambiente da URL é considerado apenas na carga inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (!environmentId) {
      setCompatibilidade(null);
      return;
    }

    let ativo = true;

    async function carregarCompatibilidade() {
      try {
        setCarregandoCompatibilidade(true);

        const dados =
          await buscarCompatibilidade(
            environmentId as number
          );

        if (!ativo) {
          return;
        }

        setCompatibilidade(dados);
        setVersoesManuais(
          dados.manualVersions ?? {}
        );
      } catch (erro) {
        console.error(
          "Erro ao carregar compatibilidade:",
          erro
        );

        if (ativo) {
          setCompatibilidade(null);
          setFeedback({
            tipo: "erro",
            texto:
              erro instanceof Error
                ? erro.message
                : "Não foi possível carregar a compatibilidade.",
          });
        }
      } finally {
        if (ativo) {
          setCarregandoCompatibilidade(false);
        }
      }
    }

    void carregarCompatibilidade();

    setSearchParams(
      {
        environment:
          String(environmentId),
      },
      {
        replace: true,
      }
    );

    return () => {
      ativo = false;
    };
  }, [environmentId, setSearchParams]);


  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout =
      window.setTimeout(
        () =>
          setFeedback(null),
        6000
      );

    return () =>
      window.clearTimeout(timeout);
  }, [feedback]);


  function localizarProjetoAutomatico(
    item: CompatibilitySystemDefinition,
    projetos: RedmineProjectOption[]
  ) {
    if (item.redmineProjectId) {
      return null;
    }

    const candidatos =
      [
        item.originalName ?? "",
        item.displayName,
      ]
        .map(normalizarTexto)
        .filter(Boolean);

    const encontrados =
      projetos.filter(
        projeto =>
          candidatos.includes(
            normalizarTexto(
              projeto.name
            )
          )
      );

    return encontrados.length === 1
      ? encontrados[0]
      : null;
  }


  async function carregarProjetosRedmine() {
    if (
      projetosRedmine.length > 0 ||
      carregandoRedmine
    ) {
      return projetosRedmine;
    }

    try {
      setCarregandoRedmine(true);
      setErroRedmine("");

      const projetos =
        await listarProjetosRedmineCatalogo();

      setProjetosRedmine(projetos);
      return projetos;
    } catch (erro) {
      const mensagem =
        erro instanceof Error
          ? erro.message
          : "Não foi possível consultar os projetos do Redmine.";

      setErroRedmine(mensagem);
      return [];
    } finally {
      setCarregandoRedmine(false);
    }
  }


  async function garantirVersoesProjeto(
    projectId?: number | null
  ) {
    if (!projectId) {
      return;
    }

    if (
      versoesRedmine[projectId] ||
      carregandoVersoes[projectId]
    ) {
      return;
    }

    setCarregandoVersoes(
      atual => ({
        ...atual,
        [projectId]: true,
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
          [projectId]: versoes,
        })
      );
    } catch (erro) {
      console.error(
        "Erro ao consultar versões do Redmine:",
        erro
      );

      setFeedback({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível consultar as versões do Redmine.",
      });
    } finally {
      setCarregandoVersoes(
        atual => ({
          ...atual,
          [projectId]: false,
        })
      );
    }
  }


  async function recarregarCompatibilidadeAtual() {
    if (!environmentId) {
      return;
    }

    const dados =
      await buscarCompatibilidade(
        environmentId
      );

    setCompatibilidade(dados);
    setVersoesManuais(
      dados.manualVersions ?? {}
    );
  }


  async function atualizarAtual() {
    try {
      setCarregandoCompatibilidade(true);

      const promessas: Promise<unknown>[] = [
        buscarCatalogoSistemasCompatibilidade()
          .then(dados => {
            setCatalogo(
              dados.items ?? []
            );
          }),
      ];

      if (environmentId) {
        promessas.push(
          recarregarCompatibilidadeAtual()
        );
      }

      await Promise.all(promessas);
    } catch (erro) {
      setFeedback({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível atualizar a compatibilidade.",
      });
    } finally {
      setCarregandoCompatibilidade(false);
    }
  }


  async function abrirConfiguracaoGeral() {
    if (!podeEditar) {
      return;
    }

    const projetos =
      await carregarProjetosRedmine();

    const itens =
      copiarDefinicoes(
        catalogo
      ).map(item => {
        const projeto =
          localizarProjetoAutomatico(
            item,
            projetos
          );

        if (!projeto) {
          return item;
        }

        return {
          ...item,
          redmineProjectId:
            projeto.id,
          redmineProjectName:
            projeto.name,
        };
      });

    setCatalogoEdicao(itens);
    setNovoProjetoRedmineId("");
    setNovoSistemaManual("");
    setAddSource("redmine");
    setConfigurandoGeral(true);
  }


  function atualizarCatalogoItem(
    key: string,
    alteracoes: Partial<CompatibilitySystemDefinition>
  ) {
    setCatalogoEdicao(
      atual =>
        atual.map(
          item =>
            item.key === key
              ? {
                  ...item,
                  ...alteracoes,
                }
              : item
        )
    );
  }


  function alterarProjetoGlobal(
    item: CompatibilitySystemDefinition,
    projectIdTexto: string
  ) {
    const projectId =
      Number(projectIdTexto);

    if (!projectId) {
      atualizarCatalogoItem(
        item.key,
        {
          redmineProjectId: null,
          redmineProjectName: "",
        }
      );
      return;
    }

    const projeto =
      projetosRedmine.find(
        atual =>
          atual.id === projectId
      );

    atualizarCatalogoItem(
      item.key,
      {
        redmineProjectId:
          projectId,
        redmineProjectName:
          projeto?.name ?? "",
      }
    );
  }


  function moverCatalogoItem(
    itemKey: string,
    direcao: "up" | "down"
  ) {
    setCatalogoEdicao(atual => {
      const ordenados =
        atual
          .slice()
          .sort(
            (a, b) =>
              a.order - b.order
          );

      const indiceAtual =
        ordenados.findIndex(
          item =>
            item.key === itemKey
        );

      if (indiceAtual < 0) {
        return atual;
      }

      const indiceDestino =
        direcao === "up"
          ? indiceAtual - 1
          : indiceAtual + 1;

      if (
        indiceDestino < 0 ||
        indiceDestino >= ordenados.length
      ) {
        return atual;
      }

      [
        ordenados[indiceAtual],
        ordenados[indiceDestino],
      ] = [
        ordenados[indiceDestino],
        ordenados[indiceAtual],
      ];

      return ordenados.map(
        (item, indice) => ({
          ...item,
          order: indice + 1,
        })
      );
    });
  }


  function alternarRelacionamentoGlobal(
    itemKey: string,
    relacionadoKey: string
  ) {
    setCatalogoEdicao(
      atual =>
        atual.map(item => {
          if (item.key !== itemKey) {
            return item;
          }

          const existe =
            item.relatedTo.includes(
              relacionadoKey
            );

          return {
            ...item,
            relatedTo:
              existe
                ? item.relatedTo.filter(
                    key =>
                      key !== relacionadoKey
                  )
                : [
                    ...item.relatedTo,
                    relacionadoKey,
                  ],
          };
        })
    );
  }


  function adicionarSistemaManualGlobal() {
    const nome =
      novoSistemaManual.trim();

    if (!nome) {
      setFeedback({
        tipo: "erro",
        texto: "Informe o nome do sistema ou componente.",
      });
      return;
    }

    const key =
      criarChaveManual(nome);

    if (
      catalogoEdicao.some(
        item => item.key === key
      )
    ) {
      setFeedback({
        tipo: "erro",
        texto: `"${nome}" já está no cadastro geral.`,
      });
      return;
    }

    const proximaOrdem =
      Math.max(
        0,
        ...catalogoEdicao.map(
          item => item.order
        )
      ) + 1;

    setCatalogoEdicao(
      atual => [
        ...atual,
        {
          key,
          source: "manual",
          originalName: nome,
          displayName: nome,
          redmineProjectId: null,
          redmineProjectName: "",
          defaultVisible: true,
          order: proximaOrdem,
          relatedTo: [],
        },
      ]
    );

    setNovoSistemaManual("");
  }


  function adicionarSistemaRedmineGlobal() {
    const projectId =
      Number(
        novoProjetoRedmineId
      );

    const projeto =
      projetosRedmine.find(
        item => item.id === projectId
      );

    if (!projeto) {
      setFeedback({
        tipo: "erro",
        texto: "Selecione um projeto do Redmine.",
      });
      return;
    }

    const jaVinculado =
      catalogoEdicao.find(
        item =>
          item.redmineProjectId ===
          projeto.id
      );

    if (jaVinculado) {
      setFeedback({
        tipo: "erro",
        texto: `O projeto "${projeto.name}" já está vinculado a "${jaVinculado.displayName}".`,
      });
      return;
    }

    const key =
      `redmine:${projeto.id}`;

    const proximaOrdem =
      Math.max(
        0,
        ...catalogoEdicao.map(
          item => item.order
        )
      ) + 1;

    setCatalogoEdicao(
      atual => [
        ...atual,
        {
          key,
          source: "redmine",
          originalName:
            projeto.name,
          displayName:
            projeto.name,
          redmineProjectId:
            projeto.id,
          redmineProjectName:
            projeto.name,
          defaultVisible: true,
          order: proximaOrdem,
          relatedTo: [],
        },
      ]
    );

    setNovoProjetoRedmineId("");
  }


  function removerSistemaGlobal(
    item: CompatibilitySystemDefinition
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
              registro.key !== item.key
          )
          .map(registro => ({
            ...registro,
            relatedTo:
              registro.relatedTo.filter(
                key => key !== item.key
              ),
          }))
    );
  }


  async function salvarConfiguracaoGeral() {
    if (salvando) {
      return;
    }

    const nomeVazio =
      catalogoEdicao.find(
        item =>
          !item.displayName.trim()
      );

    if (nomeVazio) {
      setFeedback({
        tipo: "erro",
        texto: "Todos os sistemas precisam ter um nome de exibição.",
      });
      return;
    }

    try {
      setSalvando(true);

      const salvo =
        await salvarCatalogoSistemasCompatibilidade(
          catalogoEdicao
        );

      setCatalogo(
        salvo.items ?? []
      );
      setConfigurandoGeral(false);

      if (environmentId) {
        await recarregarCompatibilidadeAtual();
      }

      setFeedback({
        tipo: "sucesso",
        texto: "Configuração geral dos sistemas salva. Ela passa a valer para todas as releases.",
      });
    } catch (erro) {
      setFeedback({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível salvar a configuração geral.",
      });
    } finally {
      setSalvando(false);
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
    setVersoesManuais(
      compatibilidade.manualVersions ?? {}
    );
    setAdicionandoVersaoPara(null);
    setNovaVersao("");
    setEditandoRelease(true);
  }


  function atualizarItemRelease(
    key: string,
    alteracoes: Partial<CompatibilityItem>
  ) {
    setItensReleaseEdicao(
      atual =>
        atual.map(
          item =>
            item.key === key
              ? {
                  ...item,
                  ...alteracoes,
                }
              : item
        )
    );
  }


  function opcoesVersao(
    item: CompatibilityItem
  ) {
    const opcoes =
      new Map<string, string>();

    const adicionar =
      (
        versao: string,
        origem: string
      ) => {
        const valor =
          versao.trim();

        if (
          valor &&
          !opcoes.has(valor)
        ) {
          opcoes.set(
            valor,
            origem
          );
        }
      };

    adicionar(
      item.environmentVersion ?? "",
      "Ambiente"
    );

    for (
      const versao of
      versoesRedmine[
        item.redmineProjectId ?? 0
      ] ?? []
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
      ] ?? []
    ) {
      adicionar(
        versao,
        "Manual"
      );
    }

    adicionar(
      item.selectedVersion,
      item.versionSource === "redmine"
        ? "Redmine"
        : item.versionSource === "manual"
          ? "Manual"
          : "Ambiente"
    );

    return [...opcoes.entries()];
  }


  function alterarVersaoRelease(
    item: CompatibilityItem,
    versao: string
  ) {
    if (!versao) {
      atualizarItemRelease(
        item.key,
        {
          selectedVersion: "",
          versionSource:
            item.source === "environment"
              ? "environment"
              : item.source,
        }
      );
      return;
    }

    const ehAmbiente =
      versao ===
      (item.environmentVersion ?? "");

    const ehManual =
      (
        versoesManuais[
          item.key
        ] ?? []
      ).includes(versao);

    atualizarItemRelease(
      item.key,
      {
        selectedVersion: versao,
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
    item: CompatibilityItem
  ) {
    const versao =
      novaVersao.trim();

    if (!versao) {
      setFeedback({
        tipo: "erro",
        texto: "Informe a versão que deseja adicionar.",
      });
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
          [item.key]: lista,
        })
      );

      atualizarItemRelease(
        item.key,
        {
          selectedVersion: versao,
          versionSource: "manual",
        }
      );

      setAdicionandoVersaoPara(null);
      setNovaVersao("");
    } catch (erro) {
      setFeedback({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível adicionar a versão.",
      });
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
      setSalvando(true);

      const salvo =
        await salvarCompatibilidade(
          environmentId,
          itensReleaseEdicao
        );

      setCompatibilidade(salvo);
      setVersoesManuais(
        salvo.manualVersions ?? {}
      );
      setEditandoRelease(false);

      setFeedback({
        tipo: "sucesso",
        texto: `Versões da release "${salvo.environmentName}" salvas com sucesso.`,
      });
    } catch (erro) {
      setFeedback({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível salvar as versões da release.",
      });
    } finally {
      setSalvando(false);
    }
  }


  return (
    <Layout>
      <div className="compatibility-page">
        {feedback && (
          <div
            className={`compatibility-feedback compatibility-feedback-${feedback.tipo}`}
            role={
              feedback.tipo === "erro"
                ? "alert"
                : "status"
            }
          >
            <div>
              {feedback.tipo === "sucesso" ? (
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
              aria-label="Fechar mensagem"
              onClick={() =>
                setFeedback(null)
              }
            >
              <MdClose size={18} />
            </button>
          </div>
        )}

        <div className="compatibility-page-header">
          <div>
            <h1>Compatibilidade</h1>
            <p>
              Mantenha o cadastro dos sistemas uma única vez e ajuste somente as versões utilizadas em cada release.
            </p>
          </div>

          <div className="compatibility-header-actions">
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
              Nome, vínculo com o Redmine, ordem e relacionamentos são definidos uma vez e reaproveitados em todas as releases. Em cada ambiente você informa somente a versão e se o sistema deve ser exibido.
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
              Define quem é cada sistema: nome exibido, projeto correspondente no Redmine, ordem padrão e sistemas utilizados em conjunto.
            </span>
            <small>
              {catalogo.length} {catalogo.length === 1 ? "sistema cadastrado" : "sistemas cadastrados"}
            </small>
          </div>

          {podeEditar && (
            <button
              type="button"
              className="compatibility-global-action"
              onClick={() =>
                void abrirConfiguracaoGeral()
              }
              disabled={carregando}
            >
              <MdSettings size={18} />
              Configurar sistemas
            </button>
          )}
        </section>

        <section className="compatibility-environment-selector">
          <label htmlFor="compatibility-environment">
            Ambiente da release
          </label>

          <select
            id="compatibility-environment"
            value={
              environmentId ?? ""
            }
            onChange={evento =>
              setEnvironmentId(
                Number(
                  evento.target.value
                ) || null
              )
            }
            disabled={carregando}
          >
            {ambientes.length === 0 && (
              <option value="">
                Nenhum ambiente cadastrado
              </option>
            )}

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

          {ambienteSelecionado && (
            <div className="compatibility-environment-meta">
              <span
                className={
                  ambienteSelecionado.concluido
                    ? "compatibility-status compatibility-status-closed"
                    : "compatibility-status compatibility-status-active"
                }
              >
                {ambienteSelecionado.concluido
                  ? "Concluído"
                  : "Ativo"}
              </span>

              <span>
                IntelliCash{" "}
                <strong>
                  {ambienteSelecionado.versoes.intellicash || "-"}
                </strong>
              </span>
            </div>
          )}
        </section>

        <section className="compatibility-view-card">
          <div className="compatibility-view-heading-row">
            <div className="compatibility-view-title">
              <h2>
                Compatibilidade da release
              </h2>
              <p>
                Versões utilizadas em {compatibilidade?.environmentName ?? "este ambiente"}.
              </p>
            </div>

            {podeEditar && compatibilidade && (
              <button
                type="button"
                className="compatibility-edit-button"
                onClick={abrirEdicaoRelease}
              >
                <MdTune size={18} />
                Ajustar versões
              </button>
            )}
          </div>

          {carregando || carregandoCompatibilidade ? (
            <div className="compatibility-page-empty">
              Carregando compatibilidade...
            </div>
          ) : !compatibilidade ? (
            <div className="compatibility-page-empty">
              Selecione um ambiente para consultar a compatibilidade.
            </div>
          ) : itensVisiveis.length === 0 ? (
            <div className="compatibility-page-empty">
              Nenhum sistema está marcado para exibição nesta release.
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
                      {item.selectedVersion || "-"}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {configurandoGeral && (
        <div
          className="compatibility-modal-backdrop"
          role="presentation"
          onMouseDown={evento => {
            if (
              evento.target ===
              evento.currentTarget &&
              !salvando
            ) {
              setConfigurandoGeral(false);
            }
          }}
        >
          <section
            className="compatibility-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compatibility-global-modal-title"
          >
            <header className="compatibility-modal-header">
              <div>
                <h2 id="compatibility-global-modal-title">
                  Configuração geral dos sistemas
                </h2>
                <p>
                  Estas definições são reaproveitadas automaticamente em todas as releases.
                </p>
              </div>

              <button
                type="button"
                className="compatibility-modal-close"
                aria-label="Fechar"
                onClick={() =>
                  setConfigurandoGeral(false)
                }
                disabled={salvando}
              >
                <MdClose size={22} />
              </button>
            </header>

            <div className="compatibility-modal-guidance">
              <MdInfoOutline size={18} />
              <span>
                O vínculo com o Redmine é feito pelo ID do projeto. Alterar o nome exibido não altera esse vínculo. Versões não são definidas aqui: elas continuam sendo escolhidas em cada release.
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
                  (a, b) =>
                    a.order - b.order
                )
                .map((item, indice, lista) => {
                  const podeSubir =
                    indice > 0;
                  const podeDescer =
                    indice < lista.length - 1;

                  const outrasOpcoes =
                    lista.filter(
                      outro =>
                        outro.key !== item.key
                    );

                  return (
                    <article
                      key={item.key}
                      className="compatibility-editor-item"
                    >
                      <div className="compatibility-editor-item-top">
                        <div className="compatibility-editor-heading">
                          <div className="compatibility-editor-title-line">
                            <strong className="compatibility-editor-title">
                              {item.displayName || item.originalName || "Sem nome"}
                            </strong>

                            <span className="compatibility-source-badge">
                              {item.source === "environment"
                                ? "Ambiente"
                                : item.source === "redmine"
                                  ? "Redmine"
                                  : "Manual"}
                            </span>
                          </div>

                          <label className="compatibility-visibility-toggle">
                            <input
                              type="checkbox"
                              checked={item.defaultVisible}
                              onChange={evento =>
                                atualizarCatalogoItem(
                                  item.key,
                                  {
                                    defaultVisible:
                                      evento.target.checked,
                                  }
                                )
                              }
                            />
                            Exibir por padrão em novas releases
                          </label>
                        </div>

                        <div className="compatibility-order-actions">
                          <button
                            type="button"
                            title="Subir na ordem"
                            aria-label={`Subir ${item.displayName} na ordem`}
                            disabled={!podeSubir}
                            onClick={() =>
                              moverCatalogoItem(
                                item.key,
                                "up"
                              )
                            }
                          >
                            <MdKeyboardArrowUp size={20} />
                          </button>

                          <button
                            type="button"
                            title="Descer na ordem"
                            aria-label={`Descer ${item.displayName} na ordem`}
                            disabled={!podeDescer}
                            onClick={() =>
                              moverCatalogoItem(
                                item.key,
                                "down"
                              )
                            }
                          >
                            <MdKeyboardArrowDown size={20} />
                          </button>

                          {item.source !== "environment" && (
                            <button
                              type="button"
                              className="compatibility-remove-item"
                              title="Remover do cadastro geral"
                              onClick={() =>
                                removerSistemaGlobal(item)
                              }
                            >
                              <MdDeleteOutline size={19} />
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
                            onChange={evento =>
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
                              item.redmineProjectId ?? ""
                            }
                            onChange={evento =>
                              alterarProjetoGlobal(
                                item,
                                evento.target.value
                              )
                            }
                            disabled={carregandoRedmine}
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
                                  {projeto.name} — ID {projeto.id}
                                </option>
                              )
                            )}
                          </select>
                        </label>
                      </div>

                      <details className="compatibility-relations">
                        <summary>
                          Utilizado em conjunto com
                          {item.relatedTo.length > 0 &&
                            ` (${item.relatedTo.length})`}
                        </summary>

                        <p>
                          Estes relacionamentos também serão reaproveitados em todas as releases.
                        </p>

                        <div className="compatibility-relations-grid">
                          {outrasOpcoes.map(
                            outro => (
                              <label key={outro.key}>
                                <input
                                  type="checkbox"
                                  checked={
                                    item.relatedTo.includes(
                                      outro.key
                                    )
                                  }
                                  onChange={() =>
                                    alternarRelacionamentoGlobal(
                                      item.key,
                                      outro.key
                                    )
                                  }
                                />
                                <span>
                                  {outro.displayName}
                                </span>
                              </label>
                            )
                          )}
                        </div>
                      </details>
                    </article>
                  );
                })}
            </div>

            <section className="compatibility-add-system">
              <div className="compatibility-add-system-title">
                <MdAdd size={20} />
                <div>
                  <strong>
                    Adicionar sistema ao cadastro geral
                  </strong>
                  <span>
                    O novo sistema passará a aparecer automaticamente em todas as releases. Use um projeto do Redmine ou um cadastro manual, como ECUpdater, Servidor ou EasyHub.
                  </span>
                </div>
              </div>

              <div className="compatibility-add-source">
                <label>
                  <input
                    type="radio"
                    name="compatibility-add-source"
                    checked={addSource === "redmine"}
                    onChange={() =>
                      setAddSource("redmine")
                    }
                  />
                  Projeto do Redmine
                </label>

                <label>
                  <input
                    type="radio"
                    name="compatibility-add-source"
                    checked={addSource === "manual"}
                    onChange={() =>
                      setAddSource("manual")
                    }
                  />
                  Cadastro manual
                </label>
              </div>

              {addSource === "redmine" ? (
                <div className="compatibility-add-row">
                  <select
                    value={novoProjetoRedmineId}
                    onChange={evento =>
                      setNovoProjetoRedmineId(
                        evento.target.value
                      )
                    }
                    disabled={carregandoRedmine}
                  >
                    <option value="">
                      {carregandoRedmine
                        ? "Carregando projetos..."
                        : "Selecione o projeto do Redmine"}
                    </option>
                    {projetosRedmine.map(
                      projeto => (
                        <option
                          key={projeto.id}
                          value={projeto.id}
                        >
                          {projeto.name} — ID {projeto.id}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={adicionarSistemaRedmineGlobal}
                  >
                    Adicionar
                  </button>
                </div>
              ) : (
                <div className="compatibility-add-row">
                  <input
                    value={novoSistemaManual}
                    placeholder="Nome do sistema ou componente"
                    onChange={evento =>
                      setNovoSistemaManual(
                        evento.target.value
                      )
                    }
                    onKeyDown={evento => {
                      if (evento.key === "Enter") {
                        evento.preventDefault();
                        adicionarSistemaManualGlobal();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={adicionarSistemaManualGlobal}
                  >
                    Adicionar
                  </button>
                </div>
              )}
            </section>

            <footer className="compatibility-modal-footer">
              <button
                type="button"
                className="compatibility-cancel-button"
                onClick={() =>
                  setConfigurandoGeral(false)
                }
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="compatibility-save-button"
                onClick={() =>
                  void salvarConfiguracaoGeral()
                }
                disabled={salvando}
              >
                <MdSave size={19} />
                {salvando
                  ? "Salvando..."
                  : "Salvar configuração geral"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {editandoRelease && compatibilidade && (
        <div
          className="compatibility-modal-backdrop"
          role="presentation"
          onMouseDown={evento => {
            if (
              evento.target ===
              evento.currentTarget &&
              !salvando
            ) {
              setEditandoRelease(false);
            }
          }}
        >
          <section
            className="compatibility-modal compatibility-release-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compatibility-release-modal-title"
          >
            <header className="compatibility-modal-header">
              <div>
                <h2 id="compatibility-release-modal-title">
                  Ajustar versões da release
                </h2>
                <p>
                  Ambiente {compatibilidade.environmentName}. Aqui você altera somente o que é específico desta release.
                </p>
              </div>

              <button
                type="button"
                className="compatibility-modal-close"
                aria-label="Fechar"
                onClick={() =>
                  setEditandoRelease(false)
                }
                disabled={salvando}
              >
                <MdClose size={22} />
              </button>
            </header>

            <div className="compatibility-modal-guidance">
              <MdInfoOutline size={18} />
              <span>
                Nome, projeto no Redmine, ordem e relacionamentos vêm da configuração geral. Nesta tela você escolhe apenas a versão utilizada e se o sistema será exibido no Dashboard e no Modo TV.
              </span>
            </div>

            <div className="compatibility-editor-list compatibility-release-editor-list">
              {itensReleaseEdicao
                .slice()
                .sort(
                  (a, b) =>
                    a.order - b.order
                )
                .map(item => {
                  const projetoCarregando =
                    Boolean(
                      item.redmineProjectId &&
                      carregandoVersoes[
                        item.redmineProjectId
                      ]
                    );

                  return (
                    <article
                      key={item.key}
                      className={`compatibility-editor-item compatibility-release-item ${
                        item.visible
                          ? ""
                          : "compatibility-editor-item-hidden"
                      }`}
                    >
                      <div className="compatibility-release-item-top">
                        <div>
                          <div className="compatibility-editor-title-line">
                            <strong className="compatibility-editor-title">
                              {item.displayName}
                            </strong>

                            <span className="compatibility-source-badge">
                              {item.source === "environment"
                                ? "Ambiente"
                                : item.source === "redmine"
                                  ? "Redmine"
                                  : "Manual"}
                            </span>
                          </div>

                          <span className="compatibility-project-reference">
                            {item.redmineProjectId
                              ? `${item.redmineProjectName || "Projeto no Redmine"} — ID ${item.redmineProjectId}`
                              : "Sem projeto vinculado no Redmine"}
                          </span>
                        </div>

                        <label className="compatibility-visibility-toggle compatibility-release-visibility">
                          <input
                            type="checkbox"
                            checked={item.visible}
                            onChange={evento =>
                              atualizarItemRelease(
                                item.key,
                                {
                                  visible:
                                    evento.target.checked,
                                }
                              )
                            }
                          />
                          Exibir nesta release
                        </label>
                      </div>

                      <label className="compatibility-release-version-field">
                        <span>
                          Versão nesta release
                        </span>

                        <select
                          value={item.selectedVersion}
                          onFocus={() =>
                            void garantirVersoesProjeto(
                              item.redmineProjectId
                            )
                          }
                          onChange={evento =>
                            alterarVersaoRelease(
                              item,
                              evento.target.value
                            )
                          }
                        >
                          <option value="">
                            Sem versão
                          </option>
                          {opcoesVersao(item).map(
                            ([versao, origem]) => (
                              <option
                                key={`${versao}-${origem}`}
                                value={versao}
                              >
                                {versao} — {origem}
                              </option>
                            )
                          )}
                        </select>

                        <div className="compatibility-version-actions">
                          {projetoCarregando && (
                            <small>
                              Carregando versões do Redmine...
                            </small>
                          )}

                          <button
                            type="button"
                            className="compatibility-add-version-link"
                            onClick={() => {
                              setAdicionandoVersaoPara(
                                item.key
                              );
                              setNovaVersao("");
                            }}
                          >
                            + Adicionar versão
                          </button>
                        </div>

                        {adicionandoVersaoPara === item.key && (
                          <div className="compatibility-new-version">
                            <input
                              autoFocus
                              value={novaVersao}
                              placeholder="Ex.: 1.5.006.000"
                              onChange={evento =>
                                setNovaVersao(
                                  evento.target.value
                                )
                              }
                              onKeyDown={evento => {
                                if (evento.key === "Enter") {
                                  evento.preventDefault();
                                  void salvarNovaVersao(item);
                                }
                              }}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                void salvarNovaVersao(item)
                              }
                            >
                              Adicionar
                            </button>

                            <button
                              type="button"
                              className="compatibility-new-version-cancel"
                              onClick={() => {
                                setAdicionandoVersaoPara(null);
                                setNovaVersao("");
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </label>
                    </article>
                  );
                })}
            </div>

            <footer className="compatibility-modal-footer">
              <button
                type="button"
                className="compatibility-cancel-button"
                onClick={() =>
                  setEditandoRelease(false)
                }
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="compatibility-save-button"
                onClick={() =>
                  void salvarRelease()
                }
                disabled={salvando}
              >
                <MdSave size={19} />
                {salvando
                  ? "Salvando..."
                  : "Salvar versões da release"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </Layout>
  );
}

export default Compatibility;
