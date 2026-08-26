import type { Project } from "../types/project";

export const INACTIVITY_WARNING_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseBrazilianDate(value: string): Date | null {
  if (!value) return null;

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

export function parseProjectTimestamp(value?: string): Date | null {
  if (!value) return null;

  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysWithoutMovement(value?: string): number | null {
  const date = parseProjectTimestamp(value);
  if (!date) return null;

  const difference = Date.now() - date.getTime();
  if (difference <= 0) return 0;

  return Math.floor(difference / DAY_MS);
}

export function formatMovementAge(value?: string): {
  text: string;
  detail: string;
  className: "fresh" | "warning" | "late" | "neutral";
} {
  const date = parseProjectTimestamp(value);

  if (!date) {
    return {
      text: "Sem dados",
      detail: "Sincronize com o Redmine",
      className: "neutral",
    };
  }

  const days = daysWithoutMovement(value) ?? 0;
  const time = date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (days === 0) {
    return {
      text: "Hoje",
      detail: time,
      className: "fresh",
    };
  }

  if (days === 1) {
    return {
      text: "Há 1 dia",
      detail: time,
      className: "fresh",
    };
  }

  if (days < INACTIVITY_WARNING_DAYS) {
    return {
      text: `Há ${days} dias`,
      detail: time,
      className: "fresh",
    };
  }

  if (days < 7) {
    return {
      text: `Há ${days} dias`,
      detail: "Sem atualização recente",
      className: "warning",
    };
  }

  return {
    text: `Há ${days} dias`,
    detail: "Parado há uma semana ou mais",
    className: "late",
  };
}

export function isProjectOverdue(project: Project, concluded = false): boolean {
  if (concluded || !project.prazo) return false;

  const deadline = parseBrazilianDate(project.prazo);
  if (!deadline) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deadline.getTime() < today.getTime();
}

export function daysUntilDeadline(project: Project): number | null {
  const deadline = parseBrazilianDate(project.prazo);
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((deadline.getTime() - today.getTime()) / DAY_MS);
}

export function isProjectInactive(project: Project): boolean {
  const days = daysWithoutMovement(project.ultimaMovimentacao);
  return days !== null && days >= INACTIVITY_WARNING_DAYS;
}

export function getObservationReasons(
  project: Project,
  concluded = false
): string[] {
  if (concluded) return [];

  const reasons: string[] = [];
  const days = daysWithoutMovement(project.ultimaMovimentacao);
  const deadlineDays = daysUntilDeadline(project);

  if (isProjectOverdue(project, concluded)) {
    reasons.push("Atrasado");
  } else if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 2) {
    reasons.push(deadlineDays === 0 ? "Vence hoje" : `Prazo em ${deadlineDays}d`);
  }

  if (project.situacoes.reaberta > 0) {
    reasons.push(`${project.situacoes.reaberta} reaberta${project.situacoes.reaberta === 1 ? "" : "s"}`);
  }

  if (project.situacoes.interrompida > 0) {
    reasons.push(`${project.situacoes.interrompida} interrompida${project.situacoes.interrompida === 1 ? "" : "s"}`);
  }

  if (project.situacoes.aguardandoCompilacao > 0) {
    reasons.push("Aguardando compilação");
  }

  if (days !== null && days >= INACTIVITY_WARNING_DAYS) {
    reasons.push(`Sem movimentação há ${days}d`);
  }

  return reasons;
}

export function isProjectUnderObservation(
  project: Project,
  concluded = false
): boolean {
  return getObservationReasons(project, concluded).length > 0;
}
