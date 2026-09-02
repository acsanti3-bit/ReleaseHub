import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MdCheckCircle,
  MdClose,
  MdEdit,
  MdHistory,
  MdInfoOutline,
  MdNotes,
  MdReplay,
  MdSchedule,
  MdSend,
} from "react-icons/md";

import {
  adicionarObservacaoAmbiente,
  listarAuditoriaEntidade,
} from "../../services/AuditLogService";

import {
  listarProjetosPorAmbiente,
} from "../../services/ReleaseProjectService";

import type {
  AuditLog,
} from "../../services/AuditLogService";

import type {
  Project,
} from "../../types/project";

import type {
  ReleaseEnvironment,
  ReleaseSystemVersion,
} from "../../types/releaseEnvironment";

import "./EnvironmentDetailsModal.css";


type AbaDetalhes =
  | "resumo"
  | "historico"
  | "observacoes";


type Props = {
  environment: ReleaseEnvironment;
  canAddObservation: boolean;
  onClose: () => void;
};


type StatusResumo = {
  chave: keyof Project["situacoes"];
  nome: string;
};


const STATUS_RESUMO: StatusResumo[] = [
  { chave: "nova", nome: "Nova" },
  { chave: "emProgresso", nome: "Em progresso" },
  { chave: "desenvolvido", nome: "Desenvolvido" },
  { chave: "aguardandoCompilacao", nome: "Aguardando compilação" },
  { chave: "qualidade", nome: "Qualidade" },
  { chave: "testes", nome: "Testes" },
  { chave: "reaberta", nome: "Reaberta" },
  { chave: "validacaoCliente", nome: "Validação no cliente" },
  { chave: "interrompida", nome: "Interrompida" },
  { chave: "rejeitada", nome: "Rejeitada" },
  { chave: "resolvidas", nome: "Resolvidas" },
];


const NOMES_ACAO: Record<string, string> = {
  CRIAR: "Ambiente criado",
  EDITAR: "Ambiente editado",
  CONCLUIR: "Ambiente concluído",
  REABRIR: "Ambiente reaberto",
  OBSERVACAO: "Observação adicionada",
};


function normalizarData(
  valor: string
): Date | null {
  if (!valor) {
    return null;
  }

  const normalizado =
    valor.includes("T")
      ? valor
      : `${valor.replace(" ", "T")}Z`;

  const data =
    new Date(normalizado);

  return Number.isNaN(data.getTime())
    ? null
    : data;
}


function formatarDataHora(
  valor?: string | null
): string {
  if (!valor) {
    return "Não disponível";
  }

  const data =
    normalizarData(valor);

  if (!data) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(data);
}


function formatarData(
  valor?: string | null
): string {
  if (!valor) {
    return "Sem prazo";
  }

  const data =
    normalizarData(valor);

  if (!data) {
    const partes = valor.split("-");

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
    }
  ).format(data);
}


function dataCriacaoPorId(
  id: number
): Date | null {
  if (
    id < 1_000_000_000_000 ||
    id > 9_999_999_999_999
  ) {
    return null;
  }

  const data = new Date(id);

  return Number.isNaN(data.getTime())
    ? null
    : data;
}


function formatarDuracao(
  inicio: Date | null,
  fim: Date | null
): string {
  if (!inicio || !fim) {
    return "Não disponível";
  }

  const diferenca = Math.max(
    0,
    fim.getTime() - inicio.getTime()
  );

  const totalMinutos =
    Math.floor(diferenca / 60_000);

  const dias =
    Math.floor(totalMinutos / 1_440);

  const horas =
    Math.floor((totalMinutos % 1_440) / 60);

  const minutos =
    totalMinutos % 60;

  if (dias > 0) {
    return `${dias}d ${horas}h`;
  }

  if (horas > 0) {
    return `${horas}h ${minutos}min`;
  }

  return `${minutos}min`;
}


function obterObservacao(
  registro: AuditLog
): string {
  if (
    !registro.newData ||
    typeof registro.newData !== "object"
  ) {
    return "";
  }

  const dados =
    registro.newData as Record<string, unknown>;

  return typeof dados.observacao === "string"
    ? dados.observacao
    : "";
}


function obterSistemasConfigurados(
  environment: ReleaseEnvironment
): ReleaseSystemVersion[] {
  return (environment.sistemas ?? [])
    .filter(sistema =>
      Boolean(sistema.versao?.trim())
    )
    .sort((a, b) => a.ordem - b.ordem);
}


function iconeAcao(
  acao: string
) {
  if (acao === "CONCLUIR") {
    return <MdCheckCircle size={17} />;
  }

  if (acao === "REABRIR") {
    return <MdReplay size={17} />;
  }

  if (acao === "EDITAR") {
    return <MdEdit size={17} />;
  }

  if (acao === "OBSERVACAO") {
    return <MdNotes size={17} />;
  }

  return <MdInfoOutline size={17} />;
}


function EnvironmentDetailsModal({
  environment,
  canAddObservation,
  onClose,
}: Props) {
  const [aba, setAba] =
    useState<AbaDetalhes>("resumo");

  const [historico, setHistorico] =
    useState<AuditLog[]>([]);

  const [projetos, setProjetos] =
    useState<Project[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [observacao, setObservacao] =
    useState("");

  const [salvandoObservacao, setSalvandoObservacao] =
    useState(false);


  async function carregarDetalhes() {
    try {
      setCarregando(true);
      setErro("");

      const [registros, projetosRelease] =
        await Promise.all([
          listarAuditoriaEntidade(
            "ambiente",
            environment.id,
            250
          ),
          listarProjetosPorAmbiente(
            environment.id
          ),
        ]);

      setHistorico(registros);
      setProjetos(projetosRelease);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os detalhes do ambiente."
      );
    } finally {
      setCarregando(false);
    }
  }


  useEffect(() => {
    void carregarDetalhes();
  }, [environment.id]);


  useEffect(() => {
    function fecharComEscape(
      evento: KeyboardEvent
    ) {
      if (evento.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      fecharComEscape
    );

    return () =>
      document.removeEventListener(
        "keydown",
        fecharComEscape
      );
  }, [onClose]);


  const observacoes =
    useMemo(
      () =>
        historico.filter(
          registro =>
            registro.action === "OBSERVACAO" &&
            Boolean(obterObservacao(registro))
        ),
      [historico]
    );


  const eventosHistorico =
    useMemo(
      () =>
        historico.filter(
          registro =>
            registro.action !== "OBSERVACAO"
        ),
      [historico]
    );


  const sistemasConfigurados =
    useMemo(
      () =>
        obterSistemasConfigurados(environment),
      [environment]
    );


  const totaisSituacoes =
    useMemo(() => {
      const totais =
        Object.fromEntries(
          STATUS_RESUMO.map(status => [
            status.chave,
            0,
          ])
        ) as Record<
          keyof Project["situacoes"],
          number
        >;

      for (const projeto of projetos) {
        for (const status of STATUS_RESUMO) {
          totais[status.chave] +=
            projeto.situacoes[status.chave] ?? 0;
        }
      }

      return totais;
    }, [projetos]);


  const totalTarefas =
    useMemo(
      () =>
        STATUS_RESUMO.reduce(
          (total, status) =>
            total + totaisSituacoes[status.chave],
          0
        ),
      [totaisSituacoes]
    );


  const dataCriacao =
    useMemo(() => {
      const criacaoAuditada =
        [...historico]
          .reverse()
          .find(registro =>
            registro.action === "CRIAR"
          );

      return criacaoAuditada
        ? normalizarData(criacaoAuditada.createdAt)
        : dataCriacaoPorId(environment.id);
    }, [environment.id, historico]);


  const conclusao =
    useMemo(
      () =>
        historico.find(
          registro =>
            registro.action === "CONCLUIR"
        ) ?? null,
      [historico]
    );


  /*
   * Quando existir liberadoEm, ele passa a ser
   * a data oficial de liberação do ambiente.
   *
   * O histórico de auditoria continua sendo
   * utilizado como fallback para ambientes antigos.
   */
  const dataConclusao =
    environment.liberadoEm
      ? normalizarData(environment.liberadoEm)
      : conclusao
        ? normalizarData(conclusao.createdAt)
        : null;


  const ultimaMovimentacao =
    useMemo(() => {
      const datas = projetos
        .map(projeto =>
          projeto.ultimaMovimentacao
            ? normalizarData(projeto.ultimaMovimentacao)
            : null
        )
        .filter(
          (data): data is Date => Boolean(data)
        );

      if (datas.length === 0) {
        return null;
      }

      return new Date(
        Math.max(
          ...datas.map(data => data.getTime())
        )
      );
    }, [projetos]);


  /*
   * As remessas são ordenadas da mais recente
   * para a mais antiga.
   *
   * O próprio ReleaseEnvironment já contém
   * somente as quantidades dos cinco sistemas
   * principais:
   *
   * IntelliCash
   * EasyCash
   * EasyCheckOut
   * EasyPDV
   * IntelliStock
   */
  const remessasOrdenadas =
    useMemo(() => {
      return [...(environment.remessas ?? [])]
        .sort(
          (a, b) =>
            new Date(b.data).getTime() -
            new Date(a.data).getTime()
        );
    }, [environment.remessas]);


  const fimDoCiclo =
    environment.concluido
      ? dataConclusao
      : new Date();


  async function salvarNovaObservacao() {
    const texto = observacao.trim();

    if (
      !texto ||
      !canAddObservation ||
      salvandoObservacao
    ) {
      return;
    }

    try {
      setSalvandoObservacao(true);
      setErro("");

      await adicionarObservacaoAmbiente(
        environment.id,
        environment.nome,
        texto
      );

      setObservacao("");
      await carregarDetalhes();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a observação."
      );
    } finally {
      setSalvandoObservacao(false);
    }
  }


  return (
    <div
      className="environment-details-overlay"
      role="presentation"
      onMouseDown={evento => {
        if (evento.target === evento.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="environment-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="environment-details-title"
      >
        <header className="environment-details-header">
          <div>
            <span className="environment-details-kicker">
              Detalhes do ambiente
            </span>

            <div className="environment-details-title-row">
              <h2 id="environment-details-title">
                {environment.nome}
              </h2>

              <span
                className={`environment-details-status ${
                  environment.concluido
                    ? "is-finished"
                    : "is-active"
                }`}
              >
                {environment.concluido
                  ? "Concluído"
                  : "Ativo"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="environment-details-close"
            aria-label="Fechar detalhes"
            onClick={onClose}
          >
            <MdClose size={21} />
          </button>
        </header>

        <nav
          className="environment-details-tabs"
          aria-label="Seções dos detalhes do ambiente"
        >
          <button
            type="button"
            className={
              aba === "resumo"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setAba("resumo")
            }
          >
            <MdInfoOutline size={18} />
            Resumo
          </button>

          <button
            type="button"
            className={
              aba === "historico"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setAba("historico")
            }
          >
            <MdHistory size={18} />
            Histórico
          </button>

          <button
            type="button"
            className={
              aba === "observacoes"
                ? "is-active"
                : ""
            }
            onClick={() =>
              setAba("observacoes")
            }
          >
            <MdNotes size={18} />
            Observações

            {observacoes.length > 0 && (
              <span className="environment-details-tab-count">
                {observacoes.length}
              </span>
            )}
          </button>
        </nav>

        <div className="environment-details-content">
          {erro && (
            <div className="environment-details-error">
              {erro}
            </div>
          )}

          {carregando ? (
            <div className="environment-details-loading">
              Carregando detalhes...
            </div>
          ) : aba === "resumo" ? (
            <div className="environment-details-summary">

              <div className="environment-details-metrics">

                <div className="environment-details-metric">
                  <span>Status</span>

                  <strong>
                    {environment.concluido
                      ? "Concluído"
                      : "Em acompanhamento"}
                  </strong>
                </div>


                <div className="environment-details-metric">
                  <span>Prazo</span>

                  <strong>
                    {formatarData(
                      environment.prazo
                    )}
                  </strong>
                </div>


                <div className="environment-details-metric">
                  <span>Criação</span>

                  <strong>
                    {dataCriacao
                      ? formatarDataHora(
                          dataCriacao.toISOString()
                        )
                      : "Não disponível"}
                  </strong>
                </div>


                <div className="environment-details-metric">
                  <span>
                    {environment.concluido
                      ? "Tempo de ciclo"
                      : "Tempo em andamento"}
                  </span>

                  <strong>
                    {formatarDuracao(
                      dataCriacao,
                      fimDoCiclo
                    )}
                  </strong>
                </div>


                <div className="environment-details-metric">
                  <span>
                    Última movimentação
                  </span>

                  <strong>
                    {ultimaMovimentacao
                      ? formatarDataHora(
                          ultimaMovimentacao.toISOString()
                        )
                      : "Não disponível"}
                  </strong>
                </div>


                <div className="environment-details-metric">
                  <span>Tarefas</span>

                  <strong>
                    {totalTarefas}
                  </strong>
                </div>


                <div className="environment-details-metric">
                  <span>
                    Liberado em
                  </span>

                  <strong>
                    {environment.liberadoEm
                      ? formatarDataHora(
                          environment.liberadoEm
                        )
                      : "Ainda não liberado"}
                  </strong>
                </div>

              </div>


              {environment.concluido && (
                <div className="environment-details-conclusion">
                  <MdCheckCircle size={19} />

                  <div>
                    <strong>
                      Conclusão
                    </strong>

                    <span>
                      {dataConclusao
                        ? `${formatarDataHora(
                            environment.liberadoEm ??
                            conclusao?.createdAt
                          )}${
                            conclusao?.userName
                              ? ` por ${conclusao.userName}`
                              : ""
                          }`
                        : "A data da conclusão não está disponível no histórico."}
                    </span>
                  </div>
                </div>
              )}


              <section className="environment-details-section">
                <div className="environment-details-section-heading">
                  <div>
                    <h3>
                      Tarefas por situação
                    </h3>

                    <p>
                      Situações com tarefas
                      nesta release.
                    </p>
                  </div>
                </div>


                {totalTarefas === 0 ? (
                  <div className="environment-details-empty-inline">
                    Nenhuma tarefa sincronizada
                    para este ambiente.
                  </div>
                ) : (
                  <div className="environment-details-status-grid">
                    {STATUS_RESUMO
                      .filter(status =>
                        totaisSituacoes[
                          status.chave
                        ] > 0
                      )
                      .map(status => (
                        <div
                          key={
                            status.chave
                          }
                          className="environment-details-status-item"
                        >
                          <span>
                            {status.nome}
                          </span>

                          <strong>
                            {
                              totaisSituacoes[
                                status.chave
                              ]
                            }
                          </strong>
                        </div>
                      ))}
                  </div>
                )}
              </section>


              <section className="environment-details-section">
                <div className="environment-details-section-heading">
                  <div>
                    <h3>
                      Versões e executáveis
                    </h3>

                    <p>
                      Somente sistemas
                      configurados neste
                      ambiente.
                    </p>
                  </div>
                </div>


                {sistemasConfigurados.length ===
                0 ? (
                  <div className="environment-details-empty-inline">
                    Nenhum sistema
                    configurado.
                  </div>
                ) : (
                  <div className="environment-details-systems">
                    {sistemasConfigurados.map(
                      sistema => (
                        <div
                          key={
                            sistema.chave
                          }
                          className="environment-details-system"
                        >
                          <div>
                            <span>
                              {sistema.nome}
                            </span>

                            <strong>
                              {sistema.versao}
                            </strong>
                          </div>

                          <small>
                            Executável:{" "}
                            {sistema.executavel?.trim() ||
                              "Não informado"}
                          </small>
                        </div>
                      )
                    )}
                  </div>
                )}
              </section>


              <section className="environment-details-section">
                <div className="environment-details-section-heading">
                  <div>
                    <h3>
                      Informações das remessas
                    </h3>

                    <p>
                      Quantidade de tarefas
                      recebidas em cada remessa
                      dos cinco sistemas
                      principais.
                    </p>
                  </div>
                </div>


                {remessasOrdenadas.length ===
                0 ? (
                  <div className="environment-details-empty-inline">
                    Nenhuma remessa registrada
                    para este ambiente.
                  </div>
                ) : (
                  <div className="environment-details-remessas">

                    {remessasOrdenadas.map(
                      remessa => (
                        <article
                          key={remessa.id}
                          className="environment-details-remessa"
                        >

                          <header>
                            <div>
                              <strong>
                                Remessa de{" "}
                                {formatarData(
                                  remessa.data
                                )}
                              </strong>

                              <span>
                                {
                                  remessa.totalTarefas
                                }{" "}
                                tarefas no total · IntelliCash: {" "}
                                <b>
                                  {
                                    remessa.tarefas.intellicash
                                  }
                                </b>
                              </span>
                            </div>
                          </header>


                          <div className="environment-details-remessa-grid">

                            <div>
                              <span>
                                IntelliCash
                              </span>

                              <strong>
                                {
                                  remessa
                                    .tarefas
                                    .intellicash
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                EasyCash
                              </span>

                              <strong>
                                {
                                  remessa
                                    .tarefas
                                    .easycash
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                EasyCheckOut
                              </span>

                              <strong>
                                {
                                  remessa
                                    .tarefas
                                    .easycheckout
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                EasyPDV
                              </span>

                              <strong>
                                {
                                  remessa
                                    .tarefas
                                    .easypdv
                                }
                              </strong>
                            </div>


                            <div>
                              <span>
                                IntelliStock
                              </span>

                              <strong>
                                {
                                  remessa
                                    .tarefas
                                    .intellistock
                                }
                              </strong>
                            </div>

                          </div>


                          <footer>
                            <span>
                              Total da remessa
                            </span>

                            <strong>
                              {
                                remessa.totalTarefas
                              }{" "}
                              tarefas
                            </strong>
                          </footer>

                        </article>
                      )
                    )}

                  </div>
                )}
              </section>

            </div>
          ) : aba === "historico" ? (

            <div className="environment-details-history">

              {eventosHistorico.length === 0 ? (
                <div className="environment-details-empty">
                  <MdHistory size={28} />

                  <strong>
                    Nenhum histórico disponível
                  </strong>

                  <span>
                    Ambientes mais antigos podem
                    não possuir registros anteriores
                    à implantação da auditoria.
                  </span>
                </div>
              ) : (
                eventosHistorico.map(
                  registro => (
                    <article
                      key={registro.id}
                      className="environment-details-history-item"
                    >
                      <div className="environment-details-history-icon">
                        {iconeAcao(
                          registro.action
                        )}
                      </div>

                      <div className="environment-details-history-body">
                        <div className="environment-details-history-title">
                          <strong>
                            {
                              NOMES_ACAO[
                                registro.action
                              ] ??
                              registro.action
                            }
                          </strong>

                          <time>
                            {formatarDataHora(
                              registro.createdAt
                            )}
                          </time>
                        </div>

                        <span>
                          {
                            registro.userName ||
                            "Sistema/Redmine"
                          }
                        </span>
                      </div>
                    </article>
                  )
                )
              )}

            </div>

          ) : (

            <div className="environment-details-notes">

              {canAddObservation && (
                <div className="environment-details-note-form">

                  <label htmlFor="environment-observation">
                    Nova observação
                  </label>

                  <textarea
                    id="environment-observation"
                    value={observacao}
                    maxLength={1000}
                    placeholder="Ex.: Aguardando correção da tarefa #10913..."
                    onChange={evento =>
                      setObservacao(
                        evento.target.value
                      )
                    }
                  />

                  <div className="environment-details-note-form-footer">

                    <span>
                      {observacao.length}/1000
                    </span>

                    <button
                      type="button"
                      disabled={
                        !observacao.trim() ||
                        salvandoObservacao
                      }
                      onClick={() =>
                        void salvarNovaObservacao()
                      }
                    >
                      <MdSend size={17} />

                      {salvandoObservacao
                        ? "Salvando..."
                        : "Adicionar"}
                    </button>

                  </div>

                </div>
              )}


              {observacoes.length === 0 ? (
                <div className="environment-details-empty">

                  <MdNotes size={28} />

                  <strong>
                    Nenhuma observação registrada
                  </strong>

                  <span>
                    Use este espaço para registrar
                    contexto interno da release sem
                    poluir o card principal.
                  </span>

                </div>
              ) : (
                <div className="environment-details-note-list">

                  {observacoes.map(
                    registro => (
                      <article
                        key={registro.id}
                        className="environment-details-note"
                      >

                        <p>
                          {obterObservacao(
                            registro
                          )}
                        </p>

                        <footer>

                          <span>
                            {registro.userName}
                          </span>

                          <time>
                            <MdSchedule
                              size={14}
                            />

                            {formatarDataHora(
                              registro.createdAt
                            )}
                          </time>

                        </footer>

                      </article>
                    )
                  )}

                </div>
              )}

            </div>
          )}
        </div>
      </section>
    </div>
  );
}


export default EnvironmentDetailsModal;