import {
  useEffect,
  useState,
} from "react";

import Layout from "../../components/layout";

import "./Projects.css";

import ProjectModal from "../../components/ProjectModal";

import type {
  Project,
} from "../../types/project";

import {
  listarProjetos,
  adicionarProjeto,
  editarProjeto,
  excluirProjeto,
} from "../../services/ProjectService";

function Projects() {

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
    openModal,
    setOpenModal,
  ] =
    useState(false);

  const [
    selectedProject,
    setSelectedProject,
  ] =
    useState<
      Project | undefined
    >();

  async function atualizarLista() {

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

    void atualizarLista();

  }, []);

  async function handleSaveProject(
    project: Project
  ) {

    try {

      const exists =
        projects.some(
          p =>
            p.id === project.id
        );

      if (exists) {

        await editarProjeto(
          project
        );

      } else {

        await adicionarProjeto(
          project
        );

      }

      await atualizarLista();

      setSelectedProject(
        undefined
      );

      setOpenModal(
        false
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

  function handleNewProject() {

    setSelectedProject(
      undefined
    );

    setOpenModal(
      true
    );

  }

  function handleEditProject(
    project: Project
  ) {

    setSelectedProject(
      project
    );

    setOpenModal(
      true
    );

  }

  async function handleDeleteProject(
    id: number
  ) {

    const confirmar =
      window.confirm(
        "Deseja realmente excluir este projeto?"
      );

    if (!confirmar) {

      return;

    }

    try {

      await excluirProjeto(id);

      await atualizarLista();

    } catch (erro) {

      console.error(
        "Erro ao excluir projeto:",
        erro
      );

      alert(
        "Não foi possível excluir o projeto."
      );

    }

  }

  return (

    <Layout>

      <div className="projects-page">

        <div className="projects-header">

          <div>

            <h1>
              Projetos
            </h1>

            <span>

              {projects.length} projetos cadastrados

            </span>

          </div>

          <button
            className="new-project-button"
            onClick={
              handleNewProject
            }
          >

            Novo Projeto

          </button>

        </div>

        <div className="projects-list">

          {carregando ? (

            <div className="projects-empty">

              Carregando projetos...

            </div>

          ) : projects.length === 0 ? (

            <div className="projects-empty">

              Nenhum projeto cadastrado.

            </div>

          ) : (

            projects.map(
              project => (

                <div
                  key={project.id}
                  className="project-card"
                >

                  <div className="project-info">

                    <h2>
                      {project.nome}
                    </h2>

                    <p>

                      Versão:{" "}

                      <strong>

                        {project.versao ||
                          "Não definida"}

                      </strong>

                    </p>

                  </div>

                  <div className="project-actions">

                    <button
                      type="button"
                      onClick={() =>
                        handleEditProject(
                          project
                        )
                      }
                    >

                      Editar

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleDeleteProject(
                          project.id
                        )
                      }
                    >

                      Excluir

                    </button>

                  </div>

                </div>

              )
            )

          )}

        </div>

      </div>

      {openModal && (

        <ProjectModal
          project={
            selectedProject
          }
          onClose={() => {

            setOpenModal(
              false
            );

            setSelectedProject(
              undefined
            );

          }}
          onSave={
            handleSaveProject
          }
        />

      )}

    </Layout>

  );

}

export default Projects;