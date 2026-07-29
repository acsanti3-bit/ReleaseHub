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
        "Informe a versão do Intellicash."
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
              os mesmos 15 sistemas. Informe
              somente as versões disponíveis.
            </span>
          </div>


          <div className="release-divider">
            Sistemas da Release
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