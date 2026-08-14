import { useEffect, useState } from "react";
import {
  MdAdd,
  MdCheckCircle,
  MdDeleteOutline,
  MdEdit,
  MdLink,
  MdReplay,
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

import { buscarSessao } from "../../services/AuthService";

import type {
  ReleaseEnvironment,
  ReleaseSystemVersion,
} from "../../types/releaseEnvironment";


function obterSistemasDoAmbiente(
  ambiente: ReleaseEnvironment
): ReleaseSystemVersion[] {
  if (ambiente.sistemas && ambiente.sistemas.length > 0) {
    return [...ambiente.sistemas].sort(
      (a, b) => a.ordem - b.ordem
    );
  }

  return [
    {
      chave: "intellicash",
      nome: "Intellicash",
      versao: ambiente.versoes.intellicash,
      ordem: 1,
    },
    {
      chave: "easycash",
      nome: "EasyCash",
      versao: ambiente.versoes.easycash,
      ordem: 2,
    },
    {
      chave: "easycheckout",
      nome: "EasyCheckout",
      versao: ambiente.versoes.easycheckout,
      ordem: 3,
    },
    {
      chave: "easypdv",
      nome: "EasyPDV",
      versao: ambiente.versoes.easypdv,
      ordem: 4,
    },
    {
      chave: "intellistock",
      nome: "IntelliStock",
      versao: ambiente.versoes.intellistock,
      ordem: 5,
    },
    {
      chave: "iwbserver",
      nome: "IWB Server",
      versao: ambiente.versoes.iwbserver,
      ordem: 6,
    },
  ];
}


function ReleaseEnvironments() {
  const [ambientes, setAmbientes] = useState<ReleaseEnvironment[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [podeEditar, setPodeEditar] = useState(false);
  const [podeExcluir, setPodeExcluir] = useState(false);

  const [ambienteSelecionado, setAmbienteSelecionado] =
    useState<ReleaseEnvironment | null>(null);


  async function atualizarLista() {
    try {
      setCarregando(true);

      const lista = await listarAmbientes();

      setAmbientes(lista);
    } catch (erro) {
      console.error("Erro ao carregar ambientes:", erro);
    } finally {
      setCarregando(false);
    }
  }


  async function carregarPermissao() {
    try {
      const usuario = await buscarSessao();

      setPodeEditar(
        usuario?.role === "admin" ||
        usuario?.role === "qualidade"
      );

      setPodeExcluir(
        usuario?.role === "admin"
      );
    } catch (erro) {
      console.error("Erro ao carregar permissão:", erro);

      setPodeEditar(false);
      setPodeExcluir(false);
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


  function abrirEdicao(
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
    if (!podeEditar || salvando) {
      return;
    }

    try {
      setSalvando(true);

      const ambienteJaExiste = ambientes.some(
        item => item.id === ambiente.id
      );

      let ambienteSalvo: ReleaseEnvironment;

      if (ambienteJaExiste) {
        ambienteSalvo = await editarAmbiente(
          ambiente
        );
      } else {
        ambienteSalvo = await adicionarAmbiente(
          ambiente
        );
      }

      setAmbientes(listaAtual => {
        const existeNaLista = listaAtual.some(
          item => item.id === ambienteSalvo.id
        );

        if (existeNaLista) {
          return listaAtual.map(item =>
            item.id === ambienteSalvo.id
              ? ambienteSalvo
              : item
          );
        }

        return [
          ...listaAtual,
          ambienteSalvo,
        ];
      });

      setAmbienteSelecionado(null);

      await atualizarLista();
    } catch (erro) {
      console.error(
        "Erro ao salvar ambiente:",
        erro
      );

      alert(
        "Não foi possível salvar o ambiente."
      );
    } finally {
      setSalvando(false);
    }
  }


  async function removerAmbiente(
    ambiente: ReleaseEnvironment
  ) {
    if (!podeExcluir) {
      return;
    }

    const confirmar = window.confirm(
      `Excluir o ambiente "${ambiente.nome}"?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await excluirAmbiente(
        ambiente.id
      );

      setAmbientes(listaAtual =>
        listaAtual.filter(
          item => item.id !== ambiente.id
        )
      );
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

  async function alterarConclusao(
    ambiente: ReleaseEnvironment
  ) {
    if (!podeEditar || salvando) {
      return;
    }

    const vaiConcluir =
      !ambiente.concluido;

    const confirmar =
      window.confirm(
        vaiConcluir
          ? `Concluir o ambiente "${ambiente.nome}"? Ele deixará de ser sincronizado automaticamente e não aparecerá mais no Modo TV.`
          : `Reabrir o ambiente "${ambiente.nome}"? Ele voltará a ser sincronizado automaticamente e poderá aparecer novamente no Modo TV.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setSalvando(true);

      const ambienteSalvo =
        await editarAmbiente({
          ...ambiente,
          concluido:
            vaiConcluir,
        });

      setAmbientes(
        listaAtual =>
          listaAtual.map(
            item =>
              item.id ===
              ambienteSalvo.id
                ? ambienteSalvo
                : item
          )
      );
    } catch (erro) {
      console.error(
        "Erro ao alterar situação do ambiente:",
        erro
      );

      alert(
        "Não foi possível alterar a situação do ambiente."
      );
    } finally {
      setSalvando(false);
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
              {!podeEditar && " • Somente leitura"}
            </p>
          </div>

          {podeEditar && (
            <button
              type="button"
              className="new-environment-button"
              onClick={novoAmbiente}
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
              Versões relacionadas
            </strong>

            <span>
              Cada ambiente reúne as versões compatíveis de todos
              os sistemas pertencentes à release.
            </span>
          </div>
        </div>


        {carregando ? (
          <div className="release-empty">
            Carregando ambientes...
          </div>
        ) : ambientes.length === 0 ? (
          <div className="release-empty">
            Nenhum ambiente cadastrado.
          </div>
        ) : (
          <div className="release-environments-list">
            {ambientes.map(ambiente => {
              const sistemas =
                obterSistemasDoAmbiente(
                  ambiente
                );

              const sistemaIntellicash =
                sistemas.find(sistema =>
                  sistema.chave
                    .toLowerCase()
                    .includes("intellicash")
                );

              const versaoIntellicash =
                sistemaIntellicash?.versao ||
                ambiente.versoes.intellicash ||
                "-";

              const sistemasConfigurados =
                sistemas.filter(
                  sistema =>
                    Boolean(
                      sistema.versao?.trim()
                    )
                ).length;

              const sistemasNaTv =
                sistemas.filter(
                  sistema =>
                    (sistema.mostrarNaTv ?? true) &&
                    Boolean(
                      sistema.versao?.trim()
                    )
                ).length;

              const prazoRelease =
                ambiente.prazo?.trim() ||
                "Sem prazo";

              return (
                <article
                  key={ambiente.id}
                  className="release-environment-card"
                >
                  <header className="release-environment-card-header">
                    <div className="release-environment-heading">
                      <span className="release-environment-label">
                        Ambiente
                      </span>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <h2>
                          {ambiente.nome}
                        </h2>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 9px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            background:
                              ambiente.concluido
                                ? "#E8EDF2"
                                : "#EAF7EE",
                            color:
                              ambiente.concluido
                                ? "#5F6B76"
                                : "#2E7D32",
                          }}
                        >
                          {ambiente.concluido
                            ? "Concluído"
                            : "Ativo"}
                        </span>
                      </div>

                      <div className="release-environment-summary">
                        <span className="release-environment-reference">
                          Intellicash{" "}

                          <strong>
                            {versaoIntellicash}
                          </strong>
                        </span>

                        <span>
                          Prazo{" "}

                          <strong>
                            {prazoRelease}
                          </strong>
                        </span>

                        <span>
                          {sistemasConfigurados}{" "}
                          {sistemasConfigurados === 1
                            ? "sistema configurado"
                            : "sistemas configurados"}
                        </span>

                        <span>
                          {sistemasNaTv}{" "}
                          {sistemasNaTv === 1
                            ? "na TV"
                            : "na TV"}
                        </span>
                      </div>
                    </div>


                    {podeEditar && (
                      <div className="release-actions">
                        <button
                          type="button"
                          title={
                            ambiente.concluido
                              ? "Reabrir ambiente"
                              : "Concluir ambiente"
                          }
                          onClick={() => {
                            void alterarConclusao(
                              ambiente
                            );
                          }}
                          disabled={salvando}
                          style={{
                            color:
                              ambiente.concluido
                                ? "#005AA9"
                                : "#2E7D32",
                          }}
                        >
                          {ambiente.concluido ? (
                            <MdReplay size={19} />
                          ) : (
                            <MdCheckCircle size={19} />
                          )}
                        </button>

                        <button
                          type="button"
                          title="Editar ambiente"
                          onClick={() =>
                            abrirEdicao(
                              ambiente
                            )
                          }
                        >
                          <MdEdit size={18} />
                        </button>

                        {podeExcluir && (
                          <button
                            type="button"
                            title="Excluir ambiente"
                            className="delete-environment"
                            onClick={() => {
                              void removerAmbiente(
                                ambiente
                              );
                            }}
                          >
                            <MdDeleteOutline size={19} />
                          </button>
                        )}
                      </div>
                    )}
                  </header>


                  <div className="release-systems-grid">
                    {sistemas.map(sistema => {
                      const possuiVersao =
                        Boolean(
                          sistema.versao?.trim()
                        );

                      const sistemaReferencia =
                        sistema.chave
                          .toLowerCase()
                          .includes("intellicash");

                      const classes = [
                        "release-system-item",
                        sistemaReferencia
                          ? "release-system-reference"
                          : "",
                        !possuiVersao
                          ? "release-system-empty"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <div
                          key={sistema.chave}
                          className={classes}
                        >
                          <span>
                            {sistema.nome}
                          </span>

                          <strong>
                            {sistema.versao || "-"}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>


      {podeEditar && ambienteSelecionado && (
        <ReleaseEnvironmentDrawer
          environment={ambienteSelecionado}
          onClose={() =>
            setAmbienteSelecionado(null)
          }
          onSave={salvar}
        />
      )}
    </Layout>
  );
}


export default ReleaseEnvironments;