import {
  useEffect,
  useState,
} from "react";

import "./CompatibilityPanel.css";

import {
  MdApps,
  MdCloud,
  MdDns,
  MdInventory,
  MdPointOfSale,
  MdShoppingCart,
  MdStore,
} from "react-icons/md";

import {
  buscarAmbientePorIntellicash,
} from "../../services/ReleaseEnvironmentService";

import type {
  Project,
} from "../../types/project";

import type {
  ReleaseEnvironment,
  ReleaseSystemVersion,
} from "../../types/releaseEnvironment";


interface Props {

  projects: Project[];

  carregando?: boolean;

}


function obterSistemas(
  ambiente: ReleaseEnvironment
): ReleaseSystemVersion[] {

  /*
    Estrutura nova e dinâmica.
  */

  if (
    ambiente.sistemas &&
    ambiente.sistemas.length > 0
  ) {

    return [
      ...ambiente.sistemas,
    ].sort(
      (
        a,
        b
      ) =>
        a.ordem -
        b.ordem
    );

  }


  /*
    Fallback para ambientes antigos.
  */

  return [

    {
      chave: "intellicash",
      nome: "Intellicash",
      versao:
        ambiente
          .versoes
          .intellicash,
      ordem: 1,
    },

    {
      chave: "easycash",
      nome: "EasyCash",
      versao:
        ambiente
          .versoes
          .easycash,
      ordem: 2,
    },

    {
      chave: "easycheckout",
      nome: "EasyCheckout",
      versao:
        ambiente
          .versoes
          .easycheckout,
      ordem: 3,
    },

    {
      chave: "easypdv",
      nome: "EasyPDV",
      versao:
        ambiente
          .versoes
          .easypdv,
      ordem: 4,
    },

    {
      chave: "intellistock",
      nome: "IntelliStock",
      versao:
        ambiente
          .versoes
          .intellistock,
      ordem: 5,
    },

    {
      chave: "iwbserver",
      nome: "IWB Server",
      versao:
        ambiente
          .versoes
          .iwbserver,
      ordem: 6,
    },

  ];

}


function obterIcone(
  chave: string
) {

  switch (
    chave
  ) {

    case "intellicash":

      return (
        <MdDns />
      );


    case "easycash":

      return (
        <MdPointOfSale />
      );


    case "easycheckout":

      return (
        <MdStore />
      );


    case "easypdv":

      return (
        <MdShoppingCart />
      );


    case "intellistock":

      return (
        <MdInventory />
      );


    case "iwbserver":

      return (
        <MdCloud />
      );


    default:

      return (
        <MdApps />
      );

  }

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
    projects.find(
      project => {

        const nome =
          project.nome
            .toLowerCase();


        return (
          nome.includes(
            "intellicash"
          ) ||
          nome.includes(
            "intelicash"
          )
        );

      }
    );


  const versaoIntellicash =
    intellicash?.versao ??
    "";


  useEffect(() => {

    let ativo =
      true;


    async function carregarAmbiente() {

      if (
        !versaoIntellicash
      ) {

        setAmbiente(
          null
        );

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


        if (
          ativo
        ) {

          setAmbiente(
            encontrado ??
            null
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao carregar ambiente:",
          erro
        );


        if (
          ativo
        ) {

          setAmbiente(
            null
          );

        }

      } finally {

        if (
          ativo
        ) {

          setCarregandoAmbiente(
            false
          );

        }

      }

    }


    void carregarAmbiente();


    return () => {

      ativo =
        false;

    };

  }, [
    versaoIntellicash,
  ]);


  if (
    carregando ||
    carregandoAmbiente
  ) {

    return (

      <section className="compatibility-panel">

        <div className="compatibility-title">

          <strong>
            Ambiente da Release
          </strong>

        </div>


        <div className="compatibility-empty">

          Carregando ambiente...

        </div>

      </section>

    );

  }


  if (
    !intellicash
  ) {

    return (

      <section className="compatibility-panel">

        <div className="compatibility-title">

          <strong>
            Ambiente da Release
          </strong>

        </div>


        <div className="compatibility-empty">

          Projeto Intellicash não cadastrado.

        </div>

      </section>

    );

  }


  if (
    !ambiente
  ) {

    return (

      <section className="compatibility-panel">

        <div className="compatibility-title">

          <strong>
            Ambiente da Release
          </strong>

        </div>


        <div className="compatibility-empty">

          Nenhum ambiente cadastrado
          para a versão{" "}

          <strong>

            {
              intellicash
                .versao
            }

          </strong>

        </div>

      </section>

    );

  }


  const sistemas =
    obterSistemas(
      ambiente
    );


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
          sistema => (

            <div
              key={
                sistema.chave
              }
              className="compatibility-version"
            >

              {
                obterIcone(
                  sistema.chave
                )
              }


              <span>

                <strong>

                  {
                    sistema.nome
                  }

                </strong>

                <small>

                  {
                    sistema.versao ||
                    "-"
                  }

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