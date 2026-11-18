import {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  useNavigate,
} from "react-router-dom";

import {
  MdDarkMode,
  MdLightMode,
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


interface Props {
  darkMode: boolean;
  onToggleTheme: () => void;
}


const SESSION_USER_KEY =
  "releasehub-session-user";

const SIDEBAR_COLLAPSED_KEY =
  "releasehub-sidebar-collapsed";


function obterUsuarioSalvo():
  AuthUser | null {

  try {

    const valor =
      sessionStorage.getItem(
        SESSION_USER_KEY
      );


    if (!valor) {

      return null;

    }


    return JSON.parse(
      valor
    ) as AuthUser;

  } catch {

    return null;

  }

}


function salvarUsuario(
  usuario: AuthUser | null
) {

  try {

    if (usuario) {

      sessionStorage.setItem(
        SESSION_USER_KEY,
        JSON.stringify(
          usuario
        )
      );

    } else {

      sessionStorage.removeItem(
        SESSION_USER_KEY
      );

    }

  } catch {

    // sessionStorage indisponível.

  }

}


function obterSidebarRecolhida():
  boolean {

  try {

    return (
      localStorage.getItem(
        SIDEBAR_COLLAPSED_KEY
      ) === "true"
    );

  } catch {

    return false;

  }

}


function Sidebar({
  darkMode,
  onToggleTheme,
}: Props) {

  const navigate =
    useNavigate();


  const [
    usuario,
    setUsuario,
  ] =
    useState<
      AuthUser | null
    >(
      obterUsuarioSalvo
    );


  const [
    saindo,
    setSaindo,
  ] =
    useState(false);


  const [
    sidebarRecolhida,
    setSidebarRecolhida,
  ] =
    useState(
      obterSidebarRecolhida
    );


  useEffect(() => {

    let ativo =
      true;


    async function carregarUsuario() {

      try {

        const sessao =
          await buscarSessao();


        if (!ativo) {

          return;

        }


        setUsuario(
          sessao
        );


        salvarUsuario(
          sessao
        );

      } catch (erro) {

        console.error(
          "Erro ao carregar usuário:",
          erro
        );

      }

    }


    void carregarUsuario();


    return () => {

      ativo =
        false;

    };

  }, []);


  function alternarSidebar() {

    setSidebarRecolhida(
      valorAtual => {

        const novoValor =
          !valorAtual;


        try {

          localStorage.setItem(
            SIDEBAR_COLLAPSED_KEY,
            String(
              novoValor
            )
          );

        } catch {

          // localStorage indisponível.

        }


        return novoValor;

      }
    );

  }


  async function handleLogout() {

    if (saindo) {

      return;

    }


    setSaindo(
      true
    );


    try {

      await logout();

    } catch (erro) {

      console.error(
        "Erro ao sair:",
        erro
      );

    } finally {

      salvarUsuario(
        null
      );


      setUsuario(
        null
      );


      navigate(
        "/login",
        {
          replace:
            true,
        }
      );


      setSaindo(
        false
      );

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


      case "gestor":

        return "Gestor";


      case "visualizador":

        return "Visualizador";


      default:

        return "Usuário";

    }

  }


  const podeAcessarAmbientes =
    usuario?.role === "admin" ||
    usuario?.role === "qualidade" ||
    usuario?.role === "gestor";


  const podeAcessarConfiguracoes =
    podeAcessarAmbientes;


  const podeAcessarGestaoHoras =
    usuario?.role === "admin" ||
    usuario?.role === "gestor";


  return (

    <aside
      className={
        `sidebar ${
          sidebarRecolhida
            ? "is-collapsed"
            : ""
        }`
      }
    >

      <button
        type="button"
        className="sidebar-edge-toggle"
        onClick={
          alternarSidebar
        }
        title={
          sidebarRecolhida
            ? "Expandir barra lateral"
            : "Recolher barra lateral"
        }
        aria-label={
          sidebarRecolhida
            ? "Expandir barra lateral"
            : "Recolher barra lateral"
        }
        aria-expanded={
          !sidebarRecolhida
        }
      >

        <span
          className="sidebar-edge-arrow"
          aria-hidden="true"
        >
          {sidebarRecolhida
            ? "›"
            : "‹"}
        </span>

      </button>


      <div className="sidebar-header">

        <div className="sidebar-brand">

          <h2>
            IWS ReleaseHub
          </h2>

          <span>
            v1.0.0
          </span>

        </div>

      </div>


      <nav>

        <div className="sidebar-group">

          <span className="sidebar-group-title">
            Visão geral
          </span>


          <NavLink to="/">
            Dashboard
          </NavLink>


          <NavLink to="/tv">
            Modo TV
          </NavLink>

        </div>


        <div className="sidebar-group">

          <span className="sidebar-group-title">
            Releases
          </span>


          {podeAcessarAmbientes && (

            <NavLink to="/environments">
              Ambientes da Release
            </NavLink>

          )}


          <NavLink to="/compatibility">
            Compatibilidade
          </NavLink>

        </div>


        <div className="sidebar-group">

          <span className="sidebar-group-title">
            Clientes
          </span>


          <NavLink to="/client-versions">
            Versões de Clientes
          </NavLink>

        </div>


        {podeAcessarGestaoHoras && (

          <div className="sidebar-group">

            <span className="sidebar-group-title">
              Administrativo
            </span>


            <NavLink to="/gestao-horas">
              Gestão de Horas
            </NavLink>

          </div>

        )}


        {podeAcessarConfiguracoes && (

          <div className="sidebar-group">

            <span className="sidebar-group-title">
              Sistema
            </span>


            <NavLink to="/settings">
              Configurações
            </NavLink>

          </div>

        )}

      </nav>


      <div className="sidebar-auth">

        <button
          type="button"
          className="sidebar-theme-toggle"
          onClick={
            onToggleTheme
          }
          title={
            darkMode
              ? "Ativar modo claro"
              : "Ativar modo noturno"
          }
        >

          {darkMode ? (

            <MdLightMode
              size={18}
            />

          ) : (

            <MdDarkMode
              size={18}
            />

          )}


          <span>

            {darkMode
              ? "Modo claro"
              : "Modo noturno"}

          </span>

        </button>


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
          disabled={
            saindo
          }
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