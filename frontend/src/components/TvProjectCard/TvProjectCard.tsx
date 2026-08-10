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


const REDMINE_STATUS_IDS = {
  qualidade: 9,
  testes: 7,
  desenvolvido: 11,
  aguardandoCompilacao: 14,
  emProgresso: 2,
  nova: 1,
  reaberta: 8,
  validacaoCliente: 12,
  rejeitada: 6,
  interrompida: 13,
  resolvidas: 3,
} as const;


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

      statusId:
        REDMINE_STATUS_IDS
          .qualidade,
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

      statusId:
        REDMINE_STATUS_IDS
          .testes,
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

      statusId:
        REDMINE_STATUS_IDS
          .desenvolvido,
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

      statusId:
        REDMINE_STATUS_IDS
          .aguardandoCompilacao,
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

      statusId:
        REDMINE_STATUS_IDS
          .emProgresso,
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

      statusId:
        REDMINE_STATUS_IDS
          .nova,
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

      statusId:
        REDMINE_STATUS_IDS
          .reaberta,
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

      statusId:
        REDMINE_STATUS_IDS
          .validacaoCliente,
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

      statusId:
        REDMINE_STATUS_IDS
          .rejeitada,
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

      statusId:
        REDMINE_STATUS_IDS
          .interrompida,
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

      statusId:
        REDMINE_STATUS_IDS
          .resolvidas,
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

    const novaAba =
      window.open(
        "",
        "_blank",
        "noopener,noreferrer"
      );

    try {
      const url =
        await obterLinkRedmine({
          projeto:
            project.nome,

          versao:
            project.versao,

          statusId,
        });

      if (
        novaAba
      ) {
        novaAba.location.href =
          url;

        return;
      }

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

    } catch (erro) {
      if (
        novaAba
      ) {
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

            const clicavel =
              !zerado &&
              Boolean(
                project.versao &&
                project.versao !== "-"
              );

            return (
              <button
                type="button"
                key={
                  item.nome
                }
                disabled={
                  !clicavel
                }
                title={
                  clicavel
                    ? `Abrir ${project.nome} - ${item.nome} no Redmine`
                    : undefined
                }
                className={`tv-status-card ${
                  zerado
                    ? "tv-status-card-zero"
                    : ""
                } ${
                  item.nome === "Resolvidas"
                    ? "tv-status-card-resolved"
                    : ""
                } ${
                  clicavel
                    ? "tv-status-card-clickable"
                    : ""
                }`}
                onClick={() =>
                  clicavel &&
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