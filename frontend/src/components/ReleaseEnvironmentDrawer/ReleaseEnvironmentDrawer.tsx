import {
  useMemo,
  useState,
} from "react";

import "./ReleaseEnvironmentDrawer.css";

import {
  criarSistemasFixos,
} from "../../types/releaseEnvironment";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";


interface Props {
  environment: ReleaseEnvironment;

  onClose: () => void;

  onSave: (
    environment: ReleaseEnvironment
  ) => void;
}


function ReleaseEnvironmentDrawer({
  environment,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] =
    useState<ReleaseEnvironment>(
      () => ({
        ...environment,

        sistemas:
          criarSistemasFixos(
            environment.sistemas,
            environment.versoes
          ),
      })
    );


  const sistemas =
    useMemo(
      () =>
        [...(form.sistemas ?? [])]
          .sort(
            (a, b) =>
              a.ordem - b.ordem
          ),
      [form.sistemas]
    );


  function alterarVersao(
    chave: string,
    valor: string
  ) {
    setForm(
      estadoAtual => ({
        ...estadoAtual,

        sistemas:
          (
            estadoAtual.sistemas ??
            []
          ).map(
            sistema =>
              sistema.chave === chave
                ? {
                    ...sistema,
                    versao: valor,
                  }
                : sistema
          ),
      })
    );
  }


  function alterarExibicaoNaTv(
    chave: string,
    mostrarNaTv: boolean
  ) {
    setForm(
      estadoAtual => ({
        ...estadoAtual,

        sistemas:
          (
            estadoAtual.sistemas ??
            []
          ).map(
            sistema =>
              sistema.chave === chave
                ? {
                    ...sistema,
                    mostrarNaTv,
                  }
                : sistema
          ),
      })
    );
  }


  function alterarTodosNaTv(
    mostrarNaTv: boolean
  ) {
    setForm(
      estadoAtual => ({
        ...estadoAtual,

        sistemas:
          (
            estadoAtual.sistemas ??
            []
          ).map(
            sistema => ({
              ...sistema,
              mostrarNaTv,
            })
          ),
      })
    );
  }


  function salvar() {
    if (!form.nome.trim()) {
      alert(
        "Informe o nome do ambiente."
      );

      return;
    }

    const intellicash =
      sistemas.find(
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
        "Informe a versão do IntelliCash."
      );

      return;
    }

    const encontrarVersao =
      (chave: string) =>
        sistemas.find(
          sistema =>
            sistema.chave === chave
        )?.versao ?? "";

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

    onSave({
      ...form,
      nome: form.nome.trim(),
      versoes,
      sistemas,
    });
  }


  return (
    <>
      <div
        className="release-drawer-backdrop"
        onClick={onClose}
      />

      <aside className="release-drawer">
        <header className="release-drawer-header">
          <div>
            <h2>
              Ambiente da Release
            </h2>

            <span>
              Informe as versões dos
              sistemas deste ambiente
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>


        <div className="release-drawer-body">
          <div className="release-field">
            <label>
              Nome do Ambiente
            </label>

            <input
              placeholder="Ex.: Release 3.1.021.000"
              value={form.nome}
              onChange={
                event =>
                  setForm(
                    estadoAtual => ({
                      ...estadoAtual,

                      nome:
                        event
                          .target
                          .value,
                    })
                  )
              }
            />
          </div>


          <div className="release-reference">
            <strong>
              Catálogo fixo
            </strong>

            <span>
              Todos os ambientes possuem
              os mesmos 19 sistemas. Informe
              somente as versões disponíveis.
            </span>
          </div>


          <div className="release-divider">
            Sistemas da Release
          </div>


          <div
            style={{
              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",

              gap:
                "12px",

              marginBottom:
                "10px",

              padding:
                "10px 12px",

              border:
                "1px solid #E3E9EF",

              borderRadius:
                "10px",

              background:
                "#F8FAFC",
            }}
          >
            <div>
              <strong
                style={{
                  display:
                    "block",

                  color:
                    "#005AA9",

                  fontSize:
                    "13px",
                }}
              >
                Projetos exibidos na TV
              </strong>

              <span
                style={{
                  color:
                    "#7A838C",

                  fontSize:
                    "11px",
                }}
              >
                Desmarque os projetos que
                não devem aparecer no painel.
              </span>
            </div>

            <div
              style={{
                display:
                  "flex",

                gap:
                  "6px",

                flexShrink:
                  0,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  alterarTodosNaTv(
                    true
                  )
                }
                style={{
                  padding:
                    "6px 9px",

                  border:
                    "1px solid #C9D8E5",

                  borderRadius:
                    "7px",

                  background:
                    "#FFFFFF",

                  color:
                    "#005AA9",

                  cursor:
                    "pointer",

                  fontSize:
                    "10px",

                  fontWeight:
                    700,
                }}
              >
                Marcar todos
              </button>

              <button
                type="button"
                onClick={() =>
                  alterarTodosNaTv(
                    false
                  )
                }
                style={{
                  padding:
                    "6px 9px",

                  border:
                    "1px solid #D7DDE3",

                  borderRadius:
                    "7px",

                  background:
                    "#FFFFFF",

                  color:
                    "#66717C",

                  cursor:
                    "pointer",

                  fontSize:
                    "10px",

                  fontWeight:
                    700,
                }}
              >
                Desmarcar
              </button>
            </div>
          </div>


          <div className="release-system-list">
            {sistemas.map(
              sistema => {
                const referencia =
                  sistema.chave ===
                  "intellicash";

                return (
                  <div
                    key={sistema.chave}
                    className={`release-system-row ${
                      referencia
                        ? "release-system-row-reference"
                        : ""
                    }`}
                  >
                    <label
                      htmlFor={
                        `version-${sistema.chave}`
                      }
                    >
                      <span>
                        {sistema.nome}
                      </span>

                      {referencia && (
                        <small>
                          Referência
                        </small>
                      )}
                    </label>

                    <input
                      id={
                        `version-${sistema.chave}`
                      }
                      placeholder="Sem versão"
                      value={
                        sistema.versao
                      }
                      onChange={
                        event =>
                          alterarVersao(
                            sistema.chave,
                            event
                              .target
                              .value
                          )
                      }
                    />

                    <label
                      title="Exibir este projeto no Modo TV"
                      style={{
                        display:
                          "flex",

                        alignItems:
                          "center",

                        justifyContent:
                          "center",

                        gap:
                          "6px",

                        minWidth:
                          "92px",

                        cursor:
                          "pointer",

                        color:
                          sistema.mostrarNaTv
                            ? "#2E7D32"
                            : "#8A939D",

                        fontSize:
                          "10px",

                        fontWeight:
                          700,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={
                          sistema.mostrarNaTv
                        }
                        onChange={
                          event =>
                            alterarExibicaoNaTv(
                              sistema.chave,
                              event
                                .target
                                .checked
                            )
                        }
                        style={{
                          width:
                            "16px",

                          height:
                            "16px",

                          accentColor:
                            "#005AA9",

                          cursor:
                            "pointer",
                        }}
                      />

                      Exibir na TV
                    </label>
                  </div>
                );
              }
            )}
          </div>


          <button
            type="button"
            className="release-save"
            onClick={salvar}
          >
            Salvar Ambiente
          </button>
        </div>
      </aside>
    </>
  );
}


export default ReleaseEnvironmentDrawer;