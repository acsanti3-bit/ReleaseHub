import {
  useEffect,
  useState,
} from "react";

import type {
  ReactNode,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  buscarSessao,
} from "../services/AuthService";

import "./ProtectedRoute.css";

interface Props {
  children: ReactNode;
}

function ProtectedRoute({
  children,
}: Props) {

  const location =
    useLocation();

  const [
    carregando,
    setCarregando,
  ] =
    useState(true);

  const [
    autenticado,
    setAutenticado,
  ] =
    useState(false);

  useEffect(() => {

    let ativo = true;

    async function verificar() {

      try {

        const usuario =
          await buscarSessao();

        if (ativo) {

          setAutenticado(
            Boolean(usuario)
          );

        }

      } catch (erro) {

        console.error(
          "Erro ao validar sessão:",
          erro
        );

        if (ativo) {

          setAutenticado(
            false
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

  if (!autenticado) {

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

  return children;

}

export default ProtectedRoute;