import {
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
    useState<Project[]>(
      listarProjetos()
    );

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

  function atualizarLista() {

    setProjects(
      listarProjetos()
    );

  }

  function handleSaveProject(
    project: Project
  ) {

    const exists =
      projects.some(
        p =>
          p.id === project.id
      );

    if (exists) {

      editarProjeto(
        project
      );

    } else {

      adicionarProjeto(
        project
      );

    }

    atualizarLista();

    setSelectedProject(
      undefined
    );

    setOpenModal(
      false
    );

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

  function handleDeleteProject(
    id: number
  ) {

    const confirmar =
      window.confirm(
        "Deseja realmente excluir este projeto?"
      );

    if (!confirmar) {

      return;

    }

    excluirProjeto(
      id
    );

    atualizarLista();

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

          {projects.length === 0 ? (

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
                        handleDeleteProject(
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