import {
  useMemo,
  useState,
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

  return Number(horas || 0)
    .toLocaleString(
      "pt-BR",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    );

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


  const usuarios =
    useMemo(() => {

      const mapa =
        new Map<
          number,
          string
        >();

      apontamentos.forEach(
        apontamento => {

          if (
            apontamento.usuario?.id &&
            apontamento.usuario?.nome
          ) {

            mapa.set(
              apontamento.usuario.id,
              apontamento.usuario.nome
            );

          }

        }
      );

      return Array.from(
        mapa.entries()
      )
        .map(
          ([
            id,
            nome,
          ]) => ({
            id,
            nome,
          })
        )
        .sort(
          (a, b) =>
            a.nome.localeCompare(
              b.nome,
              "pt-BR"
            )
        );

    }, [
      apontamentos,
    ]);


  const projetos =
    useMemo(() => {

      const mapa =
        new Map<
          number,
          string
        >();

      apontamentos.forEach(
        apontamento => {

          if (
            apontamento.projeto?.id &&
            apontamento.projeto?.nome
          ) {

            mapa.set(
              apontamento.projeto.id,
              apontamento.projeto.nome
            );

          }

        }
      );

      return Array.from(
        mapa.entries()
      )
        .map(
          ([
            id,
            nome,
          ]) => ({
            id,
            nome,
          })
        )
        .sort(
          (a, b) =>
            a.nome.localeCompare(
              b.nome,
              "pt-BR"
            )
        );

    }, [
      apontamentos,
    ]);


  const atividades =
    useMemo(() => {

      const mapa =
        new Map<
          number,
          string
        >();

      apontamentos.forEach(
        apontamento => {

          if (
            apontamento.atividade?.id &&
            apontamento.atividade?.nome
          ) {

            mapa.set(
              apontamento.atividade.id,
              apontamento.atividade.nome
            );

          }

        }
      );

      return Array.from(
        mapa.entries()
      )
        .map(
          ([
            id,
            nome,
          ]) => ({
            id,
            nome,
          })
        )
        .sort(
          (a, b) =>
            a.nome.localeCompare(
              b.nome,
              "pt-BR"
            )
        );

    }, [
      apontamentos,
    ]);


  const apontamentosFiltrados =
    useMemo(() => {

      return apontamentos.filter(
        apontamento => {

          if (
            usuarioSelecionado &&
            String(
              apontamento.usuario?.id ||
              ""
            ) !== usuarioSelecionado
          ) {

            return false;

          }

          if (
            projetoSelecionado &&
            String(
              apontamento.projeto?.id ||
              ""
            ) !== projetoSelecionado
          ) {

            return false;

          }

          if (
            atividadeSelecionada &&
            String(
              apontamento.atividade?.id ||
              ""
            ) !== atividadeSelecionada
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
              apontamento.usuario?.id
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


      if (!response.ok) {

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


      setUsuarioSelecionado("");
      setProjetoSelecionado("");
      setAtividadeSelecionada("");

      setConsultado(true);

    } catch (error) {

      console.error(
        "Erro ao consultar apontamentos:",
        error
      );

      setApontamentos([]);

      setConsultado(true);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível consultar os apontamentos."
      );

    } finally {

      setCarregando(false);

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
              Consulte o tempo registrado por usuário,
              projeto, tarefa e atividade.
            </p>

          </div>

        </div>


        <section className="time-management-filters">

          <div className="time-management-field">

            <label htmlFor="time-from">
              Data inicial
            </label>

            <input
              id="time-from"
              type="date"
              value={dataInicial}
              onChange={
                event =>
                  setDataInicial(
                    event.target.value
                  )
              }
            />

          </div>


          <div className="time-management-field">

            <label htmlFor="time-to">
              Data final
            </label>

            <input
              id="time-to"
              type="date"
              value={dataFinal}
              onChange={
                event =>
                  setDataFinal(
                    event.target.value
                  )
              }
            />

          </div>


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
                  setUsuarioSelecionado(
                    event.target.value
                  )
              }
            >

              <option value="">
                Todos
              </option>

              {usuarios.map(
                usuario => (

                  <option
                    key={
                      usuario.id
                    }
                    value={
                      usuario.id
                    }
                  >
                    {usuario.nome}
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
                  setProjetoSelecionado(
                    event.target.value
                  )
              }
            >

              <option value="">
                Todos
              </option>

              {projetos.map(
                projeto => (

                  <option
                    key={
                      projeto.id
                    }
                    value={
                      projeto.id
                    }
                  >
                    {projeto.nome}
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
                Todas
              </option>

              {atividades.map(
                atividade => (

                  <option
                    key={
                      atividade.id
                    }
                    value={
                      atividade.id
                    }
                  >
                    {atividade.nome}
                  </option>

                )
              )}

            </select>

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
              ? "Consultando..."
              : "Consultar"}

          </button>

        </section>


        {erro && (

          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              background:
                "rgba(220, 38, 38, 0.08)",
              color:
                "#dc2626",
              fontSize:
                "12px",
              fontWeight:
                600,
            }}
          >
            {erro}
          </div>

        )}


        <section className="time-management-summary">

          <div className="time-management-summary-card">

            <span>
              Total de horas
            </span>

            <strong>
              {formatarHoras(
                totalHoras
              )}h
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


        <section className="time-management-table-card">

          <div className="time-management-table-header">

            <div>

              <span className="time-management-kicker">
                Detalhamento
              </span>

              <h2>
                Apontamentos de horas
              </h2>

            </div>

          </div>


          <div className="time-management-table-wrapper">

            <table className="time-management-table">

              <thead>

                <tr>

                  <th>
                    Data
                  </th>

                  <th>
                    Usuário
                  </th>

                  <th>
                    Projeto
                  </th>

                  <th>
                    Tarefa
                  </th>

                  <th>
                    Atividade
                  </th>

                  <th>
                    Horas
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

                      Selecione um período para consultar
                      os apontamentos do Redmine.

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
                  apontamentosFiltrados.length ===
                    0 && (

                  <tr className="time-management-empty-row">

                    <td colSpan={7}>

                      Nenhum apontamento encontrado
                      para os filtros selecionados.

                    </td>

                  </tr>

                )}


                {!carregando &&
                  apontamentosFiltrados.map(
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
                          {apontamento.usuario
                            ?.nome ||
                            "-"}
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
                          {formatarHoras(
                            apontamento.horas
                          )}h
                        </td>

                        <td>
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