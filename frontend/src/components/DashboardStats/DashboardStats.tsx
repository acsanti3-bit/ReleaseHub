import "./DashboardStats.css";

import type { Project } from "../../types/project";
import {
  isProjectInactive,
  isProjectOverdue,
  isProjectUnderObservation,
} from "../../utils/projectMonitoring";

interface Props {
  projects: Project[];
  concluido?: boolean;
  filtroAtivo: string;
  onFilter: (filtro: string) => void;
}

interface StatCard {
  titulo: string;
  valor: number;
  cor: string;
  filtro: string;
  detalhe: string;
}

function DashboardStats({
  projects,
  concluido = false,
  filtroAtivo,
  onFilter,
}: Props) {
  const totalTarefas = projects.reduce(
    (acc, project) =>
      acc + Object.values(project.situacoes).reduce((a, b) => a + b, 0),
    0
  );

  const somar = (campo: keyof Project["situacoes"]) =>
    projects.reduce((acc, project) => acc + project.situacoes[campo], 0);

  const observacao = projects.filter(project =>
    isProjectUnderObservation(project, concluido)
  ).length;

  const semMovimentacao = projects.filter(isProjectInactive).length;

  const atrasados = projects.filter(project =>
    isProjectOverdue(project, concluido)
  ).length;

  const cards: StatCard[] = [
    {
      titulo: "Projetos",
      valor: projects.length,
      cor: "#005AA9",
      filtro: "Todos",
      detalhe: "Todos da release",
    },
    {
      titulo: "Tarefas",
      valor: totalTarefas,
      cor: "#F58220",
      filtro: "Todos",
      detalhe: "Total sincronizado",
    },
    {
      titulo: "Qualidade",
      valor: somar("qualidade"),
      cor: "#F58220",
      filtro: "Qualidade",
      detalhe: "Clique para filtrar",
    },
    {
      titulo: "Testes",
      valor: somar("testes"),
      cor: "#1976D2",
      filtro: "Testes",
      detalhe: "Clique para filtrar",
    },
    {
      titulo: "Aguard. Comp.",
      valor: somar("aguardandoCompilacao"),
      cor: "#78909C",
      filtro: "Aguard. Comp.",
      detalhe: "Aguardando compilação",
    },
    {
      titulo: "Reabertas",
      valor: somar("reaberta"),
      cor: "#EF5350",
      filtro: "Reaberta",
      detalhe: "Tarefas reabertas",
    },
    {
      titulo: "Em observação",
      valor: observacao,
      cor: "#D96C10",
      filtro: "Em observação",
      detalhe: "Projetos com atenção",
    },
    {
      titulo: "Sem movimentação",
      valor: semMovimentacao,
      cor: "#8E24AA",
      filtro: "Sem movimentação",
      detalhe: "3 dias ou mais",
    },
    {
      titulo: "Atrasados",
      valor: atrasados,
      cor: "#D32F2F",
      filtro: "Atrasados",
      detalhe: concluido ? "Release concluída" : "Prazo vencido",
    },
  ];

  return (
    <div className="stats-grid" aria-label="Indicadores da release">
      {cards.map(card => {
        const ativo =
          card.titulo !== "Tarefas" &&
          filtroAtivo === card.filtro;

        return (
          <button
            type="button"
            key={card.titulo}
            className={`stats-card ${ativo ? "stats-card-active" : ""}`}
            style={{ borderTopColor: card.cor }}
            onClick={() => onFilter(card.filtro)}
            aria-pressed={ativo}
            title={`${card.titulo}: ${card.valor}. ${card.detalhe}`}
          >
            <small>{card.titulo}</small>
            <strong style={{ color: card.cor }}>{card.valor}</strong>
            <span>{card.detalhe}</span>
          </button>
        );
      })}
    </div>
  );
}

export default DashboardStats;
