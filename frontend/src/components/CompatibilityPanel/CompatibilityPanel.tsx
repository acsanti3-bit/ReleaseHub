import {
  type CSSProperties,
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


interface CompatibilityStyle
  extends CSSProperties {

  "--compatibility-columns":
    number;

}


function getSystemIcon(
  chave: string
) {

  const sistema =
    chave.toLowerCase();


  if (
    sistema.includes(
      "intellicash"
    )
  ) {

    return (
      <MdDns />
    );

  }


  if (
    sistema.includes(
      "easycash"
    )
  ) {

    return (
      <MdPointOfSale />
    );

  }


  if (
    sistema.includes(
      "easycheckout"
    )
  ) {

    return (
      <MdStore />
    );

  }


  if (
    sistema.includes(
      "easypdv"
    )
  ) {

    return (
      <MdShoppingCart />
    );

  }


  if (
    sistema.includes(
      "intellistock"
    ) ||
    sistema.includes(
      "isa"
    )
  ) {

    return (
      <MdInventory />
    );

  }


  if (
    sistema.includes(
      "iwb"
    )
  ) {

    return (
      <MdCloud />
    );

  }


  return (
    <MdApps />
  );

}


function obterSistemas(
  ambiente: ReleaseEnvironment
): ReleaseSystemVersion[] {

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


  return [

    {
      chave:
        "intellicash",

      nome:
        "Intellicash",

      versao:
        ambiente
          .versoes
          .intellicash,

      ordem:
        1,
    },

    {
      chave:
        "easycash",

      nome:
        "EasyCash",

      versao:
        ambiente
          .versoes
          .easycash,

      ordem:
        2,
    },

    {
      chave:
        "easycheckout",

      nome:
        "EasyCheckout",

      versao:
        ambiente
          .versoes
          .easycheckout,

      ordem:
        3,
    },

    {
      chave:
        "easypdv",

      nome:
        "EasyPDV",

      versao:
        ambiente
          .versoes
          .easypdv,

      ordem:
        4,
    },

    {
      chave:
        "intellistock",

      nome:
        "IntelliStock",

      versao:
        ambiente
          .versoes
          .intellistock,

      ordem:
        5,
    },

    {
      chave:
        "iwbserver",

      nome:
        "IWB Server",

      versao:
        ambiente
          .versoes
          .iwbserver,

      ordem:
        6,
    },

  ];

}


function obterQuantidadeColunas(
  quantidadeSistemas: number
) {

  if (
    quantidadeSistemas <= 0
  ) {

    return 1;

  }


  if (
    quantidadeSistemas <= 6
  ) {

    return quantidadeSistemas;

  }


  /*
    Acima de seis sistemas,
    distribui os itens em linhas
    equilibradas.

    15 sistemas:
    8 na primeira linha
    7 na segunda.
  */

  return Math.min(
    8,
    Math.ceil(
      quantidadeSistemas / 2
    )
  );

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
          project
            .nome
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

        setCarregandoAmbiente(
          false
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
            Compatibilidade
          </strong>

          <small>
            Sistemas da release
          </small>

        </div>


        <div className="compatibility-empty">

          Carregando compatibilidade...

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
            Compatibilidade
          </strong>

          <small>
            Sistemas da release
          </small>

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
            Compatibilidade
          </strong>

          <small>
            Sistemas da release
          </small>

        </div>


        <div className="compatibility-empty">

          Nenhum ambiente cadastrado
          para a versão{" "}

          <strong>
            {intellicash.versao}
          </strong>

        </div>

      </section>

    );

  }


  const sistemas =
    obterSistemas(
      ambiente
    );


  const quantidadeColunas =
    obterQuantidadeColunas(
      sistemas.length
    );


  const compatibilityStyle:
    CompatibilityStyle = {

    "--compatibility-columns":
      quantidadeColunas,

  };


  return (

    <section className="compatibility-panel">

      <div className="compatibility-title">

        <strong>
          Compatibilidade
        </strong>

        <small>

          {sistemas.length}{" "}

          {sistemas.length === 1
            ? "sistema"
            : "sistemas"}

        </small>

      </div>


      <div
        className="compatibility-line"
        style={
          compatibilityStyle
        }
      >

        {sistemas.map(
          sistema => {

            const possuiVersao =
              Boolean(
                sistema.versao?.trim()
              );


            return (

              <div
                key={
                  sistema.chave
                }
                className={`compatibility-version ${
                  possuiVersao
                    ? ""
                    : "compatibility-version-empty"
                }`}
                title={`${sistema.nome}: ${
                  sistema.versao || "-"
                }`}
              >

                <div className="compatibility-icon">

                  {getSystemIcon(
                    sistema.chave
                  )}

                </div>


                <div className="compatibility-system-info">

                  <strong>

                    {sistema.nome}

                  </strong>

                  <small>

                    {sistema.versao || "-"}

                  </small>

                </div>

              </div>

            );

          }
        )}

      </div>

    </section>

  );

}


export default CompatibilityPanel;