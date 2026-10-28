import {
  useMemo,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react";

import Layout from "../../components/layout";

import "./TimeManagement.css";


interface TimeEntry {
  id: number;
  data: string;
  horas: number;

  usuario: {
    id?: number;
    nome?: string;
  };

  projeto: {
    id?: number;
    nome?: string;
  };

  tarefa: {
    id?: number;
  };

  atividade: {
    id?: number;
    nome?: string;
  };

  comentario?: string;
}


interface TimeEntriesResponse {
  total: number;
  dados: TimeEntry[];
}


type CampoOrdenacao =
  | "data"
  | "usuario"
  | "projeto"
  | "tarefa"
  | "atividade"
  | "horas";


type DirecaoOrdenacao =
  | "asc"
  | "desc";


function formatarData(
  data: string
) {

  if (!data) {

    return "-";

  }

  const partes =
    data.split("-");

  if (
    partes.length !== 3
  ) {

    return data;

  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


function formatarHoras(
  horas: number
) {

  const totalMinutos =
    Math.round(
      Number(horas || 0) * 60
    );

  const horasInteiras =
    Math.floor(
      totalMinutos / 60
    );

  const minutos =
    totalMinutos % 60;


  if (
    horasInteiras === 0
  ) {

    return `${minutos}min`;

  }


  if (
    minutos === 0
  ) {

    return `${horasInteiras}h`;

  }


  return `${horasInteiras}h ${minutos}min`;

}


function TimeManagement() {

  const [
    dataInicial,
    setDataInicial,
  ] =
    useState("");

  const [
    dataFinal,
    setDataFinal,
  ] =
    useState("");


  const [
    usuarioSelecionado,
    setUsuarioSelecionado,
  ] =
    useState("");

  const [
    projetoSelecionado,
    setProjetoSelecionado,
  ] =
    useState("");

  const [
    atividadeSelecionada,
    setAtividadeSelecionada,
  ] =
    useState("");


  const [
    campoOrdenacao,
    setCampoOrdenacao,
  ] =
    useState<CampoOrdenacao>(
      "data"
    );

  const [
    direcaoOrdenacao,
    setDirecaoOrdenacao,
  ] =
    useState<DirecaoOrdenacao>(
      "desc"
    );


  const [
    apontamentos,
    setApontamentos,
  ] =
    useState<TimeEntry[]>([]);

  const [
    consultado,
    setConsultado,
  ] =
    useState(false);

  const [
    carregando,
    setCarregando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState("");


  function preencherDataAtual(
    event:
      KeyboardEvent<HTMLInputElement>,
    setter:
      Dispatch<SetStateAction<string>>
  ) {

    if (
      event.code !== "Space"
    ) {

      return;

    }


    event.preventDefault();


    const hoje =
      new Date();


    const ano =
      hoje.getFullYear();


    const mes =
      String(
        hoje.getMonth() + 1
      )
        .padStart(
          2,
          "0"
        );


    const dia =
      String(
        hoje.getDate()
      )
        .padStart(
          2,
          "0"
        );


    setter(
      `${ano}-${mes}-${dia}`
    );

  }


  const usuarios =
    useMemo(() => {

      return Array.from(
        new Set(
          apontamentos
            .map(
              apontamento =>
                apontamento.usuario
                  ?.nome
                  ?.trim()
            )
            .filter(
              (
                nome
              ): nome is string =>
                Boolean(nome)
            )
        )
      )
        .sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        );

    }, [
      apontamentos,
    ]);


  const apontamentosDoUsuario =
    useMemo(() => {

      if (
        !usuarioSelecionado
      ) {

        return apontamentos;

      }


      return apontamentos.filter(
        apontamento =>
          apontamento.usuario
            ?.nome
            ?.trim() ===
          usuarioSelecionado
      );

    }, [
      apontamentos,
      usuarioSelecionado,
    ]);


  const projetos =
    useMemo(() => {

      return Array.from(
        new Set(
          apontamentosDoUsuario
            .map(
              apontamento =>
                apontamento.projeto
                  ?.nome
                  ?.trim()
            )
            .filter(
              (
                nome
              ): nome is string =>
                Boolean(nome)
            )
        )
      )
        .sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        );

    }, [
      apontamentosDoUsuario,
    ]);


  const apontamentosDoProjeto =
    useMemo(() => {

      if (
        !projetoSelecionado
      ) {

        return apontamentosDoUsuario;

      }


      return apontamentosDoUsuario.filter(
        apontamento =>
          apontamento.projeto
            ?.nome
            ?.trim() ===
          projetoSelecionado
      );

    }, [
      apontamentosDoUsuario,
      projetoSelecionado,
    ]);


  const atividades =
    useMemo(() => {

      return Array.from(
        new Set(
          apontamentosDoProjeto
            .map(
              apontamento =>
                apontamento.atividade
                  ?.nome
                  ?.trim()
            )
            .filter(
              (
                nome
              ): nome is string =>
                Boolean(nome)
            )
        )
      )
        .sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        );

    }, [
      apontamentosDoProjeto,
    ]);


  const apontamentosFiltrados =
    useMemo(() => {

      return apontamentos.filter(
        apontamento => {

          const usuario =
            apontamento.usuario
              ?.nome
              ?.trim() ||
            "";

          const projeto =
            apontamento.projeto
              ?.nome
              ?.trim() ||
            "";

          const atividade =
            apontamento.atividade
              ?.nome
              ?.trim() ||
            "";


          if (
            usuarioSelecionado &&
            usuario !==
              usuarioSelecionado
          ) {

            return false;

          }


          if (
            projetoSelecionado &&
            projeto !==
              projetoSelecionado
          ) {

            return false;

          }


          if (
            atividadeSelecionada &&
            atividade !==
              atividadeSelecionada
          ) {

            return false;

          }


          return true;

        }
      );

    }, [
      apontamentos,
      usuarioSelecionado,
      projetoSelecionado,
      atividadeSelecionada,
    ]);


  const apontamentosOrdenados =
    useMemo(() => {

      const lista =
        [
          ...apontamentosFiltrados,
        ];


      lista.sort(
        (
          a,
          b
        ) => {

          let comparacao =
            0;


          switch (
            campoOrdenacao
          ) {

            case "data":

              comparacao =
                a.data.localeCompare(
                  b.data
                );

              break;


            case "usuario":

              comparacao =
                (
                  a.usuario?.nome ||
                  ""
                )
                  .localeCompare(
                    b.usuario?.nome ||
                    "",
                    "pt-BR"
                  );

              break;


            case "projeto":

              comparacao =
                (
                  a.projeto?.nome ||
                  ""
                )
                  .localeCompare(
                    b.projeto?.nome ||
                    "",
                    "pt-BR"
                  );

              break;


            case "tarefa":

              comparacao =
                Number(
                  a.tarefa?.id ||
                  0
                ) -
                Number(
                  b.tarefa?.id ||
                  0
                );

              break;


            case "atividade":

              comparacao =
                (
                  a.atividade?.nome ||
                  ""
                )
                  .localeCompare(
                    b.atividade?.nome ||
                    "",
                    "pt-BR"
                  );

              break;


            case "horas":

              comparacao =
                Number(
                  a.horas ||
                  0
                ) -
                Number(
                  b.horas ||
                  0
                );

              break;

          }


          return direcaoOrdenacao ===
            "asc"
            ? comparacao
            : comparacao * -1;

        }
      );


      return lista;

    }, [
      apontamentosFiltrados,
      campoOrdenacao,
      direcaoOrdenacao,
    ]);


  const totalHoras =
    useMemo(() => {

      return apontamentosFiltrados.reduce(
        (
          total,
          apontamento
        ) =>
          total +
          Number(
            apontamento.horas ||
            0
          ),
        0
      );

    }, [
      apontamentosFiltrados,
    ]);


  const totalUsuarios =
    useMemo(() => {

      return new Set(
        apontamentosFiltrados
          .map(
            apontamento =>
              apontamento.usuario
                ?.nome
                ?.trim()
          )
          .filter(Boolean)
      ).size;

    }, [
      apontamentosFiltrados,
    ]);


  const totalTarefas =
    useMemo(() => {

      return new Set(
        apontamentosFiltrados
          .map(
            apontamento =>
              apontamento.tarefa?.id
          )
          .filter(Boolean)
      ).size;

    }, [
      apontamentosFiltrados,
    ]);


  function ordenarPor(
    campo: CampoOrdenacao
  ) {

    if (
      campoOrdenacao ===
      campo
    ) {

      setDirecaoOrdenacao(
        atual =>
          atual === "asc"
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


  function indicadorOrdenacao(
    campo: CampoOrdenacao
  ) {

    if (
      campoOrdenacao !==
      campo
    ) {

      return "↕";

    }


    return direcaoOrdenacao ===
      "asc"
      ? "↑"
      : "↓";

  }


  function alterarUsuario(
    usuario: string
  ) {

    setUsuarioSelecionado(
      usuario
    );

    setProjetoSelecionado(
      ""
    );

    setAtividadeSelecionada(
      ""
    );

  }


  function alterarProjeto(
    projeto: string
  ) {

    setProjetoSelecionado(
      projeto
    );

    setAtividadeSelecionada(
      ""
    );

  }


  function limparFiltros() {

    setUsuarioSelecionado(
      ""
    );

    setProjetoSelecionado(
      ""
    );

    setAtividadeSelecionada(
      ""
    );

  }


  async function consultar() {

    setErro("");

    if (
      !dataInicial ||
      !dataFinal
    ) {

      setErro(
        "Informe a data inicial e a data final."
      );

      return;

    }


    if (
      dataInicial >
      dataFinal
    ) {

      setErro(
        "A data inicial não pode ser maior que a data final."
      );

      return;

    }


    setCarregando(true);


    try {

      const parametros =
        new URLSearchParams({
          from:
            dataInicial,

          to:
            dataFinal,
        });


      const response =
        await fetch(
          `/api/redmine-time-entries?${parametros.toString()}`,
          {
            method:
              "GET",

            credentials:
              "include",

            cache:
              "no-store",
          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        throw new Error(
          data.erro ||
          "Não foi possível consultar os apontamentos."
        );

      }


      const resultado =
        data as TimeEntriesResponse;


      setApontamentos(
        Array.isArray(
          resultado.dados
        )
          ? resultado.dados
          : []
      );


      setUsuarioSelecionado(
        ""
      );

      setProjetoSelecionado(
        ""
      );

      setAtividadeSelecionada(
        ""
      );

      setCampoOrdenacao(
        "data"
      );

      setDirecaoOrdenacao(
        "desc"
      );

      setConsultado(
        true
      );

    } catch (error) {

      console.error(
        "Erro ao consultar apontamentos:",
        error
      );


      setApontamentos(
        []
      );

      setConsultado(
        true
      );


      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar os apontamentos."
      );

    } finally {

      setCarregando(
        false
      );

    }

  }


  return (

    <Layout>

      <div className="time-management-page">


        <div className="time-management-header">

          <div>

            <span className="time-management-kicker">
              Relatórios
            </span>

            <h1>
              Gestão de Horas
            </h1>

            <p>
              Consulte e analise os apontamentos
              registrados no Redmine.
            </p>

          </div>

        </div>


        <section className="time-management-query-card">

          <div className="time-management-section-heading">

            <div className="time-management-step">
              1
            </div>

            <div>

              <h2>
                Consultar período
              </h2>

              <p>
                Primeiro escolha o período que deseja analisar.
              </p>

            </div>

          </div>


          <div className="time-management-query-fields">

            <div className="time-management-field">

              <label htmlFor="time-from">
                Data inicial
              </label>

              <input
                id="time-from"
                type="date"
                value={
                  dataInicial
                }
                onChange={
                  event =>
                    setDataInicial(
                      event.target.value
                    )
                }
                onKeyDown={
                  event =>
                    preencherDataAtual(
                      event,
                      setDataInicial
                    )
                }
                title="Pressione Espaço para preencher com a data de hoje"
              />

            </div>


            <div className="time-management-field">

              <label htmlFor="time-to">
                Data final
              </label>

              <input
                id="time-to"
                type="date"
                value={
                  dataFinal
                }
                onChange={
                  event =>
                    setDataFinal(
                      event.target.value
                    )
                }
                onKeyDown={
                  event =>
                    preencherDataAtual(
                      event,
                      setDataFinal
                    )
                }
                title="Pressione Espaço para preencher com a data de hoje"
              />

            </div>


            <button
              type="button"
              className="time-management-filter-button"
              onClick={() =>
                void consultar()
              }
              disabled={
                carregando
              }
            >

              {carregando
                ? "Buscando..."
                : "Buscar apontamentos"}

            </button>

          </div>

        </section>


        {erro && (

          <div className="time-management-error">

            {erro}

          </div>

        )}


        {consultado &&
          apontamentos.length > 0 && (

          <section className="time-management-refine-card">

            <div className="time-management-refine-header">

              <div className="time-management-section-heading">

                <div className="time-management-step">
                  2
                </div>

                <div>

                  <h2>
                    Refinar resultados
                  </h2>

                  <p>
                    Use os filtros abaixo sobre os dados
                    encontrados no período.
                  </p>

                </div>

              </div>


              <button
                type="button"
                className="time-management-clear-button"
                onClick={
                  limparFiltros
                }
                disabled={
                  !usuarioSelecionado &&
                  !projetoSelecionado &&
                  !atividadeSelecionada
                }
              >
                Limpar filtros
              </button>

            </div>


            <div className="time-management-refine-fields">


              <div className="time-management-field">

                <label htmlFor="time-user">
                  Usuário
                </label>

                <select
                  id="time-user"
                  value={
                    usuarioSelecionado
                  }
                  onChange={
                    event =>
                      alterarUsuario(
                        event.target.value
                      )
                  }
                >

                  <option value="">
                    Todos os usuários
                  </option>

                  {usuarios.map(
                    usuario => (

                      <option
                        key={
                          usuario
                        }
                        value={
                          usuario
                        }
                      >
                        {usuario}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="time-management-field">

                <label htmlFor="time-project">
                  Projeto
                </label>

                <select
                  id="time-project"
                  value={
                    projetoSelecionado
                  }
                  onChange={
                    event =>
                      alterarProjeto(
                        event.target.value
                      )
                  }
                >

                  <option value="">
                    Todos os projetos
                  </option>

                  {projetos.map(
                    projeto => (

                      <option
                        key={
                          projeto
                        }
                        value={
                          projeto
                        }
                      >
                        {projeto}
                      </option>

                    )
                  )}

                </select>

              </div>


              <div className="time-management-field">

                <label htmlFor="time-activity">
                  Atividade
                </label>

                <select
                  id="time-activity"
                  value={
                    atividadeSelecionada
                  }
                  onChange={
                    event =>
                      setAtividadeSelecionada(
                        event.target.value
                      )
                  }
                >

                  <option value="">
                    Todas as atividades
                  </option>

                  {atividades.map(
                    atividade => (

                      <option
                        key={
                          atividade
                        }
                        value={
                          atividade
                        }
                      >
                        {atividade}
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>

          </section>

        )}


        {consultado && (

          <section className="time-management-summary">

            <div className="time-management-summary-card">

              <span>
                Total de horas
              </span>

              <strong>

                {formatarHoras(
                  totalHoras
                )}

              </strong>

            </div>


            <div className="time-management-summary-card">

              <span>
                Usuários
              </span>

              <strong>
                {totalUsuarios}
              </strong>

            </div>


            <div className="time-management-summary-card">

              <span>
                Tarefas
              </span>

              <strong>
                {totalTarefas}
              </strong>

            </div>

          </section>

        )}


        <section className="time-management-table-card">

          <div className="time-management-table-header">

            <div>

              <span className="time-management-kicker">
                Detalhamento
              </span>

              <h2>
                Apontamentos de horas
              </h2>

              {consultado && (

                <p>
                  {apontamentosFiltrados.length}
                  {" "}
                  apontamento
                  {apontamentosFiltrados.length === 1
                    ? ""
                    : "s"}
                  {" "}
                  encontrado
                  {apontamentosFiltrados.length === 1
                    ? ""
                    : "s"}
                </p>

              )}

            </div>


            {consultado &&
              apontamentos.length > 0 && (

              <span className="time-management-sort-hint">
                Clique no título da coluna para ordenar
              </span>

            )}

          </div>


          <div className="time-management-table-wrapper">

            <table className="time-management-table">

              <thead>

                <tr>

                  <th>

                    <button
                      type="button"
                      className={
                        campoOrdenacao === "data"
                          ? "time-management-sort active"
                          : "time-management-sort"
                      }
                      onClick={() =>
                        ordenarPor(
                          "data"
                        )
                      }
                    >
                      Data

                      <span>
                        {indicadorOrdenacao(
                          "data"
                        )}
                      </span>
                    </button>

                  </th>


                  <th>

                    <button
                      type="button"
                      className={
                        campoOrdenacao === "usuario"
                          ? "time-management-sort active"
                          : "time-management-sort"
                      }
                      onClick={() =>
                        ordenarPor(
                          "usuario"
                        )
                      }
                    >
                      Usuário

                      <span>
                        {indicadorOrdenacao(
                          "usuario"
                        )}
                      </span>
                    </button>

                  </th>


                  <th>

                    <button
                      type="button"
                      className={
                        campoOrdenacao === "projeto"
                          ? "time-management-sort active"
                          : "time-management-sort"
                      }
                      onClick={() =>
                        ordenarPor(
                          "projeto"
                        )
                      }
                    >
                      Projeto

                      <span>
                        {indicadorOrdenacao(
                          "projeto"
                        )}
                      </span>
                    </button>

                  </th>


                  <th>

                    <button
                      type="button"
                      className={
                        campoOrdenacao === "tarefa"
                          ? "time-management-sort active"
                          : "time-management-sort"
                      }
                      onClick={() =>
                        ordenarPor(
                          "tarefa"
                        )
                      }
                    >
                      Tarefa

                      <span>
                        {indicadorOrdenacao(
                          "tarefa"
                        )}
                      </span>
                    </button>

                  </th>


                  <th>

                    <button
                      type="button"
                      className={
                        campoOrdenacao === "atividade"
                          ? "time-management-sort active"
                          : "time-management-sort"
                      }
                      onClick={() =>
                        ordenarPor(
                          "atividade"
                        )
                      }
                    >
                      Atividade

                      <span>
                        {indicadorOrdenacao(
                          "atividade"
                        )}
                      </span>
                    </button>

                  </th>


                  <th>

                    <button
                      type="button"
                      className={
                        campoOrdenacao === "horas"
                          ? "time-management-sort active"
                          : "time-management-sort"
                      }
                      onClick={() =>
                        ordenarPor(
                          "horas"
                        )
                      }
                    >
                      Horas

                      <span>
                        {indicadorOrdenacao(
                          "horas"
                        )}
                      </span>
                    </button>

                  </th>


                  <th>
                    Comentário
                  </th>

                </tr>

              </thead>


              <tbody>

                {!consultado && (

                  <tr className="time-management-empty-row">

                    <td colSpan={7}>

                      Escolha um período acima para
                      consultar os apontamentos do Redmine.

                    </td>

                  </tr>

                )}


                {consultado &&
                  carregando && (

                  <tr className="time-management-empty-row">

                    <td colSpan={7}>

                      Consultando apontamentos...

                    </td>

                  </tr>

                )}


                {consultado &&
                  !carregando &&
                  apontamentosOrdenados.length ===
                    0 && (

                  <tr className="time-management-empty-row">

                    <td colSpan={7}>

                      Nenhum apontamento encontrado
                      para os filtros selecionados.

                    </td>

                  </tr>

                )}


                {!carregando &&
                  apontamentosOrdenados.map(
                    apontamento => (

                      <tr
                        key={
                          apontamento.id
                        }
                      >

                        <td>

                          {formatarData(
                            apontamento.data
                          )}

                        </td>

                        <td>

                          <strong className="time-management-user-name">

                            {apontamento.usuario
                              ?.nome ||
                              "-"}

                          </strong>

                        </td>

                        <td>

                          {apontamento.projeto
                            ?.nome ||
                            "-"}

                        </td>

                        <td>

                          {apontamento.tarefa
                            ?.id
                            ? `#${apontamento.tarefa.id}`
                            : "-"}

                        </td>

                        <td>

                          {apontamento.atividade
                            ?.nome ||
                            "-"}

                        </td>

                        <td>

                          <strong className="time-management-hours">

                            {formatarHoras(
                              apontamento.horas
                            )}

                          </strong>

                        </td>

                        <td className="time-management-comment">

                          {apontamento.comentario ||
                            "-"}

                        </td>

                      </tr>

                    )
                  )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </Layout>

  );

}


export default TimeManagement;