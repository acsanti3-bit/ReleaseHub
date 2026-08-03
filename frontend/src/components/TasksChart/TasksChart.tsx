import "./TasksChart.css";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

import type {
  Project,
} from "../../types/project";


interface Props {

  projects: Project[];

}


function TasksChart({

  projects,

}: Props) {

  const total = {

    nova: 0,

    emProgresso: 0,

    desenvolvido: 0,

    aguardandoCompilacao: 0,

    qualidade: 0,

    testes: 0,

    reaberta: 0,

    validacaoCliente: 0,

    resolvidas: 0,

    rejeitada: 0,

    interrompida: 0,

  };


  projects.forEach(
    project => {

      total.nova +=
        project
          .situacoes
          .nova;


      total.emProgresso +=
        project
          .situacoes
          .emProgresso;


      total.desenvolvido +=
        project
          .situacoes
          .desenvolvido;


      total.aguardandoCompilacao +=
        project
          .situacoes
          .aguardandoCompilacao;


      total.qualidade +=
        project
          .situacoes
          .qualidade;


      total.testes +=
        project
          .situacoes
          .testes;


      total.reaberta +=
        project
          .situacoes
          .reaberta;


      total.validacaoCliente +=
        project
          .situacoes
          .validacaoCliente;


      total.resolvidas +=
        project
          .situacoes
          .resolvidas;


      total.rejeitada +=
        project
          .situacoes
          .rejeitada;


      total.interrompida +=
        project
          .situacoes
          .interrompida;

    }
  );


  const data = [

    {
      name: "Nova",
      value: total.nova,
      color: "#1976D2",
    },

    {
      name: "Em Progresso",
      value: total.emProgresso,
      color: "#FB8C00",
    },

    {
      name: "Desenvolvido",
      value: total.desenvolvido,
      color: "#43A047",
    },

    {
      name: "Aguardando Compilação",
      value:
        total.aguardandoCompilacao,
      color: "#78909C",
    },

    {
      name: "Qualidade",
      value: total.qualidade,
      color: "#8E24AA",
    },

    {
      name: "Testes",
      value: total.testes,
      color: "#00ACC1",
    },

    {
      name: "Reaberta",
      value: total.reaberta,
      color: "#F4511E",
    },

    {
      name: "Validação no Cliente",
      value: total.validacaoCliente,
      color: "#5C6BC0",
    },

    {
      name: "Rejeitada",
      value: total.rejeitada,
      color: "#E53935",
    },

    {
      name: "Interrompida",
      value: total.interrompida,
      color: "#757575",
    },

    {
      name: "Resolvidas",
      value: total.resolvidas,
      color: "#2E7D32",
    },

  ].filter(
    item =>
      item.value > 0
  );


  return (

    <div className="tasks-chart">

      <h2>
        Distribuição das Tarefas
      </h2>


      <ResponsiveContainer
        width="100%"
        height={350}
      >

        <PieChart>

          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={110}
            label
          >

            {data.map(
              item => (

                <Cell
                  key={
                    item.name
                  }
                  fill={
                    item.color
                  }
                />

              )
            )}

          </Pie>


          <Tooltip />

          <Legend />

        </PieChart>

      </ResponsiveContainer>

    </div>

  );

}


export default TasksChart;