import "./AttentionProjects.css";

import type { Project } from "../../types/project";
import {
  formatMovementAge,
  getObservationReasons,
} from "../../utils/projectMonitoring";

interface Props {
  projects: Project[];
  concluido?: boolean;
  onProjectClick?: (project: Project) => void;
}

function AttentionProjects({
  projects,
  concluido = false,
  onProjectClick,
}: Props) {
  const lista = projects
    .map(project => ({
      project,
      reasons: getObservationReasons(project, concluido),
      movement: formatMovementAge(project.ultimaMovimentacao),
    }))
    .filter(item => item.reasons.length > 0)
    .sort((a, b) => {
      const priority = (reasons: string[]) => {
        if (reasons.includes("Atrasado")) return 0;
        if (reasons.some(reason => reason.includes("reaberta"))) return 1;
        if (reasons.some(reason => reason.includes("interrompida"))) return 2;
        if (reasons.some(reason => reason.startsWith("Sem movimentação"))) return 3;
        if (reasons.includes("Aguardando compilação")) return 4;
        return 5;
      };

      return priority(a.reasons) - priority(b.reasons) ||
        a.project.nome.localeCompare(b.project.nome);
    });

  return (
    <div className="attention-projects">
      <div className="attention-projects-heading">
        <div>
          <h2>Projetos em observação</h2>
          <p>
            Destaque automático para prazo, reabertura, interrupção, compilação e falta de movimentação.
          </p>
        </div>

        <strong>{lista.length}</strong>
      </div>

      {lista.length === 0 && (
        <div className="attention-empty">
          Nenhum projeto precisa de observação neste momento.
        </div>
      )}

      {lista.map(({ project, reasons, movement }) => (
        <button
          type="button"
          key={project.id}
          className="attention-row"
          onClick={() => onProjectClick?.(project)}
          disabled={!onProjectClick}
          title={onProjectClick ? `Localizar ${project.nome} na lista` : undefined}
        >
          <div className="attention-project-name">
            <strong>{project.nome}</strong>
            <small>Última movimentação: {movement.text.toLowerCase()}</small>
          </div>

          <div className="attention-badges">
            {reasons.map(reason => (
              <span key={reason}>{reason}</span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

export default AttentionProjects;
