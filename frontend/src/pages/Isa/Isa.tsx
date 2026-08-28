import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  MdAndroid,
  MdCheckCircle,
  MdDns,
  MdErrorOutline,
  MdRefresh,
  MdSave,
} from "react-icons/md";

import Layout from "../../components/layout/Layout";

import {
  buscarSessao,
} from "../../services/AuthService";

import {
  buscarCompatibilidade,
} from "../../services/CompatibilityService";

import {
  atualizarVersaoIsa,
  buscarIsaPorAmbiente,
  ordenarAplicativosIsa,
} from "../../services/IsaService";

import {
  listarAmbientes,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";

import type {
  EnvironmentCompatibility,
} from "../../types/compatibility";

import type {
  IsaApplication,
} from "../../types/isa";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

import "./Isa.css";


type Feedback = {
  tipo:
    | "sucesso"
    | "erro";

  texto:
    string;
};


function normalizarTexto(
  valor?: string | null
) {

  return String(
    valor ?? ""
  )
    .normalize("NFD")
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


function Isa() {

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
    useState<
      number | null
    >(null);


  const [
    compatibilidade,
    setCompatibilidade,
  ] =
    useState<
      EnvironmentCompatibility | null
    >(null);


  const [
    aplicativos,
    setAplicativos,
  ] =
    useState<
      IsaApplication[]
    >([]);


  const [
    versoesEdicao,
    setVersoesEdicao,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({});


  const [
    podeEditar,
    setPodeEditar,
  ] =
    useState(false);


  const [
    carregando,
    setCarregando,
  ] =
    useState(true);


  const [
    carregandoDados,
    setCarregandoDados,
  ] =
    useState(false);


  const [
    salvandoId,
    setSalvandoId,
  ] =
    useState<
      number | null
    >(null);


  const [
    feedback,
    setFeedback,
  ] =
    useState<
      Feedback | null
    >(null);


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


  /*
    A versão do ISA Servidor
    continua sendo controlada
    pela Compatibilidade.

    Não existe uma segunda versão
    salva no módulo ISA.
  */

  const isaServidor =
    useMemo(
      () => {

        const itens =
          compatibilidade
            ?.items ??
          [];


        return (
          itens.find(
            item =>
              normalizarTexto(
                item.displayName
              ) ===
              "isaservidor"
          ) ??

          /*
            Fallback para cadastros
            antigos, antes da alteração
            do nome IntelliStock
            para ISA Servidor.
          */

          itens.find(
            item =>
              normalizarTexto(
                item.originalName
              ).includes(
                "intellistock"
              )
          ) ??

          itens.find(
            item =>
              normalizarTexto(
                item.displayName
              ).includes(
                "intellistock"
              )
          ) ??

          null
        );

      },
      [
        compatibilidade,
      ]
    );


  const versaoIsaServidor =
    isaServidor
      ?.selectedVersion
      ?.trim() ||
    "";


  /*
    Carrega:
    - releases;
    - usuário logado;
    - ambiente inicial.
  */

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
          ] =
            await Promise.all(
              [
                listarAmbientes(),
                buscarSessao(),
              ]
            );


          if (!ativo) {

            return;

          }


          const ordenados =
            ordenarAmbientesPorVersao(
              lista
            );


          setAmbientes(
            ordenados
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
                      !ambiente.concluido
                  )?.id ??
                  ordenados[0]
                    ?.id ??
                  null
                );


          setEnvironmentId(
            ambienteInicial
          );

        } catch (erro) {

          console.error(
            "Erro ao carregar página ISA:",
            erro
          );


          if (ativo) {

            setFeedback(
              {
                tipo:
                  "erro",

                texto:
                  erro instanceof Error
                    ? erro.message
                    : "Não foi possível carregar a página ISA.",
              }
            );

          }

        } finally {

          if (ativo) {

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

      // Ambiente da URL usado
      // somente na carga inicial.
      // eslint-disable-next-line react-hooks/exhaustive-deps

    },
    []
  );


  /*
    Quando muda a release,
    carrega em paralelo:

    - Compatibilidade,
      para obter ISA Servidor;

    - dados próprios do ISA,
      para obter os apps Android.
  */

  useEffect(
    () => {

      if (!environmentId) {

        setCompatibilidade(
          null
        );

        setAplicativos(
          []
        );

        return;

      }


      let ativo =
        true;


      async function carregarDados() {

        try {

          setCarregandoDados(
            true
          );


          const [
            dadosCompatibilidade,
            dadosIsa,
          ] =
            await Promise.all(
              [
                buscarCompatibilidade(
                  environmentId as number
                ),

                buscarIsaPorAmbiente(
                  environmentId as number
                ),
              ]
            );


          if (!ativo) {

            return;

          }


          setCompatibilidade(
            dadosCompatibilidade
          );


          const ordenados =
            ordenarAplicativosIsa(
              dadosIsa.applications ??
                []
            );


          setAplicativos(
            ordenados
          );


          const edicao:
            Record<
              number,
              string
            > =
            {};


          ordenados.forEach(
            aplicativo => {

              edicao[
                aplicativo.id
              ] =
                aplicativo.version ??
                "";

            }
          );


          setVersoesEdicao(
            edicao
          );


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

        } catch (erro) {

          console.error(
            "Erro ao carregar dados ISA:",
            erro
          );


          if (ativo) {

            setCompatibilidade(
              null
            );

            setAplicativos(
              []
            );


            setFeedback(
              {
                tipo:
                  "erro",

                texto:
                  erro instanceof Error
                    ? erro.message
                    : "Não foi possível carregar as versões ISA.",
              }
            );

          }

        } finally {

          if (ativo) {

            setCarregandoDados(
              false
            );

          }

        }

      }


      void carregarDados();


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


  /*
    Feedback desaparece
    automaticamente.
  */

  useEffect(
    () => {

      if (!feedback) {

        return;

      }


      const timeout =
        window.setTimeout(
          () =>
            setFeedback(
              null
            ),
          5000
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


  function alterarVersao(
    applicationId: number,
    valor: string
  ) {

    setVersoesEdicao(
      atual => ({
        ...atual,

        [applicationId]:
          valor,
      })
    );

  }


  function possuiAlteracao(
    aplicativo:
      IsaApplication
  ) {

    return (
      (
        versoesEdicao[
          aplicativo.id
        ] ??
        ""
      ).trim() !==
      (
        aplicativo.version ??
        ""
      ).trim()
    );

  }


  async function salvarVersao(
    aplicativo:
      IsaApplication
  ) {

    if (
      !environmentId
    ) {

      return;

    }


    const novaVersao =
      (
        versoesEdicao[
          aplicativo.id
        ] ??
        ""
      ).trim();


    if (!novaVersao) {

      setFeedback(
        {
          tipo:
            "erro",

          texto:
            `Informe a versão do ${aplicativo.name}.`,
        }
      );

      return;

    }


    try {

      setSalvandoId(
        aplicativo.id
      );


      const resposta =
        await atualizarVersaoIsa(
          environmentId,
          aplicativo.id,
          novaVersao
        );


      setAplicativos(
        atual =>
          atual.map(
            item =>
              item.id ===
              aplicativo.id
                ? {
                    ...item,

                    version:
                      resposta
                        .application
                        .version,
                  }
                : item
          )
      );


      setVersoesEdicao(
        atual => ({
          ...atual,

          [aplicativo.id]:
            resposta
              .application
              .version,
        })
      );


      setFeedback(
        {
          tipo:
            "sucesso",

          texto:
            `Versão do ${aplicativo.name} atualizada com sucesso.`,
        }
      );

    } catch (erro) {

      console.error(
        "Erro ao atualizar versão ISA:",
        erro
      );


      setFeedback(
        {
          tipo:
            "erro",

          texto:
            erro instanceof Error
              ? erro.message
              : `Não foi possível atualizar o ${aplicativo.name}.`,
        }
      );

    } finally {

      setSalvandoId(
        null
      );

    }

  }


  async function recarregar() {

    if (!environmentId) {

      return;

    }


    try {

      setCarregandoDados(
        true
      );


      const [
        dadosCompatibilidade,
        dadosIsa,
      ] =
        await Promise.all(
          [
            buscarCompatibilidade(
              environmentId
            ),

            buscarIsaPorAmbiente(
              environmentId
            ),
          ]
        );


      setCompatibilidade(
        dadosCompatibilidade
      );


      const ordenados =
        ordenarAplicativosIsa(
          dadosIsa.applications ??
            []
        );


      setAplicativos(
        ordenados
      );


      const edicao:
        Record<
          number,
          string
        > =
        {};


      ordenados.forEach(
        aplicativo => {

          edicao[
            aplicativo.id
          ] =
            aplicativo.version ??
            "";

        }
      );


      setVersoesEdicao(
        edicao
      );

    } catch (erro) {

      setFeedback(
        {
          tipo:
            "erro",

          texto:
            erro instanceof Error
              ? erro.message
              : "Não foi possível atualizar os dados ISA.",
        }
      );

    } finally {

      setCarregandoDados(
        false
      );

    }

  }


  return (

    <Layout>

      <main className="isa-page">

        <header className="isa-header">

          <div>

            <span className="isa-eyebrow">
              Ecossistema ISA
            </span>

            <h1>
              Controle de versões ISA
            </h1>

            <p>
              Consulte o ISA Servidor
              utilizado em cada versão
              do IntelliCash e gerencie
              individualmente as versões
              dos aplicativos Android.
            </p>

          </div>


          <button
            type="button"
            className="isa-refresh-button"
            onClick={() =>
              void recarregar()
            }
            disabled={
              carregandoDados ||
              !environmentId
            }
          >

            <MdRefresh
              size={20}
            />

            Atualizar

          </button>

        </header>


        {feedback && (

          <div
            className={`isa-feedback isa-feedback-${feedback.tipo}`}
          >

            {feedback.tipo ===
            "sucesso" ? (

              <MdCheckCircle
                size={20}
              />

            ) : (

              <MdErrorOutline
                size={20}
              />

            )}

            <span>
              {feedback.texto}
            </span>

          </div>

        )}


        <section className="isa-environment-card">

          <div className="isa-environment-title">

            <span>
              Release selecionada
            </span>

            <strong>
              {ambienteSelecionado
                ?.nome ||
                "Ambiente da release"}
            </strong>

          </div>


          <label className="isa-environment-field">

            <span>
              Versão do IntelliCash
            </span>

            <select
              value={
                environmentId ??
                ""
              }
              disabled={
                carregando ||
                ambientes.length ===
                  0
              }
              onChange={
                evento =>
                  setEnvironmentId(
                    Number(
                      evento
                        .target
                        .value
                    )
                  )
              }
            >

              {ambientes.map(
                ambiente => (

                  <option
                    key={
                      ambiente.id
                    }
                    value={
                      ambiente.id
                    }
                  >
                    {
                      ambiente
                        .versoes
                        .intellicash
                    }

                    {
                      ambiente.nome
                        ? ` — ${ambiente.nome}`
                        : ""
                    }
                  </option>

                )
              )}

            </select>

          </label>

        </section>


        {carregando ||
        carregandoDados ? (

          <section className="isa-loading">

            Carregando versões ISA...

          </section>

        ) : (

          <>

            <section className="isa-server-section">

              <div className="isa-section-heading">

                <div>

                  <span className="isa-section-kicker">
                    Servidor
                  </span>

                  <h2>
                    ISA Servidor
                  </h2>

                </div>

              </div>


              <article className="isa-server-card">

                <div className="isa-server-icon">

                  <MdDns
                    size={30}
                  />

                </div>


                <div className="isa-server-content">

                  <span>
                    Versão compatível
                    com o IntelliCash
                  </span>

                  <strong>
                    {
                      versaoIsaServidor ||
                      "Versão não informada"
                    }
                  </strong>

                  <small>
                    Esta versão é
                    definida pela
                    Compatibilidade da
                    release e não é
                    alterada nesta tela.
                  </small>

                </div>


                <div className="isa-server-release">

                  <span>
                    IntelliCash
                  </span>

                  <strong>
                    {
                      ambienteSelecionado
                        ?.versoes
                        .intellicash ||
                      "-"
                    }
                  </strong>

                </div>

              </article>

            </section>


            <section className="isa-apps-section">

              <div className="isa-section-heading">

                <div>

                  <span className="isa-section-kicker">
                    Aplicativos
                  </span>

                  <h2>
                    Aplicativos Android
                  </h2>

                  <p>
                    Cada aplicativo possui
                    sua própria versão
                    para esta release.
                  </p>

                </div>


                <span className="isa-app-count">

                  {aplicativos.length}

                  {" "}

                  {aplicativos.length ===
                  1
                    ? "aplicativo"
                    : "aplicativos"}

                </span>

              </div>


              {aplicativos.length ===
              0 ? (

                <div className="isa-empty">

                  Nenhum aplicativo ISA
                  foi encontrado.

                </div>

              ) : (

                <div className="isa-app-grid">

                  {aplicativos.map(
                    aplicativo => {

                      const alterado =
                        possuiAlteracao(
                          aplicativo
                        );


                      const salvando =
                        salvandoId ===
                        aplicativo.id;


                      return (

                        <article
                          key={
                            aplicativo.id
                          }
                          className={`isa-app-card ${
                            alterado
                              ? "isa-app-card-changed"
                              : ""
                          }`}
                        >

                          <div className="isa-app-card-header">

                            <div className="isa-app-icon">

                              <MdAndroid
                                size={24}
                              />

                            </div>


                            <div>

                              <span>
                                Aplicativo
                                Android
                              </span>

                              <h3>
                                {
                                  aplicativo.name
                                }
                              </h3>

                            </div>

                          </div>


                          <div className="isa-app-current">

                            <span>
                              Versão atual
                            </span>

                            <strong>
                              {
                                aplicativo.version ||
                                "Não informada"
                              }
                            </strong>

                          </div>


                          <label className="isa-version-field">

                            <span>
                              Versão nesta
                              release
                            </span>

                            <input
                              type="text"
                              value={
                                versoesEdicao[
                                  aplicativo.id
                                ] ??
                                ""
                              }
                              placeholder="Ex.: 1.5.0"
                              disabled={
                                !podeEditar ||
                                salvando
                              }
                              onChange={
                                evento =>
                                  alterarVersao(
                                    aplicativo.id,
                                    evento
                                      .target
                                      .value
                                  )
                              }
                              onKeyDown={
                                evento => {

                                  if (
                                    evento.key ===
                                      "Enter" &&
                                    alterado &&
                                    podeEditar
                                  ) {

                                    evento.preventDefault();

                                    void salvarVersao(
                                      aplicativo
                                    );

                                  }

                                }
                              }
                            />

                          </label>


                          <footer className="isa-app-footer">

                            {!podeEditar ? (

                              <span className="isa-readonly">
                                Somente
                                visualização
                              </span>

                            ) : (

                              <button
                                type="button"
                                className="isa-save-button"
                                disabled={
                                  !alterado ||
                                  salvando
                                }
                                onClick={() =>
                                  void salvarVersao(
                                    aplicativo
                                  )
                                }
                              >

                                <MdSave
                                  size={18}
                                />

                                {salvando
                                  ? "Salvando..."
                                  : "Salvar versão"}

                              </button>

                            )}

                          </footer>

                        </article>

                      );

                    }
                  )}

                </div>

              )}

            </section>

          </>

        )}

      </main>

    </Layout>

  );

}


export default Isa;