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

    emProgresso: number;

    aguardandoCompilacao: number;

    nova: number;

    reaberta: number;

    rejeitada: number;

    interrompida: number;

  };

}