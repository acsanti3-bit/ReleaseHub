import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MdAdd,
  MdClose,
  MdDeleteOutline,
} from "react-icons/md";

import {
  criarSistemasFixos,
} from "../../types/releaseEnvironment";

import type {
  ReleaseEnvironment,
  ReleaseRemessa,
} from "../../types/releaseEnvironment";

import "./ReleaseEnvironmentDrawer.css";


type Props = {
  environment: ReleaseEnvironment;
  environments?: ReleaseEnvironment[];
  onClose: () => void;
  onSave: (
    environment: ReleaseEnvironment
  ) => Promise<void> | void;
};


type SistemaPrincipal =
  | "intellicash"
  | "easycash"
  | "easycheckout"
  | "easypdv"
  | "intellistock";


const SISTEMAS_PRINCIPAIS: SistemaPrincipal[] = [
  "intellicash",
  "easycash",
  "easycheckout",
  "easypdv",
  "intellistock",
];


const NOMES_SISTEMAS_PRINCIPAIS: Record<
  SistemaPrincipal,
  string
> = {
  intellicash: "IntelliCash",
  easycash: "EasyCash",
  easycheckout: "EasyCheckOut",
  easypdv: "EasyPDV",
  intellistock: "IntelliStock",
};


type NovaRemessaForm = {
  data: string;
  intellicash: number;
  easycash: number;
  easycheckout: number;
  easypdv: number;
  intellistock: number;
};


function criarNovaRemessaForm(): NovaRemessaForm {
  return {
    data: "",
    intellicash: 0,
    easycash: 0,
    easycheckout: 0,
    easypdv: 0,
    intellistock: 0,
  };
}


function formatarData(
  valor?: string
): string {
  if (!valor) {
    return "Não informada";
  }

  const partes =
    valor.includes("T")
      ? valor.split("T")[0].split("-")
      : valor.split("-");

  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  return valor;
}


function normalizarDateTimeLocal(
  valor?: string
): string {
  if (!valor) {
    return "";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const ano =
    data.getFullYear();

  const mes =
    String(data.getMonth() + 1).padStart(
      2,
      "0"
    );

  const dia =
    String(data.getDate()).padStart(
      2,
      "0"
    );

  const horas =
    String(data.getHours()).padStart(
      2,
      "0"
    );

  const minutos =
    String(data.getMinutes()).padStart(
      2,
      "0"
    );

  return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
}


function paraIsoDateTime(
  valor: string
): string {
  if (!valor) {
    return "";
  }

  const data =
    new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return data.toISOString();
}


function criarIdRemessa(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}


function ReleaseEnvironmentDrawer({
  environment,
  environments = [],
  onClose,
  onSave,
}: Props) {
  const [form, setForm] =
    useState<ReleaseEnvironment>(() => ({
      ...environment,
      sistemas: criarSistemasFixos(
        environment.sistemas ?? [],
        environment.versoes
      ),
      remessas: environment.remessas ?? [],
    }));


  const [salvando, setSalvando] =
    useState(false);


  const [novaRemessa, setNovaRemessa] =
    useState<NovaRemessaForm>(
      criarNovaRemessaForm
    );


  const ambienteJaExiste =
    environments.some(
      ambiente =>
        ambiente.id === environment.id
    );


  useEffect(() => {
    setForm({
      ...environment,

      sistemas: criarSistemasFixos(
        environment.sistemas ?? [],
        environment.versoes
      ),

      remessas:
        environment.remessas ?? [],
    });

    setNovaRemessa(
      criarNovaRemessaForm()
    );
  }, [environment]);


  const sistemas =
    useMemo(
      () =>
        [...(form.sistemas ?? [])].sort(
          (a, b) =>
            a.ordem - b.ordem
        ),
      [form.sistemas]
    );


  const ambienteAnterior =
    useMemo(() => {
      if (!ambienteJaExiste) {
        return undefined;
      }

      const anteriores =
        environments
          .filter(
            ambiente =>
              ambiente.id !== form.id &&
              ambiente.versoes.intellicash &&
              ambiente.versoes.intellicash !==
                form.versoes.intellicash
          )
          .sort((a, b) => {
            const versaoA =
              a.versoes.intellicash
                .split(".")
                .map(
                  parte =>
                    Number(parte) || 0
                );

            const versaoB =
              b.versoes.intellicash
                .split(".")
                .map(
                  parte =>
                    Number(parte) || 0
                );

            const tamanho =
              Math.max(
                versaoA.length,
                versaoB.length
              );

            for (
              let index = 0;
              index < tamanho;
              index++
            ) {
              const valorA =
                versaoA[index] ?? 0;

              const valorB =
                versaoB[index] ?? 0;

              if (valorA !== valorB) {
                return valorB - valorA;
              }
            }

            return 0;
          });

      return anteriores[0];
    }, [
      ambienteJaExiste,
      environments,
      form.id,
      form.versoes.intellicash,
    ]);


  function alterarCampo<
    K extends keyof ReleaseEnvironment
  >(
    campo: K,
    valor: ReleaseEnvironment[K]
  ) {
    setForm(atual => ({
      ...atual,
      [campo]: valor,
    }));
  }


  function alterarVersao(
    chave: string,
    valor: string
  ) {
    const sistemaPrincipal =
      SISTEMAS_PRINCIPAIS.includes(
        chave as SistemaPrincipal
      );

    setForm(atual => {
      const sistemasAtualizados =
        (atual.sistemas ?? []).map(
          sistema => {
            if (sistema.chave !== chave) {
              return sistema;
            }

            return {
              ...sistema,
              versao: valor,
            };
          }
        );

      const versoesAtualizadas = {
        ...atual.versoes,
      };

      if (
        chave in versoesAtualizadas
      ) {
        (
          versoesAtualizadas as Record<
            string,
            string
          >
        )[chave] = valor;
      }

      return {
        ...atual,
        versoes:
          versoesAtualizadas,
        sistemas:
          sistemasAtualizados,
      };
    });


    if (
      !sistemaPrincipal &&
      ambienteJaExiste
    ) {
      return;
    }
  }


  function alterarExecutavel(
    chave: string,
    valor: string
  ) {
    setForm(atual => ({
      ...atual,

      sistemas:
        (atual.sistemas ?? []).map(
          sistema =>
            sistema.chave === chave
              ? {
                  ...sistema,
                  executavel: valor,
                }
              : sistema
        ),
    }));
  }


  function alterarExibicaoNaTv(
    chave: string,
    valor: boolean
  ) {
    setForm(atual => ({
      ...atual,

      sistemas:
        (atual.sistemas ?? []).map(
          sistema =>
            sistema.chave === chave
              ? {
                  ...sistema,
                  mostrarNaTv: valor,
                }
              : sistema
        ),
    }));
  }


  function alterarTodosNaTv(
    valor: boolean
  ) {
    setForm(atual => ({
      ...atual,

      sistemas:
        (atual.sistemas ?? []).map(
          sistema => ({
            ...sistema,
            mostrarNaTv: valor,
          })
        ),
    }));
  }


  function alterarTarefaRemessa(
    sistema: SistemaPrincipal,
    valor: string
  ) {
    const quantidade =
      Math.max(
        0,
        Number.parseInt(
          valor,
          10
        ) || 0
      );

    setNovaRemessa(atual => ({
      ...atual,
      [sistema]: quantidade,
    }));
  }


  function registrarRemessa() {
    if (!novaRemessa.data) {
      window.alert(
        "Informe a data da remessa."
      );

      return;
    }

    const tarefas = {
      intellicash:
        novaRemessa.intellicash,

      easycash:
        novaRemessa.easycash,

      easycheckout:
        novaRemessa.easycheckout,

      easypdv:
        novaRemessa.easypdv,

      intellistock:
        novaRemessa.intellistock,
    };


    const totalTarefas =
      Object.values(tarefas).reduce(
        (
          total,
          quantidade
        ) =>
          total + quantidade,
        0
      );


    if (totalTarefas <= 0) {
      window.alert(
        "Informe pelo menos uma tarefa para registrar a remessa."
      );

      return;
    }


    const remessa: ReleaseRemessa = {
      id: criarIdRemessa(),

      data:
        novaRemessa.data,

      tarefas,

      totalTarefas,
    };


    setForm(atual => ({
      ...atual,

      remessas: [
        ...(atual.remessas ?? []),
        remessa,
      ],
    }));


    setNovaRemessa(
      criarNovaRemessaForm()
    );
  }


  function excluirRemessa(
    id: string
  ) {
    const confirmar =
      window.confirm(
        "Deseja remover esta remessa do histórico?"
      );

    if (!confirmar) {
      return;
    }


    setForm(atual => ({
      ...atual,

      remessas:
        (atual.remessas ?? []).filter(
          remessa =>
            remessa.id !== id
        ),
    }));
  }


  function alterarLiberadoEm(
    valor: string
  ) {
    alterarCampo(
      "liberadoEm",
      valor
        ? paraIsoDateTime(valor)
        : undefined
    );
  }


  function validar(): boolean {
    if (!form.nome.trim()) {
      window.alert(
        "Informe o nome do ambiente."
      );

      return false;
    }


    const versoesObrigatorias =
      SISTEMAS_PRINCIPAIS;


    for (
      const chave
      of versoesObrigatorias
    ) {
      const sistema =
        form.sistemas?.find(
          item =>
            item.chave === chave
        );

      const versao =
        sistema?.versao?.trim() ||
        form.versoes[
          chave
        ]?.trim();


      if (!versao) {
        window.alert(
          `Informe a versão do ${NOMES_SISTEMAS_PRINCIPAIS[chave]}.`
        );

        return false;
      }
    }


    return true;
  }


  async function salvar() {
    if (!validar()) {
      return;
    }


    try {
      setSalvando(true);


      const versoes = {
        intellicash:
          form.sistemas?.find(
            sistema =>
              sistema.chave ===
              "intellicash"
          )?.versao?.trim() ||
          form.versoes.intellicash,

        easycash:
          form.sistemas?.find(
            sistema =>
              sistema.chave ===
              "easycash"
          )?.versao?.trim() ||
          form.versoes.easycash,

        easycheckout:
          form.sistemas?.find(
            sistema =>
              sistema.chave ===
              "easycheckout"
          )?.versao?.trim() ||
          form.versoes.easycheckout,

        easypdv:
          form.sistemas?.find(
            sistema =>
              sistema.chave ===
              "easypdv"
          )?.versao?.trim() ||
          form.versoes.easypdv,

        intellistock:
          form.sistemas?.find(
            sistema =>
              sistema.chave ===
              "intellistock"
          )?.versao?.trim() ||
          form.versoes.intellistock,

        iwbserver:
          form.sistemas?.find(
            sistema =>
              sistema.chave ===
              "iwbserver"
          )?.versao?.trim() ||
          form.versoes.iwbserver,
      };


      const ambienteSalvo: ReleaseEnvironment = {
        ...form,

        nome:
          form.nome.trim(),

        prazo:
          form.prazo?.trim() || "",

        liberadoEm:
          form.liberadoEm || undefined,

        versoes,

        sistemas:
          (form.sistemas ?? []).map(
            sistema => ({
              ...sistema,

              versao:
                sistema.versao?.trim() ||
                "",

              executavel:
                sistema.executavel?.trim() ||
                undefined,
            })
          ),

        remessas:
          form.remessas ?? [],
      };


      await onSave(
        ambienteSalvo
      );

      onClose();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o ambiente."
      );
    } finally {
      setSalvando(false);
    }
  }


  const remessas =
    useMemo(
      () =>
        [...(form.remessas ?? [])].sort(
          (a, b) =>
            new Date(b.data).getTime() -
            new Date(a.data).getTime()
        ),
      [form.remessas]
    );


  const totalRemessas =
    useMemo(
      () =>
        remessas.reduce(
          (
            total,
            remessa
          ) =>
            total +
            remessa.totalTarefas,
          0
        ),
      [remessas]
    );

  return (
    <>
      <div
        className="release-drawer-backdrop"
        role="presentation"
        onMouseDown={evento => {
          if (evento.target === evento.currentTarget) {
            onClose();
          }
        }}
      />

      <aside
        className="release-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-drawer-title"
      >
        <header className="release-drawer-header">
          <div>
            <h2 id="release-drawer-title">
              Ambiente da Release
            </h2>

            <span>
              Informe as versões principais da release. As demais são herdadas automaticamente.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <MdClose size={21} />
          </button>
        </header>

        <div className="release-drawer-body">
          <div className="release-field">
            <label htmlFor="environment-name">
              Nome do Ambiente
            </label>

            <input
              id="environment-name"
              type="text"
              value={form.nome}
              onChange={evento =>
                alterarCampo(
                  "nome",
                  evento.target.value
                )
              }
            />
          </div>

          <div className="release-field">
            <label htmlFor="environment-deadline">
              Prazo da Release
            </label>

            <input
              id="environment-deadline"
              type="date"
              value={form.prazo ?? ""}
              onChange={evento =>
                alterarCampo(
                  "prazo",
                  evento.target.value
                )
              }
            />
          </div>

          <div className="release-field">
            <label htmlFor="environment-released-at">
              Liberado em
            </label>

            <input
              id="environment-released-at"
              type="datetime-local"
              value={normalizarDateTimeLocal(
                form.liberadoEm
              )}
              onChange={evento =>
                alterarLiberadoEm(
                  evento.target.value
                )
              }
            />

            <span className="release-field-hint">
              Preenchido automaticamente ao concluir a release, mas pode ser corrigido manualmente.
            </span>
          </div>

          <div className="release-reference">
            <strong>
              Versões principais
            </strong>

            <span>
              IntelliCash, EasyCash, EasyCheckOut, EasyPDV e IntelliStock devem ter a versão informada em cada release.
              As demais aplicações herdam a versão da release anterior mais próxima. Se não houver uma anterior cadastrada,
              é usada a próxima release disponível. Alterações ficam na página Compatibilidade.
            </span>
          </div>

          {ambienteAnterior && (
            <div className="release-inheritance-note">
              <strong>
                Ambiente de referência
              </strong>

              <span>
                As versões herdadas podem usar como referência o ambiente{" "}
                <b>{ambienteAnterior.nome}</b>{" "}
                ({ambienteAnterior.versoes.intellicash}).
              </span>
            </div>
          )}

          <div className="release-divider">
            Sistemas da Release
          </div>

          <div className="release-tv-controls">
            <div className="release-tv-controls-text">
              <strong>
                Projetos exibidos na TV
              </strong>

              <span>
                Desmarque os projetos que não devem aparecer no painel.
              </span>
            </div>

            <div className="release-tv-actions">
              <button
                type="button"
                onClick={() =>
                  alterarTodosNaTv(true)
                }
              >
                Marcar todos
              </button>

              <button
                type="button"
                onClick={() =>
                  alterarTodosNaTv(false)
                }
              >
                Desmarcar
              </button>
            </div>
          </div>

          <div className="release-system-list">
            {sistemas.map(sistema => {
              const principal =
                SISTEMAS_PRINCIPAIS.includes(
                  sistema.chave as SistemaPrincipal
                );

              const referencia =
                sistema.chave === "intellicash";

              const herdado =
                !principal &&
                ambienteJaExiste;

              return (
                <div
                  key={sistema.chave}
                  className={`release-system-row ${
                    referencia
                      ? "release-system-row-reference"
                      : ""
                  }`}
                >
                  <div className="release-system-name">
                    <span>
                      {sistema.nome}
                    </span>

                    {referencia && (
                      <small>
                        Referência
                      </small>
                    )}
                  </div>

                  <div className="release-system-version-wrap">
                    <input
                      className={`release-system-version ${
                        herdado
                          ? "release-system-version-inherited"
                          : ""
                      }`}
                      type="text"
                      value={sistema.versao ?? ""}
                      disabled={herdado}
                      placeholder="Versão"
                      onChange={evento =>
                        alterarVersao(
                          sistema.chave,
                          evento.target.value
                        )
                      }
                    />

                    {herdado && (
                      <span className="release-inherited-badge">
                        Compatibilidade
                      </span>
                    )}
                  </div>

                  <input
                    className="release-system-executable"
                    type="text"
                    value={sistema.executavel ?? ""}
                    placeholder="Executável"
                    onChange={evento =>
                      alterarExecutavel(
                        sistema.chave,
                        evento.target.value
                      )
                    }
                  />

                  <label
                    className={`release-tv-toggle ${
                      sistema.mostrarNaTv !== false
                        ? "release-tv-toggle-active"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        sistema.mostrarNaTv !== false
                      }
                      onChange={evento =>
                        alterarExibicaoNaTv(
                          sistema.chave,
                          evento.target.checked
                        )
                      }
                    />

                    Exibir na TV
                  </label>
                </div>
              );
            })}
          </div>

          <div className="release-divider">
            Remessas da Release
          </div>

          <div className="release-remessa-box">
            <div className="release-remessa-heading">
              <strong>
                Registrar nova remessa
              </strong>

              <span>
                Informe quantas tarefas vieram junto com a nova remessa dos sistemas principais.
                {remessas.length > 0 &&
                  ` Histórico: ${remessas.length} remessa${remessas.length === 1 ? "" : "s"} • ${totalRemessas} tarefas.`}
              </span>
            </div>

            <div className="release-remessa-field">
              <label htmlFor="release-remessa-date">
                Data da remessa
              </label>

              <input
                id="release-remessa-date"
                type="date"
                value={novaRemessa.data}
                onChange={evento =>
                  setNovaRemessa(atual => ({
                    ...atual,
                    data: evento.target.value,
                  }))
                }
              />
            </div>

            <div className="release-remessa-grid">
              {SISTEMAS_PRINCIPAIS.map(
                sistema => (
                  <label key={sistema}>
                    <span>
                      {
                        NOMES_SISTEMAS_PRINCIPAIS[
                          sistema
                        ]
                      }
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        novaRemessa[sistema]
                      }
                      onChange={evento =>
                        alterarTarefaRemessa(
                          sistema,
                          evento.target.value
                        )
                      }
                    />
                  </label>
                )
              )}
            </div>

            <button
              type="button"
              className="release-remessa-add"
              onClick={registrarRemessa}
            >
              <MdAdd size={16} />
              Registrar remessa
            </button>
          </div>

          {remessas.length > 0 && (
            <div className="release-remessa-history">
              <div className="release-remessa-history-heading">
                <strong>
                  Histórico de remessas
                </strong>

                <span>
                  As remessas anteriores permanecem registradas.
                </span>
              </div>

              {remessas.map(remessa => (
                <div
                  key={remessa.id}
                  className="release-remessa-history-item"
                >
                  <div>
                    <strong>
                      {formatarData(remessa.data)}
                    </strong>

                    <span>
                      IntelliCash {remessa.tarefas.intellicash}
                      {" • "}
                      EasyCash {remessa.tarefas.easycash}
                      {" • "}
                      EasyCheckOut {remessa.tarefas.easycheckout}
                      {" • "}
                      EasyPDV {remessa.tarefas.easypdv}
                      {" • "}
                      IntelliStock {remessa.tarefas.intellistock}
                      {" • "}
                      {remessa.totalTarefas} tarefas
                    </span>
                  </div>

                  <button
                    type="button"
                    title="Remover remessa"
                    aria-label={`Remover remessa de ${formatarData(
                      remessa.data
                    )}`}
                    onClick={() =>
                      excluirRemessa(
                        remessa.id
                      )
                    }
                  >
                    <MdDeleteOutline size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            className="release-save"
            onClick={() =>
              void salvar()
            }
            disabled={salvando}
          >
            {salvando
              ? "Salvando..."
              : "Salvar Ambiente"}
          </button>
        </div>
      </aside>
    </>
  );
}


export default ReleaseEnvironmentDrawer;
