export interface Project {

  id: number;

  nome: string;

  versao: string;

  executavel: string;

  prazo: string;

  situacoes: {

    qualidade: number;

    testes: number;

    desenvolvido: number;

    aguardandoCompilacao: number;

    emProgresso: number;

    nova: number;

    reaberta: number;

    resolvidas: number;

    rejeitada: number;

    interrompida: number;

  };

}