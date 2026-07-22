import "./TopProjects.css";

import type { Project } from "../../types/project";

interface Props {
  projects: Project[];
}

function TopProjects({ projects }: Props) {

  const lista = [...projects]
    .sort((a, b) => {

      const totalA = Object.values(a.situacoes).reduce(
        (x, y) => x + y,
        0
      );

      const totalB = Object.values(b.situacoes).reduce(
        (x, y) => x + y,
        0
      );

      return totalB - totalA;

    })
    .slice(0, 5);

  return (

    <div className="top-projects">

      <h2>Top 5 Projetos</h2>

      {lista.map(project => {

        const total = Object.values(project.situacoes).reduce(
          (a, b) => a + b,
          0
        );

        return (

          <div
            key={project.id}
            className="top-project-row"
          >

            <span>{project.nome}</span>

            <strong>{total}</strong>

          </div>

        );

      })}

    </div>

  );

}

export default TopProjects;