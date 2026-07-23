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
  listarProjetos,
} from "../../services/ProjectService";

import type {
  Project,
} from "../../types/project";

function TvDashboard() {

  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>([]);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    agora,
    setAgora,
  ] =
    useState(new Date());

  const [
    ultimaAtualizacao,
    setUltimaAtualizacao,
  ] =
    useState(new Date());

  useEffect(() => {

    const intervalo =
      setInterval(() => {

        setAgora(
          new Date()
        );

      }, 1000);

    return () =>
      clearInterval(
        intervalo
      );

  }, []);

  useEffect(() => {

    let ativo = true;

    async function atualizarDados() {

      try {

        const lista =
          await listarProjetos();

        if (!ativo) {

          return;

        }

        setProjects(
          lista
        );

        setUltimaAtualizacao(
          new Date()
        );

      } catch (erro) {

        console.error(
          "Erro ao atualizar TV:",
          erro
        );

      } finally {

        if (ativo) {

          setCarregando(
            false
          );

        }

      }

    }

    void atualizarDados();

    const intervalo =
      setInterval(
        () => {

          void atualizarDados();

        },
        10000
      );

    return () => {

      ativo = false;

      clearInterval(
        intervalo
      );

    };

  }, []);

  const hora =
    agora.toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  const data =
    agora.toLocaleDateString(
      "pt-BR",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  const horaAtualizacao =
    ultimaAtualizacao.toLocaleTimeString(
      "pt-BR",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  function getOrdemProjeto(
    nome: string
  ) {

    const projeto =
      nome
        .toLowerCase()
        .replace(/\s/g, "");

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
      projeto.includes("isa")
    ) {

      return 5;

    }

    if (
      projeto.includes("iwb")
    ) {

      return 6;

    }

    return 99;

  }

  const projetosOrdenados =
    useMemo(() => {

      return [
        ...projects,
      ].sort(
        (a, b) =>
          getOrdemProjeto(
            a.nome
          ) -
          getOrdemProjeto(
            b.nome
          )
      );

    }, [projects]);

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

        <div className="tv-header-right">

          <div className="tv-last-update">

            <span>
              Última atualização
            </span>

            <strong>
              {horaAtualizacao}
            </strong>

          </div>

          <div className="tv-clock">

            <strong>
              {hora}
            </strong>

            <small>
              {data}
            </small>

          </div>

        </div>

      </header>

      <CompatibilityPanel
        projects={projects}
        carregando={carregando}
      />

      <main className="tv-grid">

        {projetosOrdenados.map(
          project => (

            <TvProjectCard
              key={project.id}
              project={project}
            />

          )
        )}

      </main>

    </div>

  );

}

export default TvDashboard;