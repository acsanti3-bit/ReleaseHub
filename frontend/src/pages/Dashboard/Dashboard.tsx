import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Layout from "../../components/layout";

import ProjectCard from "../../components/ProjectCard/ProjectCard";

import ProjectDrawer from "../../components/ProjectDrawer/ProjectDrawer";

import CompatibilityPanel from "../../components/CompatibilityPanel/CompatibilityPanel";

import TasksChart from "../../components/TasksChart/TasksChart";

import TopProjects from "../../components/TopProjects/TopProjects";

import AttentionProjects from "../../components/AttentionProjects/AttentionProjects";

import "./Dashboard.css";

import type {
  Project,
} from "../../types/project";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

import {
  listarAmbientes,
  obterAmbienteMaisRecente,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";

import {
  listarProjetosPorAmbiente,
  salvarProjetoNoAmbiente,
} from "../../services/ReleaseProjectService";

import {
  buscarSessao,
} from "../../services/AuthService";


const STORAGE_KEY =
  "releasehub_dashboard_environment";


function Dashboard() {

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
    podeEditar,
    setPodeEditar,
  ] =
    useState(false);


  const [
    projectSelecionado,
    setProjectSelecionado,
  ] =
    useState<Project | null>(
      null
    );


  const [
    pesquisa,
    setPesquisa,
  ] =
    useState("");


  const [
    filtro,
    setFiltro,
  ] =
    useState("Todos");


  const [
    ordenacao,
    setOrdenacao,
  ] =
    useState("Nome");


  /*
    Carrega os ambientes.
  */

  useEffect(() => {

    let ativo =
      true;


    async function carregarAmbientes() {

      try {

        const lista =
          await listarAmbientes();


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


        const salvo =
          localStorage.getItem(
            STORAGE_KEY
          );


        const idSalvo =
          salvo
            ? Number(salvo)
            : null;


        const salvoExiste =
          idSalvo !== null &&
          ordenados.some(
            ambiente =>
              ambiente.id ===
              idSalvo
          );


        if (
          salvoExiste &&
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


        if (
          maisRecente
        ) {

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
          "Erro ao carregar ambientes:",
          erro
        );

      } finally {

        if (
          ativo
        ) {

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
    Carrega a permissão.
  */

  useEffect(() => {

    let ativo =
      true;


    async function carregarPermissao() {

      try {

        const usuario =
          await buscarSessao();


        if (
          !ativo
        ) {

          return;

        }


        setPodeEditar(
          usuario?.role ===
            "admin" ||
          usuario?.role ===
            "qualidade"
        );

      } catch (erro) {

        console.error(
          "Erro ao carregar permissão:",
          erro
        );


        if (
          ativo
        ) {

          setPodeEditar(
            false
          );

        }

      }

    }


    void carregarPermissao();


    return () => {

      ativo =
        false;

    };

  }, []);


  /*
    Busca os projetos específicos
    da release selecionada.
  */

  async function carregarProjetos(
    environmentId: number
  ) {

    try {

      setCarregando(
        true
      );


      const lista =
        await listarProjetosPorAmbiente(
          environmentId
        );


      setProjects(
        lista
      );

    } catch (erro) {

      console.error(
        "Erro ao carregar projetos da release:",
        erro
      );


      setProjects(
        []
      );

    } finally {

      setCarregando(
        false
      );

    }

  }


  useEffect(() => {

    if (
      ambienteSelecionadoId ===
      null
    ) {

      setProjects(
        []
      );


      setCarregando(
        false
      );


      return;

    }


    void carregarProjetos(
      ambienteSelecionadoId
    );

  }, [
    ambienteSelecionadoId,
  ]);


  const ambienteSelecionado =
    ambientes.find(
      ambiente =>
        ambiente.id ===
        ambienteSelecionadoId
    );


  /*
    Troca a release.

    Os filtros da release anterior
    não devem afetar a nova.
  */

  function alterarAmbiente(
    id: number
  ) {

    setProjectSelecionado(
      null
    );


    setPesquisa(
      ""
    );


    setFiltro(
      "Todos"
    );


    setOrdenacao(
      "Nome"
    );


    setProjects(
      []
    );


    setCarregando(
      true
    );


    setAmbienteSelecionadoId(
      id
    );


    localStorage.setItem(
      STORAGE_KEY,
      String(id)
    );

  }


  function fecharDrawer() {

    setProjectSelecionado(
      null
    );

  }


  /*
    Salva o projeto somente
    dentro da release selecionada.
  */

  async function salvarProjeto(
    project: Project
  ) {

    if (
      !podeEditar ||
      ambienteSelecionadoId ===
        null
    ) {

      return;

    }


    try {

      await salvarProjetoNoAmbiente(
        ambienteSelecionadoId,
        project
      );


      await carregarProjetos(
        ambienteSelecionadoId
      );


      setProjectSelecionado(
        null
      );

    } catch (erro) {

      console.error(
        "Erro ao salvar projeto da release:",
        erro
      );


      alert(
        "Não foi possível salvar o projeto desta release."
      );

    }

  }


  /*
    Converte o prazo para ordenação
    e validação dos projetos atrasados.
  */

  function converterPrazo(
    prazo: string
  ): number {

    if (
      !prazo
    ) {

      return Number.MAX_SAFE_INTEGER;

    }


    const formatoBrasileiro =
      /^(\d{2})\/(\d{2})\/(\d{4})$/;


    const resultado =
      prazo.match(
        formatoBrasileiro
      );


    if (
      resultado
    ) {

      const dia =
        Number(
          resultado[1]
        );


      const mes =
        Number(
          resultado[2]
        );


      const ano =
        Number(
          resultado[3]
        );


      const data =
        new Date(
          ano,
          mes - 1,
          dia
        );


      if (
        data.getFullYear() !==
          ano ||
        data.getMonth() !==
          mes - 1 ||
        data.getDate() !==
          dia
      ) {

        return Number.MAX_SAFE_INTEGER;

      }


      return data.getTime();

    }


    const data =
      new Date(
        prazo
      );


    if (
      Number.isNaN(
        data.getTime()
      )
    ) {

      return Number.MAX_SAFE_INTEGER;

    }


    return data.getTime();

  }


  /*
    Pesquisa, filtros e ordenação.
  */

  const projetos =
    useMemo(() => {

      let lista = [
        ...projects,
      ];


      /*
        Pesquisa pelo nome.
      */

      lista =
        lista.filter(
          project =>
            project.nome
              .toLowerCase()
              .includes(
                pesquisa
                  .toLowerCase()
              )
        );


      /*
        Filtros por situação.
      */

      switch (
        filtro
      ) {

        case "Qualidade":

          lista =
            lista.filter(
              project =>
                project
                  .situacoes
                  .qualidade >
                0
            );

          break;


        case "Testes":

          lista =
            lista.filter(
              project =>
                project
                  .situacoes
                  .testes >
                0
            );

          break;


        case "Em Progresso":

          lista =
            lista.filter(
              project =>
                project
                  .situacoes
                  .emProgresso >
                0
            );

          break;


        /*
          Desenvolvido agora é
          totalmente independente
          de Aguardando Compilação.
        */

        case "Desenvolvido":

          lista =
            lista.filter(
              project =>
                project
                  .situacoes
                  .desenvolvido >
                0
            );

          break;


        case "Aguard. Comp.":

          lista =
            lista.filter(
              project =>
                project
                  .situacoes
                  .aguardandoCompilacao >
                0
            );

          break;


        /*
          Nova situação.
        */

        case "Resolvidas":

          lista =
            lista.filter(
              project =>
                project
                  .situacoes
                  .resolvidas >
                0
            );

          break;


        case "Atrasados": {

          const hoje =
            new Date();


          hoje.setHours(
            0,
            0,
            0,
            0
          );


          lista =
            lista.filter(
              project => {

                if (
                  !project.prazo
                ) {

                  return false;

                }


                return (
                  converterPrazo(
                    project.prazo
                  ) <
                  hoje.getTime()
                );

              }
            );


          break;

        }

      }


      /*
        Ordenação.
      */

      switch (
        ordenacao
      ) {

        case "Prazo":

          lista.sort(
            (
              a,
              b
            ) =>
              converterPrazo(
                a.prazo
              ) -
              converterPrazo(
                b.prazo
              )
          );

          break;


        case "Tarefas":

          lista.sort(
            (
              a,
              b
            ) => {

              const totalA =
                Object.values(
                  a.situacoes
                ).reduce(
                  (
                    x,
                    y
                  ) =>
                    x + y,
                  0
                );


              const totalB =
                Object.values(
                  b.situacoes
                ).reduce(
                  (
                    x,
                    y
                  ) =>
                    x + y,
                  0
                );


              return (
                totalB -
                totalA
              );

            }
          );

          break;


        default:

          lista.sort(
            (
              a,
              b
            ) =>
              a.nome.localeCompare(
                b.nome
              )
          );

      }


      return lista;

    }, [
      projects,
      pesquisa,
      filtro,
      ordenacao,
    ]);


  /*
    Distribuição dos cards
    em duas colunas.
  */

  const colunaEsquerda =
    projetos.filter(
      (
        _,
        index
      ) =>
        index % 2 === 0
    );


  const colunaDireita =
    projetos.filter(
      (
        _,
        index
      ) =>
        index % 2 !== 0
    );


  return (

    <Layout>

      <div className="dashboard">

        <div className="dashboard-header">

          <div className="dashboard-title">

            <h1>
              IWS ReleaseHub
            </h1>


            <span>

              {projects.length} Projetos

            </span>

          </div>


          <div className="dashboard-release-selector">

            <label>

              Release em acompanhamento

            </label>


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

                  Nenhuma release cadastrada

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

        </div>


        <CompatibilityPanel
          projects={
            projects
          }
          carregando={
            carregando ||
            carregandoAmbientes
          }
        />


        <div className="dashboard-charts">

          <TasksChart
            projects={
              projects
            }
          />


          <TopProjects
            projects={
              projects
            }
          />

        </div>


        <AttentionProjects
          projects={
            projects
          }
        />


        <div className="dashboard-filters">

          <input
            className="dashboard-search"
            placeholder="Pesquisar projeto..."
            value={
              pesquisa
            }
            onChange={
              event =>
                setPesquisa(
                  event
                    .target
                    .value
                )
            }
          />


          <select
            className="dashboard-filter"
            value={
              filtro
            }
            onChange={
              event =>
                setFiltro(
                  event
                    .target
                    .value
                )
            }
          >

            <option>
              Todos
            </option>


            <option>
              Qualidade
            </option>


            <option>
              Testes
            </option>


            <option>
              Em Progresso
            </option>


            <option>
              Desenvolvido
            </option>


            <option>
              Aguard. Comp.
            </option>


            <option>
              Resolvidas
            </option>


            <option>
              Atrasados
            </option>

          </select>


          <select
            className="dashboard-filter"
            value={
              ordenacao
            }
            onChange={
              event =>
                setOrdenacao(
                  event
                    .target
                    .value
                )
            }
          >

            <option>
              Nome
            </option>


            <option>
              Prazo
            </option>


            <option>
              Tarefas
            </option>

          </select>

        </div>


        <span className="dashboard-counter">

          Exibindo{" "}

          {projetos.length}

          {" "}de{" "}

          {projects.length}

          {" "}projetos


          {ambienteSelecionado && (

            <>

              {" • "}

              {
                ambienteSelecionado
                  .nome
              }

            </>

          )}


          {!podeEditar &&
            " • Somente leitura"}

        </span>


        {carregando ? (

          <div className="dashboard-empty">

            <h2>

              Carregando projetos...

            </h2>

          </div>

        ) : projects.length ===
            0 ? (

          <div className="dashboard-empty">

            <h2>

              Nenhum projeto cadastrado

            </h2>


            <p>

              Esta release ainda não possui
              projetos vinculados.

            </p>

          </div>

        ) : projetos.length ===
            0 ? (

          <div className="dashboard-empty">

            <h2>

              Nenhum resultado encontrado

            </h2>


            <p>

              Existem projetos nesta release,
              mas nenhum corresponde aos
              filtros selecionados.

            </p>

          </div>

        ) : (

          <div className="dashboard-grid">

            <div className="dashboard-column">

              {colunaEsquerda.map(
                project => (

                  <ProjectCard
                    key={
                      project.id
                    }
                    project={
                      project
                    }
                    canEdit={
                      podeEditar
                    }
                    onOpen={
                      setProjectSelecionado
                    }
                  />

                )
              )}

            </div>


            <div className="dashboard-column">

              {colunaDireita.map(
                project => (

                  <ProjectCard
                    key={
                      project.id
                    }
                    project={
                      project
                    }
                    canEdit={
                      podeEditar
                    }
                    onOpen={
                      setProjectSelecionado
                    }
                  />

                )
              )}

            </div>

          </div>

        )}

      </div>


      {podeEditar &&
        projectSelecionado &&
        ambienteSelecionado && (

        <ProjectDrawer
          project={
            projectSelecionado
          }
          environment={
            ambienteSelecionado
          }
          onSave={
            salvarProjeto
          }
          onClose={
            fecharDrawer
          }
        />

      )}

    </Layout>

  );

}


export default Dashboard;