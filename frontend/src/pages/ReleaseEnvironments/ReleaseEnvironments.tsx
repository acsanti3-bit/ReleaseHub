import { useEffect, useState } from "react";
import {
  MdAdd,
  MdCheckCircle,
  MdClose,
  MdCompareArrows,
  MdDeleteOutline,
  MdEdit,
  MdErrorOutline,
  MdInfoOutline,
  MdContentCopy,
  MdMenuBook,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
  MdLink,
  MdReplay,
} from "react-icons/md";

import {
  useNavigate,
} from "react-router-dom";

import "./ReleaseEnvironments.css";

import Layout from "../../components/layout/Layout";
import ReleaseEnvironmentDrawer from "../../components/ReleaseEnvironmentDrawer/ReleaseEnvironmentDrawer";
import EnvironmentDetailsModal from "../../components/EnvironmentDetailsModal/EnvironmentDetailsModal";

import {
  adicionarAmbiente,
  criarAmbiente,
  editarAmbiente,
  excluirAmbiente,
  listarAmbientes,
} from "../../services/ReleaseEnvironmentService";

import { buscarSessao } from "../../services/AuthService";

import type {
  ReleaseEnvironment,
  ReleaseSystemVersion,
} from "../../types/releaseEnvironment";


type ReleaseFeedback = {
  tipo: "sucesso" | "erro";
  texto: string;
};


function obterSistemasDoAmbiente(
  ambiente: ReleaseEnvironment
): ReleaseSystemVersion[] {
  if (ambiente.sistemas && ambiente.sistemas.length > 0) {
    return [...ambiente.sistemas].sort(
      (a, b) => a.ordem - b.ordem
    );
  }

  return [
    {
      chave: "intellicash",
      nome: "Intellicash",
      versao: ambiente.versoes.intellicash,
      ordem: 1,
    },
    {
      chave: "easycash",
      nome: "EasyCash",
      versao: ambiente.versoes.easycash,
      ordem: 2,
    },
    {
      chave: "easycheckout",
      nome: "EasyCheckout",
      versao: ambiente.versoes.easycheckout,
      ordem: 3,
    },
    {
      chave: "easypdv",
      nome: "EasyPDV",
      versao: ambiente.versoes.easypdv,
      ordem: 4,
    },
    {
      chave: "intellistock",
      nome: "IntelliStock",
      versao: ambiente.versoes.intellistock,
      ordem: 5,
    },
    {
      chave: "iwbserver",
      nome: "IWB Server",
      versao: ambiente.versoes.iwbserver,
      ordem: 6,
    },
  ];
}



function obterVersaoIntellicashDoAmbiente(
  ambiente: ReleaseEnvironment
): string {
  const sistemaIntellicash =
    obterSistemasDoAmbiente(
      ambiente
    ).find(sistema =>
      sistema.chave
        .toLowerCase()
        .includes("intellicash")
    );

  return (
    sistemaIntellicash?.versao ||
    ambiente.versoes.intellicash ||
    ambiente.nome ||
    ""
  );
}


function obterPartesNumericas(
  valor: string
): number[] {
  return (
    valor
      .match(/\d+/g)
      ?.map(parte =>
        Number(parte)
      ) ??
    []
  );
}


function compararAmbientesPorVersao(
  ambienteA: ReleaseEnvironment,
  ambienteB: ReleaseEnvironment
): number {
  const versaoA =
    obterVersaoIntellicashDoAmbiente(
      ambienteA
    );

  const versaoB =
    obterVersaoIntellicashDoAmbiente(
      ambienteB
    );

  const partesA =
    obterPartesNumericas(
      versaoA
    );

  const partesB =
    obterPartesNumericas(
      versaoB
    );

  const maiorQuantidade =
    Math.max(
      partesA.length,
      partesB.length
    );

  for (
    let indice = 0;
    indice < maiorQuantidade;
    indice += 1
  ) {
    const parteA =
      partesA[indice] ?? 0;

    const parteB =
      partesB[indice] ?? 0;

    if (parteA !== parteB) {
      return parteA - parteB;
    }
  }

  return ambienteA.nome.localeCompare(
    ambienteB.nome,
    "pt-BR",
    {
      numeric: true,
      sensitivity: "base",
    }
  );
}


function ReleaseEnvironments() {
  const navigate =
    useNavigate();

  const [ambientes, setAmbientes] = useState<ReleaseEnvironment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [podeEditar, setPodeEditar] = useState(false);
  const [podeExcluir, setPodeExcluir] = useState(false);

  const [ambienteSelecionado, setAmbienteSelecionado] =
    useState<ReleaseEnvironment | null>(null);

  const [ambienteDetalhes, setAmbienteDetalhes] =
    useState<ReleaseEnvironment | null>(null);

  const [ambienteConfirmacao, setAmbienteConfirmacao] =
    useState<ReleaseEnvironment | null>(null);

  const [ambienteWiki, setAmbienteWiki] =
    useState<ReleaseEnvironment | null>(null);

  const [copiadoWiki, setCopiadoWiki] =
    useState(false);

  const [ambienteExclusao, setAmbienteExclusao] =
    useState<ReleaseEnvironment | null>(null);

  const [excluindo, setExcluindo] =
    useState(false);

  const [feedback, setFeedback] =
    useState<ReleaseFeedback | null>(null);

  const [
    ambientesRecolhidos,
    setAmbientesRecolhidos,
  ] = useState<Set<number>>(
    () => new Set()
  );


  function alternarAmbienteRecolhido(
    ambienteId: number
  ) {
    setAmbientesRecolhidos(
      atuais => {
        const proximos =
          new Set(atuais);

        if (
          proximos.has(
            ambienteId
          )
        ) {
          proximos.delete(
            ambienteId
          );
        } else {
          proximos.add(
            ambienteId
          );
        }

        return proximos;
      }
    );
  }


  async function atualizarLista() {
    try {
      setCarregando(true);

      const lista = await listarAmbientes();

      setAmbientes(lista);
      setAmbientesRecolhidos(
        new Set(
          lista.map(ambiente =>
            ambiente.id
          )
        )
      );
    } catch (erro) {
      console.error("Erro ao carregar ambientes:", erro);
    } finally {
      setCarregando(false);
    }
  }


  async function carregarPermissao() {
    try {
      const usuario = await buscarSessao();

      setPodeEditar(
        usuario?.role === "admin" ||
        usuario?.role === "qualidade"
      );

      setPodeExcluir(
        usuario?.role === "admin"
      );
    } catch (erro) {
      console.error("Erro ao carregar permissão:", erro);

      setPodeEditar(false);
      setPodeExcluir(false);
    }
  }


  useEffect(() => {
    void atualizarLista();
    void carregarPermissao();
  }, []);


  useEffect(() => {
    if (!feedback) {
      return;
    }

    const temporizador = window.setTimeout(
      () => setFeedback(null),
      6000
    );

    return () =>
      window.clearTimeout(temporizador);
  }, [feedback]);


  useEffect(() => {
    if (!ambienteExclusao) {
      return;
    }

    function fecharComEscape(
      evento: KeyboardEvent
    ) {
      if (
        evento.key === "Escape" &&
        !excluindo
      ) {
        setAmbienteExclusao(null);
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
  }, [ambienteExclusao, excluindo]);


  function novoAmbiente() {
    if (!podeEditar) {
      return;
    }

    setAmbienteSelecionado(
      criarAmbiente()
    );
  }


  function abrirEdicao(
    ambiente: ReleaseEnvironment
  ) {
    if (!podeEditar) {
      return;
    }

    setAmbienteSelecionado(
      ambiente
    );
  }


  async function salvar(
    ambiente: ReleaseEnvironment
  ) {
    if (!podeEditar || salvando) {
      return;
    }

    try {
      setSalvando(true);
      setFeedback(null);

      const ambienteJaExiste = ambientes.some(
        item => item.id === ambiente.id
      );

      let ambienteSalvo: ReleaseEnvironment;

      if (ambienteJaExiste) {
        ambienteSalvo = await editarAmbiente(
          ambiente
        );
      } else {
        ambienteSalvo = await adicionarAmbiente(
          ambiente
        );
      }

      setAmbientes(listaAtual => {
        const existeNaLista = listaAtual.some(
          item => item.id === ambienteSalvo.id
        );

        if (existeNaLista) {
          return listaAtual.map(item =>
            item.id === ambienteSalvo.id
              ? ambienteSalvo
              : item
          );
        }

        return [
          ...listaAtual,
          ambienteSalvo,
        ];
      });

      setAmbienteSelecionado(null);

      await atualizarLista();

      setFeedback({
        tipo: "sucesso",
        texto: `Ambiente "${ambienteSalvo.nome}" salvo com sucesso.`,
      });
    } catch (erro) {
      console.error(
        "Erro ao salvar ambiente:",
        erro
      );

      setFeedback({
        tipo: "erro",
        texto: "Não foi possível salvar o ambiente. Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }


  function solicitarExclusao(
    ambiente: ReleaseEnvironment
  ) {
    if (!podeExcluir || excluindo) {
      return;
    }

    setFeedback(null);
    setAmbienteExclusao(
      ambiente
    );
  }


  async function confirmarExclusao() {
    if (
      !ambienteExclusao ||
      !podeExcluir ||
      excluindo
    ) {
      return;
    }

    const ambiente = ambienteExclusao;

    try {
      setExcluindo(true);

      await excluirAmbiente(
        ambiente.id
      );

      setAmbientes(listaAtual =>
        listaAtual.filter(
          item => item.id !== ambiente.id
        )
      );

      setAmbienteExclusao(null);

      setFeedback({
        tipo: "sucesso",
        texto: `Ambiente "${ambiente.nome}" excluído com sucesso.`,
      });
    } catch (erro) {
      console.error(
        "Erro ao excluir ambiente:",
        erro
      );

      setFeedback({
        tipo: "erro",
        texto: `Não foi possível excluir o ambiente "${ambiente.nome}". Tente novamente.`,
      });
    } finally {
      setExcluindo(false);
    }
  }

  function montarLinhaWiki(
    ambiente: ReleaseEnvironment
  ) {
    const versao =
      obterVersaoIntellicashDoAmbiente(
        ambiente
      ).trim();

    if (!versao) {
      return "";
    }

    return `[[intellicash:atualizacoes:${versao}|${versao}]]\\\\`;
  }


  async function copiarLinhaWiki() {
    if (!ambienteWiki) {
      return;
    }

    const linha =
      montarLinhaWiki(
        ambienteWiki
      );

    if (!linha) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        linha
      );
      setCopiadoWiki(true);

      window.setTimeout(
        () => setCopiadoWiki(false),
        1800
      );
    } catch (erro) {
      console.error(
        "Não foi possível copiar a linha da Wiki:",
        erro
      );
    }
  }


  function abrirWikiParaEdicao() {
    window.open(
      "https://wiki.iws.com.br/doku.php?id=intellicash:atualizacoes&do=edit",
      "_blank",
      "noopener,noreferrer"
    );
  }


  function alterarConclusao(
    ambiente: ReleaseEnvironment
  ) {
    if (!podeEditar || salvando) {
      return;
    }

    setAmbienteConfirmacao(
      ambiente
    );
  }


  async function confirmarAlteracaoConclusao() {
    if (
      !ambienteConfirmacao ||
      !podeEditar ||
      salvando
    ) {
      return;
    }

    const vaiConcluir =
      !ambienteConfirmacao.concluido;

    try {
      setSalvando(true);
      setFeedback(null);

   const ambienteSalvo =
  await editarAmbiente({
    ...ambienteConfirmacao,

    concluido: vaiConcluir,

    liberadoEm:
      vaiConcluir
        ? ambienteConfirmacao.liberadoEm ??
          new Date().toISOString()
        : ambienteConfirmacao.liberadoEm,
  });
  
      setAmbientes(
        listaAtual =>
          listaAtual.map(
            item =>
              item.id ===
              ambienteSalvo.id
                ? ambienteSalvo
                : item
          )
      );

      setAmbienteConfirmacao(
        null
      );

      if (vaiConcluir) {
        setAmbienteWiki(
          ambienteSalvo
        );
        setCopiadoWiki(false);
      }

      setFeedback({
        tipo: "sucesso",
        texto: vaiConcluir
          ? `Ambiente "${ambienteSalvo.nome}" concluído com sucesso.`
          : `Ambiente "${ambienteSalvo.nome}" reaberto com sucesso.`,
      });
    } catch (erro) {
      console.error(
        "Erro ao alterar situação do ambiente:",
        erro
      );

      setFeedback({
        tipo: "erro",
        texto: "Não foi possível alterar a situação do ambiente. Tente novamente.",
      });
    } finally {
      setSalvando(false);
    }
  }


  const ambientesOrdenados =
    [...ambientes].sort(
      compararAmbientesPorVersao
    );


  function formatarDataRemessa(
    valor: string
  ): string {
    const partes =
      valor.split("-");

    if (
      partes.length === 3 &&
      partes[0].length === 4
    ) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return valor;
  }


  const historicoRemessasIntellicash =
    [...ambientesOrdenados]
      .reverse()
      .flatMap(ambiente => {
        const versao =
          obterVersaoIntellicashDoAmbiente(
            ambiente
          );

        return (
          ambiente.remessas ?? []
        )
          .filter(
            remessa =>
              remessa.tarefas.intellicash > 0
          )
          .map(remessa => ({
            id: `${ambiente.id}-${remessa.id}`,
            versao,
            data: remessa.data,
            quantidade:
              remessa.tarefas.intellicash,
          }));
      });


  return (
    <Layout>
      <div className="release-page">
        {feedback && (
          <div
            className={`release-feedback release-feedback-${feedback.tipo}`}
            role={
              feedback.tipo === "erro"
                ? "alert"
                : "status"
            }
            aria-live="polite"
          >
            <div className="release-feedback-content">
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
              onClick={() => setFeedback(null)}
            >
              <MdClose size={18} />
            </button>
          </div>
        )}

        <div className="release-page-header">
          <div>
            <h1>
              Ambientes da Release
            </h1>

            <p>
              Cadastre os ambientes e as versões dos sistemas que compõem cada release.
              {!podeEditar && " • Somente leitura"}
            </p>
          </div>

          {podeEditar && (
            <button
              type="button"
              className="new-environment-button"
              onClick={novoAmbiente}
            >
              <MdAdd size={20} />

              Novo Ambiente
            </button>
          )}
        </div>


        <div className="release-info">
          <MdLink size={22} />

          <div>
            <strong>
              Versões relacionadas
            </strong>

            <span>
              Cada ambiente reúne as versões compatíveis de todos
              os sistemas pertencentes à release.
            </span>
          </div>
        </div>


        {carregando ? (
          <div className="release-empty">
            Carregando ambientes...
          </div>
        ) : ambientes.length === 0 ? (
          <div className="release-empty">
            Nenhum ambiente cadastrado.
          </div>
        ) : (
          <div className="release-environments-list">
            {ambientesOrdenados.map(ambiente => {
              const recolhido =
                ambientesRecolhidos.has(
                  ambiente.id
                );

              const sistemas =
                obterSistemasDoAmbiente(
                  ambiente
                );

              const sistemaIntellicash =
                sistemas.find(sistema =>
                  sistema.chave
                    .toLowerCase()
                    .includes("intellicash")
                );

              const versaoIntellicash =
                sistemaIntellicash?.versao ||
                ambiente.versoes.intellicash ||
                "-";

              const sistemasConfigurados =
                sistemas.filter(
                  sistema =>
                    Boolean(
                      sistema.versao?.trim()
                    )
                ).length;

              const sistemasNaTv =
                sistemas.filter(
                  sistema =>
                    (sistema.mostrarNaTv ?? true) &&
                    Boolean(
                      sistema.versao?.trim()
                    )
                ).length;

              const prazoRelease =
                ambiente.prazo?.trim() ||
                "Sem prazo";

              return (
                <article
                  key={ambiente.id}
                  className={`release-environment-card ${
                    recolhido
                      ? "release-environment-card-collapsed"
                      : ""
                  }`}
                >
                  <header className="release-environment-card-header">
                    <div
                      className="release-environment-heading release-environment-heading-toggle"
                      role="button"
                      tabIndex={0}
                      aria-expanded={!recolhido}
                      onClick={() =>
                        alternarAmbienteRecolhido(
                          ambiente.id
                        )
                      }
                      onKeyDown={evento => {
                        if (
                          evento.key === "Enter" ||
                          evento.key === " "
                        ) {
                          evento.preventDefault();
                          alternarAmbienteRecolhido(
                            ambiente.id
                          );
                        }
                      }}
                    >
                      <span className="release-environment-label">
                        Ambiente
                      </span>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <h2>
                          {ambiente.nome}
                        </h2>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 9px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background:
                              ambiente.concluido
                                ? "#E8EDF2"
                                : "#EAF7EE",
                            color:
                              ambiente.concluido
                                ? "#5F6B76"
                                : "#2E7D32",
                          }}
                        >
                          {ambiente.concluido
                            ? "Concluído"
                            : "Ativo"}
                        </span>
                      </div>

                      <div className="release-environment-summary">
                        <span className="release-environment-reference">
                          Intellicash{" "}

                          <strong>
                            {versaoIntellicash}
                          </strong>
                        </span>

                        <span>
                          Prazo{" "}

                          <strong>
                            {prazoRelease}
                          </strong>
                        </span>

                        <span>
                          {sistemasConfigurados}{" "}
                          {sistemasConfigurados === 1
                            ? "sistema configurado"
                            : "sistemas configurados"}
                        </span>

                        <span>
                          {sistemasNaTv}{" "}
                          {sistemasNaTv === 1
                            ? "na TV"
                            : "na TV"}
                        </span>
                      </div>
                    </div>


                    <div className="release-actions">
                      <button
                        type="button"
                        className="release-collapse-button"
                        title={
                          recolhido
                            ? "Expandir ambiente"
                            : "Recolher ambiente"
                        }
                        aria-label={
                          recolhido
                            ? `Expandir ${ambiente.nome}`
                            : `Recolher ${ambiente.nome}`
                        }
                        aria-expanded={
                          !recolhido
                        }
                        onClick={() =>
                          alternarAmbienteRecolhido(
                            ambiente.id
                          )
                        }
                      >
                        {recolhido ? (
                          <MdKeyboardArrowDown
                            size={22}
                          />
                        ) : (
                          <MdKeyboardArrowUp
                            size={22}
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Ver compatibilidade"
                        aria-label={`Ver compatibilidade de ${ambiente.nome}`}
                        onClick={() =>
                          navigate(
                            `/compatibility?environment=${ambiente.id}`
                          )
                        }
                      >
                        <MdCompareArrows size={19} />
                      </button>

                      <button
                        type="button"
                        title="Detalhes do ambiente"
                        className="info-environment"
                        aria-label={`Ver detalhes de ${ambiente.nome}`}
                        onClick={() =>
                          setAmbienteDetalhes(
                            ambiente
                          )
                        }
                      >
                        <MdInfoOutline size={19} />
                      </button>

                      {podeEditar && (
                        <>
                          <button
                            type="button"
                            title={
                              ambiente.concluido
                                ? "Reabrir ambiente"
                                : "Concluir ambiente"
                            }
                            onClick={() => {
                              void alterarConclusao(
                                ambiente
                              );
                            }}
                            disabled={salvando}
                            style={{
                              color:
                                ambiente.concluido
                                  ? "#005AA9"
                                  : "#2E7D32",
                            }}
                          >
                            {ambiente.concluido ? (
                              <MdReplay size={19} />
                            ) : (
                              <MdCheckCircle size={19} />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Editar ambiente"
                            onClick={() =>
                              abrirEdicao(
                                ambiente
                              )
                            }
                          >
                            <MdEdit size={18} />
                          </button>

                          {podeExcluir && (
                            <button
                              type="button"
                              title="Excluir ambiente"
                              className="delete-environment"
                              disabled={excluindo}
                              onClick={() =>
                                solicitarExclusao(
                                  ambiente
                                )
                              }
                            >
                              <MdDeleteOutline size={19} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </header>


                  {!recolhido && (
                    <div className="release-systems-grid">
                      {sistemas.map(sistema => {
                      const possuiVersao =
                        Boolean(
                          sistema.versao?.trim()
                        );

                      const sistemaReferencia =
                        sistema.chave
                          .toLowerCase()
                          .includes("intellicash");

                      const classes = [
                        "release-system-item",
                        sistemaReferencia
                          ? "release-system-reference"
                          : "",
                        !possuiVersao
                          ? "release-system-empty"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={sistema.chave}
                          className={classes}
                        >
                          <span>
                            {sistema.nome}
                          </span>

                          <strong>
                            {sistema.versao || "-"}
                          </strong>
                        </div>
                      );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}


        {historicoRemessasIntellicash.length > 0 && (
          <section className="release-remittance-history">
            <div className="release-remittance-history-header">
              <div>
                <span className="release-remittance-history-kicker">
                  Histórico
                </span>

                <h2>
                  Remessas do IntelliCash
                </h2>
              </div>

              <span className="release-remittance-history-count">
                {historicoRemessasIntellicash.length}{" "}
                {historicoRemessasIntellicash.length === 1
                  ? "remessa"
                  : "remessas"}
              </span>
            </div>

            <div className="release-remittance-history-list">
              {historicoRemessasIntellicash.map(
                remessa => (
                  <div
                    key={remessa.id}
                    className="release-remittance-history-item"
                  >
                    <div>
                      <small>
                        Versão
                      </small>

                      <strong>
                        {remessa.versao}
                      </strong>
                    </div>

                    <div className="release-remittance-history-date">
                      <small>
                        Data da remessa
                      </small>

                      <strong>
                        {formatarDataRemessa(
                          remessa.data
                        )}
                      </strong>
                    </div>

                    <div className="release-remittance-history-tasks">
                      <small>
                        Tarefas
                      </small>

                      <strong>
                        {remessa.quantidade}
                      </strong>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}
      </div>


      {ambienteDetalhes && (
        <EnvironmentDetailsModal
          environment={ambienteDetalhes}
          canAddObservation={podeEditar}
          onClose={() =>
            setAmbienteDetalhes(null)
          }
        />
      )}


      {podeEditar && ambienteSelecionado && (
        <ReleaseEnvironmentDrawer
          environment={ambienteSelecionado}
          environments={ambientes}
          onClose={() =>
            setAmbienteSelecionado(null)
          }
          onSave={salvar}
        />
      )}


      {ambienteExclusao && (
        <div
          className="release-modal-overlay"
          role="presentation"
          onClick={() =>
            !excluindo &&
            setAmbienteExclusao(null)
          }
        >
          <div
            className="release-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="release-delete-title"
            aria-describedby="release-delete-description"
            onClick={evento =>
              evento.stopPropagation()
            }
          >
            <div className="release-delete-modal-accent" />

            <div className="release-delete-modal-body">
              <div className="release-delete-badge">
                <MdDeleteOutline size={16} />

                Exclusão permanente
              </div>

              <h2 id="release-delete-title">
                Excluir Ambiente da Release
              </h2>

              <p
                id="release-delete-description"
                className="release-delete-question"
              >
                Tem certeza de que deseja excluir o ambiente
                {" "}
                <strong>
                  “{ambienteExclusao.nome}”
                </strong>
                ?
              </p>

              <div className="release-delete-warning">
                <MdErrorOutline size={21} />

                <span>
                  Esta ação removerá permanentemente o ambiente e não poderá ser desfeita.
                </span>
              </div>

              <div className="release-modal-actions">
                <button
                  type="button"
                  className="release-modal-cancel-button"
                  disabled={excluindo}
                  autoFocus
                  onClick={() =>
                    setAmbienteExclusao(null)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="release-modal-delete-button"
                  disabled={excluindo}
                  onClick={() =>
                    void confirmarExclusao()
                  }
                >
                  <MdDeleteOutline size={18} />

                  {excluindo
                    ? "Excluindo..."
                    : "Excluir ambiente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {ambienteConfirmacao && (
        <div
          role="presentation"
          onClick={() =>
            !salvando &&
            setAmbienteConfirmacao(
              null
            )
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background:
              "rgba(18, 31, 45, 0.48)",
            backdropFilter:
              "blur(3px)",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="release-conclusion-title"
            onClick={event =>
              event.stopPropagation()
            }
            style={{
              width: "min(100%, 470px)",
              borderRadius: "18px",
              background: "#FFFFFF",
              boxShadow:
                "0 24px 70px rgba(0, 0, 0, 0.22)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "5px",
                background:
                  ambienteConfirmacao.concluido
                    ? "#005AA9"
                    : "#F58220",
              }}
            />

            <div
              style={{
                padding:
                  "26px 28px 28px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "5px 10px",
                  marginBottom: "14px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  background:
                    ambienteConfirmacao.concluido
                      ? "#EAF3FB"
                      : "#FFF1E6",
                  color:
                    ambienteConfirmacao.concluido
                      ? "#005AA9"
                      : "#C45D00",
                }}
              >
                {ambienteConfirmacao.concluido
                  ? "Reabrir release"
                  : "Concluir release"}
              </div>

              <h2
                id="release-conclusion-title"
                style={{
                  margin:
                    "0 0 10px",
                  color: "#17212B",
                  fontSize: "22px",
                  lineHeight: 1.25,
                }}
              >
                {ambienteConfirmacao.concluido
                  ? "Reabrir esta release?"
                  : "Esta release já foi para produção?"}
              </h2>

              <p
                style={{
                  margin:
                    "0 0 12px",
                  color: "#4D5965",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                <strong>
                  {ambienteConfirmacao.nome}
                </strong>
              </p>

              <p
                style={{
                  margin: 0,
                  color: "#66727D",
                  fontSize: "14px",
                  lineHeight: 1.65,
                }}
              >
                {ambienteConfirmacao.concluido
                  ? "Ao reabrir, a sincronização automática com o Redmine será retomada e os dados voltarão a acompanhar as alterações da release."
                  : "Ao concluir, a release continuará disponível no ReleaseHub e permanecerá visível no Modo TV como histórico da versão em produção. Apenas a sincronização automática com o Redmine será encerrada."}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "10px",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    setAmbienteConfirmacao(
                      null
                    )
                  }
                  style={{
                    minWidth: "100px",
                    padding: "10px 16px",
                    border:
                      "1px solid #D8DEE5",
                    borderRadius: "9px",
                    background: "#FFFFFF",
                    color: "#56616C",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={salvando}
                  onClick={() =>
                    void confirmarAlteracaoConclusao()
                  }
                  style={{
                    minWidth: "132px",
                    padding: "10px 18px",
                    border: 0,
                    borderRadius: "9px",
                    background:
                      ambienteConfirmacao.concluido
                        ? "#005AA9"
                        : "#F58220",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    cursor: "pointer",
                    opacity:
                      salvando
                        ? 0.7
                        : 1,
                  }}
                >
                  {salvando
                    ? "Salvando..."
                    : ambienteConfirmacao.concluido
                      ? "Reabrir release"
                      : "Concluir release"}
                </button>
              </div>
            </div>
          </div>
        </div>

      )}

      {ambienteWiki && (
        <div
          className="release-modal-overlay"
          role="presentation"
          onClick={() => {
            setAmbienteWiki(null);
            setCopiadoWiki(false);
          }}
        >
          <div
            className="release-wiki-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="release-wiki-title"
            onClick={evento =>
              evento.stopPropagation()
            }
          >
            <div className="release-wiki-modal-accent" />

            <div className="release-wiki-modal-body">
              <div className="release-wiki-badge">
                <MdMenuBook size={16} />
                Wiki do IntelliCash
              </div>

              <h2 id="release-wiki-title">
                Atualizar a página de versões?
              </h2>

              <p className="release-wiki-question">
                A release <strong>{ambienteWiki.nome}</strong> foi concluída.
                Copie a linha abaixo e adicione-a na página geral de atualizações da Wiki.
              </p>

              <div className="release-wiki-version">
                IntelliCash{" "}
                <strong>
                  {obterVersaoIntellicashDoAmbiente(
                    ambienteWiki
                  )}
                </strong>
              </div>

              <div className="release-wiki-code-row">
                <code>
                  {montarLinhaWiki(
                    ambienteWiki
                  )}
                </code>

                <button
                  type="button"
                  className="release-wiki-copy-button"
                  onClick={() =>
                    void copiarLinhaWiki()
                  }
                >
                  <MdContentCopy size={18} />
                  {copiadoWiki
                    ? "Copiado!"
                    : "Copiar linha"}
                </button>
              </div>

              <div className="release-wiki-help">
                <span>
                  Depois, abra a página de Atualizações, cole a linha no ano correspondente e salve.
                </span>
              </div>

              <div className="release-wiki-actions">
                <button
                  type="button"
                  className="release-wiki-later-button"
                  onClick={() => {
                    setAmbienteWiki(null);
                    setCopiadoWiki(false);
                  }}
                >
                  Agora não
                </button>

                <button
                  type="button"
                  className="release-wiki-open-button"
                  onClick={abrirWikiParaEdicao}
                >
                  <MdMenuBook size={18} />
                  Abrir Wiki para editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}


export default ReleaseEnvironments;
