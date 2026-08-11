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

            <div
              style={{
                marginBottom: "20px",
                padding: "12px 14px",
                background: "#EEF6FD",
                borderLeft: "4px solid #005AA9",
                borderRadius: "8px",
              }}
            >

              <strong
                style={{
                  display: "block",
                  color: "#005AA9",
                  fontSize: "13px",
                }}
              >

                Release em acompanhamento

              </strong>


              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: "#65717C",
                  fontSize: "12px",
                }}
              >

                {environment.nome}

                {" • Intellicash "}

                {
                  environment
                    .versoes
                    .intellicash
                }

              </span>

            </div>

          )}


          <label>
            Nome
          </label>


          <input
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


          {modoRelease && (

            <div
              style={{
                marginTop: "6px",
                marginBottom: "12px",
                color: "#7A838C",
                fontSize: "11px",
              }}
            >

              O nome pertence ao cadastro geral do projeto.

            </div>

          )}


          <label>
            Versão
          </label>


          {modoRelease ? (

            <input
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


          {modoRelease && (

            <div
              style={{
                marginTop: "6px",
                marginBottom: "12px",
                color: "#005AA9",
                fontSize: "12px",
              }}
            >

              Versão vinculada automaticamente
              ao ambiente selecionado.

            </div>

          )}


          <label>
            Executável
          </label>


          <input
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


          <label>
            Prazo da Release
          </label>


          <input
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


          {modoRelease && (
            <div
              style={{
                marginTop: "-4px",
                marginBottom: "8px",
                color: "#7A838C",
                fontSize: "11px",
                lineHeight: 1.4,
              }}
            >
              Executável e prazo são mantidos no
              Ambiente da Release.
            </div>
          )}


          <h3>
            Situações
          </h3>


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


          <button
            type="button"
            className="drawer-save"
            onClick={() =>
              onSave(
                form
              )
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