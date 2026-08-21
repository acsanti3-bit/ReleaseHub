import {
  useEffect,
  useMemo,
  useState,
  type SyntheticEvent,
} from "react";

import {
  MdAdd,
  MdAdminPanelSettings,
  MdClose,
  MdEdit,
  MdLockReset,
  MdOutlinePeopleAlt,
  MdPersonOutline,
  MdSearch,
} from "react-icons/md";

import Layout from "../../components/layout";
import AuditHistory from "./AuditHistory";

import {
  buscarSessao,
} from "../../services/AuthService";

import type {
  AuthUser,
} from "../../services/AuthService";

import {
  adicionarUsuario,
  editarUsuario,
  listarUsuarios,
} from "../../services/UserService";

import type {
  User,
  UserRole,
} from "../../services/UserService";

import "./Settings.css";

interface FormUsuario {
  id?: number;
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  ativo: number;
}

const formularioVazio:
  FormUsuario = {

  nome: "",
  email: "",
  senha: "",
  role: "visualizador",
  ativo: 1,

};

function nomePerfil(
  role: UserRole
) {

  switch (role) {

    case "admin":

      return "Administrador";

    case "qualidade":

      return "Qualidade";

    case "visualizador":

      return "Visualizador";

    default:

      return "Visualizador";

  }

}

function Settings() {

  const [
    usuarioLogado,
    setUsuarioLogado,
  ] =
    useState<AuthUser | null>(null);

  const [
    usuarios,
    setUsuarios,
  ] =
    useState<User[]>([]);

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    salvando,
    setSalvando,
  ] =
    useState(false);

  const [
    pesquisa,
    setPesquisa,
  ] =
    useState("");

  const [
    modalAberto,
    setModalAberto,
  ] =
    useState(false);

  const [
    formulario,
    setFormulario,
  ] =
    useState<FormUsuario>(
      formularioVazio
    );

  const [
    erro,
    setErro,
  ] =
    useState("");

  const editando =
    Boolean(
      formulario.id
    );

  const administrador =
    usuarioLogado?.role === "admin";

  const qualidade =
    usuarioLogado?.role === "qualidade";


  async function carregarUsuarioLogado() {

    try {

      setUsuarioLogado(
        await buscarSessao()
      );

    } catch (error) {

      console.error(
        "Erro ao carregar usuário logado:",
        error
      );

      setUsuarioLogado(null);

    }

  }

  async function carregarUsuarios() {

    try {

      setCarregando(true);

      const lista =
        await listarUsuarios();

      setUsuarios(lista);

    } catch (error) {

      console.error(
        "Erro ao carregar usuários:",
        error
      );

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os usuários."
      );

    } finally {

      setCarregando(false);

    }

  }

  useEffect(() => {

    void carregarUsuarios();
    void carregarUsuarioLogado();

  }, []);

  const usuariosFiltrados =
    useMemo(() => {

      const termo =
        pesquisa
          .trim()
          .toLowerCase();

      if (!termo) {

        return usuarios;

      }

      return usuarios.filter(
        usuario =>

          usuario.nome
            .toLowerCase()
            .includes(termo) ||

          usuario.email
            .toLowerCase()
            .includes(termo)

      );

    }, [
      usuarios,
      pesquisa,
    ]);

  const totalAtivos =
    usuarios.filter(
      usuario =>
        usuario.ativo === 1
    ).length;

  const totalAdmins =
    usuarios.filter(
      usuario =>
        usuario.role === "admin"
    ).length;

  function abrirNovoUsuario() {

    setFormulario({
      ...formularioVazio,
      role:
        qualidade
          ? "qualidade"
          : formularioVazio.role,
    });

    setErro("");

    setModalAberto(true);

  }

  function abrirEdicao(
    usuario: User
  ) {

    if (
      qualidade &&
      usuario.role === "admin"
    ) {

      setErro(
        "O perfil Qualidade não pode alterar usuários administradores."
      );

      return;

    }

    setFormulario({

      id: usuario.id,

      nome: usuario.nome,

      email: usuario.email,

      senha: "",

      role: usuario.role,

      ativo: usuario.ativo,

    });

    setErro("");

    setModalAberto(true);

  }

  function fecharModal() {

    if (salvando) {

      return;

    }

    setModalAberto(false);

    setFormulario({
      ...formularioVazio,
    });

    setErro("");

  }

  async function salvarUsuario(
    event:
      SyntheticEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    setErro("");

    const nome =
      formulario.nome.trim();

    const email =
      formulario.email
        .trim()
        .toLowerCase();

    if (
      !nome ||
      !email
    ) {

      setErro(
        "Informe o nome e o e-mail."
      );

      return;

    }

    if (
      !editando &&
      formulario.senha.length < 12
    ) {

      setErro(
        "A senha inicial deve possuir pelo menos 12 caracteres."
      );

      return;

    }

    if (
      editando &&
      formulario.senha &&
      formulario.senha.length < 12
    ) {

      setErro(
        "A nova senha deve possuir pelo menos 12 caracteres."
      );

      return;

    }

    if (
      qualidade &&
      editando &&
      !formulario.senha
    ) {

      setErro(
        "Informe a nova senha do usuário."
      );

      return;

    }

    setSalvando(true);

    try {

      if (
        formulario.id
      ) {

        await editarUsuario({

          id:
            formulario.id,

          nome,

          email,

          role:
            formulario.role,

          ativo:
            formulario.ativo,

          novaSenha:
            formulario.senha ||
            undefined,

        });

      } else {

        await adicionarUsuario({

          nome,

          email,

          senha:
            formulario.senha,

          role:
            formulario.role,

        });

      }

      await carregarUsuarios();

      setModalAberto(false);

      setFormulario({
        ...formularioVazio,
      });

      setErro("");

    } catch (error) {

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o usuário."
      );

    } finally {

      setSalvando(false);

    }

  }

  return (

    <Layout>

      <div className="settings-page">

        <header className="settings-header">

          <div>

            <span className="settings-eyebrow">
              Administração
            </span>

            <h1>
              Configurações
            </h1>

            <p>
              Gerencie usuários e acessos
              ao IWS ReleaseHub.
            </p>

          </div>

          <button
            type="button"
            className="settings-new-user"
            onClick={
              abrirNovoUsuario
            }
          >

            <MdAdd size={20} />

            Novo Usuário

          </button>

        </header>

        <section className="settings-user-summary">

          <div className="settings-summary-item">

            <div className="settings-summary-icon">

              <MdOutlinePeopleAlt
                size={22}
              />

            </div>

            <div>

              <small>
                Usuários
              </small>

              <strong>
                {usuarios.length}
              </strong>

            </div>

          </div>

          <div className="settings-summary-divider" />

          <div className="settings-summary-item">

            <div className="settings-summary-icon active">

              <MdPersonOutline
                size={22}
              />

            </div>

            <div>

              <small>
                Ativos
              </small>

              <strong>
                {totalAtivos}
              </strong>

            </div>

          </div>

          <div className="settings-summary-divider" />

          <div className="settings-summary-item">

            <div className="settings-summary-icon admin">

              <MdAdminPanelSettings
                size={22}
              />

            </div>

            <div>

              <small>
                Administradores
              </small>

              <strong>
                {totalAdmins}
              </strong>

            </div>

          </div>

        </section>

        <section className="settings-users-card">

          <div className="settings-users-header">

            <div>

              <h2>
                Usuários e acessos
              </h2>

              <p>
                Controle quem pode
                acessar e administrar
                o sistema.
              </p>

            </div>

            <div className="settings-search">

              <MdSearch
                size={20}
              />

              <input
                value={pesquisa}
                placeholder="Pesquisar usuário..."
                onChange={event =>
                  setPesquisa(
                    event.target.value
                  )
                }
              />

            </div>

          </div>

          {erro && !modalAberto && (

            <div className="settings-error">

              {erro}

            </div>

          )}

          <div className="settings-table-container">

            <table className="settings-users-table">

              <thead>

                <tr>

                  <th>
                    Usuário
                  </th>

                  <th>
                    Perfil
                  </th>

                  <th>
                    Status
                  </th>

                  <th className="settings-actions-title">
                    Ações
                  </th>

                </tr>

              </thead>

              <tbody>

                {usuariosFiltrados.map(
                  usuario => (

                    <tr
                      key={
                        usuario.id
                      }
                    >

                      <td>

                        <div className="settings-user">

                          <div className="settings-avatar">

                            {usuario.nome
                              .charAt(0)
                              .toUpperCase()}

                          </div>

                          <div>

                            <strong>
                              {usuario.nome}
                            </strong>

                            <span>
                              {usuario.email}
                            </span>

                          </div>

                        </div>

                      </td>

                      <td>

                        <span
                          className={
                            usuario.role === "admin"
                              ? "settings-role admin"
                              : "settings-role"
                          }
                        >

                          {nomePerfil(
                            usuario.role
                          )}

                        </span>

                      </td>

                      <td>

                        <span
                          className={
                            usuario.ativo === 1
                              ? "settings-status active"
                              : "settings-status inactive"
                          }
                        >

                          <span />

                          {usuario.ativo === 1
                            ? "Ativo"
                            : "Desativado"}

                        </span>

                      </td>

                      <td>

                        <div className="settings-actions">

                          <button
                            type="button"
                            title={
                              qualidade &&
                              usuario.role === "admin"
                                ? "Somente administradores podem alterar este usuário"
                                : administrador
                                  ? "Editar usuário"
                                  : "Redefinir senha"
                            }
                            disabled={
                              qualidade &&
                              usuario.role === "admin"
                            }
                            onClick={() =>
                              abrirEdicao(
                                usuario
                              )
                            }
                          >

                            <MdEdit
                              size={18}
                            />

                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

            {carregando && (

              <div className="settings-empty">

                Carregando usuários...

              </div>

            )}

            {!carregando &&
              usuariosFiltrados.length ===
                0 && (

                <div className="settings-empty">

                  Nenhum usuário encontrado.

                </div>

              )}

          </div>

        </section>

        <AuditHistory />

      </div>

      {modalAberto && (

        <div className="settings-modal-overlay">

          <div className="settings-modal">

            <div className="settings-modal-header">

              <div>

                <h2>

                  {editando
                    ? administrador
                      ? "Editar Usuário"
                      : "Redefinir Senha"
                    : "Novo Usuário"}

                </h2>

                <p>

                  {editando
                    ? administrador
                      ? "Atualize os dados e permissões do usuário."
                      : "Defina uma nova senha para o usuário selecionado."
                    : "Cadastre um novo acesso ao ReleaseHub."}

                </p>

              </div>

              <button
                type="button"
                className="settings-modal-close"
                onClick={
                  fecharModal
                }
              >

                <MdClose
                  size={22}
                />

              </button>

            </div>

            <form
              className="settings-form"
              onSubmit={
                salvarUsuario
              }
            >

              <label>
                Nome
              </label>

              <input
                value={
                  formulario.nome
                }
                placeholder="Nome do usuário"
                disabled={
                  qualidade &&
                  editando
                }
                onChange={event =>
                  setFormulario(
                    atual => ({
                      ...atual,
                      nome:
                        event.target.value,
                    })
                  )
                }
              />

              <label>
                E-mail
              </label>

              <input
                type="email"
                value={
                  formulario.email
                }
                placeholder="usuario@empresa.com"
                disabled={
                  qualidade &&
                  editando
                }
                onChange={event =>
                  setFormulario(
                    atual => ({
                      ...atual,
                      email:
                        event.target.value,
                    })
                  )
                }
              />

              <label>
                Perfil
              </label>

              <select
                value={
                  formulario.role
                }
                disabled={
                  qualidade &&
                  editando
                }
                onChange={event =>
                  setFormulario(
                    atual => ({
                      ...atual,
                      role:
                        event.target
                          .value as UserRole,
                    })
                  )
                }
              >

                <option value="visualizador">
                  Visualizador
                </option>

                <option value="qualidade">
                  Qualidade
                </option>

                {administrador && (

                  <option value="admin">
                    Administrador
                  </option>

                )}

              </select>

              {editando &&
                administrador && (

                <>

                  <label>
                    Status
                  </label>

                  <select
                    value={
                      formulario.ativo
                    }
                    onChange={event =>
                      setFormulario(
                        atual => ({
                          ...atual,
                          ativo:
                            Number(
                              event.target.value
                            ),
                        })
                      )
                    }
                  >

                    <option value={1}>
                      Ativo
                    </option>

                    <option value={0}>
                      Desativado
                    </option>

                  </select>

                </>

              )}

              <label>

                {editando
                  ? "Nova senha"
                  : "Senha inicial"}

              </label>

              <div className="settings-password-field">

                <MdLockReset
                  size={19}
                />

                <input
                  type="password"
                  autoComplete="new-password"
                  value={
                    formulario.senha
                  }
                  placeholder={
                    editando
                      ? qualidade
                        ? "Mínimo 12 caracteres"
                        : "Deixe em branco para manter"
                      : "Mínimo 12 caracteres"
                  }
                  onChange={event =>
                    setFormulario(
                      atual => ({
                        ...atual,
                        senha:
                          event.target.value,
                      })
                    )
                  }
                />

              </div>

              {editando && (

                <small className="settings-password-help">

                  {qualidade
                    ? "Informe a nova senha para concluir a redefinição."
                    : "Preencha somente caso queira redefinir a senha."}

                </small>

              )}

              {erro && (

                <div className="settings-modal-error">

                  {erro}

                </div>

              )}

              <div className="settings-modal-actions">

                <button
                  type="button"
                  className="settings-cancel"
                  onClick={
                    fecharModal
                  }
                  disabled={
                    salvando
                  }
                >

                  Cancelar

                </button>

                <button
                  type="submit"
                  className="settings-save"
                  disabled={
                    salvando
                  }
                >

                  {salvando
                    ? "Salvando..."
                    : qualidade && editando
                      ? "Redefinir senha"
                      : "Salvar"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </Layout>

  );

}

export default Settings;
