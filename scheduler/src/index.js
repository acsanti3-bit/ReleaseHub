const RELEASEHUB_URL =
  "https://releasehub.pages.dev";


async function listarAmbientes() {
  const response =
    await fetch(
      `${RELEASEHUB_URL}/api/environments`,
      {
        headers: {
          Accept:
            "application/json",
        },
      }
    );


  if (!response.ok) {
    throw new Error(
      `Erro ${response.status} ao buscar os ambientes do ReleaseHub.`
    );
  }


  const ambientes =
    await response.json();


  if (
    !Array.isArray(
      ambientes
    )
  ) {
    throw new Error(
      "A API de ambientes retornou um formato inesperado."
    );
  }


  return ambientes;
}


async function sincronizarAmbiente(
  ambiente,
  secret
) {
  const response =
    await fetch(
      `${RELEASEHUB_URL}/api/redmine-sync`,
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          "X-Scheduler-Secret":
            secret,
        },

        body:
          JSON.stringify({
            environmentId:
              ambiente.id,
          }),
      }
    );


  const resultado =
    await response
      .json()
      .catch(
        () => null
      );


  if (!response.ok) {
    throw new Error(
      resultado?.erro ??
      `Erro ${response.status} ao sincronizar o ambiente ${ambiente.id}.`
    );
  }


  return resultado;
}


async function executarSincronizacao(
  secret
) {
  if (!secret) {
    throw new Error(
      "O segredo SCHEDULER_SECRET não está configurado no Worker."
    );
  }


  const inicio =
    new Date();


  console.log(
    `[ReleaseHub] Sincronização automática iniciada em ${inicio.toISOString()}.`
  );


  const ambientes =
    await listarAmbientes();


  console.log(
    `[ReleaseHub] ${ambientes.length} ambiente(s) encontrado(s).`
  );


  let sincronizados =
    0;

  let erros =
    0;


  for (
    const ambiente
    of ambientes
  ) {
    try {
      console.log(
        `[ReleaseHub] Sincronizando ambiente ${ambiente.id} - ${ambiente.nome}...`
      );


      const resultado =
        await sincronizarAmbiente(
          ambiente,
          secret
        );


      sincronizados +=
        1;


      console.log(
        `[ReleaseHub] Ambiente ${ambiente.id} sincronizado.`,
        {
          nome:
            ambiente.nome,

          projetosAtualizados:
            resultado
              ?.projetosAtualizados ??
            0,

          tarefasEncontradas:
            resultado
              ?.tarefasEncontradas ??
            0,

          tarefasSincronizadas:
            resultado
              ?.tarefasSincronizadas ??
            0,
        }
      );

    } catch (erro) {
      erros +=
        1;


      console.error(
        `[ReleaseHub] Erro no ambiente ${ambiente.id} - ${ambiente.nome}:`,
        erro
      );
    }
  }


  const fim =
    new Date();


  console.log(
    "[ReleaseHub] Sincronização automática finalizada.",
    {
      ambientes:
        ambientes.length,

      sincronizados,

      erros,

      inicio:
        inicio.toISOString(),

      fim:
        fim.toISOString(),
    }
  );
}


export default {

  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      executarSincronizacao(
        env.SCHEDULER_SECRET
      )
    );
  },


  async fetch(
    request,
    env
  ) {
    return Response.json({
      servico:
        "IWS ReleaseHub Scheduler",

      status:
        "ativo",

      atualizacao:
        "automática",

      intervalo:
        "2 minutos",

      releaseHub:
        RELEASEHUB_URL,

      segredoConfigurado:
        Boolean(
          env.SCHEDULER_SECRET
        ),
    });
  },

};