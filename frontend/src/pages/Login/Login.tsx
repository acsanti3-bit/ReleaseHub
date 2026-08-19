import {
  useEffect,
  useRef,
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


const TURNSTILE_SITE_KEY =
  "0x4AAAAAAETHPPp2o-cUo82B";

type TurnstileWidgetId =
  string | number;

interface TurnstileOptions {
  sitekey: string;
  action?: string;
  theme?: "light" | "dark" | "auto";
  callback?: (
    token: string
  ) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: TurnstileOptions
      ) => TurnstileWidgetId;
      reset: (
        widgetId?: TurnstileWidgetId
      ) => void;
      remove: (
        widgetId: TurnstileWidgetId
      ) => void;
    };
  }
}

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


  const [
    turnstileToken,
    setTurnstileToken,
  ] =
    useState("");

  const turnstileContainerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const turnstileWidgetRef =
    useRef<TurnstileWidgetId | null>(
      null
    );

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

    function renderizarTurnstile() {

      if (
        !ativo ||
        !turnstileContainerRef.current ||
        !window.turnstile ||
        turnstileWidgetRef.current !== null
      ) {

        return;

      }

      turnstileWidgetRef.current =
        window.turnstile.render(
          turnstileContainerRef.current,
          {
            sitekey:
              TURNSTILE_SITE_KEY,

            action:
              "login",

            theme:
              "light",

            callback:
              token => {

                if (ativo) {

                  setTurnstileToken(
                    token
                  );

                }

              },

            "expired-callback":
              () => {

                if (ativo) {

                  setTurnstileToken(
                    ""
                  );

                }

              },

            "error-callback":
              () => {

                if (ativo) {

                  setTurnstileToken(
                    ""
                  );

                  setErro(
                    "Não foi possível concluir a verificação de segurança. Tente novamente."
                  );

                }

              },
          }
        );

    }

    const scriptId =
      "cloudflare-turnstile-script";

    let script =
      document.getElementById(
        scriptId
      ) as HTMLScriptElement | null;

    const handleLoad =
      () => {

        renderizarTurnstile();

      };

    const handleError =
      () => {

        if (ativo) {

          setErro(
            "Não foi possível carregar a verificação de segurança. Atualize a página e tente novamente."
          );

        }

      };

    if (
      window.turnstile
    ) {

      renderizarTurnstile();

    } else {

      if (!script) {

        script =
          document.createElement(
            "script"
          );

        script.id =
          scriptId;

        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

        script.async = true;
        script.defer = true;

        document.head.appendChild(
          script
        );

      }

      script.addEventListener(
        "load",
        handleLoad
      );

      script.addEventListener(
        "error",
        handleError
      );

    }

    return () => {

      ativo = false;

      if (script) {

        script.removeEventListener(
          "load",
          handleLoad
        );

        script.removeEventListener(
          "error",
          handleError
        );

      }

      if (
        window.turnstile &&
        turnstileWidgetRef.current !== null
      ) {

        window.turnstile.remove(
          turnstileWidgetRef.current
        );

        turnstileWidgetRef.current =
          null;

      }

    };

  }, []);

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
            origem,
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
    origem,
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


    if (
      !turnstileToken
    ) {

      setErro(
        "Conclua a verificação de segurança para entrar."
      );

      return;

    }

    setCarregando(true);

    setErro("");

    try {

      await login(
        email.trim(),
        senha,
        turnstileToken
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

      setTurnstileToken(
        ""
      );

      if (
        window.turnstile &&
        turnstileWidgetRef.current !== null
      ) {

        window.turnstile.reset(
          turnstileWidgetRef.current
        );

      }

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

          <div
            ref={
              turnstileContainerRef
            }
            style={{
              display: "flex",
              justifyContent: "center",
              minHeight: "65px",
            }}
          />

          {erro && (

            <div className="login-error">

              {erro}

            </div>

          )}

          <button
            type="submit"
            className="login-submit"
            disabled={
              carregando ||
              !turnstileToken
            }
          >

            {carregando
              ? "Entrando..."
              : "Entrar"}

          </button>

        </form>

        <footer className="login-footer">

          <div className="login-footer-main">

            <span>
              IWS Sistemas
            </span>

            <span>
              ReleaseHub v1.0.0
            </span>

          </div>

          <span className="login-credit">
            Desenvolvido por Ana Carolina Santi Teixeira • QA
          </span>

        </footer>

      </main>

    </div>

  );

}

export default Login;