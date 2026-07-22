import { useMemo, useState } from "react";

import "./ProjectDrawer.css";

import type {
  Project,
} from "../../types/project";

import {
  listarAmbientes,
} from "../../services/ReleaseEnvironmentService";

interface Props {

  project: Project;

  onClose: () => void;

  onSave: (
    project: Project
  ) => void;

}

function ProjectDrawer({

  project,

  onClose,

  onSave,

}: Props) {

  const [form, setForm] =
    useState<Project>(
      project
    );

  const ambientes =
    useMemo(
      () =>
        listarAmbientes(),
      []
    );

  const nomeNormalizado =
    form.nome
      .toLowerCase()
      .replace(/\s/g, "");

  const isIntellicash =
    nomeNormalizado.includes(
      "intellicash"
    ) ||
    nomeNormalizado.includes(
      "intelicash"
    );

  const isProjetoVinculado =

    nomeNormalizado.includes(
      "easycash"
    ) ||

    nomeNormalizado.includes(
      "easycheckout"
    ) ||

    nomeNormalizado.includes(
      "easypdv"
    ) ||

    nomeNormalizado.includes(
      "intellistock"
    ) ||

    nomeNormalizado.includes(
      "isa"
    ) ||

    nomeNormalizado.includes(
      "iwb"
    );

  function alterarCampo(
    campo: keyof Project,
    valor: string
  ) {

    setForm({

      ...form,

      [campo]: valor,

    });

  }

  function alterarSituacao(
    campo:
      keyof Project["situacoes"],
    valor: number
  ) {

    setForm({

      ...form,

      situacoes: {

        ...form.situacoes,

        [campo]: valor,

      },

    });

  }

  const nomesSituacoes: Record<
    keyof Project["situacoes"],
    string
  > = {

    qualidade:
      "Qualidade",

    testes:
      "Testes",

    desenvolvido:
      "Desenvolvido",

    emProgresso:
      "Em Progresso",

    aguardandoCompilacao:
      "Aguardando Compilação",

    nova:
      "Nova",

    reaberta:
      "Reaberta",

    rejeitada:
      "Rejeitada",

    interrompida:
      "Interrompida",

  };

  return (

    <>

      <div
        className="drawer-backdrop"
        onClick={onClose}
      />

      <aside className="drawer">

        <div className="drawer-header">

          <h2>
            Projeto
          </h2>

          <button
            onClick={onClose}
          >
            ×
          </button>

        </div>

        <div className="drawer-body">

          <label>
            Nome
          </label>

          <input
            value={form.nome}
            onChange={e =>
              alterarCampo(
                "nome",
                e.target.value
              )
            }
          />

          <label>
            Versão
          </label>

          {isIntellicash ? (

            <select
              value={
                form.versao
              }
              onChange={e =>
                alterarCampo(
                  "versao",
                  e.target.value
                )
              }
            >

              <option value="">

                Selecione o Ambiente da Release

              </option>

              {ambientes.map(
                ambiente => (

                  <option

                    key={
                      ambiente.id
                    }

                    value={
                      ambiente
                        .versoes
                        .intellicash
                    }

                  >

                    {
                      ambiente
                        .versoes
                        .intellicash
                    }

                    {" — "}

                    {
                      ambiente.nome
                    }

                  </option>

                )
              )}

            </select>

          ) : (

            <input
              value={form.versao}
              readOnly={
                isProjetoVinculado
              }
              onChange={e =>
                alterarCampo(
                  "versao",
                  e.target.value
                )
              }
              title={
                isProjetoVinculado
                  ? "Versão definida pelo Ambiente da Release."
                  : ""
              }
            />

          )}

          {isIntellicash && (

            <div
              style={{
                marginTop: "6px",
                marginBottom: "12px",
                color: "#005AA9",
                fontSize: "12px",
              }}
            >

              Ao selecionar uma versão,
              os demais projetos serão
              atualizados automaticamente.

            </div>

          )}

          {isProjetoVinculado && (

            <div
              style={{
                marginTop: "6px",
                marginBottom: "12px",
                color: "#7A838C",
                fontSize: "12px",
              }}
            >

              Versão definida
              automaticamente pelo
              Ambiente da Release.

            </div>

          )}

          <label>
            Executável
          </label>

          <input
            value={
              form.executavel
            }
            onChange={e =>
              alterarCampo(
                "executavel",
                e.target.value
              )
            }
          />

          <label>
            Prazo
          </label>

          <input
            value={
              form.prazo
            }
            onChange={e =>
              alterarCampo(
                "prazo",
                e.target.value
              )
            }
          />

          <h3>
            Situações
          </h3>

          {Object.entries(
            form.situacoes
          ).map(
            ([campo, valor]) => (

              <div
                key={campo}
                className="drawer-row"
              >

                <span>

                  {
                    nomesSituacoes[
                      campo as keyof Project["situacoes"]
                    ]
                  }

                </span>

                <input
                  type="number"
                  min={0}
                  value={valor}
                  onChange={e =>
                    alterarSituacao(

                      campo as keyof Project["situacoes"],

                      Number(
                        e.target.value
                      )

                    )
                  }
                />

              </div>

            )
          )}

          <button
            className="drawer-save"
            onClick={() =>
              onSave(form)
            }
          >

            Salvar

          </button>

        </div>

      </aside>

    </>

  );

}

export default ProjectDrawer;