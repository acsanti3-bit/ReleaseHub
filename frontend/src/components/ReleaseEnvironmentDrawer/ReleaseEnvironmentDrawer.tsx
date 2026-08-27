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

  environments?: ReleaseEnvironment[];

  onClose: () => void;

  onSave: (
    environment: ReleaseEnvironment
  ) => void;
}


const SISTEMAS_PRINCIPAIS = new Set([
  "intellicash",
  "easycash",
  "easycheckout",
  "easypdv",
  "intellistock",
]);


function obterPartesVersao(
  valor: string
): number[] {
  return (
    valor
      .match(/\d+/g)
      ?.map(Number) ??
    []
  );
}


function compararVersoes(
  versaoA: string,
  versaoB: string
): number {
  const partesA =
    obterPartesVersao(versaoA);

  const partesB =
    obterPartesVersao(versaoB);

  const tamanho =
    Math.max(
      partesA.length,
      partesB.length
    );

  for (
    let indice = 0;
    indice < tamanho;
    indice += 1
  ) {
    const parteA =
      partesA[indice] ?? 0;

    const parteB =
      partesB[indice] ?? 0;

    if (parteA !== parteB) {
      return parteA - parteB;
    }
  }

  return 0;
}


function obterVersaoIntellicash(
  ambiente: ReleaseEnvironment
): string {
  return (
    ambiente.sistemas?.find(
      sistema =>
        sistema.chave ===
        "intellicash"
    )?.versao ??
    ambiente.versoes.intellicash ??
    ""
  ).trim();
}


function ReleaseEnvironmentDrawer({
  environment,
  environments = [],
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


  const ambienteJaExiste =
    useMemo(
      () =>
        environments.some(
          item =>
            item.id === environment.id
        ),
      [environments, environment.id]
    );


  const ambienteAnterior =
    useMemo(() => {
      if (ambienteJaExiste) {
        return null;
      }

      const versaoAtual =
        form.sistemas?.find(
          sistema =>
            sistema.chave ===
            "intellicash"
        )?.versao.trim() ?? "";

      if (!versaoAtual) {
        return null;
      }

      const anteriores =
        environments
          .filter(ambiente => {
            const versao =
              obterVersaoIntellicash(
                ambiente
              );

            return (
              Boolean(versao) &&
              compararVersoes(
                versao,
                versaoAtual
              ) < 0
            );
          })
          .sort(
            (a, b) =>
              compararVersoes(
                obterVersaoIntellicash(b),
                obterVersaoIntellicash(a)
              )
          );

      if (anteriores[0]) {
        return anteriores[0];
      }

      return (
        environments
          .filter(ambiente => {
            const versao =
              obterVersaoIntellicash(
                ambiente
              );

            return (
              Boolean(versao) &&
              compararVersoes(
                versao,
                versaoAtual
              ) > 0
            );
          })
          .sort(
            (a, b) =>
              compararVersoes(
                obterVersaoIntellicash(a),
                obterVersaoIntellicash(b)
              )
          )[0] ?? null
      );
    }, [
      ambienteJaExiste,
      environments,
      form.sistemas,
    ]);


  function alterarVersao(
    chave: string,
    valor: string
  ) {
    setForm(estadoAtual => {
      const sistemasAtuais =
        estadoAtual.sistemas ?? [];

      if (
        chave !== "intellicash" ||
        ambienteJaExiste
      ) {
        return {
          ...estadoAtual,
          sistemas:
            sistemasAtuais.map(
              sistema =>
                sistema.chave === chave
                  ? {
                      ...sistema,
                      versao: valor,
                    }
                  : sistema
            ),
        };
      }

      const anteriores =
        environments
          .filter(ambiente => {
            const versao =
              obterVersaoIntellicash(
                ambiente
              );

            return (
              Boolean(versao) &&
              Boolean(valor.trim()) &&
              compararVersoes(
                versao,
                valor
              ) < 0
            );
          })
          .sort(
            (a, b) =>
              compararVersoes(
                obterVersaoIntellicash(b),
                obterVersaoIntellicash(a)
              )
          );

      const posteriores =
        environments
          .filter(ambiente => {
            const versao =
              obterVersaoIntellicash(
                ambiente
              );

            return (
              Boolean(versao) &&
              Boolean(valor.trim()) &&
              compararVersoes(
                versao,
                valor
              ) > 0
            );
          })
          .sort(
            (a, b) =>
              compararVersoes(
                obterVersaoIntellicash(a),
                obterVersaoIntellicash(b)
              )
          );

      const ambienteBase =
        anteriores[0] ??
        posteriores[0];

      const herdados =
        new Map(
          (ambienteBase?.sistemas ?? [])
            .map(sistema => [
              sistema.chave,
              sistema,
            ])
        );

      return {
        ...estadoAtual,
        sistemas:
          sistemasAtuais.map(
            sistema => {
              if (
                sistema.chave ===
                "intellicash"
              ) {
                return {
                  ...sistema,
                  versao: valor,
                };
              }

              if (
                SISTEMAS_PRINCIPAIS.has(
                  sistema.chave
                )
              ) {
                return sistema;
              }

              const herdado =
                herdados.get(
                  sistema.chave
                );

              if (!herdado) {
                return {
                  ...sistema,
                  versao: "",
                };
              }

              return {
                ...sistema,
                versao:
                  herdado.versao ?? "",
                executavel:
                  herdado.executavel ?? "",
                mostrarNaTv:
                  herdado.mostrarNaTv ??
                  true,
              };
            }
          ),
      };
    });
  }


  function alterarExecutavel(
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
                    executavel: valor,
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

    const principaisSemVersao =
      sistemas.filter(
        sistema =>
          SISTEMAS_PRINCIPAIS.has(
            sistema.chave
          ) &&
          !sistema.versao.trim()
      );

    if (principaisSemVersao.length) {
      alert(
        `Informe a versão de: ${principaisSemVersao
          .map(sistema => sistema.nome)
          .join(", ")}.`
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

      prazo:
        form.prazo?.trim() ?? "",

      versoes,

      sistemas:
        sistemas.map(
          sistema => ({
            ...sistema,

            versao:
              sistema
                .versao
                .trim(),

            executavel:
              sistema
                .executavel
                ?.trim() ??
              "",

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
              Informe as versões principais da release.
              As demais são herdadas automaticamente.
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


          <div className="release-field">
            <label>
              Prazo da Release
            </label>

            <input
              placeholder="dd/mm/aaaa"
              value={
                form.prazo ?? ""
              }
              onChange={
                event =>
                  setForm(
                    estadoAtual => ({
                      ...estadoAtual,

                      prazo:
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
              Versões principais
            </strong>

            <span>
              IntelliCash, EasyCash, EasyCheckOut,
              EasyPDV e IntelliStock devem ter a versão
              informada em cada release. As demais
              aplicações herdam a versão da release
              anterior mais próxima. Se não houver uma
              anterior cadastrada, é usada a próxima
              release disponível. Alterações ficam na
              página Compatibilidade.
            </span>
          </div>


          {!ambienteJaExiste && ambienteAnterior && (
            <div className="release-inheritance-note">
              <strong>
                Versões herdadas
              </strong>

              <span>
                As aplicações secundárias foram
                preenchidas com base em
                <b> {ambienteAnterior.nome}</b>.
              </span>
            </div>
          )}


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

                    <div className="release-system-version-wrap">
                      <input
                        className={`release-system-version ${
                          SISTEMAS_PRINCIPAIS.has(
                            sistema.chave
                          )
                            ? ""
                            : "release-system-version-inherited"
                        }`}
                        id={
                          `version-${sistema.chave}`
                        }
                        placeholder="Sem versão"
                        value={
                          sistema.versao
                        }
                        readOnly={
                          !SISTEMAS_PRINCIPAIS.has(
                            sistema.chave
                          )
                        }
                        title={
                          SISTEMAS_PRINCIPAIS.has(
                            sistema.chave
                          )
                            ? "Versão utilizada nesta release"
                            : "Versão herdada. Altere pela página Compatibilidade."
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

                      {!SISTEMAS_PRINCIPAIS.has(
                        sistema.chave
                      ) && (
                        <small className="release-inherited-badge">
                          Compatibilidade
                        </small>
                      )}
                    </div>

                    <input
                      className="release-system-executable"
                      placeholder="Executável"
                      value={
                        sistema.executavel ??
                        ""
                      }
                      onChange={
                        event =>
                          alterarExecutavel(
                            sistema.chave,
                            event
                              .target
                              .value
                          )
                      }
                      title="Data do executável deste sistema"
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
