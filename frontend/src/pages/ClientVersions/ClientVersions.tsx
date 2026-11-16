import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  readSheet,
} from "read-excel-file/browser";

import {
  MdCheckCircle,
  MdCloudUpload,
  MdErrorOutline,
  MdRefresh,
  MdSearch,
} from "react-icons/md";

import Layout from "../../components/layout/Layout";

import {
  buscarSessao,
} from "../../services/AuthService";

import {
  importarVersoesClientes,
  listarVersoesClientes,
} from "../../services/ClientVersionService";

import type {
  ClientVersion,
  ClientVersionImport,
  ClientVersionImportRow,
} from "../../types/clientVersions";

import "./ClientVersions.css";


type Feedback = {
  tipo:
    | "sucesso"
    | "erro";

  texto: string;
};


function textoCelula(
  valor: unknown
) {
  return String(
    valor ?? ""
  ).trim();
}


function documentoCelula(
  valor: unknown
) {
  return textoCelula(
    valor
  )
    .replace(
      /\D/g,
      ""
    );
}


function versaoCelula(
  valor: unknown
) {
  const versao =
    textoCelula(
      valor
    );


  if (
    !versao ||
    versao
      .toLowerCase()
      .includes(
        "undefined.undefined"
      )
  ) {
    return "";
  }


  return versao;
}


function licencasCelula(
  valor: unknown
) {
  const numero =
    Number(
      valor
    );


  if (
    !Number.isFinite(
      numero
    ) ||
    numero < 0
  ) {
    return 0;
  }


  return Math.trunc(
    numero
  );
}


function formatarDocumento(
  documento: string
) {
  const numeros =
    documento.replace(
      /\D/g,
      ""
    );


  if (
    numeros.length ===
    14
  ) {
    return numeros.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }


  if (
    numeros.length ===
    11
  ) {
    return numeros.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      "$1.$2.$3-$4"
    );
  }


  return documento;
}


function formatarData(
  data: string
) {
  if (
    !data
  ) {
    return "-";
  }


  const normalizada =
    data.includes(
      "T"
    )
      ? data
      : `${data.replace(
          " ",
          "T"
        )}Z`;


  const valor =
    new Date(
      normalizada
    );


  if (
    Number.isNaN(
      valor.getTime()
    )
  ) {
    return data;
  }


  return valor.toLocaleString(
    "pt-BR"
  );
}


function ClientVersions() {
  const inputArquivoRef =
    useRef<HTMLInputElement>(
      null
    );


  const [
    clientes,
    setClientes,
  ] =
    useState<
      ClientVersion[]
    >([]);


  const [
    ultimaImportacao,
    setUltimaImportacao,
  ] =
    useState<
      ClientVersionImport |
      null
    >(null);


  const [
    carregando,
    setCarregando,
  ] =
    useState(true);


  const [
    importando,
    setImportando,
  ] =
    useState(false);


  const [
    podeImportar,
    setPodeImportar,
  ] =
    useState(false);


  const [
    busca,
    setBusca,
  ] =
    useState("");


  const [
    uf,
    setUf,
  ] =
    useState("");


  const [
    parceiro,
    setParceiro,
  ] =
    useState("");


  const [
    versao,
    setVersao,
  ] =
    useState("");


  const [
    feedback,
    setFeedback,
  ] =
    useState<
      Feedback |
      null
    >(null);


  async function carregar() {
    try {

      setCarregando(
        true
      );


      const resultado =
        await listarVersoesClientes();


      setClientes(
        resultado.clients
      );


      setUltimaImportacao(
        resultado.lastImport
      );

    } catch (
      erro
    ) {

      setFeedback({
        tipo:
          "erro",

        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível carregar os clientes.",
      });

    } finally {

      setCarregando(
        false
      );

    }
  }


  useEffect(
    () => {

      let ativo =
        true;


      async function iniciar() {
        try {

          const usuario =
            await buscarSessao();


          if (
            ativo
          ) {
            setPodeImportar(
              usuario?.role ===
                "admin" ||
              usuario?.role ===
                "qualidade"
            );
          }

        } catch (
          erro
        ) {

          console.error(
            "Erro ao consultar sessão:",
            erro
          );

        }


        if (
          ativo
        ) {
          await carregar();
        }

      }


      void iniciar();


      return () => {
        ativo =
          false;
      };

    },
    []
  );


  const ufs =
    useMemo(
      () =>
        Array.from(
          new Set(
            clientes
              .map(
                item =>
                  item.state
                    .trim()
              )
              .filter(
                Boolean
              )
          )
        )
          .sort(),

      [
        clientes,
      ]
    );


  const parceiros =
    useMemo(
      () =>
        Array.from(
          new Set(
            clientes
              .map(
                item =>
                  item.partner
                    .trim()
              )
              .filter(
                Boolean
              )
          )
        )
          .sort(
            (
              a,
              b
            ) =>
              a.localeCompare(
                b,
                "pt-BR"
              )
          ),

      [
        clientes,
      ]
    );


  const versoes =
    useMemo(
      () =>
        Array.from(
          new Set(
            clientes
              .map(
                item =>
                  item.version
                    .trim()
              )
              .filter(
                Boolean
              )
          )
        )
          .sort(
            (
              a,
              b
            ) =>
              b.localeCompare(
                a,
                undefined,
                {
                  numeric:
                    true,
                }
              )
          ),

      [
        clientes,
      ]
    );


  const clientesFiltrados =
    useMemo(
      () => {

        const termo =
          busca
            .trim()
            .toLowerCase();


        return clientes.filter(
          item => {

            const correspondeBusca =
              !termo ||
              item.fantasyName
                .toLowerCase()
                .includes(
                  termo
                ) ||
              item.document
                .includes(
                  termo.replace(
                    /\D/g,
                    ""
                  )
                );


            const correspondeUf =
              !uf ||
              item.state ===
                uf;


            const correspondeParceiro =
              !parceiro ||
              item.partner ===
                parceiro;


            const correspondeVersao =
              !versao ||
              item.version ===
                versao;


            return (
              correspondeBusca &&
              correspondeUf &&
              correspondeParceiro &&
              correspondeVersao
            );

          }
        );

      },
      [
        clientes,
        busca,
        uf,
        parceiro,
        versao,
      ]
    );


  const totalLicencasFiltradas =
    useMemo(
      () =>
        clientesFiltrados.reduce(
          (
            total,
            item
          ) =>
            total +
            item.activeLicenses,
          0
        ),

      [
        clientesFiltrados,
      ]
    );


  const totalVersoesIdentificadas =
    useMemo(
      () =>
        new Set(
          clientes
            .map(
              item =>
                item.version
            )
            .filter(
              Boolean
            )
        )
          .size,

      [
        clientes,
      ]
    );


  async function importarArquivo(
    arquivo: File
  ) {
    try {

      setImportando(
        true
      );


      setFeedback(
        null
      );


      const linhas =
        await readSheet(
          arquivo
        );


      if (
        linhas.length <
        2
      ) {
        throw new Error(
          "O Excel não possui dados para importar."
        );
      }


      const cabecalho =
        linhas[0]
          .map(
            valor =>
              textoCelula(
                valor
              )
          );


      const indiceFantasia =
        cabecalho.indexOf(
          "Fantasia"
        );


      const indiceDocumento =
        cabecalho.indexOf(
          "CPF/CNPJ"
        );


      const indiceUf =
        cabecalho.indexOf(
          "U.F."
        );


      const indiceParceiro =
        cabecalho.indexOf(
          "Parceiro"
        );


      const indiceVersao =
        cabecalho.indexOf(
          "Version"
        );


      const indiceTotal =
        cabecalho.indexOf(
          "Total"
        );


      if (
        indiceFantasia <
          0 ||
        indiceDocumento <
          0
      ) {
        throw new Error(
          "O Excel precisa possuir as colunas Fantasia e CPF/CNPJ."
        );
      }


      const registros:
        ClientVersionImportRow[] =
        linhas
          .slice(
            1
          )
          .map(
            linha => ({
              fantasyName:
                textoCelula(
                  linha[
                    indiceFantasia
                  ]
                ),

              document:
                documentoCelula(
                  linha[
                    indiceDocumento
                  ]
                ),

              state:
                indiceUf >=
                0
                  ? textoCelula(
                      linha[
                        indiceUf
                      ]
                    )
                  : "",

              partner:
                indiceParceiro >=
                0
                  ? textoCelula(
                      linha[
                        indiceParceiro
                      ]
                    )
                  : "",

              version:
                indiceVersao >=
                0
                  ? versaoCelula(
                      linha[
                        indiceVersao
                      ]
                    )
                  : "",

              activeLicenses:
                indiceTotal >=
                0
                  ? licencasCelula(
                      linha[
                        indiceTotal
                      ]
                    )
                  : 0,
            })
          )
          .filter(
            item =>
              item.fantasyName
          );


      if (
        registros.length ===
        0
      ) {
        throw new Error(
          "Nenhum cliente válido foi encontrado no Excel."
        );
      }


      const resultado =
        await importarVersoesClientes(
          arquivo.name,
          registros
        );


      setClientes(
        resultado.clients
      );


      setUltimaImportacao(
        resultado.lastImport
      );


      setBusca(
        ""
      );

      setUf(
        ""
      );

      setParceiro(
        ""
      );

      setVersao(
        ""
      );


      setFeedback({
        tipo:
          "sucesso",

        texto:
          `${resultado.clients.length} registros importados com sucesso.`,
      });

    } catch (
      erro
    ) {

      setFeedback({
        tipo:
          "erro",

        texto:
          erro instanceof Error
            ? erro.message
            : "Não foi possível importar o Excel.",
      });

    } finally {

      setImportando(
        false
      );


      if (
        inputArquivoRef.current
      ) {
        inputArquivoRef.current.value =
          "";
      }

    }
  }


  return (
    <Layout>

      <div className="client-versions-page">

        <header className="client-versions-header">

          <div>

            <span className="client-versions-eyebrow">
              Clientes
            </span>

            <h1>
              Versões dos Clientes
            </h1>

            <p>
              Consulte versões e quantidade de licenças ativas a partir do relatório importado.
            </p>

          </div>


          <div className="client-versions-header-actions">

            <button
              type="button"
              className="client-versions-refresh"
              onClick={() =>
                void carregar()
              }
              disabled={
                carregando ||
                importando
              }
            >
              <MdRefresh
                size={19}
              />

              Atualizar
            </button>


            {podeImportar && (
              <>
                <input
                  ref={
                    inputArquivoRef
                  }
                  type="file"
                  accept=".xlsx"
                  hidden
                  onChange={
                    evento => {

                      const arquivo =
                        evento
                          .target
                          .files?.[0];


                      if (
                        arquivo
                      ) {
                        void importarArquivo(
                          arquivo
                        );
                      }

                    }
                  }
                />


                <button
                  type="button"
                  className="client-versions-import"
                  onClick={() =>
                    inputArquivoRef
                      .current
                      ?.click()
                  }
                  disabled={
                    importando
                  }
                >
                  <MdCloudUpload
                    size={19}
                  />

                  {importando
                    ? "Importando..."
                    : "Importar Excel"}
                </button>
              </>
            )}

          </div>

        </header>


        {feedback && (
          <div
            className={`client-versions-feedback client-versions-feedback-${feedback.tipo}`}
          >
            {feedback.tipo ===
              "sucesso" ? (
              <MdCheckCircle
                size={20}
              />
            ) : (
              <MdErrorOutline
                size={20}
              />
            )}

            <span>
              {feedback.texto}
            </span>
          </div>
        )}


        <section className="client-versions-summary">

          <div>
            <span>
              Registros
            </span>

            <strong>
              {clientes.length}
            </strong>
          </div>


          <div>
            <span>
              Licenças ativas
            </span>

            <strong>
              {ultimaImportacao
                ?.totalActiveLicenses ??
                0}
            </strong>
          </div>


          <div>
            <span>
              Versões identificadas
            </span>

            <strong>
              {totalVersoesIdentificadas}
            </strong>
          </div>


          <div>
            <span>
              Última importação
            </span>

            <strong className="client-versions-summary-date">
              {ultimaImportacao
                ? formatarData(
                    ultimaImportacao.importedAt
                  )
                : "Nenhuma"}
            </strong>
          </div>

        </section>


        {ultimaImportacao && (
          <div className="client-versions-import-info">

            <span>
              Arquivo:
              {" "}
              <strong>
                {ultimaImportacao.fileName}
              </strong>
            </span>

            <span>
              {ultimaImportacao.totalRows}
              {" "}
              registros
            </span>

          </div>
        )}


        <section className="client-versions-filters">

          <label className="client-versions-search">

            <MdSearch
              size={19}
            />

            <input
              value={
                busca
              }
              placeholder="Buscar cliente ou CPF/CNPJ..."
              onChange={
                evento =>
                  setBusca(
                    evento.target.value
                  )
              }
            />

          </label>


          <select
            value={
              uf
            }
            onChange={
              evento =>
                setUf(
                  evento.target.value
                )
            }
          >
            <option value="">
              Todas as UFs
            </option>

            {ufs.map(
              item => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>


          <select
            value={
              parceiro
            }
            onChange={
              evento =>
                setParceiro(
                  evento.target.value
                )
            }
          >
            <option value="">
              Todos os parceiros
            </option>

            {parceiros.map(
              item => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>


          <select
            value={
              versao
            }
            onChange={
              evento =>
                setVersao(
                  evento.target.value
                )
            }
          >
            <option value="">
              Todas as versões
            </option>

            {versoes.map(
              item => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              )
            )}
          </select>

        </section>


        <div className="client-versions-filter-summary">

          <span>
            {clientesFiltrados.length}
            {" "}
            registros encontrados
          </span>

          <strong>
            {totalLicencasFiltradas}
            {" "}
            licenças ativas nos filtros atuais
          </strong>

        </div>


        <section className="client-versions-card">

          {carregando ? (

            <div className="client-versions-empty">
              Carregando clientes...
            </div>

          ) : clientesFiltrados.length ===
            0 ? (

            <div className="client-versions-empty">

              {clientes.length ===
                0
                ? "Nenhum Excel foi importado ainda."
                : "Nenhum cliente encontrado com esses filtros."}

            </div>

          ) : (

            <div className="client-versions-table-wrapper">

              <table className="client-versions-table">

                <thead>

                  <tr>
                    <th>
                      Cliente
                    </th>

                    <th>
                      CPF/CNPJ
                    </th>

                    <th>
                      UF
                    </th>

                    <th>
                      Parceiro
                    </th>

                    <th>
                      Versão
                    </th>

                    <th>
                      Licenças ativas
                    </th>
                  </tr>

                </thead>


                <tbody>

                  {clientesFiltrados.map(
                    cliente => (

                      <tr
                        key={
                          cliente.id
                        }
                      >

                        <td className="client-versions-name">
                          {cliente.fantasyName}
                        </td>

                        <td>
                          {formatarDocumento(
                            cliente.document
                          )}
                        </td>

                        <td>
                          {cliente.state ||
                            "-"}
                        </td>

                        <td>
                          {cliente.partner ||
                            "-"}
                        </td>

                        <td>

                          {cliente.version ? (
                            <span className="client-versions-version">
                              {cliente.version}
                            </span>
                          ) : (
                            <span className="client-versions-version-empty">
                              Não informado
                            </span>
                          )}

                        </td>

                        <td className="client-versions-licenses">
                          {cliente.activeLicenses}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

      </div>

    </Layout>
  );
}


export default ClientVersions;