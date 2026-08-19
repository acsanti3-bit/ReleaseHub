import "./DashboardStats.css";

import type { Project } from "../../types/project";

interface Props {

  projects: Project[];

  concluido?: boolean;

  onFilter: (filtro: string) => void;

}

function DashboardStats({

  projects,

  concluido = false,

  onFilter,

}: Props) {

  const totalProjetos = projects.length;

  const totalTarefas = projects.reduce(

    (acc, project) =>

      acc +

      Object.values(project.situacoes).reduce(

        (a, b) => a + b,

        0

      ),

    0

  );

  const qualidade = projects.reduce(

    (acc, project) =>

      acc + project.situacoes.qualidade,

    0

  );

  const testes = projects.reduce(

    (acc, project) =>

      acc + project.situacoes.testes,

    0

  );

  const desenvolvido = projects.reduce(

    (acc, project) =>

      acc +

      project.situacoes.desenvolvido +

      project.situacoes.aguardandoCompilacao,

    0

  );

  const atrasados =
    concluido
      ? 0
      : projects.filter(project => {

          if (!project.prazo) {

            return false;

          }

          return new Date(project.prazo) < new Date();

        }).length;

  const cards = [

    {

      titulo: "Projetos",

      valor: totalProjetos,

      cor: "#005AA9",

      filtro: "Todos",

    },

    {

      titulo: "Tarefas",

      valor: totalTarefas,

      cor: "#F58220",

      filtro: "Todos",

    },

    {

      titulo: "Desenvolvido",

      valor: desenvolvido,

      cor: "#43A047",

      filtro: "Desenvolvido",

    },

    {

      titulo: "Qualidade",

      valor: qualidade,

      cor: "#F58220",

      filtro: "Qualidade",

    },

    {

      titulo: "Testes",

      valor: testes,

      cor: "#005AA9",

      filtro: "Testes",

    },

    {

      titulo: "Atrasados",

      valor: atrasados,

      cor: "#E53935",

      filtro: "Atrasados",

    },

  ];

  return (

    <div className="stats-grid">

      {cards.map(card => (

        <div

          key={card.titulo}

          className="stats-card"

          onClick={() =>

            onFilter(card.filtro)

          }

        >

          <small>

            {card.titulo}

          </small>

          <strong

            style={{

              color: card.cor,

            }}

          >

            {card.valor}

          </strong>

        </div>

      ))}

    </div>

  );

}

export default DashboardStats;