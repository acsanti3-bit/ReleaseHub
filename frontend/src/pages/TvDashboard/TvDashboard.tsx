import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./TvDashboard.css";

import logo from "../../assets/images/logo.png";

import TvProjectCard from "../../components/TvProjectCard/TvProjectCard";

import CompatibilityPanel from "../../components/CompatibilityPanel/CompatibilityPanel";

import {
  listarAmbientes,
  obterAmbienteMaisRecente,
  ordenarAmbientesPorVersao,
} from "../../services/ReleaseEnvironmentService";

import {
  listarProjetosPorAmbiente,
} from "../../services/ReleaseProjectService";

import type {
  Project,
} from "../../types/project";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";


const STORAGE_KEY =
  "releasehub_tv_environment";


function normalizarNome(
  valor: string
) {
  return valor
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}


function projetoVisivelNaTv(
  project: Project,
  ambiente:
    ReleaseEnvironment | undefined
) {
  const sistemas =
    ambiente?.sistemas ?? [];

  if (
    sistemas.length === 0
  ) {
    return true;
  }

  const nomeProjeto =
    normalizarNome(
      project.nome
    );

  const sistema =
    sistemas.find(
      item => {
        const chave =
          normalizarNome(
            item.chave
          );

        const nome =
          normalizarNome(
            item.nome
          );

        if (
          nomeProjeto === chave ||
          nomeProjeto === nome
        ) {
          return true;
        }

        if (
          nomeProjeto.includes(
            "isa"
          ) &&
          chave ===
            "intellistock"
        ) {
          return true;
        }

        if (
          nomeProjeto.includes(
            "sincronizadormatrizxfilial"
          ) &&
          chave ===
            "sincmatrizxfilial"
        ) {
          return true;
        }

        if (
          nomeProjeto.includes(
            "sincronizadorlabfiscal"
          ) &&
          chave ===
            "sinclabfiscal"
        ) {
          return true;
        }

        if (
          nomeProjeto.includes(
            "sincronizadorecommerce"
          ) &&
          chave ===
            "sincecommerce"
        ) {
          return true;
        }

        return (
          chave.length > 3 &&
          (
            nomeProjeto.includes(
              chave
            ) ||
            nomeProjeto.includes(
              nome
            )
          )
        );
      }
    );

  return (
    sistema?.mostrarNaTv ??
    true
  );
}


function TvDashboard() {

  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>([]);

  const [
    ambientes,
    setAmbientes,
  ] =
    useState<
      ReleaseEnvironment[]
    >([]);

  const [
    ambienteSelecionadoId,
    setAmbienteSelecionadoId,
  ] =
    useState<
      number | null
    >(null);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    carregandoAmbientes,
    setCarregandoAmbientes,
  ] =
    useState(true);

  const [
    agora,
    setAgora,
  ] =
    useState(
      new Date()
    );


  /*
    Relógio.
  */

  useEffect(() => {

    const intervalo =
      setInterval(
        () => {

          setAgora(
            new Date()
          );

        },
        1000
      );


    return () =>
      clearInterval(
        intervalo
      );

  }, []);


  /*
    Ambientes disponíveis.
  */

  useEffect(() => {

    let ativo =
      true;


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


        const ambienteSalvoExiste =
          idSalvo !== null &&
          ordenados.some(
            ambiente =>
              ambiente.id ===
              idSalvo
          );


        if (
          ambienteSalvoExiste &&
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


        if (
          maisRecente
        ) {

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
          "Erro ao carregar ambientes da TV:",
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

      ativo =
        false;

    };

  }, []);


  /*
    Projetos da release selecionada.
  */

  useEffect(() => {

    if (
      ambienteSelecionadoId === null
    ) {

      setProjects([]);

      setCarregando(false);

      return;

    }


    const environmentId =
      ambienteSelecionadoId;


    let ativo =
      true;


    async function atualizarDados() {

      try {

        const lista =
          await listarProjetosPorAmbiente(
            environmentId
          );


        if (
          ativo
        ) {

          setProjects(
            lista
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao atualizar dados da TV:",
          erro
        );

      } finally {

        if (
          ativo
        ) {

          setCarregando(
            false
          );

        }

      }

    }


    setCarregando(
      true
    );


    void atualizarDados();


    const intervalo =
      setInterval(
        () => {

          void atualizarDados();

        },
        10000
      );


    return () => {

      ativo =
        false;

      clearInterval(
        intervalo
      );

    };

  }, [
    ambienteSelecionadoId,
  ]);


  /*
    Troca de release.
  */

  function alterarAmbiente(
    id: number
  ) {

    if (
      id ===
      ambienteSelecionadoId
    ) {

      return;

    }


    setProjects([]);

    setCarregando(true);

    setAmbienteSelecionadoId(
      id
    );


    localStorage.setItem(
      STORAGE_KEY,
      String(id)
    );

  }


  /*
    Nome curto utilizado
    nas abas.

    3.1.020.001 -> 20.01
    3.1.020.002 -> 20.02
    3.1.021.000 -> 21
    3.1.021.001 -> 21.01
  */

  function obterNomeCurtoRelease(
    ambiente: ReleaseEnvironment
  ) {

    const versao =
      ambiente
        .versoes
        .intellicash;


    const partes =
      versao.split(".");


    if (
      partes.length < 4
    ) {

      return ambiente.nome;

    }


    const principal =
      Number(
        partes[2]
      );


    const revisao =
      Number(
        partes[3]
      );


    if (
      Number.isNaN(
        principal
      ) ||
      Number.isNaN(
        revisao
      )
    ) {

      return ambiente.nome;

    }


    const principalCurto =
      String(
        principal
      );


    if (
      revisao === 0
    ) {

      return principalCurto;

    }


    return `${principalCurto}.${String(
      revisao
    ).padStart(
      2,
      "0"
    )}`;

  }


  const ambienteSelecionado =
    ambientes.find(
      ambiente =>
        ambiente.id ===
        ambienteSelecionadoId
    );


  /*
    Só aparecem cards
    que possuem tarefas.
  */

  function possuiTarefas(
    project: Project
  ) {

    return Object.values(
      project.situacoes
    ).some(
      quantidade =>
        quantidade > 0
    );

  }


  const projetosAtivos =
    useMemo(
      () => {

        return projects.filter(
          project =>
            possuiTarefas(
              project
            ) &&
            projetoVisivelNaTv(
              project,
              ambienteSelecionado
            )
        );

      },
      [
        projects,
        ambienteSelecionado,
      ]
    );


  const hora =
    agora.toLocaleTimeString(
      "pt-BR",
      {
        hour:
          "2-digit",

        minute:
          "2-digit",

        second:
          "2-digit",
      }
    );


  const data =
    agora.toLocaleDateString(
      "pt-BR",
      {
        weekday:
          "long",

        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    );


  function getOrdemProjeto(
    nome: string
  ) {

    const projeto =
      nome
        .toLowerCase()
        .replace(
          /\s/g,
          ""
        );


    if (
      projeto.includes(
        "intellicash"
      ) ||
      projeto.includes(
        "intelicash"
      )
    ) {

      return 1;

    }


    if (
      projeto.includes(
        "easycash"
      )
    ) {

      return 2;

    }


    if (
      projeto.includes(
        "easycheckout"
      )
    ) {

      return 3;

    }


    if (
      projeto.includes(
        "easypdv"
      )
    ) {

      return 4;

    }


    if (
      projeto.includes(
        "intellistock"
      ) ||
      projeto.includes(
        "isa"
      )
    ) {

      return 5;

    }


    if (
      projeto.includes(
        "iwb"
      )
    ) {

      return 6;

    }


    return 99;

  }


  const projetosOrdenados =
    useMemo(
      () => {

        return [
          ...projetosAtivos,
        ].sort(
          (
            a,
            b
          ) =>

            getOrdemProjeto(
              a.nome
            ) -
            getOrdemProjeto(
              b.nome
            )
        );

      },
      [
        projetosAtivos,
      ]
    );


  return (

    <div className="tv-dashboard">

      <header className="tv-header">

        <div className="tv-brand">

          <img
            src={logo}
            alt="IWS"
            className="tv-logo"
          />


          <div className="tv-brand-text">

            <h1>
              IWS ReleaseHub
            </h1>


            <div className="tv-brand-subtitle">

              <span>
                Painel da Qualidade
              </span>


              <div className="tv-online">

                <span className="tv-online-dot" />

                Painel ativo

              </div>

            </div>

          </div>

        </div>


        <div className="tv-clock">

          <strong>
            {hora}
          </strong>

          <small>
            {data}
          </small>

        </div>

      </header>


      <section className="tv-release-area">

        <div className="tv-release-tabs-header">

          <span>
            Releases
          </span>

          {ambienteSelecionado && (

            <small>

              {
                ambienteSelecionado
                  .nome
              }

            </small>

          )}

        </div>


        <div className="tv-release-tabs">

          {carregandoAmbientes ? (

            <span className="tv-release-tabs-loading">

              Carregando releases...

            </span>

          ) : (

            ambientes.map(
              ambiente => {

                const ativo =
                  ambiente.id ===
                  ambienteSelecionadoId;


                return (

                  <button
                    type="button"
                    key={
                      ambiente.id
                    }
                    className={`tv-release-tab ${
                      ativo
                        ? "tv-release-tab-active"
                        : ""
                    }`}
                    onClick={() =>
                      alterarAmbiente(
                        ambiente.id
                      )
                    }
                    title={
                      ambiente.nome
                    }
                  >

                    <span>

                      {
                        obterNomeCurtoRelease(
                          ambiente
                        )
                      }

                    </span>

                    <small>

                      {
                        ambiente
                          .versoes
                          .intellicash
                      }

                    </small>

                  </button>

                );

              }
            )

          )}

        </div>

      </section>


      <CompatibilityPanel
        projects={
          projects
        }
        carregando={
          carregando
        }
      />


      <main className="tv-grid">

        {carregando ? (

          <div className="tv-loading">

            Carregando release...

          </div>

        ) : projetosOrdenados.length ===
            0 ? (

          <div className="tv-loading">

            Nenhum projeto com tarefas
            nesta release.

          </div>

        ) : (

          projetosOrdenados.map(
            project => (

              <TvProjectCard
                key={
                  project.id
                }
                project={
                  project
                }
              />

            )
          )

        )}

      </main>

    </div>

  );

}


export default TvDashboard;