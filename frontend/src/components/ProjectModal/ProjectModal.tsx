import {
  useEffect,
  useState,
} from "react";

import "./ProjectModal.css";

import type {
  Project,
} from "../../types/project";

import {
  criarProjeto,
} from "../../services/ProjectService";

interface Props {

  project?: Project;

  onClose: () => void;

  onSave: (
    project: Project
  ) => void;

}

function ProjectModal({

  project,

  onClose,

  onSave,

}: Props) {

  const [nome, setNome] =
    useState("");

  useEffect(() => {

    setNome(
      project?.nome ?? ""
    );

  }, [project]);

  function handleSave() {

    const nomeTratado =
      nome.trim();

    if (!nomeTratado) {

      alert(
        "Informe o nome do projeto."
      );

      return;

    }

    const projetoBase =
      project ?? criarProjeto();

    const projetoSalvo: Project = {

      ...projetoBase,

      nome: nomeTratado,

    };

    onSave(
      projetoSalvo
    );

    onClose();

  }

  return (

    <div className="modal-overlay">

      <div className="modal-box">

        <h2>

          {project
            ? "Editar Projeto"
            : "Novo Projeto"}

        </h2>

        <label>
          Nome do projeto
        </label>

        <input
          value={nome}
          onChange={e =>
            setNome(
              e.target.value
            )
          }
          placeholder="Ex.: Intellicash"
          autoFocus
        />

        <div className="modal-actions">

          <button
            type="button"
            className="cancel"
            onClick={onClose}
          >

            Cancelar

          </button>

          <button
            type="button"
            className="save"
            onClick={handleSave}
          >

            Salvar

          </button>

        </div>

      </div>

    </div>

  );

}

export default ProjectModal;