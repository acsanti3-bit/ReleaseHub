import { useState } from "react";

import {
  MdAdd,
  MdDeleteOutline,
  MdEdit,
  MdLink,
} from "react-icons/md";

import "./ReleaseEnvironments.css";

import Layout from "../../components/layout/Layout";

import ReleaseEnvironmentDrawer from "../../components/ReleaseEnvironmentDrawer/ReleaseEnvironmentDrawer";

import {
  adicionarAmbiente,
  criarAmbiente,
  editarAmbiente,
  excluirAmbiente,
  listarAmbientes,
} from "../../services/ReleaseEnvironmentService";

import {
  sincronizarProjetosComAmbienteAtual,
} from "../../services/ProjectService";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

function ReleaseEnvironments() {

  const [ambientes, setAmbientes] =
    useState<ReleaseEnvironment[]>(
      listarAmbientes()
    );

  const [
    ambienteSelecionado,
    setAmbienteSelecionado,
  ] =
    useState<ReleaseEnvironment | null>(
      null
    );

  function atualizarLista() {

    setAmbientes(
      listarAmbientes()
    );

  }

  function novoAmbiente() {

    setAmbienteSelecionado(
      criarAmbiente()
    );

  }

  function editar(
    ambiente: ReleaseEnvironment
  ) {

    setAmbienteSelecionado(
      ambiente
    );

  }

  function salvar(
    ambiente: ReleaseEnvironment
  ) {

    const existe =
      ambientes.some(
        item =>
          item.id ===
          ambiente.id
      );

    if (existe) {

      editarAmbiente(
        ambiente
      );

    } else {

      adicionarAmbiente(
        ambiente
      );

    }

    /*
      Depois de salvar o ambiente,
      atualizamos automaticamente
      as versões dos projetos.
    */

    sincronizarProjetosComAmbienteAtual();

    atualizarLista();

    setAmbienteSelecionado(
      null
    );

  }

  function excluir(
    ambiente: ReleaseEnvironment
  ) {

    const confirmar =
      window.confirm(

        `Excluir o ambiente "${ambiente.nome}"?`

      );

    if (!confirmar) {

      return;

    }

    excluirAmbiente(
      ambiente.id
    );

    atualizarLista();

  }

  return (

    <Layout>

      <div className="release-page">

        <div className="release-page-header">

          <div>

            <h1>
              Ambientes da Release
            </h1>

            <p>

              Configure a relação
              entre as versões dos projetos.

            </p>

          </div>

          <button
            type="button"
            className="new-environment-button"
            onClick={
              novoAmbiente
            }
          >

            <MdAdd
              size={20}
            />

            Novo Ambiente

          </button>

        </div>

        <div className="release-info">

          <MdLink
            size={22}
          />

          <div>

            <strong>

              Versões amarradas

            </strong>

            <span>

              Ao identificar a versão
              do Intellicash, o ReleaseHub
              encontra automaticamente
              as versões correspondentes
              dos demais projetos.

            </span>

          </div>

        </div>

        <div className="release-table-container">

          <table className="release-table">

            <thead>

              <tr>

                <th>
                  Ambiente
                </th>

                <th>
                  Intellicash
                </th>

                <th>
                  EasyCash
                </th>

                <th>
                  EasyCheckout
                </th>

                <th>
                  EasyPDV
                </th>

                <th>
                  IntelliStock
                </th>

                <th>
                  IWB Server
                </th>

                <th className="release-actions-column">

                  Ações

                </th>

              </tr>

            </thead>

            <tbody>

              {ambientes.map(
                ambiente => (

                  <tr
                    key={
                      ambiente.id
                    }
                  >

                    <td>

                      <strong className="release-name">

                        {
                          ambiente.nome
                        }

                      </strong>

                    </td>

                    <td className="release-reference-version">

                      {
                        ambiente
                          .versoes
                          .intellicash ||
                        "-"
                      }

                    </td>

                    <td>

                      {
                        ambiente
                          .versoes
                          .easycash ||
                        "-"
                      }

                    </td>

                    <td>

                      {
                        ambiente
                          .versoes
                          .easycheckout ||
                        "-"
                      }

                    </td>

                    <td>

                      {
                        ambiente
                          .versoes
                          .easypdv ||
                        "-"
                      }

                    </td>

                    <td>

                      {
                        ambiente
                          .versoes
                          .intellistock ||
                        "-"
                      }

                    </td>

                    <td>

                      {
                        ambiente
                          .versoes
                          .iwbserver ||
                        "-"
                      }

                    </td>

                    <td>

                      <div className="release-actions">

                        <button
                          type="button"
                          title="Editar"
                          onClick={() =>
                            editar(
                              ambiente
                            )
                          }
                        >

                          <MdEdit
                            size={18}
                          />

                        </button>

                        <button
                          type="button"
                          title="Excluir"
                          className="delete-environment"
                          onClick={() =>
                            excluir(
                              ambiente
                            )
                          }
                        >

                          <MdDeleteOutline
                            size={19}
                          />

                        </button>

                      </div>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

          {ambientes.length === 0 && (

            <div className="release-empty">

              Nenhum ambiente
              cadastrado.

            </div>

          )}

        </div>

      </div>

      {ambienteSelecionado && (

        <ReleaseEnvironmentDrawer

          environment={
            ambienteSelecionado
          }

          onClose={() =>
            setAmbienteSelecionado(
              null
            )
          }

          onSave={
            salvar
          }

        />

      )}

    </Layout>

  );

}

export default ReleaseEnvironments;