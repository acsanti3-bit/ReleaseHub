import type {
  Project,
} from "../types/project";


export const projects: Project[] = [

  {

    id: 1,

    nome: "EasyCash",

    versao: "1.5.5.0",

    executavel: "15/07/2026",

    prazo: "18/07/2026",

    situacoes: {

      qualidade: 14,

      testes: 3,

      desenvolvido: 8,

      aguardandoCompilacao: 1,

      emProgresso: 2,

      nova: 5,

      reaberta: 1,

      validacaoCliente: 0,

      resolvidas: 0,

      rejeitada: 0,

      interrompida: 0,

    },

  },


  {

    id: 2,

    nome: "EasyPDV",

    versao: "2.1.3.0",

    executavel: "16/07/2026",

    prazo: "19/07/2026",

    situacoes: {

      qualidade: 4,

      testes: 7,

      desenvolvido: 6,

      aguardandoCompilacao: 0,

      emProgresso: 1,

      nova: 2,

      reaberta: 0,

      validacaoCliente: 0,

      resolvidas: 0,

      rejeitada: 0,

      interrompida: 0,

    },

  },


  {

    id: 3,

    nome: "EasyCheckOut",

    versao: "1.0.6.0",

    executavel: "17/07/2026",

    prazo: "21/07/2026",

    situacoes: {

      qualidade: 2,

      testes: 1,

      desenvolvido: 10,

      aguardandoCompilacao: 0,

      emProgresso: 0,

      nova: 0,

      reaberta: 0,

      validacaoCliente: 0,

      resolvidas: 0,

      rejeitada: 0,

      interrompida: 0,

    },

  },

];