export interface Task {

  id: number;

  numero: number;

  titulo: string;

  projetoId: number;

  releaseId: number;

  situacao:
    | "Nova"
    | "Qualidade"
    | "Testes"
    | "Em Progresso"
    | "Desenvolvido"
    | "Aguardando Compilação"
    | "Reaberta"
    | "Resolvidas"
    | "Interrompida"
    | "Rejeitada";

  tipo:
    | "Bug"
    | "Melhoria"
    | "Nova Funcionalidade";

  prioridade:
    | "Baixa"
    | "Normal"
    | "Alta"
    | "Urgente";

  testador: string;

  observacoes: string;

}