import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  MdOpenInNew,
  MdRefresh,
  MdSearch,
} from "react-icons/md";

import {
  listarProjetosAbertosRedmine,
} from "../../services/RedmineOpenProjectsService";

import type {
  RedmineOpenProjectsSummary,
} from "../../services/RedmineOpenProjectsService";

import "./RedmineProjectsMonitor.css";


const INTERVALO_ATUALIZACAO =
  2 * 60 * 1000;


function normalizarTexto(
  valor: string
): string {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase();
}


function formatarHorario(
  valor: string
): string {
  const data =
    new Date(
      valor
    );

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return "Horário indisponível";
  }

  return data.toLocaleTimeString(
    "pt-BR",
    {
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  );
}


function corSituacao(
  nome: string
): string {
  const chave =
    normalizarTexto(
      nome
    )
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  if (
    chave.includes(
      "qualidade"
    )
  ) {
    return "#F58220";
  }

  if (
    chave.includes(
      "teste"
    )
  ) {
    return "#1976D2";
  }

  if (
    chave.includes(
      "desenvolvid"
    )
  ) {
    return "#43A047";
  }

  if (
    chave.includes(
      "aguardandocompilacao"
    )
  ) {
    return "#78909C";
  }

  if (
    chave.includes(
      "emprogresso"
    )
  ) {
    return "#E5A900";
  }

  if (
    chave.includes(
      "nova"
    ) ||
    chave.includes(
      "novo"
    )
  ) {
    return "#26A69A";
  }

  if (
    chave.includes(
      "reabert"
    )
  ) {
    return "#EF5350";
  }

  if (
    chave.includes(
      "validacao"
    )
  ) {
    return "#8E24AA";
  }

  if (
    chave.includes(
      "interrompid"
    )
  ) {
    return "#795548";
  }

  if (
    chave.includes(
      "rejeitad"
    )
  ) {
    return "#607D8B";
  }

  return "#005AA9";
}


function RedmineProjectsMonitor() {
  const [
    resumo,
    setResumo,
  ] =
    useState<
      RedmineOpenProjectsSummary | null
    >(null);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    atualizando,
    setAtualizando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState("");

  const [
    pesquisa,
    setPesquisa,
  ] =
    useState("");

  const [
    somenteComTarefas,
    setSomenteComTarefas,
  ] =
    useState(true);

  const [
    somenteForaReleaseHub,
    setSomenteForaReleaseHub,
  ] =
    useState(false);

  const requisicaoEmAndamento =
    useRef(false);

  const componenteMontado =
    useRef(false);

  const carregar =
    useCallback(
      async (
        forcarAtualizacao = false
      ) => {
        if (
          requisicaoEmAndamento.current
        ) {
          return;
        }

        requisicaoEmAndamento.current =
          true;

        if (
          componenteMontado.current
        ) {
          setAtualizando(
            true
          );

          setErro(
            ""
          );
        }

        try {
          const dados =
            await listarProjetosAbertosRedmine(
              forcarAtualizacao
            );

          if (
            componenteMontado.current
          ) {
            setResumo(
              dados
            );
          }
        } catch (error) {
          if (
            componenteMontado.current
          ) {
            setErro(
              error instanceof Error
                ? error.message
                : "Não foi possível consultar os projetos do Redmine."
            );
          }
        } finally {
          requisicaoEmAndamento.current =
            false;

          if (
            componenteMontado.current
          ) {
            setCarregando(
              false
            );

            setAtualizando(
              false
            );
          }
        }
      },
      []
    );

  useEffect(() => {
    componenteMontado.current =
      true;

    void carregar();

    const intervalo =
      window.setInterval(
        () => {
          void carregar();
        },
        INTERVALO_ATUALIZACAO
      );

    return () => {
      componenteMontado.current =
        false;

      window.clearInterval(
        intervalo
      );
    };
  }, [
    carregar,
  ]);

  const projetosVisiveis =
    useMemo(
      () => {
        const termo =
          normalizarTexto(
            pesquisa.trim()
          );

        return (
          resumo?.projetos ??
          []
        ).filter(
          projeto => {
            if (
              somenteComTarefas &&
              projeto.totalAbertas === 0
            ) {
              return false;
            }

            if (
              somenteForaReleaseHub &&
              projeto.cadastradoNoReleaseHub !== false
            ) {
              return false;
            }

            return (
              !termo ||
              normalizarTexto(
                projeto.nome
              ).includes(
                termo
              ) ||
              normalizarTexto(
                projeto.identifier
              ).includes(
                termo
              )
            );
          }
        );
      },
      [
        pesquisa,
        resumo,
        somenteComTarefas,
        somenteForaReleaseHub,
      ]
    );

  return (
    <section
      className="redmine-monitor"
      aria-labelledby="redmine-monitor-title"
    >
      <div className="redmine-monitor-header">
        <div>
          <span className="redmine-monitor-eyebrow">
            Visão independente das releases
          </span>

          <h2 id="redmine-monitor-title">
            Monitoramento geral do Redmine
          </h2>

          <p>
            Todos os projetos ativos do Redmine, inclusive os que não estão cadastrados no ReleaseHub.
          </p>
        </div>

        <button
          type="button"
          className="redmine-monitor-refresh"
          onClick={() =>
            void carregar(
              true
            )
          }
          disabled={
            carregando ||
            atualizando
          }
        >
          <MdRefresh
            size={19}
            className={
              atualizando
                ? "is-spinning"
                : ""
            }
          />

          {atualizando
            ? "Atualizando..."
            : "Atualizar agora"}
        </button>
      </div>

      {resumo && (
        <div className="redmine-monitor-summary">
          <div>
            <span>
              Projetos no Redmine
            </span>

            <strong>
              {resumo.totalProjetos}
            </strong>
          </div>

          <div>
            <span>
              Com tarefas abertas
            </span>

            <strong>
              {resumo.totalProjetosComTarefas}
            </strong>
          </div>

          <div className="is-outside-releasehub">
            <span>
              Fora do ReleaseHub
            </span>

            <strong>
              {resumo.totalProjetosForaReleaseHub ?? 0}
            </strong>
          </div>

          <div className="is-highlighted">
            <span>
              Total de tarefas abertas
            </span>

            <strong>
              {resumo.totalTarefasAbertas}
            </strong>
          </div>
        </div>
      )}

      {resumo && (
        <div className="redmine-monitor-controls">
          <label className="redmine-monitor-search">
            <MdSearch
              size={20}
            />

            <input
              type="search"
              value={pesquisa}
              placeholder="Pesquisar projeto no Redmine..."
              aria-label="Pesquisar projeto no Redmine"
              onChange={
                event =>
                  setPesquisa(
                    event.target.value
                  )
              }
            />
          </label>

          <div className="redmine-monitor-filters">
            <button
              type="button"
              className={`redmine-monitor-filter ${somenteComTarefas ? "is-active" : ""}`}
              aria-pressed={
                somenteComTarefas
              }
              onClick={() =>
                setSomenteComTarefas(
                  valor =>
                    !valor
                )
              }
            >
              {somenteComTarefas
                ? "Mostrando somente com tarefas"
                : "Mostrar somente com tarefas abertas"}
            </button>

            <button
              type="button"
              className={`redmine-monitor-filter ${somenteForaReleaseHub ? "is-active" : ""}`}
              aria-pressed={
                somenteForaReleaseHub
              }
              onClick={() =>
                setSomenteForaReleaseHub(
                  valor =>
                    !valor
                )
              }
            >
              {somenteForaReleaseHub
                ? "Mostrando fora do ReleaseHub"
                : "Mostrar fora do ReleaseHub"}
            </button>
          </div>
        </div>
      )}

      {erro && (
        <div
          className="redmine-monitor-error"
          role="alert"
        >
          <strong>
            Não foi possível atualizar o monitoramento.
          </strong>

          <span>
            {erro}
          </span>
        </div>
      )}

      {carregando && !resumo ? (
        <div className="redmine-monitor-empty">
          <div className="redmine-monitor-loader" />

          <strong>
            Consultando projetos e tarefas abertas...
          </strong>
        </div>
      ) : projetosVisiveis.length === 0 ? (
        <div className="redmine-monitor-empty">
          <strong>
            Nenhum projeto encontrado.
          </strong>

          <span>
            Ajuste a pesquisa ou o filtro selecionado.
          </span>
        </div>
      ) : (
        <div className="redmine-monitor-grid">
          {projetosVisiveis.map(
            projeto => (
              <article
                key={
                  projeto.id
                }
                className={[
                  "redmine-monitor-project",
                  projeto.totalAbertas === 0
                    ? "has-no-open-tasks"
                    : "",
                  projeto.cadastradoNoReleaseHub === false
                    ? "is-outside-releasehub"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="redmine-monitor-project-header">
                  <div>
                    <a
                      href={
                        projeto.totalAbertas > 0
                          ? projeto.urlTarefasAbertas
                          : projeto.urlProjeto
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {projeto.nome}

                      <MdOpenInNew
                        size={16}
                      />
                    </a>

                    <div className="redmine-monitor-project-meta">
                      <span>
                        Projeto do Redmine
                      </span>

                      {projeto.cadastradoNoReleaseHub === false && (
                        <strong>
                          Fora do ReleaseHub
                        </strong>
                      )}
                    </div>
                  </div>

                  {projeto.totalAbertas > 0 ? (
                    <a
                      className="redmine-monitor-total"
                      href={
                        projeto.urlTarefasAbertas
                      }
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir todas as tarefas abertas deste projeto no Redmine"
                    >
                      <strong>
                        {projeto.totalAbertas}
                      </strong>

                      <span>
                        {projeto.totalAbertas === 1
                          ? "aberta"
                          : "abertas"}
                      </span>
                    </a>
                  ) : (
                    <span className="redmine-monitor-total is-zero">
                      <strong>
                        0
                      </strong>

                      <span>
                        abertas
                      </span>
                    </span>
                  )}
                </div>

                {projeto.situacoes.length > 0 ? (
                  <div className="redmine-monitor-statuses">
                    {projeto.situacoes.map(
                      situacao => (
                        <a
                          key={`${projeto.id}-${situacao.id ?? situacao.nome}`}
                          href={
                            situacao.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          title={`Abrir ${situacao.quantidade} tarefa(s) em ${situacao.nome} no Redmine`}
                        >
                          <span>
                            <i
                              style={{
                                backgroundColor:
                                  corSituacao(
                                    situacao.nome
                                  ),
                              }}
                            />

                            {situacao.nome}
                          </span>

                          <strong>
                            {situacao.quantidade}
                          </strong>
                        </a>
                      )
                    )}
                  </div>
                ) : (
                  <div className="redmine-monitor-no-tasks">
                    Nenhuma tarefa aberta neste projeto.
                  </div>
                )}
              </article>
            )
          )}
        </div>
      )}

      {resumo && (
        <footer className="redmine-monitor-footer">
          <span>
            Exibindo {projetosVisiveis.length} de {resumo.totalProjetos} projetos
          </span>

          <span>
            Atualizado às {formatarHorario(resumo.atualizadoEm)} • Atualização automática a cada 2 minutos
          </span>

          <strong>
            Esta visão não altera a compatibilidade nem o versionamento das releases.
          </strong>
        </footer>
      )}
    </section>
  );
}


export default RedmineProjectsMonitor;
