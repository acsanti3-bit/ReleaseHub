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


  /*
    Mantém o comportamento antigo
    caso o Drawer seja utilizado
    fora do Dashboard por release.
  */

  useEffect(() => {

    if (modoRelease) {

      return;

    }

    let ativo = true;

    async function carregarAmbientes() {

      try {

        const lista =
          await listarAmbientes();

        if (ativo) {

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

      ativo = false;

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
                  display:
                    "block",

                  marginTop:
                    "4px",

                  color:
                    "#7A838C",

                  fontSize:
                    "11px",
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
                marginBottom:
                  "20px",

                padding:
                  "12px 14px",

                background:
                  "#EEF6FD",

                borderLeft:
                  "4px solid #005AA9",

                borderRadius:
                  "8px",
              }}
            >

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

                Release em acompanhamento

              </strong>


              <span
                style={{
                  display:
                    "block",

                  marginTop:
                    "4px",

                  color:
                    "#65717C",

                  fontSize:
                    "12px",
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
            onChange={e =>
              alterarCampo(
                "nome",
                e.target.value
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
                marginTop:
                  "6px",

                marginBottom:
                  "12px",

                color:
                  "#7A838C",

                fontSize:
                  "11px",
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
              value={
                form.versao
              }
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


          {modoRelease && (

            <div
              style={{
                marginTop:
                  "6px",

                marginBottom:
                  "12px",

                color:
                  "#005AA9",

                fontSize:
                  "12px",
              }}
            >

              Versão vinculada automaticamente
              ao ambiente selecionado.

            </div>

          )}


          {!modoRelease &&
            isIntellicash && (

            <div
              style={{
                marginTop:
                  "6px",

                marginBottom:
                  "12px",

                color:
                  "#005AA9",

                fontSize:
                  "12px",
              }}
            >

              Ao selecionar uma versão,
              os demais projetos serão
              atualizados automaticamente.

            </div>

          )}


          {!modoRelease &&
            isProjetoVinculado && (

            <div
              style={{
                marginTop:
                  "6px",

                marginBottom:
                  "12px",

                color:
                  "#7A838C",

                fontSize:
                  "12px",
              }}
            >

              Versão definida automaticamente
              pelo Ambiente da Release.

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
            placeholder="dd/mm/aaaa"
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
            (
              [
                campo,
                valor,
              ]
            ) => (

              <div
                key={
                  campo
                }
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
                  value={
                    valor
                  }
                  onChange={e =>
                    alterarSituacao(
                      campo as keyof Project["situacoes"],
                      Math.max(
                        0,
                        Number(
                          e.target.value
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