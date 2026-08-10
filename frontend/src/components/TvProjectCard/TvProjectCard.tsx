import "./TvProjectCard.css";

import {
  obterLinkRedmine,
} from "../../services/RedmineService";

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

      statusId: 7,
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

      statusId: 9,
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

      statusId: 11,
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

      statusId: 14,
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

      statusId: 2,
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

      statusId: 1,
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

      statusId: 8,
    },

    {
      nome:
        "Validação no Cliente",

      valor:
        project
          .situacoes
          .validacaoCliente,

      cor:
        "#5C6BC0",

      statusId: 12,
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

      statusId: 6,
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

      statusId: 13,
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

      statusId: 3,
    },

  ];


  async function abrirRedmine(
    statusId: number
  ) {
    if (
      !project.versao ||
      project.versao === "-"
    ) {
      return;
    }

    const novaAba = window.open(
      "",
      "_blank"
    );

    try {
      const url = await obterLinkRedmine({
        projeto: project.nome,
        versao: project.versao,
        statusId,
      });

      if (novaAba) {
        novaAba.location.href = url;
        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (erro) {
      if (novaAba) {
        novaAba.close();
      }

      console.error(
        "Erro ao abrir filtro do Redmine:",
        erro
      );

      alert(
        erro instanceof Error
          ? erro.message
          : "Não foi possível abrir o filtro no Redmine."
      );
    }
  }


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

              <button
                type="button"
                key={
                  item.nome
                }
                disabled={
                  zerado ||
                  !project.versao ||
                  project.versao === "-"
                }
                title={
                  zerado
                    ? undefined
                    : `Abrir ${project.nome} - ${item.nome} no Redmine`
                }
                className={`tv-status-card ${
                  zerado
                    ? "tv-status-card-zero"
                    : "tv-status-card-clickable"
                } ${
                  item.nome === "Resolvidas"
                    ? "tv-status-card-resolved"
                    : ""
                }`}
                onClick={() =>
                  void abrirRedmine(
                    item.statusId
                  )
                }
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

              </button>

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