import {
  useEffect,
  useState,
} from "react";

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

import {
  buscarSessao,
} from "../../services/AuthService";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

function ReleaseEnvironments() {

  const [
    ambientes,
    setAmbientes,
  ] =
    useState<
      ReleaseEnvironment[]
    >([]);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    podeEditar,
    setPodeEditar,
  ] =
    useState(false);

  const [
    ambienteSelecionado,
    setAmbienteSelecionado,
  ] =
    useState<
      ReleaseEnvironment | null
    >(null);

  async function atualizarLista() {

    try {

      const lista =
        await listarAmbientes();

      setAmbientes(lista);

    } catch (erro) {

      console.error(
        "Erro ao carregar ambientes:",
        erro
      );

    } finally {

      setCarregando(false);

    }

  }

  async function carregarPermissao() {

    try {

      const usuario =
        await buscarSessao();

      setPodeEditar(
        usuario?.role === "admin" ||
        usuario?.role === "qualidade"
      );

    } catch (erro) {

      console.error(
        "Erro ao carregar permissão:",
        erro
      );

      setPodeEditar(false);

    }

  }

  useEffect(() => {

    void atualizarLista();

    void carregarPermissao();

  }, []);

  function novoAmbiente() {

    if (!podeEditar) {

      return;

    }

    setAmbienteSelecionado(
      criarAmbiente()
    );

  }

  function editar(
    ambiente: ReleaseEnvironment
  ) {

    if (!podeEditar) {

      return;

    }

    setAmbienteSelecionado(
      ambiente
    );

  }

  async function salvar(
    ambiente: ReleaseEnvironment
  ) {

    if (!podeEditar) {

      return;

    }

    try {

      const existe =
        ambientes.some(
          item =>
            item.id ===
            ambiente.id
        );

      if (existe) {

        await editarAmbiente(
          ambiente
        );

      } else {

        await adicionarAmbiente(
          ambiente
        );

      }

      await sincronizarProjetosComAmbienteAtual();

      await atualizarLista();

      setAmbienteSelecionado(
        null
      );

    } catch (erro) {

      console.error(
        "Erro ao salvar ambiente:",
        erro
      );

      alert(
        "Não foi possível salvar o ambiente."
      );

    }

  }

  async function excluir(
    ambiente: ReleaseEnvironment
  ) {

    if (!podeEditar) {

      return;

    }

    const confirmar =
      window.confirm(
        `Excluir o ambiente "${ambiente.nome}"?`
      );

    if (!confirmar) {

      return;

    }

    try {

      await excluirAmbiente(
        ambiente.id
      );

      await atualizarLista();

    } catch (erro) {

      console.error(
        "Erro ao excluir ambiente:",
        erro
      );

      alert(
        "Não foi possível excluir o ambiente."
      );

    }

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

              Configure a relação entre as versões dos projetos.

              {!podeEditar &&
                " • Somente leitura"}

            </p>

          </div>

          {podeEditar && (

            <button
              type="button"
              className="new-environment-button"
              onClick={
                novoAmbiente
              }
            >

              <MdAdd size={20} />

              Novo Ambiente

            </button>

          )}

        </div>

        <div className="release-info">

          <MdLink size={22} />

          <div>

            <strong>
              Versões amarradas
            </strong>

            <span>

              Ao identificar a versão do Intellicash,
              o ReleaseHub encontra automaticamente
              as versões correspondentes dos demais projetos.

            </span>

          </div>

        </div>

        <div className="release-table-container">

          <table className="release-table">

            <thead>

              <tr>

                <th>Ambiente</th>

                <th>Intellicash</th>

                <th>EasyCash</th>

                <th>EasyCheckout</th>

                <th>EasyPDV</th>

                <th>IntelliStock</th>

                <th>IWB Server</th>

                {podeEditar && (

                  <th className="release-actions-column">
                    Ações
                  </th>

                )}

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

                        {ambiente.nome}

                      </strong>

                    </td>

                    <td className="release-reference-version">

                      {ambiente.versoes.intellicash || "-"}

                    </td>

                    <td>

                      {ambiente.versoes.easycash || "-"}

                    </td>

                    <td>

                      {ambiente.versoes.easycheckout || "-"}

                    </td>

                    <td>

                      {ambiente.versoes.easypdv || "-"}

                    </td>

                    <td>

                      {ambiente.versoes.intellistock || "-"}

                    </td>

                    <td>

                      {ambiente.versoes.iwbserver || "-"}

                    </td>

                    {podeEditar && (

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
                              void excluir(
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

                    )}

                  </tr>

                )
              )}

            </tbody>

          </table>

          {carregando ? (

            <div className="release-empty">

              Carregando ambientes...

            </div>

          ) : ambientes.length === 0 && (

            <div className="release-empty">

              Nenhum ambiente cadastrado.

            </div>

          )}

        </div>

      </div>

      {podeEditar &&
        ambienteSelecionado && (

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