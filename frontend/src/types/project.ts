export interface Project {

  id: number;

  nome: string;

  versao: string;

  executavel: string;

  prazo: string;

  ultimaMovimentacao?: string;

  situacoes: {

    qualidade: number;

    testes: number;

    desenvolvido: number;

    aguardandoCompilacao: number;

    emProgresso: number;

    nova: number;

    reaberta: number;

    validacaoCliente: number;

    resolvidas: number;

    rejeitada: number;

    interrompida: number;

  };

}