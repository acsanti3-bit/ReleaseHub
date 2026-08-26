import {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  MdLogout,
} from "react-icons/md";

import {
  buscarSessao,
  logout,
} from "../../services/AuthService";

import type {
  AuthUser,
} from "../../services/AuthService";

import "./Sidebar.css";
import "./SidebarAuth.css";

function Sidebar() {

  const navigate =
    useNavigate();

  const [
    usuario,
    setUsuario,
  ] =
    useState<
      AuthUser | null
    >(null);

  const [
    saindo,
    setSaindo,
  ] =
    useState(false);

  useEffect(() => {

    let ativo = true;

    async function carregarUsuario() {

      try {

        const sessao =
          await buscarSessao();

        if (ativo) {

          setUsuario(
            sessao
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao carregar usuário:",
          erro
        );

      }

    }

    void carregarUsuario();

    return () => {

      ativo = false;

    };

  }, []);

  async function handleLogout() {

    if (saindo) {

      return;

    }

    setSaindo(true);

    try {

      await logout();

    } catch (erro) {

      console.error(
        "Erro ao sair:",
        erro
      );

    } finally {

      navigate(
        "/login",
        {
          replace: true,
        }
      );

      setSaindo(false);

    }

  }

  const inicial =
    usuario?.nome
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    "U";

  function descricaoPerfil() {

    switch (
      usuario?.role
    ) {

      case "admin":

        return "Administrador";

      case "qualidade":

        return "Qualidade";

      case "visualizador":

        return "Visualizador";

      default:

        return "Usuário";

    }

  }

  const podeAcessarAmbientes =
    usuario?.role === "admin" ||
    usuario?.role === "qualidade";

  const podeAcessarConfiguracoes =
    podeAcessarAmbientes;

  return (

    <aside className="sidebar">

      <div className="sidebar-header">

        <h2>
          IWS ReleaseHub
        </h2>

        <span>
          v1.0.0
        </span>

      </div>

      <nav>

        <NavLink to="/">
          Dashboard
        </NavLink>

        {podeAcessarAmbientes && (

          <NavLink to="/environments">
            Ambientes da Release
          </NavLink>

        )}

        <NavLink to="/compatibility">
          Compatibilidade
        </NavLink>

        <NavLink to="/tv">
          Modo TV
        </NavLink>

        {podeAcessarConfiguracoes && (

          <NavLink to="/settings">
            Configurações
          </NavLink>

        )}

      </nav>

      <div className="sidebar-auth">

        <div className="sidebar-auth-user">

          <div className="sidebar-auth-avatar">

            {inicial}

          </div>

          <div className="sidebar-auth-info">

            <strong>
              {usuario?.nome ||
                "Usuário"}
            </strong>

            <span>
              {descricaoPerfil()}
            </span>

          </div>

        </div>

        <button
          type="button"
          className="sidebar-logout"
          onClick={() =>
            void handleLogout()
          }
          disabled={saindo}
        >

          <MdLogout
            size={18}
          />

          {saindo
            ? "Saindo..."
            : "Sair"}

        </button>

      </div>

    </aside>

  );

}

export default Sidebar;
