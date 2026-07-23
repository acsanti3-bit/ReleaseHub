import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  buscarSessao,
} from "../services/AuthService";

import type {
  AuthUser,
} from "../services/AuthService";

import "./ProtectedRoute.css";

interface Props {
  children: ReactNode;
  requiredRole?: "admin";
}

function ProtectedRoute({
  children,
  requiredRole,
}: Props) {

  const location =
    useLocation();

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    usuario,
    setUsuario,
  ] =
    useState<AuthUser | null>(
      null
    );

  useEffect(() => {

    let ativo = true;

    async function verificar() {

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
          "Erro ao validar sessão:",
          erro
        );

        if (ativo) {

          setUsuario(
            null
          );

        }

      } finally {

        if (ativo) {

          setCarregando(
            false
          );

        }

      }

    }

    void verificar();

    return () => {

      ativo = false;

    };

  }, []);

  if (carregando) {

    return (

      <div className="auth-loading">

        <div className="auth-loading-spinner" />

        <strong>
          IWS ReleaseHub
        </strong>

        <span>
          Validando acesso...
        </span>

      </div>

    );

  }

  if (!usuario) {

    return (

      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />

    );

  }

  if (
    requiredRole &&
    usuario.role !== requiredRole
  ) {

    return (

      <Navigate
        to="/"
        replace
      />

    );

  }

  return children;

}

export default ProtectedRoute;