import "./TvProjectCard.css";

import type { Project } from "../../types/project";

interface Props {
  project: Project;
}

function getProjectColor(nome: string) {

  const projeto = nome.toLowerCase();

  if (projeto.includes("intellicash")) return "#005AA9";
  if (projeto.includes("easycash")) return "#F58220";
  if (projeto.includes("easycheckout")) return "#43A047";
  if (projeto.includes("easypdv")) return "#8E24AA";
  if (projeto.includes("intellistock")) return "#E53935";
  if (projeto.includes("iwb")) return "#546E7A";

  return "#005AA9";

}

function TvProjectCard({ project }: Props) {

  const projectColor = getProjectColor(project.nome);

  const status = [

    {
      nome: "Qualidade",
      valor: project.situacoes.qualidade,
      cor: "#F58220",
    },

    {
      nome: "Testes",
      valor: project.situacoes.testes,
      cor: "#1976D2",
    },

    {
      nome: "Desenvolvido",
      valor:
        project.situacoes.desenvolvido +
        project.situacoes.aguardandoCompilacao,
      cor: "#43A047",
    },

    {
      nome: "Em Progresso",
      valor: project.situacoes.emProgresso,
      cor: "#FBC02D",
    },

    {
      nome: "Nova",
      valor: project.situacoes.nova,
      cor: "#26A69A",
    },

    {
      nome: "Reaberta",
      valor: project.situacoes.reaberta,
      cor: "#E53935",
    },

    {
      nome: "Rejeitada",
      valor: project.situacoes.rejeitada,
      cor: "#616161",
    },

    {
      nome: "Interrompida",
      valor: project.situacoes.interrompida,
      cor: "#8E24AA",
    },

  ];

  return (

    <div
      className="tv-project-card"
      style={{
        borderTopColor: projectColor,
      }}
    >

      <div className="tv-card-header">

        <div className="tv-card-title">

          <span
            className="tv-project-dot"
            style={{
              backgroundColor: projectColor,
            }}
          />

          <h3
            style={{
              color: projectColor,
            }}
          >
            {project.nome}
          </h3>

        </div>

        <span className="tv-version">

          {project.versao || "-"}

        </span>

      </div>

      <div className="tv-status-list">

        {status.map(item => {

          const zerado = item.valor === 0;

          return (

            <div
              key={item.nome}
              className={`tv-status-row ${
                zerado ? "tv-status-zero" : ""
              }`}
            >

              <div className="tv-status-name">

                <span
                  className="tv-status-dot"
                  style={{
                    backgroundColor: zerado
                      ? "#444"
                      : item.cor,
                  }}
                />

                <span>

                  {item.nome}

                </span>

              </div>

              <strong
                style={{
                  color: zerado
                    ? "#222"
                    : item.cor,
                }}
              >

                {item.valor}

              </strong>

            </div>

          );

        })}

      </div>

      <div className="tv-dates">

        <div>

          <small>Executável</small>

          <strong>

            {project.executavel || "-"}

          </strong>

        </div>

        <div>

          <small>Prazo</small>

          <strong>

            {project.prazo || "-"}

          </strong>

        </div>

      </div>

    </div>

  );

}

export default TvProjectCard;