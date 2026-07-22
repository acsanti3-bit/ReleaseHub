import { useState } from "react";

import "./ReleaseEnvironmentDrawer.css";

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
      environment
    );

  function alterarVersao(
    campo: keyof ReleaseEnvironment["versoes"],
    valor: string
  ) {

    setForm({

      ...form,

      versoes: {

        ...form.versoes,

        [campo]: valor,

      },

    });

  }

  function salvar() {

    if (!form.nome.trim()) {

      alert(
        "Informe o nome do ambiente."
      );

      return;

    }

    if (
      !form.versoes.intellicash.trim()
    ) {

      alert(
        "Informe a versão do Intellicash."
      );

      return;

    }

    onSave(form);

  }

  return (

    <>

      <div
        className="release-drawer-backdrop"
        onClick={onClose}
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
            onClick={onClose}
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
              value={form.nome}
              onChange={e =>
                setForm({

                  ...form,

                  nome:
                    e.target.value,

                })
              }
            />

          </div>

          <div className="release-reference">

            <strong>
              Versão de referência
            </strong>

            <span>

              O Intellicash identifica
              automaticamente todo o ambiente.

            </span>

          </div>

          <div className="release-field release-main-version">

            <label>
              Intellicash
            </label>

            <input
              placeholder="3.1.021.000"
              value={
                form.versoes.intellicash
              }
              onChange={e =>
                alterarVersao(
                  "intellicash",
                  e.target.value
                )
              }
            />

          </div>

          <div className="release-divider">

            Projetos vinculados

          </div>

          <div className="release-field">

            <label>
              EasyCash
            </label>

            <input
              placeholder="1.5.5.0"
              value={
                form.versoes.easycash
              }
              onChange={e =>
                alterarVersao(
                  "easycash",
                  e.target.value
                )
              }
            />

          </div>

          <div className="release-field">

            <label>
              EasyCheckout
            </label>

            <input
              placeholder="1.0.6.0"
              value={
                form.versoes.easycheckout
              }
              onChange={e =>
                alterarVersao(
                  "easycheckout",
                  e.target.value
                )
              }
            />

          </div>

          <div className="release-field">

            <label>
              EasyPDV
            </label>

            <input
              placeholder="2.1.3.0"
              value={
                form.versoes.easypdv
              }
              onChange={e =>
                alterarVersao(
                  "easypdv",
                  e.target.value
                )
              }
            />

          </div>

          <div className="release-field">

            <label>
              IntelliStock
            </label>

            <input
              placeholder="1.1.2.0"
              value={
                form.versoes.intellistock
              }
              onChange={e =>
                alterarVersao(
                  "intellistock",
                  e.target.value
                )
              }
            />

          </div>

          <div className="release-field">

            <label>
              IWB Server
            </label>

            <input
              placeholder="1.0.0.9"
              value={
                form.versoes.iwbserver
              }
              onChange={e =>
                alterarVersao(
                  "iwbserver",
                  e.target.value
                )
              }
            />

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