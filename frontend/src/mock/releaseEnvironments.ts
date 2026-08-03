import type { ReleaseEnvironment } from "../types/releaseEnvironment";

export const releaseEnvironments: ReleaseEnvironment[] = [
  {
    id: 1,
    nome: "Release 3.1.021",
    versoes: {
      intellicash: "3.1.021.000",
      easycash: "1.5.004.002",
      easycheckout: "1.0.6.0",
      easypdv: "2.1.3.0",
      intellistock: "1.1.2.0",
      iwbserver: "1.0.0.9",
    },
    sistemas: [
      { chave: "intellicash", nome: "IntelliCash", versao: "3.1.021.000", ordem: 1 },
      { chave: "easycash", nome: "EasyCash", versao: "1.5.004.002", ordem: 2 },
      { chave: "easycheckout", nome: "EasyCheckOut", versao: "1.0.6.0", ordem: 3 },
      { chave: "easypdv", nome: "EasyPDV", versao: "2.1.3.0", ordem: 4 },
      { chave: "intellistock", nome: "IntelliStock", versao: "1.1.2.0", ordem: 5 },
      { chave: "iwsserver", nome: "IWS Server", versao: "1.0.0.9", ordem: 6 },
      { chave: "enterpriseserver", nome: "Enterprise Server", versao: "", ordem: 7 },
      { chave: "nfedestinadas", nome: "NF-e Destinadas", versao: "", ordem: 8 },
      { chave: "intellifood", nome: "IntelliFood", versao: "", ordem: 9 },
      { chave: "pcp", nome: "PCP", versao: "", ordem: 10 },
      { chave: "gerenciadordepromocoes", nome: "Gerenciador de Promoções", versao: "", ordem: 11 },
      { chave: "sincmatrizxfilial", nome: "Sinc. Matriz X Filial", versao: "", ordem: 12 },
      { chave: "sinclabfiscal", nome: "Sinc. Lab. Fiscal", versao: "", ordem: 13 },
      { chave: "sincecommerce", nome: "Sinc. E-Commerce", versao: "", ordem: 14 },
      { chave: "pesocerto", nome: "Peso Certo", versao: "", ordem: 15 },
      { chave: "notify", nome: "Notify", versao: "", ordem: 16 },
      { chave: "vendaassistida", nome: "Venda Assistida", versao: "", ordem: 17 },
      { chave: "cotacao", nome: "Cotação", versao: "", ordem: 18 },
      { chave: "bi", nome: "BI", versao: "", ordem: 19 },
    ],
  },
];
