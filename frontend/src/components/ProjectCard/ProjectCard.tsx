import { useState } from "react";
import {
  MdEdit,
  MdExpandLess,
  MdExpandMore,
  MdVisibility,
} from "react-icons/md";

import "./ProjectCard.css";

import type { Project } from "../../types/project";
import {
  formatMovementAge,
  getObservationReasons,
  parseBrazilianDate,
} from "../../utils/projectMonitoring";

interface Props {
  project: Project;
  onOpen: (project: Project) => void;
  canEdit: boolean;
  concluido?: boolean;
  onFilterStatus?: (filtro: string) => void;
}

interface StatusItem {
  label: string;
  filter: string;
  value: number;
  color: string;
}

interface PrazoInfo {
  texto: string;
  detalhe: string;
  classe: "ok" | "warning" | "late" | "invalid" | "neutral";
}

function obterSituacaoPrazo(prazoTexto: string, concluido = false): PrazoInfo {
  if (concluido) {
    return {
      texto: "Concluída",
      detalhe: "Prazo não considerado",
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

  const prazo = parseBrazilianDate(prazoTexto);

  if (!prazo) {
    return {
      texto: "Prazo inválido",
      detalhe: prazoTexto,
      classe: "invalid",
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const diferenca = Math.round((prazo.getTime() - hoje.getTime()) / 86400000);

  if (diferenca < 0) {
    const dias = Math.abs(diferenca);
    return {
      texto: "Atrasado",
      detalhe: dias === 1 ? "1 dia em atraso" : `${dias} dias em atraso`,
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

function ProjectCard({
  project,
  onOpen,
  canEdit,
  concluido = false,
  onFilterStatus,
}: Props) {
  const [recolhido, setRecolhido] = useState(false);

  const total = Object.values(project.situacoes).reduce(
    (acumulado, valor) => acumulado + valor,
    0
  );

  const situacaoPrazo = obterSituacaoPrazo(project.prazo, concluido);
  const movimentacao = formatMovementAge(project.ultimaMovimentacao);
  const observacoes = getObservationReasons(project, concluido);

  const situacoes: StatusItem[] = [
    { label: "Qualidade", filter: "Qualidade", value: project.situacoes.qualidade, color: "#F58220" },
    { label: "Testes", filter: "Testes", value: project.situacoes.testes, color: "#1976D2" },
    { label: "Desenvolvido", filter: "Desenvolvido", value: project.situacoes.desenvolvido, color: "#43A047" },
    { label: "Aguard. Comp.", filter: "Aguard. Comp.", value: project.situacoes.aguardandoCompilacao, color: "#78909C" },
    { label: "Em Progresso", filter: "Em Progresso", value: project.situacoes.emProgresso, color: "#FBC02D" },
    { label: "Nova", filter: "Nova", value: project.situacoes.nova, color: "#26A69A" },
    { label: "Reaberta", filter: "Reaberta", value: project.situacoes.reaberta, color: "#EF5350" },
    { label: "Validação no Cliente", filter: "Validação no Cliente", value: project.situacoes.validacaoCliente, color: "#5C6BC0" },
    { label: "Rejeitada", filter: "Rejeitada", value: project.situacoes.rejeitada, color: "#616161" },
    { label: "Interrompida", filter: "Interrompida", value: project.situacoes.interrompida, color: "#8E24AA" },
    { label: "Resolvidas", filter: "Resolvidas", value: project.situacoes.resolvidas, color: "#2E7D32" },
  ].filter(status => status.value > 0);

  return (
    <article
      className={`release-project-card ${
        observacoes.length > 0 ? "release-project-card-observation" : ""
      } ${recolhido ? "release-project-card-collapsed" : ""}`}
    >
      <header className="release-project-header">
        <div className="release-project-title">
          <div className="release-project-title-line">
            <h2 title={project.nome}>{project.nome}</h2>

            {observacoes.length > 0 && (
              <span
                className="release-observation-badge"
                title={observacoes.join(" • ")}
              >
                <MdVisibility size={14} />
                Em observação
              </span>
            )}
          </div>

          <div className="release-project-subtitle">
            <span>
              Versão <strong>{project.versao || "-"}</strong>
            </span>

            <span className="release-task-total">{total} tarefas</span>

            {recolhido && project.ultimaMovimentacao && (
              <span className={`release-collapsed-movement ${movimentacao.className}`}>
                Movimento {movimentacao.text.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        <div className="release-project-actions">
          <button
            type="button"
            className="release-collapse-button"
            title={recolhido ? "Expandir card" : "Recolher card"}
            aria-label={recolhido ? "Expandir card" : "Recolher card"}
            aria-expanded={!recolhido}
            onClick={() => setRecolhido(value => !value)}
          >
            {recolhido ? <MdExpandMore size={21} /> : <MdExpandLess size={21} />}
          </button>

          {canEdit && (
            <button
              type="button"
              className="release-edit-button"
              title="Editar projeto"
              onClick={() => onOpen(project)}
            >
              <MdEdit size={19} />
            </button>
          )}
        </div>
      </header>

      {!recolhido && (
        <>
          <div className="release-project-info">
            <div>
              <small>Último Executável</small>
              <strong>{project.executavel || "-"}</strong>
            </div>

            <div>
              <small>Prazo</small>
              <strong>{project.prazo || "-"}</strong>
            </div>

            <div>
              <small>Situação do prazo</small>
              <div className={`release-deadline-status ${situacaoPrazo.classe}`}>
                <strong>{situacaoPrazo.texto}</strong>
                <span>{situacaoPrazo.detalhe}</span>
              </div>
            </div>

            <div>
              <small>Última movimentação</small>
              <div className={`release-movement-status ${movimentacao.className}`}>
                <strong>{movimentacao.text}</strong>
                <span>{movimentacao.detail}</span>
              </div>
            </div>
          </div>

          {observacoes.length > 0 && (
            <div className="release-observation-reasons">
              {observacoes.map(reason => (
                <span key={reason}>{reason}</span>
              ))}
            </div>
          )}

          <div className="release-status-grid">
            {situacoes.map(status => {
              const clicavel = Boolean(onFilterStatus);

              return (
                <button
                  type="button"
                  key={status.label}
                  className={`release-status-item ${
                    status.label === "Resolvidas" ? "release-status-item-resolved" : ""
                  } ${clicavel ? "release-status-item-clickable" : ""}`}
                  onClick={() => onFilterStatus?.(status.filter)}
                  disabled={!clicavel}
                  title={clicavel ? `Filtrar projetos em ${status.label}` : undefined}
                >
                  <span className="release-status-label">
                    <span
                      className="release-status-dot"
                      style={{ background: status.color }}
                    />
                    <span>{status.label}</span>
                  </span>

                  <strong style={{ color: status.color }}>{status.value}</strong>
                </button>
              );
            })}

            {situacoes.length === 0 && (
              <div className="release-status-empty">Nenhuma tarefa neste projeto.</div>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export default ProjectCard;
