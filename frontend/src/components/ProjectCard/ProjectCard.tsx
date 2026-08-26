import { MdEdit } from "react-icons/md";

import "./ProjectCard.css";

import type { Project } from "../../types/project";
import {
  formatMovementAge,
  parseBrazilianDate,
} from "../../utils/projectMonitoring";

interface Props {
  project: Project;
  onOpen: (project: Project) => void;
  canEdit: boolean;
  concluido?: boolean;
}

interface StatusItem {
  label: string;
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
}: Props) {
  const total = Object.values(project.situacoes).reduce(
    (acumulado, valor) => acumulado + valor,
    0
  );

  const situacaoPrazo = obterSituacaoPrazo(project.prazo, concluido);
  const movimentacao = formatMovementAge(project.ultimaMovimentacao);

  const situacoes: StatusItem[] = [
    { label: "Qualidade", value: project.situacoes.qualidade, color: "#F58220" },
    { label: "Testes", value: project.situacoes.testes, color: "#1976D2" },
    { label: "Desenvolvido", value: project.situacoes.desenvolvido, color: "#43A047" },
    { label: "Aguard. Comp.", value: project.situacoes.aguardandoCompilacao, color: "#78909C" },
    { label: "Em Progresso", value: project.situacoes.emProgresso, color: "#FBC02D" },
    { label: "Nova", value: project.situacoes.nova, color: "#26A69A" },
    { label: "Reaberta", value: project.situacoes.reaberta, color: "#EF5350" },
    { label: "Validação no Cliente", value: project.situacoes.validacaoCliente, color: "#5C6BC0" },
    { label: "Rejeitada", value: project.situacoes.rejeitada, color: "#616161" },
    { label: "Interrompida", value: project.situacoes.interrompida, color: "#8E24AA" },
    { label: "Resolvidas", value: project.situacoes.resolvidas, color: "#2E7D32" },
  ].filter(status => status.value > 0);

  return (
    <article className="release-project-card">
      <header className="release-project-header">
        <div className="release-project-title">
          <h2 title={project.nome}>{project.nome}</h2>

          <div className="release-project-subtitle">
            <span>
              Versão <strong>{project.versao || "-"}</strong>
            </span>

            <span className="release-task-total">{total} tarefas</span>
          </div>
        </div>

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
      </header>

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

      <div className="release-status-grid">
        {situacoes.map(status => (
          <div
            key={status.label}
            className={`release-status-item ${
              status.label === "Resolvidas" ? "release-status-item-resolved" : ""
            }`}
          >
            <span className="release-status-label">
              <span
                className="release-status-dot"
                style={{ background: status.color }}
              />
              <span>{status.label}</span>
            </span>

            <strong style={{ color: status.color }}>{status.value}</strong>
          </div>
        ))}

        {situacoes.length === 0 && (
          <div className="release-status-empty">Nenhuma tarefa neste projeto.</div>
        )}
      </div>
    </article>
  );
}

export default ProjectCard;
