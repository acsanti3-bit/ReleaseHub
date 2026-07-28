import {
  useMemo,
  useState,
} from "react";

import "./ReleaseEnvironmentDrawer.css";

import type {
  ReleaseEnvironment,
  ReleaseSystemVersion,
} from "../../types/releaseEnvironment";


interface Props {

  environment: ReleaseEnvironment;

  onClose: () => void;

  onSave: (
    environment: ReleaseEnvironment
  ) => void;

}


function obterSistemasIniciais(
  environment: ReleaseEnvironment
): ReleaseSystemVersion[] {

  /*
    Se a API já devolveu os sistemas
    dinâmicos, utilizamos eles.
  */

  if (
    environment.sistemas &&
    environment.sistemas.length > 0
  ) {

    return environment.sistemas.map(
      sistema => ({
        ...sistema,
      })
    );

  }


  /*
    Fallback para ambientes antigos.
  */

  return [

    {
      chave: "intellicash",
      nome: "Intellicash",
      versao:
        environment
          .versoes
          .intellicash,
      ordem: 1,
    },

    {
      chave: "easycash",
      nome: "EasyCash",
      versao:
        environment
          .versoes
          .easycash,
      ordem: 2,
    },

    {
      chave: "easycheckout",
      nome: "EasyCheckout",
      versao:
        environment
          .versoes
          .easycheckout,
      ordem: 3,
    },

    {
      chave: "easypdv",
      nome: "EasyPDV",
      versao:
        environment
          .versoes
          .easypdv,
      ordem: 4,
    },

    {
      chave: "intellistock",
      nome: "IntelliStock",
      versao:
        environment
          .versoes
          .intellistock,
      ordem: 5,
    },

    {
      chave: "iwbserver",
      nome: "IWB Server",
      versao:
        environment
          .versoes
          .iwbserver,
      ordem: 6,
    },

  ];

}


function ReleaseEnvironmentDrawer({

  environment,

  onClose,

  onSave,

}: Props) {

  const [
    form,
    setForm,
  ] =
    useState<ReleaseEnvironment>(
      {
        ...environment,

        sistemas:
          obterSistemasIniciais(
            environment
          ),
      }
    );


  /*
    Ordena os sistemas conforme
    a ordem cadastrada.
  */

  const sistemas =
    useMemo(
      () => {

        return [
          ...(
            form.sistemas ??
            []
          ),
        ].sort(
          (
            a,
            b
          ) =>
            a.ordem -
            b.ordem
        );

      },
      [
        form.sistemas,
      ]
    );


  /*
    Altera nome ou versão
    de um sistema.
  */

  function alterarSistema(
    chave: string,
    campo:
      "nome" |
      "versao",
    valor: string
  ) {

    const atualizados =
      (
        form.sistemas ??
        []
      ).map(
        sistema => {

          if (
            sistema.chave !==
            chave
          ) {

            return sistema;

          }


          return {

            ...sistema,

            [campo]:
              valor,

          };

        }
      );


    setForm(
      {
        ...form,

        sistemas:
          atualizados,
      }
    );

  }


  /*
    Adiciona um novo sistema
    dinamicamente.
  */

  function adicionarSistema() {

    const lista =
      form.sistemas ??
      [];


    const maiorOrdem =
      lista.reduce(
        (
          maior,
          sistema
        ) =>
          Math.max(
            maior,
            sistema.ordem
          ),
        0
      );


    setForm(
      {
        ...form,

        sistemas: [

          ...lista,

          {
            chave:
              `novo-${Date.now()}`,

            nome:
              "",

            versao:
              "",

            ordem:
              maiorOrdem + 1,
          },

        ],
      }
    );

  }


  /*
    Remove um sistema.

    Intellicash nunca pode
    ser removido porque é
    nossa versão de referência.
  */

  function removerSistema(
    chave: string
  ) {

    if (
      chave ===
      "intellicash"
    ) {

      return;

    }


    setForm(
      {
        ...form,

        sistemas:
          (
            form.sistemas ??
            []
          ).filter(
            sistema =>
              sistema.chave !==
              chave
          ),
      }
    );

  }


  function salvar() {

    if (
      !form.nome.trim()
    ) {

      alert(
        "Informe o nome do ambiente."
      );

      return;

    }


    const intellicash =
      (
        form.sistemas ??
        []
      ).find(
        sistema =>
          sistema.chave ===
          "intellicash"
      );


    if (
      !intellicash
        ?.versao
        .trim()
    ) {

      alert(
        "Informe a versão do Intellicash."
      );

      return;

    }


    const sistemaSemNome =
      (
        form.sistemas ??
        []
      ).some(
        sistema =>
          !sistema.nome.trim()
      );


    if (
      sistemaSemNome
    ) {

      alert(
        "Informe o nome de todos os sistemas."
      );

      return;

    }


    /*
      Mantemos as propriedades antigas
      para compatibilidade com as partes
      do sistema que ainda utilizam
      ambiente.versoes.
    */

    const encontrarVersao =
      (
        chave: string
      ) => {

        return (
          (
            form.sistemas ??
            []
          ).find(
            sistema =>
              sistema.chave ===
              chave
          )?.versao ??
          ""
        );

      };


    const versoes = {

      intellicash:
        encontrarVersao(
          "intellicash"
        ),

      easycash:
        encontrarVersao(
          "easycash"
        ),

      easycheckout:
        encontrarVersao(
          "easycheckout"
        ),

      easypdv:
        encontrarVersao(
          "easypdv"
        ),

      intellistock:
        encontrarVersao(
          "intellistock"
        ),

      iwbserver:
        encontrarVersao(
          "iwbserver"
        ),

    };


    onSave(
      {
        ...form,

        versoes,
      }
    );

  }


  return (

    <>

      <div
        className="release-drawer-backdrop"
        onClick={
          onClose
        }
      />


      <aside className="release-drawer">

        <div className="release-drawer-header">

          <div>

            <h2>
              Ambiente da Release
            </h2>

            <span>
              Amarração entre versões
            </span>

          </div>


          <button
            type="button"
            onClick={
              onClose
            }
          >

            ×

          </button>

        </div>


        <div className="release-drawer-body">

          <div className="release-field">

            <label>
              Nome do Ambiente
            </label>


            <input
              placeholder="Ex.: Release 3.1.021"
              value={
                form.nome
              }
              onChange={
                event =>
                  setForm(
                    {
                      ...form,

                      nome:
                        event
                          .target
                          .value,
                    }
                  )
              }
            />

          </div>


          <div className="release-reference">

            <strong>
              Versão de referência
            </strong>

            <span>

              O Intellicash identifica
              automaticamente todo
              o ambiente.

            </span>

          </div>


          <div className="release-divider">

            Sistemas da Release

          </div>


          {sistemas.map(
            sistema => (

              <div
                key={
                  sistema.chave
                }
                style={{
                  marginBottom:
                    "14px",

                  padding:
                    "12px",

                  border:
                    sistema.chave ===
                    "intellicash"
                      ? "1px solid #BFD9EF"
                      : "1px solid #E2E7EC",

                  borderRadius:
                    "10px",

                  background:
                    sistema.chave ===
                    "intellicash"
                      ? "#F4F9FD"
                      : "#FFF",
                }}
              >

                <div className="release-field">

                  <label>

                    Sistema

                    {sistema.chave ===
                      "intellicash" &&
                      " • Referência"}

                  </label>


                  <input
                    value={
                      sistema.nome
                    }
                    readOnly={
                      sistema.chave ===
                      "intellicash"
                    }
                    onChange={
                      event =>
                        alterarSistema(
                          sistema.chave,
                          "nome",
                          event
                            .target
                            .value
                        )
                    }
                  />

                </div>


                <div
                  className="release-field"
                  style={{
                    marginTop:
                      "10px",
                  }}
                >

                  <label>
                    Versão
                  </label>


                  <input
                    placeholder="Informe a versão"
                    value={
                      sistema.versao
                    }
                    onChange={
                      event =>
                        alterarSistema(
                          sistema.chave,
                          "versao",
                          event
                            .target
                            .value
                        )
                    }
                  />

                </div>


                {sistema.chave !==
                  "intellicash" && (

                  <button
                    type="button"
                    onClick={() =>
                      removerSistema(
                        sistema.chave
                      )
                    }
                    style={{
                      marginTop:
                        "8px",

                      padding:
                        "0",

                      border:
                        "none",

                      background:
                        "transparent",

                      color:
                        "#C62828",

                      fontSize:
                        "11px",

                      fontWeight:
                        700,

                      cursor:
                        "pointer",
                    }}
                  >

                    Remover sistema

                  </button>

                )}

              </div>

            )
          )}


          <button
            type="button"
            onClick={
              adicionarSistema
            }
            style={{
              width:
                "100%",

              height:
                "42px",

              marginTop:
                "4px",

              marginBottom:
                "16px",

              border:
                "1px dashed #005AA9",

              borderRadius:
                "9px",

              background:
                "#F6FAFD",

              color:
                "#005AA9",

              fontSize:
                "13px",

              fontWeight:
                700,

              cursor:
                "pointer",
            }}
          >

            + Adicionar sistema

          </button>


          <button
            type="button"
            className="release-save"
            onClick={
              salvar
            }
          >

            Salvar Ambiente

          </button>

        </div>

      </aside>

    </>

  );

}


export default ReleaseEnvironmentDrawer;