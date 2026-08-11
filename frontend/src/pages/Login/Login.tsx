import {
  useEffect,
  useState,
  type SyntheticEvent,
} from "react";

import {
  MdLockOutline,
  MdOutlineEmail,
  MdVisibility,
  MdVisibilityOff,
} from "react-icons/md";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import logo from "../../assets/images/logo.png";

import {
  buscarSessao,
  login,
} from "../../services/AuthService";

import "./Login.css";

function Login() {

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    senha,
    setSenha,
  ] =
    useState("");

  const [
    mostrarSenha,
    setMostrarSenha,
  ] =
    useState(false);

  const [
    carregando,
    setCarregando,
  ] =
    useState(false);

  const [
    erro,
    setErro,
  ] =
    useState("");

  const origem =
    (
      location.state as
        | {
            from?: string;
          }
        | null
    )?.from || "/";

  useEffect(() => {

    let ativo = true;

    async function verificarSessao() {

      try {

        const usuario =
          await buscarSessao();

        if (
          ativo &&
          usuario
        ) {

          navigate(
            "/",
            {
              replace: true,
            }
          );

        }

      } catch {

        /*
          Sem sessão:
          permanece no login.
        */

      }

    }

    void verificarSessao();

    return () => {

      ativo = false;

    };

  }, [
    navigate,
  ]);

  async function handleSubmit(
    event: SyntheticEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (
      !email.trim() ||
      !senha
    ) {

      setErro(
        "Informe seu e-mail e sua senha."
      );

      return;

    }

    setCarregando(true);

    setErro("");

    try {

      await login(
        email.trim(),
        senha
      );

      navigate(
        origem,
        {
          replace: true,
        }
      );

    } catch (error) {

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível entrar."
      );

    } finally {

      setCarregando(false);

    }

  }

  return (

    <div className="login-page">

      <div className="login-decoration login-decoration-one" />

      <div className="login-decoration login-decoration-two" />

      <main className="login-card">

        <div className="login-brand">

          <div className="login-logo-container">

            <img
              src={logo}
              alt="IWS"
            />

          </div>

          <div>

            <h1>
              IWS ReleaseHub
            </h1>

            <span>
              Gestão de Releases
            </span>

          </div>

        </div>

        <div className="login-heading">

          <h2>
            Bem-vindo(a)
          </h2>

          <p>
            Entre para acessar o painel de gerenciamento.
          </p>

        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="login-form"
        >

          <label>
            E-mail
          </label>

          <div className="login-input">

            <MdOutlineEmail
              size={20}
            />

            <input
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={event =>
                setEmail(
                  event.target.value
                )
              }
            />

          </div>

          <label>
            Senha
          </label>

          <div className="login-input">

            <MdLockOutline
              size={20}
            />

            <input
              type={
                mostrarSenha
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={event =>
                setSenha(
                  event.target.value
                )
              }
            />

            <button
              type="button"
              className="login-show-password"
              onClick={() =>
                setMostrarSenha(
                  valor =>
                    !valor
                )
              }
              aria-label={
                mostrarSenha
                  ? "Ocultar senha"
                  : "Mostrar senha"
              }
            >

              {mostrarSenha ? (

                <MdVisibilityOff
                  size={20}
                />

              ) : (

                <MdVisibility
                  size={20}
                />

              )}

            </button>

          </div>

          {erro && (

            <div className="login-error">

              {erro}

            </div>

          )}

          <button
            type="submit"
            className="login-submit"
            disabled={
              carregando
            }
          >

            {carregando
              ? "Entrando..."
              : "Entrar"}

          </button>

        </form>

        <button
          type="button"
          className="login-tv-link"
          onClick={() =>
            navigate("/tv")
          }
        >

          Acessar apenas o Modo TV

        </button>

        <footer className="login-footer">

          <div className="login-footer-main">

            <span>
              IWS Intelliware Solutions
            </span>

            <span>
              ReleaseHub v1.0.0
            </span>

          </div>

          <span className="login-credit">
            Desenvolvido por Ana Carolina Santi Teixeira
          </span>

        </footer>

      </main>

    </div>

  );

}

export default Login;