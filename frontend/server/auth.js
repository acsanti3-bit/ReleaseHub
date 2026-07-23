const encoder =
  new TextEncoder();

const PBKDF2_ITERATIONS =
  600000;

const SESSION_SECONDS =
  60 * 60 * 8;

const COOKIE_NAME =
  "releasehub_session";


function bytesToHex(
  bytes
) {

  return Array.from(bytes)
    .map(byte =>
      byte
        .toString(16)
        .padStart(2, "0")
    )
    .join("");

}


function hexToBytes(
  hex
) {

  const bytes =
    new Uint8Array(
      hex.length / 2
    );

  for (
    let index = 0;
    index < bytes.length;
    index++
  ) {

    bytes[index] =
      Number.parseInt(
        hex.slice(
          index * 2,
          index * 2 + 2
        ),
        16
      );

  }

  return bytes;

}


function randomHex(
  quantidadeBytes
) {

  const bytes =
    new Uint8Array(
      quantidadeBytes
    );

  crypto.getRandomValues(
    bytes
  );

  return bytesToHex(
    bytes
  );

}


async function derivarSenha(
  senha,
  saltHex
) {

  const material =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(senha),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const resultado =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",

        hash: "SHA-256",

        salt:
          hexToBytes(
            saltHex
          ),

        iterations:
          PBKDF2_ITERATIONS,
      },

      material,

      256
    );

  return new Uint8Array(
    resultado
  );

}


export async function criarHashSenha(
  senha
) {

  const salt =
    randomHex(16);

  const hashBytes =
    await derivarSenha(
      senha,
      salt
    );

  return {

    salt,

    hash:
      bytesToHex(
        hashBytes
      ),

  };

}


export async function verificarSenha(
  senha,
  hashSalvo,
  salt
) {

  const calculado =
    await derivarSenha(
      senha,
      salt
    );

  const salvo =
    hexToBytes(
      hashSalvo
    );

  if (
    calculado.byteLength !==
    salvo.byteLength
  ) {

    return false;

  }

  return crypto.subtle
    .timingSafeEqual(
      calculado,
      salvo
    );

}


export function compararSegredo(
  recebido,
  esperado
) {

  const recebidoBytes =
    encoder.encode(
      recebido || ""
    );

  const esperadoBytes =
    encoder.encode(
      esperado || ""
    );

  const mesmoTamanho =
    recebidoBytes.byteLength ===
    esperadoBytes.byteLength;

  if (mesmoTamanho) {

    return crypto.subtle
      .timingSafeEqual(
        recebidoBytes,
        esperadoBytes
      );

  }

  /*
    Mesmo com tamanhos diferentes,
    executamos uma comparação para
    reduzir vazamento por tempo.
  */

  return !crypto.subtle
    .timingSafeEqual(
      recebidoBytes,
      recebidoBytes
    );

}


export function gerarTokenSessao() {

  return randomHex(32);

}


export async function hashToken(
  token
) {

  const resultado =
    await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(token)
    );

  return bytesToHex(
    new Uint8Array(
      resultado
    )
  );

}


export function obterCookie(
  request,
  nome
) {

  const cookie =
    request.headers.get(
      "Cookie"
    );

  if (!cookie) {

    return null;

  }

  const cookies =
    cookie.split(";");

  for (
    const item of cookies
  ) {

    const [
      chave,
      ...valor
    ] =
      item
        .trim()
        .split("=");

    if (
      chave === nome
    ) {

      return decodeURIComponent(
        valor.join("=")
      );

    }

  }

  return null;

}


export function obterTokenSessao(
  request
) {

  return obterCookie(
    request,
    COOKIE_NAME
  );

}


export async function buscarUsuarioLogado(
  context
) {

  const token =
    obterTokenSessao(
      context.request
    );

  if (!token) {

    return null;

  }

  const tokenHash =
    await hashToken(
      token
    );

  const agora =
    new Date()
      .toISOString();

  const usuario =
    await context.env.DB
      .prepare(
        `
          SELECT
            u.id,
            u.nome,
            u.email,
            u.role
          FROM sessions s
          INNER JOIN users u
            ON u.id = s.user_id
          WHERE
            s.token_hash = ?
            AND s.expires_at > ?
            AND u.ativo = 1
          LIMIT 1
        `
      )
      .bind(
        tokenHash,
        agora
      )
      .first();

  return usuario || null;

}


export function criarCookieSessao(
  token
) {

  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${SESSION_SECONDS}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");

}


export function removerCookieSessao() {

  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
  ].join("; ");

}


export function expiracaoSessao() {

  return new Date(
    Date.now() +
      SESSION_SECONDS * 1000
  ).toISOString();

}