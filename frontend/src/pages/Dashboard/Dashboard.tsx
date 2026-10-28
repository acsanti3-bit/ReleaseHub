import {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import Layout from "../../components/layout";
import "./Dashboard.css";

const RedmineProjectsMonitor = lazy(
  () => import("../../components/RedmineProjectsMonitor/RedmineProjectsMonitor")
);

import type { ReleaseEnvironment } from "../../types/releaseEnvironment";

import {
  listarAmbientes,
  obterAmbienteMaisRecente,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";

import {
  sincronizarProjetosComRedmine,
} from "../../services/ReleaseProjectService";

import { buscarSessao } from "../../services/AuthService";


const STORAGE_KEY =
  "releasehub_dashboard_environment";


interface MensagemRedmine {
  tipo: "success" | "error";
  texto: string;
  detalhes?: string;
}


function Dashboard() {
  const [
    ambientes,
    setAmbientes,
  ] = useState<ReleaseEnvironment[]>([]);

  const [
    ambienteSelecionadoId,
    setAmbienteSelecionadoId,
  ] = useState<number | null>(null);

  const [
    carregandoAmbientes,
    setCarregandoAmbientes,
  ] = useState(true);

  const [
    podeEditar,
    setPodeEditar,
  ] = useState(false);

  const [
    sincronizandoRedmine,
    setSincronizandoRedmine,
  ] = useState(false);

  const [
    mensagemRedmine,
    setMensagemRedmine,
  ] = useState<MensagemRedmine | null>(null);


  useEffect(() => {
    let ativo = true;

    async function carregarAmbientes() {
      try {
        const lista =
          await listarAmbientes();

        if (!ativo) {
          return;
        }

        const ordenados =
          ordenarAmbientesPorVersao(
            lista
          );

        setAmbientes(
          ordenados
        );

        const salvo =
          localStorage.getItem(
            STORAGE_KEY
          );

        const idSalvo =
          salvo
            ? Number(salvo)
            : null;

        const salvoExiste =
          idSalvo !== null &&
          ordenados.some(
            ambiente =>
              ambiente.id ===
              idSalvo
          );

        if (
          salvoExiste &&
          idSalvo !== null
        ) {
          setAmbienteSelecionadoId(
            idSalvo
          );

          return;
        }

        const maisRecente =
          obterAmbienteMaisRecente(
            ordenados
          );

        if (maisRecente) {
          setAmbienteSelecionadoId(
            maisRecente.id
          );

          localStorage.setItem(
            STORAGE_KEY,
            String(
              maisRecente.id
            )
          );
        }
      } catch (erro) {
        console.error(
          "Erro ao carregar ambientes:",
          erro
        );
      } finally {
        if (ativo) {
          setCarregandoAmbientes(
            false
          );
        }
      }
    }

    void carregarAmbientes();

    return () => {
      ativo = false;
    };
  }, []);


  useEffect(() => {
    let ativo = true;

    async function carregarPermissao() {
      try {
        const usuario =
          await buscarSessao();

        if (!ativo) {
          return;
        }

        setPodeEditar(
          usuario?.role === "admin" ||
          usuario?.role === "qualidade"
        );
      } catch (erro) {
        console.error(
          "Erro ao carregar permissão:",
          erro
        );

        if (ativo) {
          setPodeEditar(
            false
          );
        }
      }
    }

    void carregarPermissao();

    return () => {
      ativo = false;
    };
  }, []);


  const ambienteSelecionado =
    ambientes.find(
      ambiente =>
        ambiente.id ===
        ambienteSelecionadoId
    );


  function alterarAmbiente(
    id: number
  ) {
    setMensagemRedmine(
      null
    );

    setAmbienteSelecionadoId(
      id
    );

    localStorage.setItem(
      STORAGE_KEY,
      String(id)
    );
  }


  async function sincronizarRedmine() {
    if (
      !podeEditar ||
      ambienteSelecionadoId === null ||
      sincronizandoRedmine
    ) {
      return;
    }

    const environmentId =
      ambienteSelecionadoId;

    try {
      setSincronizandoRedmine(
        true
      );

      setMensagemRedmine(
        null
      );

      const resultado =
        await sincronizarProjetosComRedmine(
          environmentId
        );

      const ignorados =
        resultado.projetosIgnorados.length;

      const statusIgnorados =
        resultado.statusIgnorados.reduce(
          (
            total,
            status
          ) =>
            total +
            status.quantidade,
          0
        );

      let texto =
        `${resultado.tarefasSincronizadas} tarefas sincronizadas em ${resultado.projetosAtualizados} projetos.`;

      if (
        ignorados > 0
      ) {
        texto +=
          ` ${ignorados} projetos não foram atualizados.`;
      }

      if (
        statusIgnorados > 0
      ) {
        texto +=
          ` ${statusIgnorados} tarefas possuem situações ainda não mapeadas.`;
      }

      const detalhes = [
        ...resultado.projetosIgnorados.map(
          item =>
            `${item.projeto}: ${item.motivo}`
        ),
        ...resultado.statusIgnorados.map(
          item =>
            `${item.status}: ${item.quantidade}`
        ),
      ].join("\n");

      setMensagemRedmine({
        tipo: "success",
        texto,
        detalhes:
          detalhes ||
          undefined,
      });
    } catch (erro) {
      console.error(
        "Erro ao sincronizar Redmine:",
        erro
      );

      setMensagemRedmine({
        tipo: "error",
        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível sincronizar os dados com o Redmine.",
      });
    } finally {
      setSincronizandoRedmine(
        false
      );
    }
  }


  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>
              Painel da Qualidade
            </h1>

            <span>
              Consulte todos os projetos e tarefas do Redmine em um só lugar
            </span>
          </div>

          <div className="dashboard-release-control">
            <div className="dashboard-release-selector">
              <label>
                Release em acompanhamento
              </label>

              <select
                value={
                  ambienteSelecionadoId ??
                  ""
                }
                disabled={
                  carregandoAmbientes ||
                  ambientes.length === 0 ||
                  sincronizandoRedmine
                }
                onChange={
                  event =>
                    alterarAmbiente(
                      Number(
                        event.target.value
                      )
                    )
                }
              >
                {ambientes.length === 0 && (
                  <option value="">
                    Nenhuma release cadastrada
                  </option>
                )}

                {ambientes.map(
                  ambiente => (
                    <option
                      key={
                        ambiente.id
                      }
                      value={
                        ambiente.id
                      }
                    >
                      {ambiente.nome}
                    </option>
                  )
                )}
              </select>

              {ambienteSelecionado && (
                <small>
                  Intellicash{" "}
                  {
                    ambienteSelecionado
                      .versoes
                      .intellicash
                  }
                  {
                    ambienteSelecionado
                      .concluido
                      ? " • Release concluída"
                      : ""
                  }
                </small>
              )}
            </div>

            {podeEditar && (
              <button
                type="button"
                className="dashboard-redmine-sync"
                disabled={
                  ambienteSelecionadoId ===
                    null ||
                  sincronizandoRedmine ||
                  carregandoAmbientes
                }
                onClick={
                  sincronizarRedmine
                }
              >
                {
                  sincronizandoRedmine
                    ? "Sincronizando Redmine..."
                    : "Sincronizar com o Redmine"
                }
              </button>
            )}

            {mensagemRedmine && (
              <span
                className={`dashboard-redmine-message ${mensagemRedmine.tipo}`}
                title={
                  mensagemRedmine.detalhes
                }
              >
                {
                  mensagemRedmine.texto
                }
              </span>
            )}
          </div>
        </div>


        <Suspense
          fallback={
            <div className="dashboard-empty">
              <h2>
                Carregando monitoramento do Redmine...
              </h2>
            </div>
          }
        >
          <RedmineProjectsMonitor />
        </Suspense>
      </div>
    </Layout>
  );
}


export default Dashboard;
