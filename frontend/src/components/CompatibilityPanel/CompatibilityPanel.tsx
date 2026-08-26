import {
  type CSSProperties,
  useEffect,
  useState,
} from "react";

import "./CompatibilityPanel.css";

import {
  buscarCompatibilidade,
} from "../../services/CompatibilityService";

import {
  buscarAmbientePorIntellicash,
} from "../../services/ReleaseEnvironmentService";

import type {
  Project,
} from "../../types/project";

import type {
  CompatibilityItem,
} from "../../types/compatibility";

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
  "--compatibility-columns": number;
}


type SistemaExibicao = {
  key: string;
  nome: string;
  versao: string;
};


function obterSistemasAmbiente(
  ambiente: ReleaseEnvironment
): ReleaseSystemVersion[] {
  if (
    ambiente.sistemas &&
    ambiente.sistemas.length > 0
  ) {
    return [
      ...ambiente.sistemas,
    ].sort(
      (a, b) =>
        a.ordem - b.ordem
    );
  }

  return [
    {
      chave: "intellicash",
      nome: "IntelliCash",
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
      nome: "EasyCheckOut",
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


function converterItens(
  itens: CompatibilityItem[]
): SistemaExibicao[] {
  return itens
    .filter(item => item.visible)
    .sort(
      (a, b) =>
        a.order - b.order
    )
    .map(item => ({
      key: item.key,
      nome: item.displayName,
      versao: item.selectedVersion,
    }));
}


function converterAmbiente(
  ambiente: ReleaseEnvironment
): SistemaExibicao[] {
  return obterSistemasAmbiente(
    ambiente
  ).map(sistema => ({
    key: sistema.chave,
    nome: sistema.nome,
    versao: sistema.versao,
  }));
}


function obterQuantidadeColunas(
  quantidadeSistemas: number
) {
  if (quantidadeSistemas <= 0) {
    return 1;
  }

  if (quantidadeSistemas <= 6) {
    return quantidadeSistemas;
  }

  return Math.min(
    10,
    Math.ceil(
      quantidadeSistemas / 2
    )
  );
}


function CompatibilityPanel({
  projects,
  carregando = false,
}: Props) {
  const [ambiente, setAmbiente] =
    useState<ReleaseEnvironment | null>(null);

  const [sistemas, setSistemas] =
    useState<SistemaExibicao[]>([]);

  const [carregandoAmbiente, setCarregandoAmbiente] =
    useState(false);

  const intellicash =
    projects.find(project => {
      const nome =
        project.nome.toLowerCase();

      return (
        nome.includes("intellicash") ||
        nome.includes("intelicash")
      );
    });

  const versaoIntellicash =
    intellicash?.versao ?? "";

  useEffect(() => {
    let ativo = true;

    async function carregarAmbiente() {
      if (!versaoIntellicash) {
        setAmbiente(null);
        setSistemas([]);
        setCarregandoAmbiente(false);
        return;
      }

      setCarregandoAmbiente(true);

      try {
        const encontrado =
          await buscarAmbientePorIntellicash(
            versaoIntellicash
          );

        if (!ativo) {
          return;
        }

        setAmbiente(
          encontrado ?? null
        );

        if (!encontrado) {
          setSistemas([]);
          return;
        }

        /*
          A compatibilidade é uma camada
          separada do ambiente. Se a nova
          API falhar por qualquer motivo,
          o painel mantém o comportamento
          antigo como fallback para não
          interromper Dashboard ou Modo TV.
        */
        try {
          const configuracao =
            await buscarCompatibilidade(
              encontrado.id
            );

          if (ativo) {
            setSistemas(
              converterItens(
                configuracao.items
              )
            );
          }
        } catch (erro) {
          console.error(
            "Erro ao carregar configuração de compatibilidade:",
            erro
          );

          if (ativo) {
            setSistemas(
              converterAmbiente(
                encontrado
              )
            );
          }
        }
      } catch (erro) {
        console.error(
          "Erro ao carregar ambiente:",
          erro
        );

        if (ativo) {
          setAmbiente(null);
          setSistemas([]);
        }
      } finally {
        if (ativo) {
          setCarregandoAmbiente(false);
        }
      }
    }

    void carregarAmbiente();

    return () => {
      ativo = false;
    };
  }, [versaoIntellicash, projects]);

  const titulo = (
    <div className="compatibility-title">
      <strong>
        Compatibilidade entre os sistemas
      </strong>
    </div>
  );

  if (
    carregando ||
    carregandoAmbiente
  ) {
    return (
      <section className="compatibility-panel">
        {titulo}
        <div className="compatibility-empty">
          Carregando compatibilidade...
        </div>
      </section>
    );
  }

  if (!intellicash) {
    return (
      <section className="compatibility-panel">
        {titulo}
        <div className="compatibility-empty">
          Projeto IntelliCash não cadastrado.
        </div>
      </section>
    );
  }

  if (!ambiente) {
    return (
      <section className="compatibility-panel">
        {titulo}
        <div className="compatibility-empty">
          Nenhum ambiente cadastrado para a versão{" "}
          <strong>
            {intellicash.versao}
          </strong>
        </div>
      </section>
    );
  }

  if (sistemas.length === 0) {
    return (
      <section className="compatibility-panel">
        {titulo}
        <div className="compatibility-empty">
          Nenhum sistema está marcado para exibição neste ambiente.
        </div>
      </section>
    );
  }

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
      {titulo}

      <div
        className="compatibility-line"
        style={compatibilityStyle}
      >
        {sistemas.map(sistema => {
          const possuiVersao =
            Boolean(
              sistema.versao?.trim()
            );

          return (
            <div
              key={sistema.key}
              className={`compatibility-version ${
                possuiVersao
                  ? ""
                  : "compatibility-version-empty"
              }`}
              title={`${sistema.nome}: ${
                sistema.versao || "-"
              }`}
            >
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
        })}
      </div>
    </section>
  );
}

export default CompatibilityPanel;
