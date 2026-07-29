import "./TvProjectCard.css";

import type {
  Project,
} from "../../types/project";


interface Props {

  project: Project;

}


function getProjectColor(
  nome: string
) {

  const projeto =
    nome.toLowerCase();


  if (
    projeto.includes(
      "intellicash"
    )
  ) {

    return "#005AA9";

  }


  if (
    projeto.includes(
      "easycash"
    )
  ) {

    return "#F58220";

  }


  if (
    projeto.includes(
      "easycheckout"
    )
  ) {

    return "#43A047";

  }


  if (
    projeto.includes(
      "easypdv"
    )
  ) {

    return "#8E24AA";

  }


  if (
    projeto.includes(
      "intellistock"
    ) ||
    projeto.includes(
      "isa"
    )
  ) {

    return "#E53935";

  }


  if (
    projeto.includes(
      "iwb"
    )
  ) {

    return "#546E7A";

  }


  return "#005AA9";

}


function TvProjectCard({

  project,

}: Props) {

  const projectColor =
    getProjectColor(
      project.nome
    );


  const status = [

    {
      nome:
        "Qualidade",

      valor:
        project
          .situacoes
          .qualidade,

      cor:
        "#F58220",
    },

    {
      nome:
        "Testes",

      valor:
        project
          .situacoes
          .testes,

      cor:
        "#1976D2",
    },

    {
      nome:
        "Desenvolvido",

      valor:
        project
          .situacoes
          .desenvolvido,

      cor:
        "#43A047",
    },

    {
      nome:
        "Aguard. Comp.",

      valor:
        project
          .situacoes
          .aguardandoCompilacao,

      cor:
        "#78909C",
    },

    {
      nome:
        "Em Progresso",

      valor:
        project
          .situacoes
          .emProgresso,

      cor:
        "#F9A825",
    },

    {
      nome:
        "Nova",

      valor:
        project
          .situacoes
          .nova,

      cor:
        "#26A69A",
    },

    {
      nome:
        "Reaberta",

      valor:
        project
          .situacoes
          .reaberta,

      cor:
        "#E53935",
    },

    {
      nome:
        "Resolvidas",

      valor:
        project
          .situacoes
          .resolvidas,

      cor:
        "#2E7D32",
    },

    {
      nome:
        "Rejeitada",

      valor:
        project
          .situacoes
          .rejeitada,

      cor:
        "#616161",
    },

    {
      nome:
        "Interrompida",

      valor:
        project
          .situacoes
          .interrompida,

      cor:
        "#8E24AA",
    },

  ];


  return (

    <article
      className="tv-project-card"
      style={{
        "--project-color":
          projectColor,
      } as React.CSSProperties}
    >

      <header className="tv-card-header">

        <div className="tv-card-heading">

          <span className="tv-card-project-label">

            Projeto

          </span>

          <h3>

            {project.nome}

          </h3>

        </div>


        <div className="tv-card-version">

          <small>
            Versão
          </small>

          <strong>

            {
              project.versao ||
              "-"
            }

          </strong>

        </div>

      </header>


      <div className="tv-status-grid">

        {status.map(
          item => {

            const zerado =
              item.valor === 0;


            return (

              <div
                key={
                  item.nome
                }
                className={`tv-status-card ${
                  zerado
                    ? "tv-status-card-zero"
                    : ""
                }`}
              >

                <div className="tv-status-card-top">

                  <span
                    className="tv-status-indicator"
                    style={{
                      backgroundColor:
                        zerado
                          ? "#CAD1D8"
                          : item.cor,
                    }}
                  />

                  <span>

                    {item.nome}

                  </span>

                </div>


                <strong
                  style={{
                    color:
                      zerado
                        ? "#7B858F"
                        : item.cor,
                  }}
                >

                  {item.valor}

                </strong>

              </div>

            );

          }
        )}

      </div>


      <footer className="tv-card-footer">

        <div className="tv-card-date">

          <small>
            Executável
          </small>

          <strong>

            {
              project.executavel ||
              "-"
            }

          </strong>

        </div>


        <div className="tv-card-date">

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

      </footer>

    </article>

  );

}


export default TvProjectCard;