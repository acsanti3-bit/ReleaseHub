import "./AttentionProjects.css";

import type { Project } from "../../types/project";

interface Props {
  projects: Project[];
  concluido?: boolean;
}

function AttentionProjects({
  projects,
  concluido = false,
}: Props) {

  const lista = projects.filter(project => {

    const atrasado =
      !concluido &&
      project.prazo &&
      new Date(project.prazo) < new Date();

    return (
      atrasado ||
      project.situacoes.qualidade > 0 ||
      project.situacoes.testes > 0 ||
      project.situacoes.reaberta > 0
    );

  });

  return (

    <div className="attention-projects">

      <h2>Projetos que exigem atenção</h2>

      {lista.length === 0 && (
        <p>Nenhum projeto necessita atenção.</p>
      )}

      {lista.map(project => {

        const badges = [];

        if (
          !concluido &&
          project.prazo &&
          new Date(project.prazo) < new Date()
        ) {
          badges.push("Atrasado");
        }

        if (project.situacoes.qualidade > 0)
          badges.push("Qualidade");

        if (project.situacoes.testes > 0)
          badges.push("Testes");

        if (project.situacoes.reaberta > 0)
          badges.push("Reaberta");

        return (

          <div
            key={project.id}
            className="attention-row"
          >

            <strong>{project.nome}</strong>

            <div className="attention-badges">

              {badges.map(item => (

                <span key={item}>
                  {item}
                </span>

              ))}

            </div>

          </div>

        );

      })}

    </div>

  );

}

export default AttentionProjects;