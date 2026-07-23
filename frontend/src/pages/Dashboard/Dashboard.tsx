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

import {
  listarProjetos,
  editarProjeto,
  adicionarProjeto,
  criarProjeto,
} from "../../services/ProjectService";

function Dashboard() {

  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>([]);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

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

  async function carregarProjetos() {

    try {

      const lista =
        await listarProjetos();

      setProjects(lista);

    } catch (erro) {

      console.error(
        "Erro ao carregar projetos:",
        erro
      );

    } finally {

      setCarregando(false);

    }

  }

  useEffect(() => {

    void carregarProjetos();

  }, []);

  function fecharDrawer() {

    setProjectSelecionado(
      null
    );

  }

  async function salvarProjeto(
    project: Project
  ) {

    try {

      const existe =
        projects.some(
          p =>
            p.id === project.id
        );

      if (existe) {

        await editarProjeto(
          project
        );

      } else {

        await adicionarProjeto(
          project
        );

      }

      await carregarProjetos();

      setProjectSelecionado(
        null
      );

    } catch (erro) {

      console.error(
        "Erro ao salvar projeto:",
        erro
      );

      alert(
        "Não foi possível salvar o projeto."
      );

    }

  }

  function converterPrazo(
    prazo: string
  ): number {

    if (!prazo) {

      return Number.MAX_SAFE_INTEGER;

    }

    const formatoBrasileiro =
      /^(\d{2})\/(\d{2})\/(\d{4})$/;

    const resultado =
      prazo.match(
        formatoBrasileiro
      );

    if (resultado) {

      const dia =
        Number(resultado[1]);

      const mes =
        Number(resultado[2]);

      const ano =
        Number(resultado[3]);

      return new Date(
        ano,
        mes - 1,
        dia
      ).getTime();

    }

    const data =
      new Date(prazo);

    if (
      Number.isNaN(
        data.getTime()
      )
    ) {

      return Number.MAX_SAFE_INTEGER;

    }

    return data.getTime();

  }

  const projetos =
    useMemo(() => {

      let lista = [
        ...projects,
      ];

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

      switch (filtro) {

        case "Qualidade":

          lista =
            lista.filter(
              p =>
                p.situacoes.qualidade > 0
            );

          break;

        case "Testes":

          lista =
            lista.filter(
              p =>
                p.situacoes.testes > 0
            );

          break;

        case "Em Progresso":

          lista =
            lista.filter(
              p =>
                p.situacoes.emProgresso > 0
            );

          break;

        case "Desenvolvido":

          lista =
            lista.filter(
              p =>
                p.situacoes.desenvolvido > 0 ||
                p.situacoes.aguardandoCompilacao > 0
            );

          break;

        case "Aguard. Comp.":

          lista =
            lista.filter(
              p =>
                p.situacoes.aguardandoCompilacao > 0
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

                if (!project.prazo) {

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

      switch (ordenacao) {

        case "Prazo":

          lista.sort(
            (a, b) =>
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
            (a, b) => {

              const totalA =
                Object.values(
                  a.situacoes
                ).reduce(
                  (x, y) =>
                    x + y,
                  0
                );

              const totalB =
                Object.values(
                  b.situacoes
                ).reduce(
                  (x, y) =>
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
            (a, b) =>
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

          <button
            className="new-project"
            onClick={() =>
              setProjectSelecionado(
                criarProjeto()
              )
            }
          >

            + Novo Projeto

          </button>

        </div>

        <CompatibilityPanel
          projects={projects}
          carregando={carregando}
        />

        <div className="dashboard-charts">

          <TasksChart
            projects={projects}
          />

          <TopProjects
            projects={projects}
          />

        </div>

        <AttentionProjects
          projects={projects}
        />

        <div className="dashboard-filters">

          <input
            className="dashboard-search"
            placeholder="Pesquisar projeto..."
            value={pesquisa}
            onChange={e =>
              setPesquisa(
                e.target.value
              )
            }
          />

          <select
            className="dashboard-filter"
            value={filtro}
            onChange={e =>
              setFiltro(
                e.target.value
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
              Atrasados
            </option>

          </select>

          <select
            className="dashboard-filter"
            value={ordenacao}
            onChange={e =>
              setOrdenacao(
                e.target.value
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
          {projetos.length} de{" "}
          {projects.length} projetos

        </span>

        <div className="dashboard-grid">

          {carregando ? (

            <div className="dashboard-empty">

              <h2>
                Carregando projetos...
              </h2>

            </div>

          ) : projetos.length === 0 ? (

            <div className="dashboard-empty">

              <h2>
                Nenhum projeto encontrado
              </h2>

              <p>
                Tente alterar os filtros ou a pesquisa.
              </p>

            </div>

          ) : (

            projetos.map(
              project => (

                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={
                    setProjectSelecionado
                  }
                />

              )
            )

          )}

        </div>

      </div>

      {projectSelecionado && (

        <ProjectDrawer
          project={
            projectSelecionado
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