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
        )?.versao.trim() ?? "";

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

      nome:
        form.nome.trim(),

      versoes,

      sistemas:
        sistemas.map(
          sistema => ({
            ...sistema,

            versao:
              sistema
                .versao
                .trim(),

            mostrarNaTv:
              sistema
                .mostrarNaTv ??
              true,
          })
        ),
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


          <div className="release-tv-controls">
            <div className="release-tv-controls-text">
              <strong>
                Projetos exibidos na TV
              </strong>

              <span>
                Desmarque os projetos que
                não devem aparecer no painel.
              </span>
            </div>

            <div className="release-tv-actions">
              <button
                type="button"
                onClick={() =>
                  alterarTodosNaTv(
                    true
                  )
                }
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

                const mostrarNaTv =
                  sistema
                    .mostrarNaTv ??
                  true;

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
                      className="release-system-name"
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
                      className="release-system-version"
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
                      className={`release-tv-toggle ${
                        mostrarNaTv
                          ? "release-tv-toggle-active"
                          : ""
                      }`}
                      title="Exibir este projeto no Modo TV"
                    >
                      <input
                        type="checkbox"
                        checked={
                          mostrarNaTv
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
                      />

                      <span>
                        Exibir na TV
                      </span>
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
