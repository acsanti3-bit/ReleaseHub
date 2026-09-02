import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import "./TvProjectCard.css";

import {
  obterLinkRedmine,
} from "../../services/RedmineService";

import type {
  Project,
} from "../../types/project";


interface Props {
  project: Project;
  concluido?: boolean;
  liberadoEm?: string;
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


function converterDataBrasileira(
  valor: string
) {
  const partes =
    valor.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (!partes) {
    const data =
      new Date(valor);

    return Number.isNaN(
      data.getTime()
    )
      ? null
      : data;
  }

  const dia =
    Number(partes[1]);
  const mes =
    Number(partes[2]);
  const ano =
    Number(partes[3]);

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

  return data;
}


function obterSituacaoPrazo(
  prazoTexto: string,
  concluido = false
) {
  if (concluido) {
    return {
      texto: "Concluída",
      detalhe: "Release liberada",
      classe: "neutral",
    };
  }

  if (!prazoTexto) {
    return {
      texto: "Sem prazo",
      detalhe: "Prazo não informado",
      classe: "neutral",
    };
  }

  const prazo =
    converterDataBrasileira(
      prazoTexto
    );

  if (!prazo) {
    return {
      texto: "Prazo inválido",
      detalhe: prazoTexto,
      classe: "invalid",
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

  prazo.setHours(
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

  if (diferenca < 0) {
    const dias =
      Math.abs(diferenca);

    return {
      texto: "Atrasado",
      detalhe:
        dias === 1
          ? "1 dia em atraso"
          : `${dias} dias em atraso`,
      classe: "late",
    };
  }

  if (diferenca === 0) {
    return {
      texto: "Vence hoje",
      detalhe: "Prazo final hoje",
      classe: "warning",
    };
  }

  if (diferenca === 1) {
    return {
      texto: "Vence amanhã",
      detalhe: "1 dia restante",
      classe: "warning",
    };
  }

  if (diferenca <= 3) {
    return {
      texto: "Prazo próximo",
      detalhe: `${diferenca} dias restantes`,
      classe: "warning",
    };
  }

  return {
    texto: "Em dia",
    detalhe: `${diferenca} dias restantes`,
    classe: "ok",
  };
}


function formatarData(
  valor?: string
) {
  if (!valor) {
    return "-";
  }

  const iso =
    valor.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (iso) {
    return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }

  const brasileira =
    valor.match(
      /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

  if (brasileira) {
    return valor;
  }

  const data =
    new Date(valor);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(data);
}


function formatarLiberadoEm(
  valor?: string
) {
  if (!valor) {
    return "-";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(data);
}


function TvProjectCard({
  project,
  concluido = false,
  liberadoEm,
}: Props) {
  const navigate =
    useNavigate();

  const [
    mostrarLoginModal,
    setMostrarLoginModal,
  ] = useState(false);

  const projectColor =
    getProjectColor(
      project.nome
    );

  const total =
    Object.values(
      project.situacoes
    ).reduce(
      (acumulado, valor) =>
        acumulado + valor,
      0
    );

  const situacaoPrazo =
    obterSituacaoPrazo(
      project.prazo,
      concluido
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
        "about:blank",
        "_blank"
      );

    if (novaAba) {
      novaAba.opener =
        null;
    }

    try {
      const url =
        await obterLinkRedmine({
          projeto:
            project.nome,

          versao:
            project.versao,

          statusId,
        });

      if (novaAba) {
        novaAba.location.replace(
          url
        );

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

      const mensagem =
        erro instanceof Error
          ? erro.message
          : "Não foi possível abrir o filtro no Redmine.";

      const mensagemNormalizada =
        mensagem
          .normalize("NFD")
          .replace(
            /[\u0300-\u036f]/g,
            ""
          )
          .toLowerCase();

      if (
        mensagemNormalizada.includes(
          "sessao invalida"
        ) ||
        mensagemNormalizada.includes(
          "sessao expirada"
        ) ||
        mensagemNormalizada.includes(
          "sessao invalida ou expirada"
        )
      ) {
        setMostrarLoginModal(
          true
        );

        return;
      }

      alert(
        mensagem
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

        <div
          className="tv-status-card tv-status-card-total"
          title="Total de tarefas do projeto"
        >
          <div className="tv-status-card-top">
            <span
              className="tv-status-indicator"
            />

            <span>
              Total
            </span>
          </div>

          <strong>
            {total}
          </strong>
        </div>
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


        {!concluido && (
          <div className="tv-card-date">
            <small>
              Prazo
            </small>

            <strong>
              {formatarData(
                project.prazo
              )}
            </strong>
          </div>
        )}


        <div className="tv-card-date tv-card-situation">
          <small>
            Situação
          </small>

          <div
            className={`tv-deadline-status tv-deadline-${situacaoPrazo.classe}`}
          >
            <strong>
              {situacaoPrazo.texto}
            </strong>

            <span>
              {situacaoPrazo.detalhe}
            </span>
          </div>
        </div>


        {concluido && (
          <div className="tv-card-date">
            <small>
              Liberado em
            </small>

            <strong>
              {formatarLiberadoEm(
                liberadoEm
              )}
            </strong>
          </div>
        )}
      </footer>


      {mostrarLoginModal && (
        <div
          className="tv-redmine-login-overlay"
          role="presentation"
          onClick={() =>
            setMostrarLoginModal(
              false
            )
          }
        >
          <div
            className="tv-redmine-login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tv-redmine-login-title"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="tv-redmine-login-close"
              aria-label="Fechar"
              title="Fechar"
              onClick={() =>
                setMostrarLoginModal(
                  false
                )
              }
            >
              ×
            </button>


            <div className="tv-redmine-login-badge">
              Acesso protegido
            </div>


            <h2 id="tv-redmine-login-title">
              Acesso ao Redmine
            </h2>


            <p>
              Para acessar as tarefas no Redmine,
              faça login no ReleaseHub.
            </p>


            <div className="tv-redmine-login-actions">
              <button
                type="button"
                className="tv-redmine-login-cancel"
                onClick={() =>
                  setMostrarLoginModal(
                    false
                  )
                }
              >
                Agora não
              </button>


              <button
                type="button"
                className="tv-redmine-login-primary"
                onClick={() => {
                  setMostrarLoginModal(
                    false
                  );

                  navigate(
                    "/login",
                    {
                      state: {
                        from: "/tv",
                      },
                    }
                  );
                }}
              >
                Ir para o login
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}


export default TvProjectCard;