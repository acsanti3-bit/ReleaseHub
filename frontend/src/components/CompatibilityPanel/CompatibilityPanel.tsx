import {
  useEffect,
  useState,
} from "react";

import "./CompatibilityPanel.css";

import {
  MdDns,
  MdPointOfSale,
  MdShoppingCart,
  MdStore,
  MdInventory,
  MdCloud,
} from "react-icons/md";

import {
  buscarAmbientePorIntellicash,
} from "../../services/ReleaseEnvironmentService";

import type {
  Project,
} from "../../types/project";

import type {
  ReleaseEnvironment,
} from "../../types/releaseEnvironment";

interface Props {

  projects: Project[];

  carregando?: boolean;

}

function CompatibilityPanel({

  projects,

  carregando = false,

}: Props) {

  const [
    ambiente,
    setAmbiente,
  ] =
    useState<
      ReleaseEnvironment | null
    >(null);

  const [
    carregandoAmbiente,
    setCarregandoAmbiente,
  ] =
    useState(false);

  const intellicash =
    projects.find(project => {

      const nome =
        project.nome.toLowerCase();

      return (
        nome.includes(
          "intellicash"
        ) ||
        nome.includes(
          "intelicash"
        )
      );

    });

  const versaoIntellicash =
    intellicash?.versao ?? "";

  useEffect(() => {

    let ativo = true;

    async function carregarAmbiente() {

      if (!versaoIntellicash) {

        setAmbiente(null);

        return;

      }

      setCarregandoAmbiente(
        true
      );

      try {

        const encontrado =
          await buscarAmbientePorIntellicash(
            versaoIntellicash
          );

        if (ativo) {

          setAmbiente(
            encontrado ?? null
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao carregar ambiente:",
          erro
        );

        if (ativo) {

          setAmbiente(null);

        }

      } finally {

        if (ativo) {

          setCarregandoAmbiente(
            false
          );

        }

      }

    }

    void carregarAmbiente();

    return () => {

      ativo = false;

    };

  }, [versaoIntellicash]);

  if (
    carregando ||
    carregandoAmbiente
  ) {

    return (

      <section className="compatibility-panel">

        <div className="compatibility-title">

          Ambiente da Release

        </div>

        <div className="compatibility-empty">

          Carregando ambiente...

        </div>

      </section>

    );

  }

  if (!intellicash) {

    return (

      <section className="compatibility-panel">

        <div className="compatibility-title">

          Ambiente da Release

        </div>

        <div className="compatibility-empty">

          Projeto Intellicash não cadastrado.

        </div>

      </section>

    );

  }

  if (!ambiente) {

    return (

      <section className="compatibility-panel">

        <div className="compatibility-title">

          Ambiente da Release

        </div>

        <div className="compatibility-empty">

          Nenhum ambiente cadastrado para a versão{" "}

          <strong>
            {intellicash.versao}
          </strong>

        </div>

      </section>

    );

  }

  const sistemas = [

    {
      nome: "Intellicash",
      versao:
        ambiente.versoes
          .intellicash,
      icon:
        <MdDns size={17} />,
    },

    {
      nome: "EasyCash",
      versao:
        ambiente.versoes
          .easycash,
      icon:
        <MdPointOfSale size={17} />,
    },

    {
      nome: "EasyCheckout",
      versao:
        ambiente.versoes
          .easycheckout,
      icon:
        <MdStore size={17} />,
    },

    {
      nome: "EasyPDV",
      versao:
        ambiente.versoes
          .easypdv,
      icon:
        <MdShoppingCart size={17} />,
    },

    {
      nome: "IntelliStock",
      versao:
        ambiente.versoes
          .intellistock,
      icon:
        <MdInventory size={17} />,
    },

    {
      nome: "IWB Server",
      versao:
        ambiente.versoes
          .iwbserver,
      icon:
        <MdCloud size={17} />,
    },

  ];

  return (

    <section className="compatibility-panel">

      <div className="compatibility-title">

        <strong>
          Ambiente da Release
        </strong>

        <small>
          {ambiente.nome}
        </small>

      </div>

      <div className="compatibility-line">

        {sistemas.map(
          item => (

            <div
              key={item.nome}
              className="compatibility-version"
            >

              {item.icon}

              <span>

                <strong>
                  {item.nome}
                </strong>

                <small>
                  {item.versao || "-"}
                </small>

              </span>

            </div>

          )
        )}

      </div>

    </section>

  );

}

export default CompatibilityPanel;