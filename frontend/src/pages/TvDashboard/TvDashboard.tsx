import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./TvDashboard.css";

import logo from "../../assets/images/logo.png";

import TvProjectCard from "../../components/TvProjectCard/TvProjectCard";

import CompatibilityPanel from "../../components/CompatibilityPanel/CompatibilityPanel";

import {
  listarAmbientes,
  obterAmbienteMaisRecente,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";

import {
  listarProjetosPorAmbiente,
} from "../../services/ReleaseProjectService";

import type {
  Project,
} from "../../types/project";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";


const STORAGE_KEY =
  "releasehub_tv_environment";


function TvDashboard() {

  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>([]);

  const [
    ambientes,
    setAmbientes,
  ] =
    useState<
      ReleaseEnvironment[]
    >([]);

  const [
    ambienteSelecionadoId,
    setAmbienteSelecionadoId,
  ] =
    useState<
      number | null
    >(null);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    carregandoAmbientes,
    setCarregandoAmbientes,
  ] =
    useState(true);

  const [
    agora,
    setAgora,
  ] =
    useState(
      new Date()
    );


  /*
    Relógio da TV.
  */

  useEffect(() => {

    const intervalo =
      setInterval(
        () => {

          setAgora(
            new Date()
          );

        },
        1000
      );


    return () =>
      clearInterval(
        intervalo
      );

  }, []);


  /*
    Carrega as releases.
  */

  useEffect(() => {

    let ativo =
      true;


    async function carregarAmbientes() {

      try {

        const lista =
          await listarAmbientes();


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


        const salvo =
          localStorage.getItem(
            STORAGE_KEY
          );


        const idSalvo =
          salvo
            ? Number(salvo)
            : null;


        const ambienteSalvoExiste =
          idSalvo !== null &&
          ordenados.some(
            ambiente =>
              ambiente.id ===
              idSalvo
          );


        if (
          ambienteSalvoExiste &&
          idSalvo !== null
        ) {

          setAmbienteSelecionadoId(
            idSalvo
          );

          return;

        }


        const maisRecente =
          obterAmbienteMaisRecente(
            ordenados
          );


        if (maisRecente) {

          setAmbienteSelecionadoId(
            maisRecente.id
          );


          localStorage.setItem(
            STORAGE_KEY,
            String(
              maisRecente.id
            )
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao carregar ambientes da TV:",
          erro
        );

      } finally {

        if (ativo) {

          setCarregandoAmbientes(
            false
          );

        }

      }

    }


    void carregarAmbientes();


    return () => {

      ativo =
        false;

    };

  }, []);


  /*
    Carrega os projetos específicos
    da release selecionada.

    Atualiza automaticamente
    a cada 10 segundos.
  */

  useEffect(() => {

    if (
      ambienteSelecionadoId === null
    ) {

      setProjects([]);

      setCarregando(false);

      return;

    }


    const environmentId =
      ambienteSelecionadoId;


    let ativo =
      true;


    async function atualizarDados() {

      try {

        const lista =
          await listarProjetosPorAmbiente(
            environmentId
          );


        if (ativo) {

          setProjects(
            lista
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao atualizar dados da TV:",
          erro
        );

      } finally {

        if (ativo) {

          setCarregando(
            false
          );

        }

      }

    }


    setCarregando(
      true
    );


    void atualizarDados();


    const intervalo =
      setInterval(
        () => {

          void atualizarDados();

        },
        10000
      );


    return () => {

      ativo =
        false;

      clearInterval(
        intervalo
      );

    };

  }, [
    ambienteSelecionadoId,
  ]);


  /*
    Troca a release acompanhada.
  */

  function alterarAmbiente(
    id: number
  ) {

    setProjects([]);

    setCarregando(true);

    setAmbienteSelecionadoId(
      id
    );


    localStorage.setItem(
      STORAGE_KEY,
      String(id)
    );

  }


  /*
    Ambiente atual.
  */

  const ambienteSelecionado =
    ambientes.find(
      ambiente =>
        ambiente.id ===
        ambienteSelecionadoId
    );


  /*
    REGRA DOS CARDS:

    Só aparecem projetos que possuem
    pelo menos uma tarefa em qualquer
    situação da release.

    Ter versão cadastrada NÃO é
    suficiente para criar um card.
  */

  function possuiTarefas(
    project: Project
  ) {

    return Object.values(
      project.situacoes
    ).some(
      quantidade =>
        quantidade > 0
    );

  }


  const projetosAtivos =
    useMemo(
      () => {

        return projects.filter(
          project =>
            possuiTarefas(
              project
            )
        );

      },
      [
        projects,
      ]
    );


  /*
    Hora e data.
  */

  const hora =
    agora.toLocaleTimeString(
      "pt-BR",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",
      }
    );


  const data =
    agora.toLocaleDateString(
      "pt-BR",
      {
        weekday:
          "long",

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    );


  /*
    Ordem dos cards.
  */

  function getOrdemProjeto(
    nome: string
  ) {

    const projeto =
      nome
        .toLowerCase()
        .replace(
          /\s/g,
          ""
        );


    if (
      projeto.includes(
        "intellicash"
      ) ||
      projeto.includes(
        "intelicash"
      )
    ) {

      return 1;

    }


    if (
      projeto.includes(
        "easycash"
      )
    ) {

      return 2;

    }


    if (
      projeto.includes(
        "easycheckout"
      )
    ) {

      return 3;

    }


    if (
      projeto.includes(
        "easypdv"
      )
    ) {

      return 4;

    }


    if (
      projeto.includes(
        "intellistock"
      ) ||
      projeto.includes(
        "isa"
      )
    ) {

      return 5;

    }


    if (
      projeto.includes(
        "iwb"
      )
    ) {

      return 6;

    }


    return 99;

  }


  const projetosOrdenados =
    useMemo(
      () => {

        return [
          ...projetosAtivos,
        ].sort(
          (
            a,
            b
          ) =>

            getOrdemProjeto(
              a.nome
            ) -
            getOrdemProjeto(
              b.nome
            )
        );

      },
      [
        projetosAtivos,
      ]
    );


  return (

    <div className="tv-dashboard">

      <header className="tv-header">

        <div className="tv-brand">

          <img
            src={logo}
            alt="IWS"
            className="tv-logo"
          />


          <div className="tv-brand-text">

            <h1>
              IWS ReleaseHub
            </h1>


            <div className="tv-brand-subtitle">

              <span>
                Painel da Qualidade
              </span>


              <div className="tv-online">

                <span className="tv-online-dot" />

                Painel ativo

              </div>

            </div>

          </div>

        </div>


        <div className="tv-header-right">

          <div className="tv-release-selector">

            <span>
              Release acompanhada
            </span>


            <div className="tv-release-select-wrapper">

              <select
                value={
                  ambienteSelecionadoId ??
                  ""
                }
                disabled={
                  carregandoAmbientes ||
                  ambientes.length === 0
                }
                onChange={
                  event =>
                    alterarAmbiente(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                }
              >

                {ambientes.length ===
                  0 && (

                  <option value="">

                    Nenhuma release

                  </option>

                )}


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

                      {ambiente.nome}

                    </option>

                  )
                )}

              </select>

            </div>


            {ambienteSelecionado && (

              <small>

                Intellicash{" "}

                {
                  ambienteSelecionado
                    .versoes
                    .intellicash
                }

              </small>

            )}

          </div>


          <div className="tv-clock">

            <strong>
              {hora}
            </strong>

            <small>
              {data}
            </small>

          </div>

        </div>

      </header>


      {/*
        Compatibilidade continua
        recebendo TODOS os projetos
        e mostra TODOS os sistemas
        do ambiente.
  */}

      <CompatibilityPanel
        projects={
          projects
        }
        carregando={
          carregando
        }
      />


      <main className="tv-grid">

        {carregando ? (

          <div className="tv-loading">

            Carregando release...

          </div>

        ) : projetosOrdenados.length ===
            0 ? (

          <div className="tv-loading">

            Nenhum projeto com tarefas
            nesta release.

          </div>

        ) : (

          projetosOrdenados.map(
            project => (

              <TvProjectCard
                key={
                  project.id
                }
                project={
                  project
                }
              />

            )
          )

        )}

      </main>

    </div>

  );

}


export default TvDashboard;