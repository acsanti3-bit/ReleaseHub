export interface ReleaseSystemVersion {

  chave: string;

  nome: string;

  versao: string;

  ordem: number;

}


export interface ReleaseEnvironment {

  id: number;

  nome: string;

  /*
    Estrutura antiga mantida
    por compatibilidade com
    outras partes do ReleaseHub.
  */

  versoes: {

    intellicash: string;

    easycash: string;

    easycheckout: string;

    easypdv: string;

    intellistock: string;

    iwbserver: string;

  };


  /*
    Estrutura dinâmica utilizada
    para todos os sistemas
    pertencentes à release.
  */

  sistemas?: ReleaseSystemVersion[];

}