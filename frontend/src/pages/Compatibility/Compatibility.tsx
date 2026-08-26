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
  MdLink,
  MdRefresh,
  MdSave,
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
  listarAmbientes,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";

import {
  listarProjetosRedmineCatalogo,
  listarVersoesProjetoRedmine,
} from "../../services/RedmineCatalogService";

import type {
  CompatibilityItem,
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


function Compatibility() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const [ambientes, setAmbientes] =
    useState<ReleaseEnvironment[]>([]);

  const [environmentId, setEnvironmentId] =
    useState<number | null>(null);

  const [compatibilidade, setCompatibilidade] =
    useState<EnvironmentCompatibility | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [carregandoCompatibilidade, setCarregandoCompatibilidade] =
    useState(false);

  const [podeEditar, setPodeEditar] =
    useState(false);

  const [editando, setEditando] =
    useState(false);

  const [salvando, setSalvando] =
    useState(false);

  const [itensEdicao, setItensEdicao] =
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

        const [lista, usuario] =
          await Promise.all([
            listarAmbientes(),
            buscarSessao(),
          ]);

        if (!ativo) {
          return;
        }

        const ordenados =
          ordenarAmbientesPorVersao(
            lista
          );

        setAmbientes(ordenados);

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
            texto: "Não foi possível carregar os ambientes.",
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
    item: CompatibilityItem,
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


  async function abrirEdicao() {
    if (
      !podeEditar ||
      !compatibilidade
    ) {
      return;
    }

    const projetos =
      await carregarProjetosRedmine();

    const itens =
      copiarItens(
        compatibilidade.items
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

    setItensEdicao(itens);
    setVersoesManuais(
      compatibilidade.manualVersions ?? {}
    );
    setAdicionandoVersaoPara(null);
    setNovaVersao("");
    setNovoProjetoRedmineId("");
    setNovoSistemaManual("");
    setAddSource("redmine");
    setEditando(true);
  }


  function atualizarItem(
    key: string,
    alteracoes: Partial<CompatibilityItem>
  ) {
    setItensEdicao(
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


  async function alterarProjetoRedmine(
    item: CompatibilityItem,
    projectIdTexto: string
  ) {
    const projectId =
      Number(projectIdTexto);

    if (!projectId) {
      atualizarItem(
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

    atualizarItem(
      item.key,
      {
        redmineProjectId:
          projectId,
        redmineProjectName:
          projeto?.name ?? "",
      }
    );

    await garantirVersoesProjeto(
      projectId
    );
  }


  function opcoesVersao(
    item: CompatibilityItem
  ) {
    const opcoes =
      new Map<
        string,
        string
      >();

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


  function alterarVersao(
    item: CompatibilityItem,
    versao: string
  ) {
    if (!versao) {
      atualizarItem(
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

    atualizarItem(
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

      atualizarItem(
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


  function adicionarSistemaManual() {
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
      itensEdicao.some(
        item => item.key === key
      )
    ) {
      setFeedback({
        tipo: "erro",
        texto: `"${nome}" já está na compatibilidade deste ambiente.`,
      });
      return;
    }

    const proximaOrdem =
      Math.max(
        0,
        ...itensEdicao.map(
          item => item.order
        )
      ) + 1;

    setItensEdicao(
      atual => [
        ...atual,
        {
          key,
          source: "manual",
          originalName: nome,
          displayName: nome,
          environmentVersion: "",
          selectedVersion: "",
          versionSource: "manual",
          redmineProjectId: null,
          redmineProjectName: "",
          visible: true,
          order: proximaOrdem,
          relatedTo: [],
        },
      ]
    );

    setNovoSistemaManual("");
  }


  async function adicionarSistemaRedmine() {
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

    const key =
      `redmine:${projeto.id}`;

    if (
      itensEdicao.some(
        item => item.key === key
      )
    ) {
      setFeedback({
        tipo: "erro",
        texto: `O projeto "${projeto.name}" já foi adicionado.`,
      });
      return;
    }

    const proximaOrdem =
      Math.max(
        0,
        ...itensEdicao.map(
          item => item.order
        )
      ) + 1;

    setItensEdicao(
      atual => [
        ...atual,
        {
          key,
          source: "redmine",
          originalName:
            projeto.name,
          displayName:
            projeto.name,
          environmentVersion: "",
          selectedVersion: "",
          versionSource: "redmine",
          redmineProjectId:
            projeto.id,
          redmineProjectName:
            projeto.name,
          visible: true,
          order: proximaOrdem,
          relatedTo: [],
        },
      ]
    );

    setNovoProjetoRedmineId("");

    await garantirVersoesProjeto(
      projeto.id
    );
  }


  function removerItem(
    item: CompatibilityItem
  ) {
    if (
      item.source === "environment"
    ) {
      return;
    }

    setItensEdicao(
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


  function alternarRelacionamento(
    itemKey: string,
    relacionadoKey: string
  ) {
    setItensEdicao(
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


  async function salvarEdicao() {
    if (
      !environmentId ||
      salvando
    ) {
      return;
    }

    const nomeVazio =
      itensEdicao.find(
        item =>
          !item.displayName.trim()
      );

    if (nomeVazio) {
      setFeedback({
        tipo: "erro",
        texto: "Todos os itens precisam ter um nome de exibição.",
      });
      return;
    }

    try {
      setSalvando(true);

      const salvo =
        await salvarCompatibilidade(
          environmentId,
          itensEdicao
        );

      setCompatibilidade(salvo);
      setVersoesManuais(
        salvo.manualVersions ?? {}
      );
      setEditando(false);

      setFeedback({
        tipo: "sucesso",
        texto: `Compatibilidade do ambiente "${salvo.environmentName}" salva com sucesso.`,
      });
    } catch (erro) {
      setFeedback({
        tipo: "erro",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível salvar a compatibilidade.",
      });
    } finally {
      setSalvando(false);
    }
  }


  async function atualizarAtual() {
    if (!environmentId) {
      return;
    }

    try {
      setCarregandoCompatibilidade(true);

      const dados =
        await buscarCompatibilidade(
          environmentId
        );

      setCompatibilidade(dados);
      setVersoesManuais(
        dados.manualVersions ?? {}
      );
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
              Consulte as versões que devem ser utilizadas em conjunto em cada ambiente da release.
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
                !environmentId ||
                carregandoCompatibilidade
              }
            >
              <MdRefresh size={19} />
              Atualizar
            </button>

            {podeEditar && compatibilidade && (
              <button
                type="button"
                className="compatibility-edit-button"
                onClick={() =>
                  void abrirEdicao()
                }
              >
                <MdTune size={19} />
                Ajustar compatibilidade
              </button>
            )}
          </div>
        </div>

        <div className="compatibility-info">
          <MdLink size={22} />
          <div>
            <strong>
              Ligada aos Ambientes da Release
            </strong>
            <span>
              Os sistemas cadastrados no ambiente entram automaticamente aqui. Os ajustes feitos nesta página alteram somente a compatibilidade exibida no Dashboard e no Modo TV.
            </span>
          </div>
        </div>

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
          <div className="compatibility-view-title">
            <h2>
              Compatibilidade entre os sistemas
            </h2>
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
              Nenhum sistema está marcado para exibição neste ambiente.
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

      {editando && compatibilidade && (
        <div
          className="compatibility-modal-backdrop"
          role="presentation"
          onMouseDown={evento => {
            if (
              evento.target ===
              evento.currentTarget &&
              !salvando
            ) {
              setEditando(false);
            }
          }}
        >
          <section
            className="compatibility-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compatibility-modal-title"
          >
            <header className="compatibility-modal-header">
              <div>
                <h2 id="compatibility-modal-title">
                  Ajustar compatibilidade
                </h2>
                <p>
                  Ambiente {compatibilidade.environmentName}. O que for marcado como exibido será usado no Dashboard e no Modo TV.
                </p>
              </div>

              <button
                type="button"
                className="compatibility-modal-close"
                aria-label="Fechar"
                onClick={() =>
                  setEditando(false)
                }
                disabled={salvando}
              >
                <MdClose size={22} />
              </button>
            </header>

            {erroRedmine && (
              <div className="compatibility-redmine-warning">
                <MdErrorOutline size={19} />
                <span>
                  {erroRedmine} Você ainda pode usar as versões do ambiente e cadastrar versões manualmente.
                </span>
              </div>
            )}

            <div className="compatibility-editor-list">
              {itensEdicao
                .slice()
                .sort(
                  (a, b) =>
                    a.order - b.order
                )
                .map(item => {
                  const projetoCarregando =
                    item.redmineProjectId
                      ? carregandoVersoes[
                          item.redmineProjectId
                        ]
                      : false;

                  const outrasOpcoes =
                    itensEdicao.filter(
                      outro =>
                        outro.key !== item.key
                    );

                  return (
                    <article
                      key={item.key}
                      className={
                        item.visible
                          ? "compatibility-editor-item"
                          : "compatibility-editor-item compatibility-editor-item-hidden"
                      }
                    >
                      <div className="compatibility-editor-item-top">
                        <label className="compatibility-visibility-toggle">
                          <input
                            type="checkbox"
                            checked={item.visible}
                            onChange={evento =>
                              atualizarItem(
                                item.key,
                                {
                                  visible:
                                    evento.target.checked,
                                }
                              )
                            }
                          />
                          <span>
                            Exibir
                          </span>
                        </label>

                        <span className="compatibility-source-badge">
                          {item.source === "environment"
                            ? "Ambiente"
                            : item.source === "redmine"
                              ? "Redmine"
                              : "Manual"}
                        </span>

                        {item.source !== "environment" && (
                          <button
                            type="button"
                            className="compatibility-remove-item"
                            title="Remover da compatibilidade"
                            onClick={() =>
                              removerItem(item)
                            }
                          >
                            <MdDeleteOutline size={19} />
                          </button>
                        )}
                      </div>

                      <div className="compatibility-editor-fields">
                        <label>
                          <span>
                            Nome exibido
                          </span>
                          <input
                            value={item.displayName}
                            onChange={evento =>
                              atualizarItem(
                                item.key,
                                {
                                  displayName:
                                    evento.target.value,
                                }
                              )
                            }
                          />
                          {item.source === "environment" &&
                            item.originalName &&
                            item.originalName !== item.displayName && (
                              <small>
                                Cadastro original: {item.originalName}
                              </small>
                            )}
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
                              void alterarProjetoRedmine(
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
                          {item.redmineProjectId && (
                            <small>
                              O vínculo usa o ID do projeto, mesmo que o nome exibido seja diferente.
                            </small>
                          )}
                        </label>

                        <label>
                          <span>
                            Versão utilizada
                          </span>
                          <select
                            value={item.selectedVersion}
                            onFocus={() =>
                              void garantirVersoesProjeto(
                                item.redmineProjectId
                              )
                            }
                            onChange={evento =>
                              alterarVersao(
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
                      </div>

                      <details className="compatibility-relations">
                        <summary>
                          Amarrações com outros sistemas
                          {item.relatedTo.length > 0 &&
                            ` (${item.relatedTo.length})`}
                        </summary>

                        <p>
                          Marque os sistemas que dependem ou trabalham em conjunto com este item nesta release.
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
                                    alternarRelacionamento(
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
                    Adicionar sistema à compatibilidade
                  </strong>
                  <span>
                    Use um projeto do Redmine ou cadastre um componente que exista somente no ReleaseHub, como ECUpdater, Servidor ou EasyHub.
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
                    onClick={() =>
                      void adicionarSistemaRedmine()
                    }
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
                        adicionarSistemaManual();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={adicionarSistemaManual}
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
                  setEditando(false)
                }
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="compatibility-save-button"
                onClick={() =>
                  void salvarEdicao()
                }
                disabled={salvando}
              >
                <MdSave size={19} />
                {salvando
                  ? "Salvando..."
                  : "Salvar compatibilidade"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </Layout>
  );
}

export default Compatibility;
