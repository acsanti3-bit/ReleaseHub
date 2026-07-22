import "./ProjectCard.css";

import { MdEdit } from "react-icons/md";

import type { Project } from "../../types/project";

interface Props {

  project: Project;

  onOpen: (project: Project) => void;

}

interface StatusItem {

  label: string;

  value: number;

  color: string;

}

function ProjectCard({

  project,

  onOpen,

}: Props) {

  const total = Object.values(

    project.situacoes

  ).reduce(

    (acc, value) => acc + value,

    0

  );

  const concluidas =

    project.situacoes.desenvolvido +

    project.situacoes.testes;

  const progresso =

    total === 0

      ? 0

      : Math.round(

          (concluidas / total) * 100

        );

  const hoje = new Date();

  hoje.setHours(

    0,

    0,

    0,

    0

  );

  const prazo =

    project.prazo

      ? new Date(project.prazo)

      : null;

  if (prazo) {

    prazo.setHours(

      0,

      0,

      0,

      0

    );

  }

  let statusProjeto = "EM DIA";

  let corStatus = "#43A047";

  if (

    prazo &&

    prazo < hoje

  ) {

    statusProjeto = "ATRASADO";

    corStatus = "#E53935";

  } else if (

    project.situacoes.qualidade > 0

  ) {

    statusProjeto = "EM QUALIDADE";

    corStatus = "#F58220";

  } else if (

    project.situacoes.testes > 0

  ) {

    statusProjeto = "EM TESTES";

    corStatus = "#005AA9";

  } else if (

    project.situacoes.emProgresso > 0

  ) {

    statusProjeto = "EM DESENVOLVIMENTO";

    corStatus = "#29B6F6";

  }

  let textoPrazo = "-";

  if (prazo) {

    const diferenca = Math.floor(

      (

        prazo.getTime() -

        hoje.getTime()

      ) /

      86400000

    );

    if (diferenca > 1) {

      textoPrazo =

        `${diferenca} dias restantes`;

    } else if (

      diferenca === 1

    ) {

      textoPrazo =

        "Vence amanhã";

    } else if (

      diferenca === 0

    ) {

      textoPrazo =

        "Vence hoje";

    } else {

      textoPrazo =

        `Atrasado há ${Math.abs(

          diferenca

        )} dias`;

    }

  }

  const situacoes: StatusItem[] = [

    {

      label: "Qualidade",

      value: project.situacoes.qualidade,

      color: "#F58220",

    },

    {

      label: "Testes",

      value: project.situacoes.testes,

      color: "#005AA9",

    },

    {

      label: "Desenvolvido",

      value: project.situacoes.desenvolvido,

      color: "#43A047",

    },

    {

      label: "Em Progresso",

      value: project.situacoes.emProgresso,

      color: "#29B6F6",

    },

    {

      label: "Aguard. Comp.",

      value: project.situacoes.aguardandoCompilacao,

      color: "#FBC02D",

    },

    {

      label: "Nova",

      value: project.situacoes.nova,

      color: "#8E24AA",

    },

    {

      label: "Reaberta",

      value: project.situacoes.reaberta,

      color: "#795548",

    },

    {

      label: "Rejeitada",

      value: project.situacoes.rejeitada,

      color: "#E53935",

    },

    {

      label: "Interrompida",

      value: project.situacoes.interrompida,

      color: "#757575",

    },

  ].filter(

    status =>

      status.value > 0

  );

    return (

    <div className="project-card">

      <div className="project-header">

        <div>

          <h2>

            {project.nome}

          </h2>

          <div className="project-subtitle">

            <span>

              Versão {project.versao || "-"}

            </span>

            <span className="task-total">

              {total} tarefas

            </span>

          </div>

        </div>

        <div className="project-actions">

          <span

            className="status-badge"

            style={{

              background: corStatus,

            }}

          >

            {statusProjeto}

          </span>

          <button

            className="edit-button"

            onClick={() => onOpen(project)}

          >

            <MdEdit size={20} />

          </button>

        </div>

      </div>

      <div className="project-info">

        <div>

          <small>

            Último Executável

          </small>

          <strong>

            {project.executavel || "-"}

          </strong>

        </div>

        <div>

          <small>

            Prazo

          </small>

          <strong>

            {project.prazo || "-"}

          </strong>

        </div>

        <div>

          <small>

            Situação

          </small>

          <strong>

            {textoPrazo}

          </strong>

        </div>

      </div>

      <div className="progress-area">

        <div className="progress-header">

          <span>

            Progresso: 

          </span>

          <strong>

            {progresso}%

          </strong>

        </div>

        <div className="progress-bar">

          <div

            className="progress-fill"

            style={{

              width: `${progresso}%`,

            }}

          />

        </div>

      </div>

      <div className="status-list">

        {situacoes.map(status => {

          const porcentagem =

            total === 0

              ? 0

              : (status.value / total) * 100;

          return (

            <div

              key={status.label}

              className="status-row"

            >

              <span className="status-name">

                {status.label}

              </span>

              <div className="status-bar">

                <div

                  className="status-fill"

                  style={{

                    width: `${porcentagem}%`,

                    background: status.color,

                  }}

                />

              </div>

              <strong>

                {status.value}

              </strong>

            </div>

          );

        })}

      </div>

    </div>

  );

}

export default ProjectCard;