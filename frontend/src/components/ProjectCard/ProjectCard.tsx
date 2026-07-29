import "./ProjectCard.css";

import {
  MdEdit,
} from "react-icons/md";

import type {
  Project,
} from "../../types/project";


interface Props {

  project: Project;

  onOpen:
    (project: Project) => void;

  canEdit: boolean;

}


interface StatusItem {

  label: string;

  value: number;

  color: string;

}


interface PrazoInfo {

  texto: string;

  detalhe: string;

  classe:
    | "ok"
    | "warning"
    | "late"
    | "invalid"
    | "neutral";

}


function converterDataBrasileira(
  valor: string
): Date | null {

  if (!valor) {
    return null;
  }


  const partes =
    valor.split("/");


  if (
    partes.length !== 3
  ) {

    return null;

  }


  const dia =
    Number(
      partes[0]
    );

  const mes =
    Number(
      partes[1]
    );

  const ano =
    Number(
      partes[2]
    );


  if (
    !dia ||
    !mes ||
    !ano
  ) {

    return null;

  }


  const data =
    new Date(
      ano,
      mes - 1,
      dia
    );


  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {

    return null;

  }


  data.setHours(
    0,
    0,
    0,
    0
  );


  return data;

}


function obterSituacaoPrazo(
  prazoTexto: string
): PrazoInfo {

  if (
    !prazoTexto
  ) {

    return {
      texto:
        "Sem prazo",

      detalhe:
        "Prazo não informado",

      classe:
        "neutral",
    };

  }


  const prazo =
    converterDataBrasileira(
      prazoTexto
    );


  if (
    !prazo
  ) {

    return {
      texto:
        "Prazo inválido",

      detalhe:
        prazoTexto,

      classe:
        "invalid",
    };

  }


  const hoje =
    new Date();


  hoje.setHours(
    0,
    0,
    0,
    0
  );


  const diferenca =
    Math.round(
      (
        prazo.getTime() -
        hoje.getTime()
      ) /
      86400000
    );


  if (
    diferenca < 0
  ) {

    const dias =
      Math.abs(
        diferenca
      );


    return {

      texto:
        "Atrasado",

      detalhe:
        dias === 1
          ? "1 dia em atraso"
          : `${dias} dias em atraso`,

      classe:
        "late",

    };

  }


  if (
    diferenca === 0
  ) {

    return {
      texto:
        "Vence hoje",

      detalhe:
        "Prazo final hoje",

      classe:
        "warning",
    };

  }


  if (
    diferenca === 1
  ) {

    return {
      texto:
        "Vence amanhã",

      detalhe:
        "1 dia restante",

      classe:
        "warning",
    };

  }


  if (
    diferenca <= 3
  ) {

    return {
      texto:
        "Prazo próximo",

      detalhe:
        `${diferenca} dias restantes`,

      classe:
        "warning",
    };

  }


  return {

    texto:
      "Em dia",

    detalhe:
      `${diferenca} dias restantes`,

    classe:
      "ok",

  };

}


function ProjectCard({

  project,

  onOpen,

  canEdit,

}: Props) {

  const total =
    Object.values(
      project.situacoes
    ).reduce(
      (
        acumulado,
        valor
      ) =>
        acumulado + valor,
      0
    );


  const situacaoPrazo =
    obterSituacaoPrazo(
      project.prazo
    );


  const situacoes:
    StatusItem[] = [

    {
      label:
        "Qualidade",

      value:
        project
          .situacoes
          .qualidade,

      color:
        "#F58220",
    },

    {
      label:
        "Testes",

      value:
        project
          .situacoes
          .testes,

      color:
        "#1976D2",
    },

    {
      label:
        "Desenvolvido",

      value:
        project
          .situacoes
          .desenvolvido,

      color:
        "#43A047",
    },

    {
      label:
        "Aguard. Comp.",

      value:
        project
          .situacoes
          .aguardandoCompilacao,

      color:
        "#78909C",
    },

    {
      label:
        "Em Progresso",

      value:
        project
          .situacoes
          .emProgresso,

      color:
        "#FBC02D",
    },

    {
      label:
        "Nova",

      value:
        project
          .situacoes
          .nova,

      color:
        "#26A69A",
    },

    {
      label:
        "Reaberta",

      value:
        project
          .situacoes
          .reaberta,

      color:
        "#EF5350",
    },

    {
      label:
        "Resolvidas",

      value:
        project
          .situacoes
          .resolvidas,

      color:
        "#2E7D32",
    },

    {
      label:
        "Rejeitada",

      value:
        project
          .situacoes
          .rejeitada,

      color:
        "#616161",
    },

    {
      label:
        "Interrompida",

      value:
        project
          .situacoes
          .interrompida,

      color:
        "#8E24AA",
    },

  ].filter(
    status =>
      status.value > 0
  );


  return (

    <div className="release-project-card">

      <div className="release-project-header">

        <div className="release-project-title">

          <h2>
            {project.nome}
          </h2>


          <div className="release-project-subtitle">

            <span>

              Versão{" "}

              <strong>

                {
                  project.versao ||
                  "-"
                }

              </strong>

            </span>


            <span className="release-task-total">

              {total} tarefas

            </span>

          </div>

        </div>


        {canEdit && (

          <button
            type="button"
            className="release-edit-button"
            title="Editar projeto"
            onClick={() =>
              onOpen(
                project
              )
            }
          >

            <MdEdit
              size={19}
            />

          </button>

        )}

      </div>


      <div className="release-project-info">

        <div>

          <small>
            Último Executável
          </small>

          <strong>

            {
              project.executavel ||
              "-"
            }

          </strong>

        </div>


        <div>

          <small>
            Prazo
          </small>

          <strong>

            {
              project.prazo ||
              "-"
            }

          </strong>

        </div>


        <div>

          <small>
            Situação
          </small>


          <div
            className={
              `release-deadline-status ${situacaoPrazo.classe}`
            }
          >

            <strong>

              {situacaoPrazo.texto}

            </strong>

            <span>

              {situacaoPrazo.detalhe}

            </span>

          </div>

        </div>

      </div>


      <div className="release-status-grid">

        {situacoes.map(
          status => (

            <div
              key={
                status.label
              }
              className="release-status-item"
            >

              <div className="release-status-label">

                <span
                  className="release-status-dot"
                  style={{
                    background:
                      status.color,
                  }}
                />


                <span>
                  {status.label}
                </span>

              </div>


              <strong
                style={{
                  color:
                    status.color,
                }}
              >

                {status.value}

              </strong>

            </div>

          )
        )}


        {situacoes.length === 0 && (

          <div className="release-status-empty">

            Nenhuma tarefa neste projeto.

          </div>

        )}

      </div>

    </div>

  );

}


export default ProjectCard;