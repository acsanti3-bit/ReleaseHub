import {
  useEffect,
  useState,
} from "react";

import "./ProjectDrawer.css";

import type {
  Project,
} from "../../types/project";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

import {
  listarAmbientes,
} from "../../services/ReleaseEnvironmentService";


interface Props {

  project: Project;

  environment?: ReleaseEnvironment;

  onClose: () => void;

  onSave: (
    project: Project
  ) => void;

}


function ProjectDrawer({

  project,

  environment,

  onClose,

  onSave,

}: Props) {

  const [
    form,
    setForm,
  ] =
    useState<Project>(
      project
    );


  const [
    ambientes,
    setAmbientes,
  ] =
    useState<
      ReleaseEnvironment[]
    >([]);


  const modoRelease =
    Boolean(
      environment
    );


  useEffect(() => {

    if (
      modoRelease
    ) {

      return;

    }


    let ativo =
      true;


    async function carregarAmbientes() {

      try {

        const lista =
          await listarAmbientes();


        if (
          ativo
        ) {

          setAmbientes(
            lista
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao carregar ambientes:",
          erro
        );

      }

    }


    void carregarAmbientes();


    return () => {

      ativo =
        false;

    };

  }, [
    modoRelease,
  ]);


  const nomeNormalizado =
    form.nome
      .toLowerCase()
      .replace(
        /\s/g,
        ""
      );


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

      [campo]:
        valor,
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

        [campo]:
          valor,
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

    aguardandoCompilacao:
      "Aguardando Compilação",

    emProgresso:
      "Em Progresso",

    nova:
      "Nova",

    reaberta:
      "Reaberta",

    validacaoCliente:
      "Validação no Cliente",

    resolvidas:
      "Resolvidas",

    rejeitada:
      "Rejeitada",

    interrompida:
      "Interrompida",

  };


  const ordemSituacoes:
    Array<
      keyof Project["situacoes"]
    > = [

      "qualidade",

      "testes",

      "desenvolvido",

      "aguardandoCompilacao",

      "emProgresso",

      "nova",

      "reaberta",

      "validacaoCliente",

      "rejeitada",

      "interrompida",

      "resolvidas",

    ];


  return (

    <>

      <div
        className="drawer-backdrop"
        onClick={
          onClose
        }
      />


      <aside className="drawer">

        <div className="drawer-header">

          <div>

            <h2>
              Projeto
            </h2>


            {environment && (

              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: "#7A838C",
                  fontSize: "11px",
                }}
              >

                {environment.nome}

              </span>

            )}

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


        <div className="drawer-body">

          {environment && (

            <div className="drawer-release-summary">

              <div>

                <strong>
                  Release em acompanhamento
                </strong>

                <span>
                  {environment.nome}
                  {" • IntelliCash "}
                  {
                    environment
                      .versoes
                      .intellicash
                  }
                </span>

              </div>

              <span className="drawer-release-badge">
                Ambiente vinculado
              </span>

            </div>

          )}


          <section
            className={`drawer-section ${
              modoRelease
                ? "drawer-section-readonly"
                : ""
            }`}
          >

            <div className="drawer-section-heading">

              <div>

                <span className="drawer-section-kicker">
                  Dados da Release
                </span>

                <h3>
                  Informações do projeto
                </h3>

              </div>


              {modoRelease && (

                <span className="drawer-managed-badge">
                  Gerenciado em Ambientes da Release
                </span>

              )}

            </div>


            <div className="drawer-fields-grid">

              <div className="drawer-field drawer-field-full">

                <label>
                  Nome
                </label>

                <input
                  className={
                    modoRelease
                      ? "drawer-input-readonly"
                      : ""
                  }
                  value={
                    form.nome
                  }
                  readOnly={
                    modoRelease
                  }
                  onChange={
                    event =>
                      alterarCampo(
                        "nome",
                        event.target.value
                      )
                  }
                  title={
                    modoRelease
                      ? "O projeto é definido pelo cadastro geral."
                      : ""
                  }
                />

              </div>


              <div className="drawer-field drawer-field-full">

                <label>
                  Versão
                </label>

                {modoRelease ? (

                  <input
                    className="drawer-input-readonly"
                    value={
                      form.versao
                    }
                    readOnly
                    title="Versão definida pelo Ambiente da Release."
                  />

                ) : isIntellicash ? (

                  <select
                    value={
                      form.versao
                    }
                    onChange={
                      event =>
                        alterarCampo(
                          "versao",
                          event.target.value
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
                          {ambiente.nome}
                        </option>

                      )
                    )}

                  </select>

                ) : (

                  <input
                    className={
                      isProjetoVinculado
                        ? "drawer-input-readonly"
                        : ""
                    }
                    value={
                      form.versao
                    }
                    readOnly={
                      isProjetoVinculado
                    }
                    onChange={
                      event =>
                        alterarCampo(
                          "versao",
                          event.target.value
                        )
                    }
                    title={
                      isProjetoVinculado
                        ? "Versão definida pelo Ambiente da Release."
                        : ""
                    }
                  />

                )}

              </div>


              <div className="drawer-field">

                <label>
                  Executável
                </label>

                <input
                  className={
                    modoRelease
                      ? "drawer-input-readonly"
                      : ""
                  }
                  value={
                    form.executavel
                  }
                  placeholder="dd/mm/aaaa"
                  readOnly={
                    modoRelease
                  }
                  onChange={
                    event =>
                      alterarCampo(
                        "executavel",
                        event.target.value
                      )
                  }
                  title={
                    modoRelease
                      ? "Executável definido pelo Ambiente da Release."
                      : ""
                  }
                />

              </div>


              <div className="drawer-field">

                <label>
                  Prazo da Release
                </label>

                <input
                  className={
                    modoRelease
                      ? "drawer-input-readonly"
                      : ""
                  }
                  value={
                    form.prazo
                  }
                  placeholder="dd/mm/aaaa"
                  readOnly={
                    modoRelease
                  }
                  onChange={
                    event =>
                      alterarCampo(
                        "prazo",
                        event.target.value
                      )
                  }
                  title={
                    modoRelease
                      ? "Prazo definido pelo Ambiente da Release."
                      : ""
                  }
                />

              </div>

            </div>


            {modoRelease && (

              <div className="drawer-managed-note">

                <strong>
                  Dados informativos
                </strong>

                <span>
                  Nome, versão, executável e prazo são
                  definidos fora deste projeto. Para alterá-los,
                  utilize a tela Ambientes da Release.
                </span>

              </div>

            )}

          </section>


          <section className="drawer-section drawer-section-status">

            <div className="drawer-section-heading">

              <div>

                <span className="drawer-section-kicker">
                  Acompanhamento
                </span>

                <h3>
                  Situações
                </h3>

              </div>

              <span className="drawer-editable-badge">
                Editável
              </span>

            </div>


            <p className="drawer-section-description">
              Ajuste somente quando for necessário corrigir
              manualmente os totais deste projeto na release.
            </p>


            <div className="drawer-status-list">

              {ordemSituacoes.map(
                campo => (

                  <div
                    key={
                      campo
                    }
                    className="drawer-row"
                  >

                    <span>

                      {
                        nomesSituacoes[
                          campo
                        ]
                      }

                    </span>


                    <input
                      type="number"
                      min={0}
                      value={
                        form
                          .situacoes[
                            campo
                          ] ?? 0
                      }
                      onChange={
                        event =>
                          alterarSituacao(
                            campo,
                            Math.max(
                              0,
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          )
                      }
                    />

                  </div>

                )
              )}

            </div>

          </section>


          <button
            type="button"
            className="drawer-save"
            onClick={() =>
              onSave(
                form
              )
            }
          >

            Salvar alterações

          </button>

        </div>

      </aside>

    </>

  );

}


export default ProjectDrawer;