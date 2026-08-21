import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MdHistory,
  MdRefresh,
  MdSearch,
} from "react-icons/md";

import {
  listarAuditoria,
} from "../../services/AuditLogService";

import type {
  AuditLog,
} from "../../services/AuditLogService";

import "./AuditHistory.css";


const NOMES_ACAO:
  Record<string, string> = {
    CRIAR: "Criação",
    EDITAR: "Edição",
    EXCLUIR: "Exclusão",
    CONCLUIR: "Conclusão",
    REABRIR: "Reabertura",
    REDEFINIR_SENHA:
      "Redefinição de senha",
};


const NOMES_ENTIDADE:
  Record<string, string> = {
    ambiente: "Ambiente",
    projeto: "Projeto",
    projeto_release:
      "Projeto da release",
    usuario: "Usuário",
};


function formatarData(
  valor: string
) {
  const normalizado =
    valor.includes("T")
      ? valor
      : `${valor.replace(" ", "T")}Z`;

  const data =
    new Date(normalizado);

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return valor;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "medium",
    }
  ).format(data);
}


function possuiDetalhes(
  registro: AuditLog
) {
  return Boolean(
    registro.previousData ||
    registro.newData
  );
}


function AuditHistory() {
  const [registros, setRegistros] =
    useState<AuditLog[]>([]);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [pesquisa, setPesquisa] =
    useState("");


  async function carregarHistorico() {
    try {
      setCarregando(true);
      setErro("");

      const lista =
        await listarAuditoria(150);

      setRegistros(lista);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o histórico."
      );
    } finally {
      setCarregando(false);
    }
  }


  useEffect(() => {
    void carregarHistorico();
  }, []);


  const registrosFiltrados =
    useMemo(() => {
      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      if (!termo) {
        return registros;
      }

      return registros.filter(
        registro =>
          [
            registro.userName,
            registro.userEmail,
            registro.action,
            NOMES_ACAO[registro.action],
            registro.entityType,
            NOMES_ENTIDADE[
              registro.entityType
            ],
            registro.entityName,
          ]
            .filter(Boolean)
            .some(valor =>
              String(valor)
                .toLowerCase()
                .includes(termo)
            )
      );
    }, [registros, pesquisa]);


  return (
    <section className="audit-card">
      <header className="audit-header">
        <div className="audit-title">
          <div className="audit-title-icon">
            <MdHistory size={23} />
          </div>

          <div>
            <h2>
              Histórico de alterações
            </h2>

            <p>
              Consulte quem realizou cada alteração no ReleaseHub.
            </p>
          </div>
        </div>

        <div className="audit-header-actions">
          <label className="audit-search">
            <MdSearch size={19} />

            <input
              value={pesquisa}
              placeholder="Pesquisar no histórico..."
              onChange={evento =>
                setPesquisa(
                  evento.target.value
                )
              }
            />
          </label>

          <button
            type="button"
            className="audit-refresh"
            disabled={carregando}
            onClick={() =>
              void carregarHistorico()
            }
          >
            <MdRefresh size={19} />

            Atualizar
          </button>
        </div>
      </header>

      {erro && (
        <div className="audit-error">
          {erro}
        </div>
      )}

      <div className="audit-table-container">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Data e hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Registro</th>
              <th>Detalhes</th>
            </tr>
          </thead>

          <tbody>
            {registrosFiltrados.map(
              registro => (
                <tr key={registro.id}>
                  <td className="audit-date">
                    {formatarData(
                      registro.createdAt
                    )}
                  </td>

                  <td>
                    <div className="audit-user">
                      <strong>
                        {registro.userName}
                      </strong>

                      <span>
                        {registro.userEmail ||
                          registro.userRole}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span
                      className={`audit-action audit-action-${registro.action.toLowerCase()}`}
                    >
                      {NOMES_ACAO[
                        registro.action
                      ] ?? registro.action}
                    </span>
                  </td>

                  <td>
                    <div className="audit-entity">
                      <span>
                        {NOMES_ENTIDADE[
                          registro.entityType
                        ] ??
                          registro.entityType}
                      </span>

                      <strong>
                        {registro.entityName ||
                          `#${registro.entityId}`}
                      </strong>
                    </div>
                  </td>

                  <td>
                    {possuiDetalhes(
                      registro
                    ) ? (
                      <details className="audit-details">
                        <summary>
                          Ver alteração
                        </summary>

                        <div className="audit-details-content">
                          {registro.previousData !== null &&
                            registro.previousData !== undefined && (
                            <div>
                              <strong>Antes</strong>

                              <pre>
                                {JSON.stringify(
                                  registro.previousData,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}

                          {registro.newData !== null &&
                            registro.newData !== undefined && (
                            <div>
                              <strong>Depois</strong>

                              <pre>
                                {JSON.stringify(
                                  registro.newData,
                                  null,
                                  2
                                )}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    ) : (
                      <span className="audit-no-details">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>

        {carregando && (
          <div className="audit-empty">
            Carregando histórico...
          </div>
        )}

        {!carregando &&
          registrosFiltrados.length === 0 && (
            <div className="audit-empty">
              Nenhuma alteração encontrada.
            </div>
          )}
      </div>
    </section>
  );
}


export default AuditHistory;
